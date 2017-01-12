/* Copyright 2016 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

/* global Plotly:true, window:true, $:true */

/* eslint no-console: "off" */

import clone from "clone";
import saveZip from "single-market-robot-simulator-savezip";

// private

function commonFrom(config){
    return function(c){
        const result =  Object.assign({},clone(c),clone(config.common));
        return result;
    };
}

function adjustBook(sim){
    sim.bookfixed=1;
    sim.booklimit = Math.max(...([sim.buySellBookLimit, sim.buyerImprovementRule, sim.sellerImprovementRule]
                                 .filter((x)=>(typeof(x) === 'number')))) || 10;
    return sim;
}


export class App {
    constructor(options){
	this.SMRS = options.SMRS;
	this.DB = options.DB;
	this.Visuals = options.Visuals;
	this.editorConfigSchema = options.editorConfigSchema;
	this.editorStartValue = options.editorStartValue;
	this.saveList = this.DB.openList(options.saveList);
	this.trashList = this.DB.openList(options.trashList);
	this.editor = 0;
	this.periodsEditor = 0;
	this.periodTimers  = [];
	this.savedConfigs = [];
	this.chosenScenarioIndex = 0;
	this.sims = [];
	this.visual = 0;
    }

    allSim(config){
        return (config
                .configurations
                .map(commonFrom(config))
                .map(adjustBook)
                .map((s)=>(new this.SMRS.Simulation(s)))
               );
    }

    plotParameters(sim, slot){
        const plotlyParams = this.Visuals.params(sim);
        plotlyParams.unshift("paramPlot"+slot);
        Plotly.newPlot(...plotlyParams);
    }

    showParameters(conf){
        $('.paramPlot').html("");
        (conf
         .configurations
         .map(commonFrom(conf))
         .map((config)=>(new this.SMRS.Simulation(config)))
         .forEach((sim,slot)=>(this.plotParameters(sim,slot)))
        );
    }    

    guessTime(){
        const l = this.periodTimers.length;
        let guess = 0;
        if (l>2){ 
            guess = ((this.periodsEditor.getValue())*(this.periodTimers[l-1]-this.periodTimers[1])/(l-2))+this.periodTimers[1];
        } else if (l===2){
            guess = (this.periodsEditor.getValue())*this.periodTimers[1];
        }
        if (guess){
            const seconds = Math.round(guess/1000.0);
            const minutes = Math.ceil(seconds/60);
            $('span.estimated-running-time').text((minutes>1)? ('~'+minutes+'min'): ('~'+seconds+'sec'));
        } else {
            $('span.estimated-running-time').text("?");
        }
    }
    
    timeit(scenario){
        const t0 = Date.now();
	const periodTimers = this.periodTimers;
        periodTimers.length = 0;
        function markperiod(sim){
            const elapsed = Date.now()-t0;
            periodTimers[sim.period] = elapsed;
            // hack to end simulations if over 5 sec
            if (elapsed>5000)
                sim.config.periods = 0;
            return sim;
        }
        const scenario2p = clone(scenario);
        scenario2p.common.periods=5;
        (Promise.all(
            this.allSim(scenario2p).map((s)=>(s.run({update: markperiod})))
        ).then(()=>{
            console.log("simulation period timers", this.periodTimers);
            this.guessTime();
        })
         .catch((e)=>(console.log(e)))
             );
    }

    choose(n){
        this.chosenScenarioIndex = Math.max(0, Math.min(Math.floor(n),this.savedConfigs.length-1));
        const choice = this.savedConfigs[this.chosenScenarioIndex];
        if (choice){
            this.editor.setValue(clone(choice));
            // initialize periodsEditor only after a scenario is chosen
            this.periodsEditor = this.editor.getEditor('root.common.periods');
            this.timeit(clone(choice)); // time a separate clone
            this.refresh();
        }
    }   

    renderConfigSelector(){
        $("#selector > option").remove();
        this.savedConfigs.forEach((c,n)=> ($("#selector").append('<option value="'+n+'">'+c.title+'</option>')));
        $('#selector').on('change', (evt)=>this.choose(evt.target.selectedIndex));
    }

    getVisuals(simConfig){
        let visuals = [];
        const cfg = simConfig.config || simConfig;
        if (cfg.periods<=50)
            visuals = this.Visuals.small;
        else if (cfg.periods<=500)
            visuals = this.Visuals.medium;
        else
            visuals = this.Visuals.large;
        return visuals;
    }

