/* Copyright 2016 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

/* global Plotly:true, window:true, $:true */

/* eslint no-console: "off" */
/* eslint consistent-this: ["error", "app", "that"] */

import clone from "clone";
import saveZip from "single-market-robot-simulator-savezip";

// private

function commonFrom(config){
    return function(c){
        const result =  Object.assign({},clone(c),clone(config.common));
        return result;
    };
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
        this.behavior = options.behavior;
        this.editor = 0;
        this.periodsEditor = 0;
        this.periodTimers  = [];
        this.savedConfigs = [];
        this.chosenScenarioIndex = 0;
        this.sims = [];
        this.visual = 0;
    }

    allSim(config){
        const { SMRS } = this;
        return (config
                .configurations
                .map(commonFrom(config))
                .map((s)=>(new SMRS.Simulation(s)))
               );
    }

    plotParameters(sim, slot){
        const app = this;
        const plotlyParams = app.Visuals.params(sim);
        plotlyParams.unshift("paramPlot"+slot);
        Plotly.newPlot(...plotlyParams);
    }

    showParameters(conf){
        const app = this;
        $('.paramPlot').html("");
        (conf
         .configurations
         .map(commonFrom(conf))
         .map((config)=>(new app.SMRS.Simulation(config)))
         .forEach((sim,slot)=>(app.plotParameters(sim,slot)))
        );
    }    

    guessTime(){
        const { periodsEditor, periodTimers } = this;
        const l = periodTimers.length;
        let guess = 0;
        if (l>2){ 
            guess = ((periodsEditor.getValue())*(periodTimers[l-1]-periodTimers[1])/(l-2))+periodTimers[1];
        } else if (l===2){
            guess = (periodsEditor.getValue())*periodTimers[1];
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
        const app = this;
        const t0 = Date.now();
        const periodTimers = app.periodTimers;
        periodTimers.length = 0;
        const scenario2p = clone(scenario);
        scenario2p.common.periods=5;
        (Promise.all(
            (app
             .allSim(scenario2p)
             .map(
                 (s)=>(s.run({
                     update:(sim)=>{
                         const elapsed = Date.now()-t0;
                         periodTimers[sim.period] = elapsed;
                         // hack to end simulations if over 5 sec
                         if (elapsed>5000)
                             sim.config.periods = 0;
                         return sim;
                         
                     }
                 })
                      )
             )
            )
        ).then(
            ()=>{
                console.log("simulation period timers", periodTimers);
                app.guessTime();
            }
        )
         .catch((e)=>(console.log(e)))
             );
    }
    
    choose(n){
        const app = this;
        app.chosenScenarioIndex = Math.max(0, Math.min(Math.floor(n),app.savedConfigs.length-1));
        const choice = app.savedConfigs[app.chosenScenarioIndex];
        if (choice){
            app.editor.setValue(clone(choice));
            // initialize periodsEditor only after a scenario is chosen
            app.periodsEditor = app.editor.getEditor('root.common.periods');
            app.timeit(clone(choice)); // time a separate clone
            app.refresh();
        }
    }   

    renderConfigSelector(){
        const app = this;
        $("#selector > option").remove();
        app.savedConfigs.forEach((c,n)=> ($("#selector").append('<option value="'+n+'">'+c.title+'</option>')));
        $('#selector').on('change', (evt)=>this.choose(evt.target.selectedIndex));
    }

    getVisuals(simConfig){
        const app = this;
        let visuals = [];
        const cfg = simConfig.config || simConfig;
        if (cfg.periods<=50)
            visuals = app.Visuals.small;
        else if (cfg.periods<=500)
            visuals = app.Visuals.medium;
        else
            visuals = app.Visuals.large;
        return visuals;
    }

    adjustTitle(plotParams, modifier){
        const layout = plotParams[1];
        if (layout){
            if (layout.title){
                if (modifier.prepend && (modifier.prepend.length>0))
                    layout.title = modifier.prepend + layout.title;
                if (modifier.append && (modifier.append.length>0))
                    layout.title += modifier.append;
            }
            if (modifier.replace && (modifier.replace.length>0))
                layout.title = modifier.replace;
        }
    }

    showSimulation(simConfig, slot){
        const app = this;
        const visuals = app.getVisuals(simConfig);
        const plotParams = visuals[app.visual%visuals.length](simConfig);
        const config = simConfig.config;
        app.adjustTitle(
            plotParams,
            {
                prepend: config.titlePrepend,
                append:  config.titleAppend,
                replace: config.titleReplace
            }
        );          
        plotParams.unshift('resultPlot'+slot);
        Plotly.newPlot(...plotParams);
    }

    runSimulation(simConfig, slot){
        // set up and run new simulation

        const app = this;
        
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
                    ((i===app.visual)? ' selected="selected" ': ''),
                    '>',
                     (v.meta.title || v.meta.f),
                    '</option>'
                ].join('');
            }
            const visuals = app.getVisuals(simConfig);
            if (Array.isArray(visuals)){
                const vizchoices = visuals.map(toSelectBox).join("");
                $('#vizselect').html(vizchoices);
            } else {
                console.log("invalid visuals", visuals);
            }
            app.showSimulation(sim, slot);
            $('.spinning').removeClass('spinning');
            $('.postrun').removeClass('disabled');
            $('.postrun').prop('disabled',false);
        } 

        let mysim = new app.SMRS.Simulation(simConfig);

        app.plotParameters(mysim, slot);

        (mysim
         .run({update: onPeriod})
         .then(onDone)
         .catch((e)=>{ console.log(e); })
        );
        if (mysim.config.periods>500){
            delete mysim.logs.buyorder;
            delete mysim.logs.sellorder;
        }

        return mysim;
        
    }

    expand(how){
        const app = this;
        const xfactor = +$('#xfactor').val();
        const config = app.editor.getValue();
        if (xfactor){
            config.title += ' x'+xfactor;
            config.configurations.forEach((sim)=>{
                sim.buyerValues = how(sim.buyerValues, xfactor);
                sim.sellerCosts = how(sim.sellerCosts, xfactor);
                if (sim.numberOfBuyers>1) 
                    sim.numberOfBuyers  *= xfactor;
                if (sim.numberOfSellers>1)
                    sim.numberOfSellers *= xfactor;
            });
            app.editor.setValue(config);
            app.timeit(clone(config));
            app.refresh();
        }
    }

    /* public: app functions for outside code below this line */
    
    init(){
        const app = this;
        app.behavior.forEach((v)=>{
            let [jqSelector, appMethod, eventName] = v;
            if (typeof(app[appMethod])!=='function')
                throw new Error("Error initializing app behavior - method "+appMethod+" specified in event map for selector "+jqSelector+" does not exist");
            let selection = $(jqSelector);
            if (selection.length===0)
                throw new Error("Error initializing app behavior - selector "+jqSelector+" not found in app's web page");
            selection.on(eventName || 'click', ((evt)=>app[appMethod](evt && evt.target && evt.target.value)));
        });
        $('.postrun').prop('disabled',true);
        let editorElement = document.getElementById('editor');
        let editorOptions = {
            schema: app.editorConfigSchema,
            startval: app.editorStartValue
        };
        app.editor = new window.JSONEditor(editorElement, editorOptions);
        app.editor.on('change', ()=>{
            $('#runError').html("Click >Run to run the simulation and see the new results");
        });
        (app.DB.promiseList(app.saveList)
         .then((configs)=>{
             if (Array.isArray(configs) && (configs.length)){
                 app.savedConfigs = configs;
                 app.renderConfigSelector();
                 app.choose(0);
             }
         })
         .catch((e)=>{
             console.log("Error accessing simulation configuration database:"+e);
             app.DB = null;
         })
             );
    }

    estimateTime(){
        const app = this;
        app.timeit(app.editor.getValue());
    }

    refresh(){
        const app = this;
        const periodsEditor = app.periodsEditor;
        const editor = app.editor;
        if (periodsEditor){
            $('input.periods').val(periodsEditor.getValue());
            $('span.periods').text(periodsEditor.getValue());
            app.guessTime();
        }
        if (editor){
            const current = editor.getValue();
            app.showParameters(current);
            $('.configTitle').text(current.title);
            $('#xsimbs').html(
                "<tr>"+(current
                        .configurations
                        .map(
                            (config,j)=>{
                                const data = [j,config.numberOfBuyers,config.numberOfSellers];
                                return "<td>"+data.join("</td><td>")+"</td>";
                            })
                        .join('</tr><tr>')
                       )+"</tr>");
            app.plotParameters(new app.SMRS.Simulation((commonFrom(current)(current.configurations[0]))), "ScaleUp");
        }
    }

    interpolate(){
        const app = this;
        app.expand(
            (a,n)=>{
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
        const app = this;
        app.expand(
            (a,n)=>{
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
        const app = this;
        app.choose(app.chosenScenarioIndex);
    }

    moveToTrash(){
        const app = this;
        const {savedConfigs, chosenScenarioIndex, saveList, trashList } = app;
        (app.DB.promiseMoveItem(savedConfigs[chosenScenarioIndex], saveList, trashList)
         .then(()=>{
             savedConfigs.splice(chosenScenarioIndex,1);
             app.renderConfigSelector();
             app.choose(0);
         })
         .catch((e)=>{
             console.log(e);
         })
             );
    }

    run(){
        const app = this;
        $('#runError').html("");
        $('.postrun').removeClass("disabled");
        $('.postrun').addClass("disabled");
        $('.postrun').prop('disabled',true);
        $('.paramPlot').html("");
        $('.resultPlot').html("");
        $('#runButton .glyphicon').addClass("spinning");
        setTimeout(()=>{
            let config = app.editor.getValue();
            app.sims = (config
                         .configurations
                         .map(commonFrom(config))
                         .map((s,i)=>app.runSimulation(s,i))
                        );
        }, 200);
    }

    save(){
        const app = this;
        function doSave(){
            (app.DB.promiseSaveItem(app.editor.getValue(), app.saveList)
             .then(()=>(window.location.reload()))
            );
        }   
        if (app.savedConfigs.length && (app.savedConfigs[app.chosenScenarioIndex]) && (app.editor.getValue().title===app.savedConfigs[app.chosenScenarioIndex].title)){
            (app.DB.promiseRemoveItem(app.savedConfigs[app.chosenScenarioIndex], app.saveList)
             .then(doSave)
            );
        } else {
            doSave();
        }
    }

    setPeriods(n){
        const app = this;
        app.periodsEditor.setValue(Math.floor(n));
        app.refresh();
    }

    setVisualNumber(n){
        const app = this;
        app.visual = n;
        app.sims.forEach((s,j)=>app.showSimulation(s,j));
    }
    
    downloadData(){
        const app = this;
        $('#downloadButton').prop('disabled',true);
        $('#downloadButton').addClass("disabled");
        $('#downloadButton .glyphicon').addClass("spinning");
        setTimeout(()=>{
            saveZip({
                config: app.editor.getValue(),
                sims: app.sims,
                download: true
            }).then(()=>{
                $('#downloadButton .spinning').removeClass("spinning");
                $('#downloadButton').removeClass("disabled");
                $('#downloadButton').prop('disabled',false);
            });
        }, 200);
    }

    uploadData(){
        const app = this;
        $('#uploadButton').prop('disabled',true);
        $('#uploadButton').addClass('disabled');
        $('#uploadButton .glyphicon').addClass("spinning");
        setTimeout(()=>{
            saveZip({
                config: app.editor.getValue(), 
                sims: app.sims, 
                download: false})
                .then((zipBlob)=>{
                    (app.DB.promiseUpload(zipBlob)
                     .then(()=>{
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
        const app = this;
        $('#trashList').html("");
        (app.DB.promiseListRange(app.trashList,0,20)
         .then((items)=>{
             items.forEach((item)=>{
                 $('#trashList').append('<pre class="pre-scrollable trash-item">'+JSON.stringify(item,null,2)+'</pre>');
             });
             $('pre.trash-item').click(function(){

                 // this click function needs to be a full function with its own "this", not an anonymous ()=>{block}
                 
                 try {
                     const restoredScenario = JSON.parse($(this).text());
                     if ( (typeof(restoredScenario)==='object') && 
                          (typeof(restoredScenario.title)==='string') && 
                          (typeof(restoredScenario.common)==='object') && 
                          (Array.isArray(restoredScenario.configurations))
                        ){                        
                         app.editor.setValue(restoredScenario);
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
