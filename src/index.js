/* Copyright 2016, 2017 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software.  */

/* global Plotly:true, window:true, $:true */

/* eslint no-console: "off" */
/* eslint consistent-this: ["error", "app", "that"] */

import clone from "clone";
import saveZip from "single-market-robot-simulator-savezip";
import openZip from "single-market-robot-simulator-openzip";
import { makeClassicSimulations, myDateStamp } from "single-market-robot-simulator-study";

/**
 * Change Plotly plot title by prepending, appending, or replacing existing plot title
 * @param {Array<Object>} plotParams The plot to be modified -- a two element Array of [PlotlyTraces, PlotlyLayout]
 * @param {{prepend: ?string, append: ?string, replace: ?string}} modifier modifications to title
 */

export function adjustTitle(plotParams, modifier){
    const layout = plotParams[1];
    if (layout){
        if (modifier.replace && (modifier.replace.length>0))
            layout.title = modifier.replace;
        if (layout.title){
            if (modifier.prepend && (modifier.prepend.length>0))
                layout.title = modifier.prepend + layout.title;
            if (modifier.append && (modifier.append.length>0))
                layout.title += modifier.append;
        }
    }
}

/**
 * Use jQuery to manipulate DOM select element
 * @param {string} select - jQuery selector for select element, i.e. '#selector'
 * @param {Array<String>} options - array of strings for option labels (optional, but will blank previous options)
 * @param {number} selectedOption - the index of the selected option (optional)
 * @param {function(number)} onChange - called when user changes the selection (optional)
 */

function setSelectOptions({ select, options, selectedOption }){
    $(select+' > option').remove();
    if (Array.isArray(options))
        options.forEach(
            (o,n)=>{
                const s = (n===selectedOption)?'selected="selected"':'';
                $(select).append(`<option value="${n}" ${s}>${o}</option>`);
            }
        );
}

export class App {

    /**
     * Create App with given settings.  Many of these settings are required.
     * @param {Object} options
     * @param {Object} options.SMRS reference to either the imported module single-market-robot-simulator or a fork 
     * @param {Object} options.DB "database" such as single-market-robot-simulator-db-googledrive for storing simulation configurations
     * @param {Object} options.Visuals object describing visualizations of completed simulations and parameters, to be interpreted by single-market-robot-simulator-viz-plotly
     * @param {Object} options.editorConfigSchema JSON Schema object for json-editor relevant to user editing of simulation configurations
     * @param {Object} options.editorStartValue default simulation configuration for editing if none are defined
     * @param {Array<Array<string>>} options.behavior click and eventmap stored as Array of 2 or 3 element arrays [jqSelector, appMethodName, [ eventType = click ] ]
     */

    constructor(options){
        this.SMRS = options.SMRS;
        this.DB = options.DB;
        this.Visuals = options.Visuals;
        this.editorConfigSchema = options.editorConfigSchema;
        this.editorStartValue = options.editorStartValue;
        this.behavior = options.behavior;
        this.editor = 0;
        this.periodTimers  = [];
        this.study = 0;
        this.availableStudies = [];
        this.chosenStudyIndex = 0;
        this.sims = [];
        this.visualIndex = 0;
    }

    /**
     * Create new simulations for study 
     * @param {Object} studyConfig The study configuration
     * @param {Array<Object>} studyConfig.configurations An array of SMRS.Simulation() configurations, one for each independent simulation in a study.  
     * @param {Object} studyConfig.common Common single-market-robot-simulator configuration settings to be forced in all simulations in a study.
     * @return {Array<Object>} array of new SMRS.Simulation - each simulation will be initialized but not running
     */

    simulations(studyConfig){
        const app = this;
        return makeClassicSimulations(studyConfig, app.SMRS.Simulation);
    }

    /** 
     * Get current study configuration
     * @return {Object} study configuration
     */

    getStudyConfig(){
        const app = this;
        return app.study && app.study.config; 
    }

    /** 
     * Get current StudyFolder
     * @return {Object} an instance implementing the StudyFolder interface
     */

    getStudyFolder(){
        const app = this;
        return app.study && app.study.folder;
    }

    /**
     * Set current study 
     * @param {Object} studyConfig study configuraion
     */