    showSimulation(simConfig, slot){
        let visuals = this.getVisuals(simConfig);
        let plotParams = visuals[this.visual%visuals.length](simConfig);
        plotParams.unshift('resultPlot'+slot);
        Plotly.newPlot(...plotParams);
    }

    runSimulation(simConfig, slot){
        // set up and run new simulation
	
        function onPeriod(sim){
            if (sim.period<sim.config.periods){
                $('#resultPlot'+slot).html("<h1>"+Math.round(100*sim.period/sim.config.periods)+"% complete</h1>");
            } else {
                $('#resultPlot'+slot).html("");
            }
            return sim;
        }

        function onDone(sim){
            function toSelectBox(v,i){
                return [
                    '<option value="',
                    i,
                    '"',
                    ((i===this.visual)? ' selected="selected" ': ''),
                    '>',
                     (v.meta.title || v.meta.f),
                    '</option>'
                ].join('');
            }
            const visuals = this.getVisuals(simConfig);
            if (Array.isArray(visuals)){
                const vizchoices = visuals.map(toSelectBox).join("");
                $('#vizselect').html(vizchoices);
            } else {
                console.log("invalid visuals", visuals);
            }
            this.showSimulation(sim, slot);
            $('.spinning').removeClass('spinning');
            $('.postrun').removeClass('disabled');
            $('.postrun').prop('disabled',false);
        } 

        adjustBook(simConfig);

        let mysim = new this.SMRS.Simulation(simConfig);

        this.plotParameters(mysim, slot);

        (mysim
         .run({update: onPeriod})
         .then(onDone)
         .catch(function(e){ console.log(e); })
        );
        if (mysim.config.periods>500){
            delete mysim.logs.buyorder;
            delete mysim.logs.sellorder;
        }

        return mysim;
        
    }

    expand(how){
        const xfactor = +$('#xfactor').val();
        const config = this.editor.getValue();
        if (xfactor){
            config.title += ' x'+xfactor;
            config.configurations.forEach(function(sim){
                sim.buyerValues = how(sim.buyerValues, xfactor);
                sim.sellerCosts = how(sim.sellerCosts, xfactor);
                if (sim.numberOfBuyers>1) 
                    sim.numberOfBuyers  *= xfactor;
                if (sim.numberOfSellers>1)
                    sim.numberOfSellers *= xfactor;
            });
            this.editor.setValue(config);
            this.timeit(clone(config));
            this.refresh();
        }
    }

    /* public: app functions for outside code below this line */
    
    init(){
        $('.postrun').prop('disabled',true);
        let editorElement = $('#editor');
        let editorOptions = {
            schema: this.configSchema,
            startval: this.startVal
        };
        this.editor = new window.JSONEditor(editorElement, editorOptions);
        this.editor.on('change', function(){
            $('#runError').html("Click >Run to run the simulation and see the new results");
        });
        this.DB.promiseList(this.saveList)
            .then((configs)=>{
                if (Array.isArray(configs) && (configs.length)){
                    this.savedConfigs = configs;
                    this.renderConfigSelector();
                    this.choose(0);
                }
            });
    }

    estimateTime(){
        this.timeit(this.editor.getValue());
    }

    refresh(){
	const periodsEditor = this.periodsEditor;
	const editor = this.editor;
        if (periodsEditor){
            $('input.periods').val(periodsEditor.getValue());
            $('span.periods').text(periodsEditor.getValue());
            this.guessTime();
        }
        if (editor){
            const current = editor.getValue();
            this.showParameters(current);
            $('.configTitle').text(current.title);
            $('#xsimbs').html(
                "<tr>"+(current
                        .configurations
                        .map(
                            function(config,j){
                                const data = [j,config.numberOfBuyers,config.numberOfSellers];
                                return "<td>"+data.join("</td><td>")+"</td>";
                            })
                        .join('</tr><tr>')
                       )+"</tr>");
            this.plotParameters(new this.SMRS.Simulation((commonFrom(current)(current.configurations[0]))), "ScaleUp");
        }
    }

    interpolate(){
        this.expand(
            function(a,n){
                const result = [];
                for(let i=0,l=a.length;i<(l-1);++i){
                    for(let j=0;j<n;++j){
                        result.push((a[i]*(n-j)+a[i+1]*j)/n);
                    }
                }
                const last = a[a.length-1];
                for(let j=0;j<n;++j)
                    result.push(last);
                return result;
            }
        );
    }