    setStudy({config, folder}){
        const app = this;
        app.study = { config, folder };
        if (config){
            if (app.editor && app.initEditor){
                app.initEditor({
                    config: clone(config),
                    schema: app.editorConfigSchema
                });
            }
            $('#runError').html("Click >Run to run the simulation and see the new results");
            if (app.timeit) app.timeit(clone(config)); 
            if (app.refresh) app.refresh();
        }
        if (folder && app.renderPriorRunSelector){
            (folder
             .listFiles()
             .then((files)=>(files.filter((f)=>(f.mimeType==='application/zip'))))
             .then((files)=>{ app.study.zipFiles = files; })
             .then(()=>(app.renderPriorRunSelector()))
            );
        }
    }

    /**
     * Get number of periods for next run of study, looks in study.common.periods 
     * @return {number} number of periods
     */
    
    getPeriods(){
        const app = this;
        const config = app.getStudyConfig();
        return config && config.common.periods;
    }
    
    /**
     * Safely sets number of periods for the next run of the current study.  Affects config of cached app.study but not settings in editor.
     * @param {number} n number of periods
     */
    
    setPeriods(n){
        const app = this;
        const config = app.getStudyConfig();
        if (config && config.common && (+n>0) && (+n <= 200)) {
            config.common.periods = +n;
            app.refresh();
        }
    }
    
    /**
     * Plot the parameters of a simulation into a numbered slot in the UI 
     * Low level, for SMRS.Simulation --  For study level, see showParameters(conf)
     * @param {Object} sim - an instance of SMRS.Simulation
     * @param {number} slot - slot number, appended to "paramPlot" to get DOM id
     */

    plotParameters(sim, slot){
        const app = this;
        const plotlyParams = app.Visuals.params(sim);
        plotlyParams.unshift("paramPlot"+slot);
        Plotly.newPlot(...plotlyParams);
    }

    /**
     * Clears all class .paramPlot UI elements and plots all parameters of simulations in a study. Calls app.simulations and app.plotParameters
     * @param {Object} conf A study configuration compatible with app.simulations()
     */

    showParameters(conf){
        const app = this;
        $('.paramPlot').html("");
        (app.simulations(conf)
         .forEach((sim,slot)=>(app.plotParameters(sim,slot)))
        );
    }

    /**
     * Updates span.estimated-running-time with estimate of required running time for the current study, given the number of periods and the cached timing run, 
     * 
     */
    
    guessTime(){
        const app = this;
        const periodTimers = this.periodTimers;
        const periods = app.getPeriods();
        const l = periodTimers.length;
        let guess = 0;
        if (periods){
            if (l>2){ 
                guess = (periods*(periodTimers[l-1]-periodTimers[1])/(l-2))+periodTimers[1];
            } else if (l===2){
                guess = periods*periodTimers[1];
            }
            if (guess){
                const seconds = Math.round(guess/1000.0);
                const minutes = Math.ceil(seconds/60);
                $('span.estimated-running-time').text((minutes>1)? ('~'+minutes+'min'): ('~'+seconds+'sec'));
            } else {
                $('span.estimated-running-time').text("?");
            }
        }
    }

    /**
     * Eventually updates Array<number> app.periodTimers by running a study for up to 5 periods or 5 seconds to get period finishing times. Calls guessTIme to update span.estimated-running-time
     * @param {Object} studyConfig - A studyConfig as defined by app.simulations
     */
    
    timeit(studyConfig){
        const app = this;
        const t0 = Date.now();
        const periodTimers = app.periodTimers;
        periodTimers.length = 0;
        const studyConfig2p = clone(studyConfig);
        (Promise.all(
            (app
             .simulations(studyConfig2p)
             .map(
                 (s)=>(s.run({
                     update:(sim)=>{
                         const elapsed = Date.now()-t0;
                         periodTimers[sim.period] = elapsed;
                         // hack to end simulations if over 5 sec or 5 periods
                         if ((elapsed>5000) || (sim.period>5))
                             sim.config.periods = sim.period;
                         return sim;
                         
                     }
                 })
                      )
             )
            )
        ).then(
            ()=>{
                app.guessTime();
            }
        )
         .catch((e)=>(console.log(e)))
             );
    }

    /**
     * Eventually choose study n from Array app.availableStudies if possible, get details from DB, send it to app.editor and app.periodsEditor if defined, then app.timeit, and then refresh UI with app.refresh
     * @param {number} n index of chosen study in app.availableStudies[]
     */
    
    choose(n){
        const app = this;
        if (Array.isArray(app.availableStudyFolders)){
            app.chosenStudyIndex = Math.max(0, Math.min(Math.floor(n),app.availableStudyFolders.length-1));
            app.availableStudyFolders[app.chosenStudyIndex].getConfig().then((choice)=>(app.setStudy(choice)));
        }
    }

    chooseRun(n){
	const app = this;
        alert("To Be Implemented...you chose "+n+" "+app.study.zipFiles[+n].name); // eslint-disable-line no-alert
    }
    
    /**
     * Render #selector if it exists, by erasing all options and reading each study .title from app.availableStudies  You should define an empty select element in index.html with id "selector"
     */

    renderConfigSelector(){
        const app = this;
        const select = '#selector';
        const options = (
            app.availableStudyFolders &&
                app.availableStudyFolders.map((f)=>(f.name))
        ) || []; // fails thru to empty set of options
        const selectedOption = 0;
        setSelectOptions({ select, options, selectedOption });
    }

    /**
     * Render #priorRunSelector if it exists
     *
     */

    renderPriorRunSelector(){
        const app = this;
        const select = '#priorRunSelector';
        const options = (
            app.study &&
                app.study.zipFiles &&
                app.study.zipFiles.map((f)=>(f.name+': '+((Number(f.size)/1e6).toString().substr(0,3))+' MB'))
        ) || []; // fails thru to empty set of options
        const selectedOption = 0;
        setSelectOptions({ select, options, selectedOption });
    }

    
    /**
     * get array of visualizations appropriate to the number of periods in the current study
     * if periods<=50, returns app.Visuals.small;  if 50<periods<=500, returns app.Visuals.medium; if periods>500, returns app.Visuals.large
     * @return {Array<function>} array of visualization functions generated from single-market-robot-simulator-viz-plotly
     */
    
    getVisuals(){
        const app = this;
        let visuals = [];
        const periods = app.getPeriods();
        if (periods<=50)
            visuals = app.Visuals.small;
        else if (periods<=500)
            visuals = app.Visuals.medium;
        else
            visuals = app.Visuals.large;
        return visuals;
    }


    /**
     * plot simulation data plot into "slot" at div with id resultPlot+slot using chosen visual; adjust plot title per sim.config.title{append,prepend,replace}
     * @param {Object} simConfig An instance of SMRS.Simulation with finished simulation data in the logs
     * @param {number} slot 
     */