    duplicate(){
        this.expand(
            function(a,n){
                const result = [];
                for(let i=0,l=a.length;i<l;++i){
                    for(let j=0;j<n;++j){
                        result.push(a[i]);
                    }
                }
                return result;
            }
        );
    }

    undo(){
        this.choose(this.chosenScenarioIndex);
    }

    moveToTrash(){
        console.log("move-to-trash");
	const {savedConfigs, renderConfigSelector, choose, chosenScenarioIndex, saveList, trashList } = this;
        (this.DB.promiseMoveItem(savedConfigs[chosenScenarioIndex], saveList, trashList)
         .then(function(){
             savedConfigs.splice(chosenScenarioIndex,1);
             renderConfigSelector();
             choose(0);
         })
         .catch(function(e){
             console.log(e);
         })
             );
    }

    run(){
        $('#runError').html("");
        $('.postrun').removeClass("disabled");
        $('.postrun').addClass("disabled");
        $('.postrun').prop('disabled',true);
        $('.paramPlot').html("");
        $('.resultPlot').html("");
        $('#runButton .glyphicon').addClass("spinning");
        setTimeout(()=>{
            let config = this.editor.getValue();
            this.sims = (config
                         .configurations
                         .map(commonFrom(config))
                         .map((s,i)=>this.runSimulation(s,i))
                        );
        }, 200);
    }

    save(){
	const that = this;
        function doSave(){
            (that.DB.promiseSaveItem(that.editor.getValue(), that.saveList)
             .then(()=>(window.location.reload()))
            );
        }   
        if (that.savedConfigs.length && (that.savedConfigs[that.chosenScenarioIndex]) && (that.editor.getValue().title===that.savedConfigs[that.chosenScenarioIndex].title)){
            (that.DB.promiseRemoveItem(that.savedConfigs[that.chosenScenarioIndex], that.saveList)
             .then(doSave)
            );
        } else {
            doSave();
        }
    }

    setPeriods(n){
        this.periodsEditor.setValue(Math.floor(n));
        this.refresh();
    }

    setVisualNumber(n){
        this.visual = n;
        this.sims.forEach((s,j)=>this.showSimulation(s,j));
    }
    
    downloadData(){
        $('#downloadButton').prop('disabled',true);
        $('#downloadButton').addClass("disabled");
        $('#downloadButton .glyphicon').addClass("spinning");
        setTimeout(()=>{
            saveZip({
                config: this.editor.getValue(),
                sims: this.sims,
                download: true
            }).then(function(){
                $('#downloadButton .spinning').removeClass("spinning");
                $('#downloadButton').removeClass("disabled");
                $('#downloadButton').prop('disabled',false);
            });
        }, 200);
    }

    uploadData(){
        $('#uploadButton').prop('disabled',true);
        $('#uploadButton').addClass('disabled');
        $('#uploadButton .glyphicon').addClass("spinning");
        setTimeout(()=>{
            saveZip({
                config: this.editor.getValue(), 
                sims: this.sims, 
                download: false})
                .then((zipBlob)=>{
                    (this.DB.promiseUpload(zipBlob)
                     .then(function(){
                         $('#uploadButton .spinning').removeClass("spinning");
                         $('#uploadButton').removeClass("disabled");
                         $('#uploadButton').prop('disabled',false);
                     })
                     .catch((e)=>(console.log(e)))
                         );
                });
        }, 200);
    }

    renderTrash(){
        $('#trashList').html("");
	const that = this;
        (that.DB.promiseListRange(that.trashList,0,20)
         .then((items)=>{
             items.forEach((item)=>{
                 $('#trashList').append('<pre class="pre-scrollable trash-item">'+JSON.stringify(item,null,2)+'</pre>');
             });
             $('pre.trash-item').click(function(){
                 try {
                     const restoredScenario = JSON.parse($(this).text());
                     if ( (typeof(restoredScenario)==='object') && 
                          (typeof(restoredScenario.title)==='string') && 
                          (typeof(restoredScenario.common)==='object') && 
                          (Array.isArray(restoredScenario.configurations))
                        ){                        
                         that.editor.setValue(restoredScenario);
                         $('#editLink').click();
                     } else {
                         console.log("trashed item is not a valid scenario");
                     }
                 } catch(e){ 
                     console.log("could not send trashed item to editor: "+e);
                 }
             });
         })
        );           
    }
}