    showSimulation(simConfig, slot){
        const app = this;
        const visuals = app.getVisuals();
        const plotParams = visuals[app.visualIndex%visuals.length](simConfig);
        const config = simConfig.config;
        adjustTitle(
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

    /** 
     * Render visualization options for current app.study into DOM select existing at id #vizselect 
     */
    
    renderVisualSelector(){
        const app = this;
        const visuals = app.getVisuals();
        const select = '#vizselect';
        const options = (visuals && (visuals.map((v)=>(v.meta.title || v.meta.f)))) || [];
        const selectedOption = app.visualIndex;
        setSelectOptions({ select, options, selectedOption });
    }

    /**
     * show progress message in resultPlot slot with h1 header tag; blank message clears (no h1)
     * 
     * @param {string} message text to show as heading in div resultPlot+slot
     * @param {number} slot Location for showing message
     */

    progress(message, slot){
        const hmsg = (message && (message.length>0))? ("<h1>"+message+"</h1>") : '';
        $('#resultPlot'+slot).html(hmsg);
    }

    /**
     * asynchronously start running a simulation and when done show its plots in a slot.  stops spinning run animation when done. Deletes logs buyorder,sellorder if periods>500 to prevent out-of-memory.
     * @param {Object} simConfig An initialized SMRS.Simulation
     * @param {number} slot A slot number.  Plots appear in div with id resultPlot+slot and paramPlot+slot
     * @return {Object} running SMRS.Simulations 
     */


    runSimulation(simConfig, slot){
        // set up and run simulation

        const app = this;
        
        function onPeriod(sim){
            if (sim.period<sim.config.periods){
                app.progress(Math.round(100*sim.period/sim.config.periods)+"% complete", slot);
            } else {
                app.progress('', slot);
            }
            return sim;
        }

        function uiDone(){
            $('.spinning').removeClass('spinning'); // this is perhaps needessly done multiple times
            $('.postrun').removeClass('disabled');  // same here
            $('.postrun').prop('disabled',false);   // and here
        }

        function onDone(sim){
            app.showSimulation(sim, slot);
            uiDone();
        } 

        let mysim = simConfig;  // this line used to call new Simulation based on simConfig... but that is done in .simulations already 

        app.plotParameters(mysim, slot);

        (mysim
         .run({update: onPeriod})
         .then(onDone)
         .catch((e)=>{ 
             console.log(e);
             app.progress('<span class="error">'+e+'</span>', slot);
             uiDone();
         })
        );
        if (mysim.config.periods>500){
            delete mysim.logs.buyorder;
            delete mysim.logs.sellorder;
            delete mysim.logs.rejectbuyorder;
            delete mysim.logs.rejectsellorder;
        }

        return mysim;
        
    }

    /**
     * Fetches current study and modifies it for expansion.
     * If the number of buyers or sellers is 1, that number is unchanged.  Otherwise, multiplies the number of buyers and sellers by xfactor.
     * .buyerValues and .sellerCosts arrays in the current study are updated using supplied function how.  " x"+factor is appended to study title. 
     * @param {function(valuesOrCosts: number[], expansionFactor: number):number[]} how Function specifying how to modify the values and costs
     */
    
    expand(how){
        const app = this;
        const xfactor = +$('#xfactor').val();
        const config = app.getStudyConfig();
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
            app.setStudy({config}); 
        }
    }

    /** Perform additional required initialization, NOT called by constructor. Sets up (1) app.behavior with jQuery.on; (2) JSON Editor in div with id editor; (3) begins reading database for saveList 
     */
    
    init(){
        const app = this;
        app.initBehavior();
        if (app.editorStartValue && app.editorConfigSchema)
            app.initEditor({
                config: app.editorStartValue,
                schema: app.editorConfigSchema 
            });
        app.initDB();
    }

    initBehavior(){
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
    }
                   
    initEditor({config, schema}){
        const app = this;
        if (typeof(config)!=='object')
            throw new Error("config must be an object, instead got: "+typeof(config));
        if (typeof(schema)!=='object')
            throw new Error("schema must be an object, instead got: "+typeof(schema));
        let editorElement = document.getElementById('editor');
        if (editorElement && window.JSONEditor ){
            while (editorElement.firstChild){
                editorElement.removeChild(editorElement.firstChild);
            }
            let editorOptions = {
                schema,
                startval: config
            };
            app.editor = new window.JSONEditor(editorElement, editorOptions);
        }
    }

    initDB(){
        const app = this;
        if (app.DB)
            (app.DB.listStudyFolders({trashed:false})
             .then((items)=>{
                 if (Array.isArray(items) && (items.length)){
                     app.availableStudyFolders = items;
                     app.renderConfigSelector();
                     app.choose(0);
                 } 
             })
             .catch((e)=>{
                 console.log("app-framework initDB() Error accessing simulation configuration database:"+e);
             })
                 );
    }
        
    /**
     * updates running time estimate in span.estimated-running-time , using the current study
     */
    
    estimateTime(){
        const app = this;
        app.timeit(clone(app.getStudyConfig()));
    }
    
    /**
     * refreshes a number of UI elements
     */
    
    refresh(){
        const app = this;
        const study = clone(app.getStudyConfig());
        const folder = clone(app.getStudyFolder());
        const periods = app.getPeriods();
        if (study){
            app.guessTime();
            app.showParameters(study);
            $('.configTitle').text(folder.name);
            $('.currentStudyFolderModifiedTime').text(new Date(folder.modifiedTime).toString());
            $('.currentStudyFolderDescription').text(folder.description);
            if (periods){
                $('input.periods').val(periods);
                $('span.periods').text(periods);
            }
            const sims = app.simulations(study);
            $('#xsimbs').html(
                "<tr>"+(sims
                        .map(
                            (sim,j)=>{
                                const data = [j,sim.numberOfBuyers,sim.numberOfSellers];
                                return "<td>"+data.join("</td><td>")+"</td>";
                            })
                        .join('</tr><tr>')
                       )+"</tr>");
            app.plotParameters(sims[0], "ScaleUp");
        }
    }

    /**
     * expands the current study by creating new values and costs by interpolation
     */

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

    /**
     * expands the current study by duplicating unit costs and values 
     */

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

    /**
     * abandon edits to the current study by refreshing the UI and editor from the cache
     */

    undo(){
        const app = this;
        app.choose(app.chosenStudyIndex);
    }

    /**
     * move the current study to the trash list
     */

    moveToTrash(){
        const app = this;
        const { availableStudyFolders, chosenStudyIndex } = app;
        if (app.DB){
            (availableStudyFolders[chosenStudyIndex].trash()
             .then(()=>{
                 availableStudyFolders.splice(chosenStudyIndex,1);
                 app.renderConfigSelector();
                 app.choose(0);
             })
             .catch((e)=>{
                 console.log(e);
             })
                 );
        }
    }

    /**
     * run the current study and display a visualization 
     */

    run(){
        const app = this;
        $('#runError').html("");
        $('.postrun').removeClass("disabled");
        $('.postrun').addClass("disabled");
        $('.postrun').prop('disabled',true);
        $('.paramPlot').html("");
        $('.resultPlot').html("");
        $('#runButton .glyphicon').addClass("spinning");
        app.renderVisualSelector();
        setTimeout(()=>{
            const studyConfig = clone(app.getStudyConfig());
            app.sims = (app.simulations(studyConfig)
                         .map((s,i)=>app.runSimulation(s,i))
                        );
        }, 200);
    }

    /**
     * stop a run of the current study
     * should have no effect unless study is running
     */

    stop(){
        const app = this;
        // trigger normal completion
        app.sims.forEach((sim)=>{ sim.config.periods = sim.period; });
    }

    /**
     * tries to save the current study from the editor. try to save in place if name is unchanged.  If new name, create a new StudyFolder and save.  Reload the browser after saving.
     *
     * Previous behavior was to Save to the top of the app DB saveList, if the title is changed.  Otherwise, in place (remove/save).  
     * Finally, reload the browser to give the app a clean restart.
     * 
     */
    
    save(){
        const app = this;
        const myStudyFolder = app.getStudyFolder();
        const config = app.editor.getValue();

        /*
         * if name is unchanged, try to save in place 
         *
         */
        
        if (myStudyFolder && (config.name === myStudyFolder.name))
            return (
                myStudyFolder
                    .setConfig({config})
                    .then(()=>(window.location.reload()))
            );

        /*
         * name is different, or no myStudyFolder, so create a new Study Folder then save
         *
         */

        return (app.DB.createStudyFolder({name: config.name})
                .then((folder)=>(folder.setConfig({config})))
                .then(()=>(window.location.reload()))
               );
        
    }

    /**
     * Select a visualization from the visualization list and refresh the UI.
     * @param {number} n Visualization index in Visuals array
     */

    setVisualNumber(n){
        const app = this;
        app.visualIndex = n;
        app.sims.forEach((s,j)=>app.showSimulation(s,j));
    }

    /**
     * Create  .zip file containing study and simulation configurations and data and give it to the user
     */
    
    downloadData(){
        const app = this;
        $('#downloadButton').prop('disabled',true);
        $('#downloadButton').addClass("disabled");
        $('#downloadButton .glyphicon').addClass("spinning");
        setTimeout(()=>{
            saveZip({
                config: clone(app.getStudyConfig()),
                sims: app.sims,
                download: true
            }).then(()=>{
                $('#downloadButton .spinning').removeClass("spinning");
                $('#downloadButton').removeClass("disabled");
                $('#downloadButton').prop('disabled',false);
            });
        }, 200);
    }

    /**
     * Create .zip file containing study and simulation configurations and data and upload it to the cloud
     */

    uploadData(){
        const app = this;
        const study = clone(app.getStudyConfig());
        const folder = app.getStudyFolder();
        if (folder){
            $('#uploadButton').prop('disabled',true);
            $('#uploadButton').addClass('disabled');
            $('#uploadButton .glyphicon').addClass("spinning");
            setTimeout(()=>{
                saveZip({
                    config: study, 
                    sims: app.sims, 
                    download: false})
                    .then((zipBlob)=>{
                        (folder.upload({
                            name: myDateStamp(),
                            blob: zipBlob,
                            onProgress: (x)=>(console.log(x))
                        }).then(()=>{
                            $('#uploadButton .spinning').removeClass("spinning");
                            $('#uploadButton').removeClass("disabled");
                            $('#uploadButton').prop('disabled',false);
                        })
                         .catch((e)=>(console.log(e)))
                             );
                    });
            }, 200);
        }
    }

    /**
     * open a .zip file previously generated by app.downloadData() and load data and configurations as current study.  Check validity.  Hackish in places.
     */

    openZipFile(){
        const app = this;
        function showProgress(message){
            $('div.openzip-progress').append("<p>"+message+"</p>");
        }
        function showError(e){
            showProgress('<span class="red"> ERROR: '+e+'</span>');
        }
        function restoreUI(){
            ($('button.openzip-button')
             .removeClass('diosabled')
             .prop('disabled',false)
            );
        }
        function showSuccess(){
            showProgress('<span class="green"> SUCCESS.  The data in the zip file has been loaded.  You may click the "App" or "Edit" tabs now.  </span>');
            restoreUI();
        }
        function showFailure(e){
            if (e) showError(e);
            showProgress('<span class="red"> FAILURE. I could not use that zip file.  You may try again, choosing a different zip file');
            restoreUI();
        }
        function hasMissing(a){
            // JavaScript ignores missing elements in higher order functional operations like .some, and even .indexOf(), so we have to check this with an explicit loop
            if (Array.isArray(a)){ 
                let i=0, l = a.length, u = false;
                while ((i<l) && (!u)){
                    u = (typeof(a[i])==="undefined");
                    i++;
                }
                return u;
            }
        }
        $('div.openzip-progress').html('');
        ($('button.openzip-button')
         .prop('disabled',true)
         .addClass("disabled")
        );  
        setTimeout(()=>{
            const zipPromise = new Promise(function(resolve, reject){
                const zipfile = $(".openzip-file")[0].files[0];
                const reader = new FileReader();
                reader.onload = function(event){ resolve(event.target.result); };
                reader.onerror = function(e){ reject(e); };
                reader.readAsArrayBuffer(zipfile);
            });
            (openZip(zipPromise, app.SMRS, showProgress)
             .then(function(data){
                 if (!(data.config)) throw new Error("No master configuration file (config.json) was found in zip file.  Maybe this zip file is unrelated.");
                 if (!(data.sims.length)) throw new Error("No simulation configuration files (sim.json) in the zip file");
                 if ( (Array.isArray(data.config.configurations)) &&  (data.config.configurations.length !== data.sims.length) )
                     throw new Error("Missing files.  the number of configurations in config.json does not match the number of simulation directories and files I found");
                 if (hasMissing(data.sims))
                     throw new Error("It seems a folder has been deleted from the zip file or I could not read it. ");
                 return data;
             })
             .then(function(data){
                 app.sims = data.sims;
                 app.availableStudies = [data.config];  // deletes local cache of DB - pulled studiess. app only sees the loaded file.
                 app.renderConfigSelector(); // app only shows one choice in config selector -- can reload to get back to imported list
                 app.choose(0); // configure app to use the loaded file as the current study
                 app.renderVisualSelector();  // can render the list of available visualization only once the study is chosen as current study           
             })
             .then(showSuccess, showFailure)
            );
        }, 200);
    }

    /**
     * render into the div with id "trashList" the study folders found in Trash. Trash items can be clicked to restore to editor.
     */

    renderTrash(){
        const app = this;
        const StudyFolder = app.DB.studyFolder;
        $('#trashList').html("");
        if (app.DB){
            (app.DB.listStudyFolders({trashed:true})
             .then((items)=>{
                 items.forEach((item)=>{
                     $('#trashList').append('<pre class="pre-scrollable trash-item">'+JSON.stringify(item,null,2)+'</pre>');
                 });
                 $('pre.trash-item').click(function(){
                     
                     // this click function needs to be a full function with its own "this", not an anonymous ()=>{block}

                     const folder = new StudyFolder(JSON.parse($(this).text()));
                     if ((typeof(folder)==='object') && (folder.id) && (folder.name)) {
                         (folder.untrash()
                          .then(()=>(folder.getConfig()))
                          .then((response)=>(app.setStudy(response)))
                          .then(()=>{ $('#editLink').click(); })
                          .catch((e)=>(console.log(e)))
                         );
                     }
                 });
             })
            );          
        }
    }
}
