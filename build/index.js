"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.App = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /* Copyright 2016, 2017 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software.  */

/* global Plotly:true, window:true, $:true */

/* eslint no-console: "off" */
/* eslint consistent-this: ["error", "app", "that"] */

exports.adjustTitle = adjustTitle;

var _clone = require("clone");

var _clone2 = _interopRequireDefault(_clone);

var _singleMarketRobotSimulatorSavezip = require("single-market-robot-simulator-savezip");

var _singleMarketRobotSimulatorSavezip2 = _interopRequireDefault(_singleMarketRobotSimulatorSavezip);

var _singleMarketRobotSimulatorOpenzip = require("single-market-robot-simulator-openzip");

var _singleMarketRobotSimulatorOpenzip2 = _interopRequireDefault(_singleMarketRobotSimulatorOpenzip);

var _singleMarketRobotSimulatorStudy = require("single-market-robot-simulator-study");

var Study = _interopRequireWildcard(_singleMarketRobotSimulatorStudy);

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

/**
 * Change Plotly plot title by prepending, appending, or replacing existing plot title
 * @param {Array<Object>} plotParams The plot to be modified -- a two element Array of [PlotlyTraces, PlotlyLayout]
 * @param {{prepend: ?string, append: ?string, replace: ?string}} modifier modifications to title
 */

function adjustTitle(plotParams, modifier) {
    var layout = plotParams[1];
    if (layout) {
        if (modifier.replace && modifier.replace.length > 0) layout.title = modifier.replace;
        if (layout.title) {
            if (modifier.prepend && modifier.prepend.length > 0) layout.title = modifier.prepend + layout.title;
            if (modifier.append && modifier.append.length > 0) layout.title += modifier.append;
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

function setSelectOptions(_ref) {
    var select = _ref.select,
        options = _ref.options,
        selectedOption = _ref.selectedOption;

    $(select + ' > option').remove();
    if (Array.isArray(options)) options.forEach(function (o, n) {
        var s = n === selectedOption ? 'selected="selected"' : '';
        $(select).append("<option value=\"" + n + "\" " + s + ">" + o + "</option>");
    });
}

var App = exports.App = function () {

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

    function App(options) {
        _classCallCheck(this, App);

        this.SMRS = options.SMRS;
        this.DB = options.DB;
        this.Visuals = options.Visuals;
        this.editorConfigSchema = options.editorConfigSchema;
        this.editorStartValue = options.editorStartValue;
        this.behavior = options.behavior;
        this.editor = 0;
        this.periodTimers = [];
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

    _createClass(App, [{
        key: "simulations",
        value: function simulations(studyConfig, runnable) {
            function facadeSimulation(props) {
                this.config = props;
            }
            var app = this;
            return Study.makeClassicSimulations(studyConfig, runnable ? app.SMRS.Simulation : facadeSimulation);
        }

        /** 
         * Get current study configuration
         * @return {Object} study configuration
         */

    }, {
        key: "getStudyConfig",
        value: function getStudyConfig() {
            var app = this;
            return app.study && app.study.config;
        }

        /** 
         * Get current StudyFolder
         * @return {Object} an instance implementing the StudyFolder interface
         */

    }, {
        key: "getStudyFolder",
        value: function getStudyFolder() {
            var app = this;
            return app.study && app.study.folder;
        }

        /**
         * Set current study 
         * @param {Object} studyConfig study configuraion
         */

    }, {
        key: "setStudy",
        value: function setStudy(_ref2) {
            var config = _ref2.config,
                folder = _ref2.folder;

            var app = this;
            function updateSavedListTask() {
                folder.listFiles().then(function (files) {
                    return files.filter(function (f) {
                        return f.mimeType === 'application/zip';
                    });
                }).then(function (files) {
                    app.study.zipFiles = files;
                }).then(function () {
                    return app.renderPriorRunSelector();
                });
            }
            function updateEditorTask() {
                if (app.editor && app.initEditor) {
                    app.initEditor({
                        config: (0, _clone2.default)(config),
                        schema: app.editorConfigSchema
                    });
                }
            }
            var t0 = Date.now();
            console.log("called setStudy at " + t0);
            app.study = { config: config, folder: folder };
            if (folder && app.renderPriorRunSelector) {
                if (folder.name) $('.onSetStudyFolderNameUpdateValue').prop('value', folder.name);else $('.onSetStudyFolderNameUpdateValue').prop('value', '');
                if (folder.id) $('.onSetStudyFolderIdUpdateValue').prop('value', folder.id);else $('.onSetStudyFolderIdUpdateValue').prop('value', '');
                if (typeof folder.listFiles === 'function') {
                    setTimeout(updateSavedListTask, 200);
                }
            } else {
                $('.onSetStudyFolderNameUpdateValue').prop('value', '');
                $('.onSetStudyFolderIdUpdateValue').prop('value', '');
            }
            var configTitle = folder && folder.name || config && config.name || 'UNTITLED';
            $('.configTitle').text(configTitle);
            var modifiedTime = folder && folder.modifiedTime;
            var modifiedTimeStr = modifiedTime ? new Date(modifiedTime).toUTCString() : '';
            $('.currentStudyFolderModifiedTime').text(modifiedTimeStr);
            var description = folder && folder.description || config && config.description || '';
            $('.currentStudyFolderDescription').text(description);
            if (config) {
                setTimeout(updateEditorTask, 200);
                $('#runError').html("Click >Run to run the simulation and see the new results");
                if (app.timeit) app.timeit((0, _clone2.default)(config));
                if (config && config.configurations && config.configurations.length <= 4) app.refresh();
            }
            var elapsed = Date.now() - t0;
            console.log("finish setConfig, elapsed = " + elapsed);
        }

        /**
         * Get number of periods for next run of study, looks in study.common.periods 
         * @return {number} number of periods
         */

    }, {
        key: "getPeriods",
        value: function getPeriods() {
            var app = this;
            var config = app.getStudyConfig();
            return config && config.common.periods;
        }

        /**
         * Safely sets number of periods for the next run of the current study.  Affects config of cached app.study but not settings in editor.
         * @param {number} n number of periods
         */

    }, {
        key: "setPeriods",
        value: function setPeriods(n) {
            var app = this;
            var config = app.getStudyConfig();
            if (config && config.common && +n > 0) {
                config.common.periods = +n;
                app.showPeriods(n);
                app.timeit((0, _clone2.default)(config));
            }
        }

        /**
         * Plot the parameters of a simulation into a numbered slot in the UI 
         * Low level, for SMRS.Simulation --  For study level, see showParameters(conf)
         * @param {Object} sim - an instance of SMRS.Simulation
         * @param {number} slot - slot number, appended to "paramPlot" to get DOM id
         */

    }, {
        key: "plotParameters",
        value: function plotParameters(sim, slot) {
            var _Plotly;

            var app = this;
            var plotlyParams = app.Visuals.params(sim);
            plotlyParams.unshift("paramPlot" + slot);
            (_Plotly = Plotly).newPlot.apply(_Plotly, _toConsumableArray(plotlyParams));
        }

        /**
         * Clears all class .paramPlot UI elements and plots all parameters of simulations in a study. Calls app.simulations and app.plotParameters.
         * completes updates to UI asynchronously, with 100ms pause between plots.
         * @param {Object} conf A study configuration compatible with app.simulations()
         */

    }, {
        key: "showParameters",
        value: function showParameters(conf) {
            var app = this;
            $('.paramPlot').html("");
            var sims = app.simulations(conf);
            var l = sims.length;
            var i = 0;
            function loop() {
                app.plotParameters(sims[i], i);
                i += 1;
                if (i < l) {
                    setTimeout(loop, 100);
                }
            }
            setTimeout(loop, 100);
        }

        /**
         * Updates span.estimated-running-time with estimate of required running time for the current study, given the number of periods and the cached timing run, 
         * 
         */

    }, {
        key: "guessTime",
        value: function guessTime() {
            var app = this;
            var periodTimers = app.periodTimers;
            var periods = app.getPeriods();
            var configurations = app.getStudyConfig().configurations.length;
            var l = periodTimers.length;
            var guess = 0;
            if (periods) {
                if (l > 2) {
                    guess = periods * configurations * (periodTimers[l - 1] - periodTimers[1]) / (l - 2) + periodTimers[1];
                } else if (l === 2) {
                    guess = periods * configurations * periodTimers[1];
                }
                if (guess) {
                    var seconds = Math.round(guess / 1000.0);
                    var minutes = Math.ceil(seconds / 60);
                    $('span.estimated-running-time').text(minutes > 1 ? '~' + minutes + 'min' : '~' + seconds + 'sec');
                } else {
                    $('span.estimated-running-time').text("?");
                }
            }
        }

        /**
         * Eventually updates Array<number> app.periodTimers by running a study for up to 5 periods or 5 seconds to get period finishing times. Calls guessTIme to update span.estimated-running-time
         * @param {Object} studyConfig - A studyConfig as defined by app.simulations
         */

    }, {
        key: "timeit",
        value: function timeit(studyConfig) {
            var app = this;
            // delay running timeit by 1 sec as seems to be blocking screen refresh of description, etc.
            setTimeout(function () {
                var t0 = Date.now();
                var periodTimers = app.periodTimers;
                periodTimers.length = 0;
                var sims = app.simulations(studyConfig);
                var randomSim = new app.SMRS.Simulation(sims[Math.floor(Math.random() * sims.length)].config);
                randomSim.run({
                    update: function update(sim) {
                        var elapsed = Date.now() - t0;
                        periodTimers[sim.period] = elapsed;
                        // hack to end simulations if over 2 sec or 5 periods
                        if (elapsed > 2000 || sim.period > 5) sim.config.periods = sim.period;
                        return sim;
                    }
                }).then(function () {
                    app.guessTime();
                }).catch(function (e) {
                    return console.log(e);
                });
            }, 1000);
        }

        /**
         * Eventually choose study n from Array app.availableStudies if possible, get details from DB, send it to app.editor and app.periodsEditor if defined, then app.timeit, and then refresh UI with app.refresh
         * @param {number} n index of chosen study in app.availableStudies[]
         */

    }, {
        key: "choose",
        value: function choose(n) {
            var app = this;
            console.log("chose " + n + " at " + Date.now());
            if (Array.isArray(app.availableStudyFolders)) {
                app.chosenStudyIndex = Math.max(0, Math.min(Math.floor(n), app.availableStudyFolders.length - 1));
                app.availableStudyFolders[app.chosenStudyIndex].getConfig().then(function (choice) {
                    return app.setStudy(choice);
                });
            }
        }
    }, {
        key: "chooseRun",
        value: function chooseRun(n) {
            var app = this;
            app.chosenRun = +n;
        }
    }, {
        key: "fetchChosenRun",
        value: function fetchChosenRun() {
            var app = this;
            app.openZipFile(app.chosenRun);
        }

        /**
         * Render #selector if it exists, by erasing all options and reading each study .title from app.availableStudies  You should define an empty select element in index.html with id "selector"
         */

    }, {
        key: "renderConfigSelector",
        value: function renderConfigSelector() {
            var app = this;
            var select = '#selector';
            var options = app.availableStudyFolders && app.availableStudyFolders.map(function (f) {
                return f.name;
            }) || []; // fails thru to empty set of options
            var selectedOption = 0;
            setSelectOptions({ select: select, options: options, selectedOption: selectedOption });
        }

        /**
         * Render #priorRunSelector if it exists
         *
         */

    }, {
        key: "renderPriorRunSelector",
        value: function renderPriorRunSelector() {
            var app = this;
            var select = '#priorRunSelector';
            var options = app.study && app.study.zipFiles && app.study.zipFiles.map(function (f) {
                return f.name + ': ' + (Number(f.size) / 1e6).toString().substr(0, 3) + ' MB';
            }) || []; // fails thru to empty set of options
            var selectedOption = 0;
            app.chosenRun = 0;
            setSelectOptions({ select: select, options: options, selectedOption: selectedOption });
        }

        /**
         * get array of visualizations appropriate to the number of periods in the current study
         * if periods<=50, returns app.Visuals.small;  if 50<periods<=500, returns app.Visuals.medium; if periods>500, returns app.Visuals.large
         * @return {Array<function>} array of visualization functions generated from single-market-robot-simulator-viz-plotly
         */

    }, {
        key: "getVisuals",
        value: function getVisuals() {
            var app = this;
            var visuals = [];
            var periods = app.getPeriods();
            if (periods <= 50) visuals = app.Visuals.small;else if (periods <= 500) visuals = app.Visuals.medium;else visuals = app.Visuals.large;
            return visuals;
        }

        /**
         * plot simulation data plot into "slot" at div with id resultPlot+slot using chosen visual; adjust plot title per sim.config.title{append,prepend,replace}
         * @param {Object} simConfig An instance of SMRS.Simulation with finished simulation data in the logs
         * @param {number} slot 
         */

    }, {
        key: "showSimulation",
        value: function showSimulation(simConfig, slot) {
            var _Plotly2;

            var app = this;
            var visuals = app.getVisuals();
            var plotParams = visuals[app.visualIndex % visuals.length](simConfig);
            var config = simConfig.config;
            adjustTitle(plotParams, {
                prepend: config.titlePrepend,
                append: config.titleAppend,
                replace: config.titleReplace
            });
            plotParams.unshift('resultPlot' + slot);
            (_Plotly2 = Plotly).newPlot.apply(_Plotly2, _toConsumableArray(plotParams));
        }

        /** 
         * Render visualization options for current app.study into DOM select existing at id #vizselect 
         */

    }, {
        key: "renderVisualSelector",
        value: function renderVisualSelector() {
            var app = this;
            var visuals = app.getVisuals();
            var select = '#vizselect';
            var options = visuals && visuals.map(function (v) {
                return v.meta.title || v.meta.f;
            }) || [];
            var selectedOption = app.visualIndex;
            setSelectOptions({ select: select, options: options, selectedOption: selectedOption });
        }

        /**
         * show progress message in resultPlot slot with h1 header tag; blank message clears (no h1)
         * 
         * @param {string} message text to show as heading in div resultPlot+slot
         * @param {number} slot Location for showing message
         */

    }, {
        key: "progress",
        value: function progress(message, slot) {
            var hmsg = message && message.length > 0 ? "<h1>" + message + "</h1>" : '';
            $('#resultPlot' + slot).html(hmsg);
        }

        /**
         * asynchronously start running a simulation and when done show its plots in a slot.  stops spinning run animation when done. Deletes logs buyorder,sellorder if periods>500 to prevent out-of-memory.
         * @param {Object} simConfig An initialized SMRS.Simulation
         * @param {number} slot A slot number.  Plots appear in div with id resultPlot+slot and paramPlot+slot
         * @return {Object} running SMRS.Simulations 
         */

    }, {
        key: "runSimulation",
        value: function runSimulation(simConfig, slot) {
            // set up and run simulation

            var app = this;

            function onPeriod(sim) {
                if (sim.period < sim.config.periods) {
                    app.progress(Math.round(100 * sim.period / sim.config.periods) + "% complete", slot);
                } else {
                    app.progress('', slot);
                }
                return sim;
            }

            function uiDone() {
                $('.spinning').removeClass('spinning'); // this is perhaps needessly done multiple times
                $('.postrun').removeClass('disabled'); // same here
                $('.postrun').prop('disabled', false); // and here
            }

            function onDone(sim) {
                app.showSimulation(sim, slot);
                uiDone();
            }

            var mysim = simConfig; // this line used to call new Simulation based on simConfig... but that is done in .simulations already 

            app.plotParameters(mysim, slot);

            mysim.run({ update: onPeriod }).then(onDone).catch(function (e) {
                console.log(e);
                app.progress('<span class="error">' + e + '</span>', slot);
                uiDone();
            });
            if (mysim.config.periods > 500) {
                delete mysim.logs.buyorder;
                delete mysim.logs.sellorder;
                delete mysim.logs.rejectbuyorder;
                delete mysim.logs.rejectsellorder;
            }

            return mysim;
        }

        /**
         *  Expand the number of buyers and sellers (unless the number is 1, which is preserved), expanding the array(s) of buyerValues and sellerCosts via the how function 
         *   how should be callable like this how(buyerValueorSellerCostArray, xfactor) and return a new array of values or costs
         */

    }, {
        key: "expand",
        value: function expand(how) {
            var app = this;
            var xfactor = +$('#xfactor').val();
            var config = app.getStudyConfig();
            app.setStudy({ config: Study.expand(config, xfactor, how) });
        }

        /** Perform additional required initialization, NOT called by constructor. Sets up (1) app.behavior with jQuery.on; (2) JSON Editor in div with id editor; (3) begins reading database for saveList 
         */

    }, {
        key: "init",
        value: function init() {
            var app = this;
            app.initBehavior();
            if (app.editorStartValue && app.editorConfigSchema) app.initEditor({
                config: app.editorStartValue,
                schema: app.editorConfigSchema
            });
            app.initDB();
        }
    }, {
        key: "initBehavior",
        value: function initBehavior() {
            var app = this;
            app.behavior.forEach(function (v) {
                var _v = _slicedToArray(v, 3),
                    jqSelector = _v[0],
                    appMethod = _v[1],
                    eventName = _v[2];

                if (typeof app[appMethod] !== 'function') throw new Error("Error initializing app behavior - method " + appMethod + " specified in event map for selector " + jqSelector + " does not exist");
                var selection = $(jqSelector);
                if (selection.length === 0) throw new Error("Error initializing app behavior - selector " + jqSelector + " not found in app's web page");
                selection.on(eventName || 'click', function (evt) {
                    return app[appMethod](evt && evt.target && evt.target.value);
                });
            });
            $('.postrun').prop('disabled', true);
        }
    }, {
        key: "createJSONEditor",
        value: function createJSONEditor(_ref3) {
            var div = _ref3.div,
                clear = _ref3.clear,
                options = _ref3.options;

            var editorElement = document.getElementById(div);
            if (editorElement && window.JSONEditor) {
                if (clear) {
                    while (editorElement.firstChild) {
                        editorElement.removeChild(editorElement.firstChild);
                    }
                }
                return new window.JSONEditor(editorElement, options);
            }
        }
    }, {
        key: "initEditor",
        value: function initEditor(_ref4) {
            var config = _ref4.config,
                schema = _ref4.schema;

            var app = this;
            if ((typeof config === "undefined" ? "undefined" : _typeof(config)) !== 'object') throw new Error("config must be an object, instead got: " + (typeof config === "undefined" ? "undefined" : _typeof(config)));
            if ((typeof schema === "undefined" ? "undefined" : _typeof(schema)) !== 'object') throw new Error("schema must be an object, instead got: " + (typeof schema === "undefined" ? "undefined" : _typeof(schema)));
            var editorOptions = {
                schema: schema,
                startval: config
            };
            app.editor = app.createJSONEditor({
                div: 'editor',
                clear: true,
                options: editorOptions
            });
        }
    }, {
        key: "initDB",
        value: function initDB() {
            var app = this;
            if (app.DB) app.DB.listStudyFolders({ trashed: false }).then(function (items) {
                if (Array.isArray(items) && items.length) {
                    app.availableStudyFolders = items;
                    app.renderConfigSelector();
                    app.choose(0);
                }
            }).catch(function (e) {
                console.log("app-framework initDB() Error accessing simulation configuration database:" + e);
            });
        }

        /** 
         * renderMorph
         * setup UI for Morph after tab click
         */

    }, {
        key: "renderMorphEditor",
        value: function renderMorphEditor() {
            var app = this;
            if (app.editor) {
                var config = app.editor.getValue();
                var l = config && config.configurations && config.configurations.length;
                if (!l || l < 2) throw new Error("app.renderMorph morph requires at least 2 configurations");
                var A = config.configurations[0];
                var B = config.configurations[l - 1];
                if (!Study.isMorphable(A, B)) throw new Error("app.renderMorph morph requires configurations that pass Study.isMorphable");
                var schema = Study.morphSchema(A, B);
                var startval = schema.default;
                app.morphEditor = app.createJSONEditor({
                    div: 'morphEditor',
                    clear: true,
                    options: {
                        schema: schema,
                        startval: startval
                    }
                });
            }
        }

        /**
         * morphs the edited configuration and stuffs it back in the editor
         */

    }, {
        key: "doMorph",
        value: function doMorph() {
            var app = this;
            if (app.editor && app.morphEditor) {
                var config = app.editor.getValue();
                var morphConfig = app.morphEditor.getValue();
                var morphed = Study.morph(config, morphConfig);
                app.editor.setValue(morphed);
                $('#editLink').click(); // send user to Editor tab to rename/edit/save
            }
        }

        /**
         * show the number of periods as indicated
         *
         * @param {number} number of periods to indicate
         * @return {number} the same number passed
         */

    }, {
        key: "showPeriods",
        value: function showPeriods(periods) {
            $('input.periods').val(periods);
            $('span.periods').text(periods);
            return periods;
        }

        /**
         * refreshes a number of UI elements
         */

    }, {
        key: "refresh",
        value: function refresh() {
            var app = this;
            var t0 = Date.now();
            console.log("refresh started at: " + t0);
            var study = app.getStudyConfig();
            var periods = app.getPeriods();
            app.showPeriods(periods);
            console.log("in refresh, elapsed after get study, folder, periods: " + (Date.now() - t0));
            if (study) {
                app.showParameters(study);
                console.log("in refresh, elapsed after app.showParameters: " + (Date.now() - t0));
                var sims = app.simulations(study);
                console.log("in refresh, elapsed after creating sims for xsimbs table: " + (Date.now() - t0));
                $('#xsimbs').html("<tr>" + sims.map(function (sim, j) {
                    var data = [j, sim.numberOfBuyers, sim.numberOfSellers];
                    return "<td>" + data.join("</td><td>") + "</td>";
                }).join('</tr><tr>') + "</tr>");
                console.log("in refresh, elapsed after creating xsimbs table: " + (Date.now() - t0));
                app.plotParameters(sims[0], "ScaleUp");
                console.log("in refresh, elapsed after plotting supply/demand in xsimbs, finished all refresh: " + (Date.now() - t0));
            }
        }

        /**
         * expands the current study by creating new values and costs by interpolation
         */

    }, {
        key: "interpolate",
        value: function interpolate() {
            var app = this;
            app.expand(Study.expander.interpolate);
        }

        /**
         * expands the current study by duplicating unit costs and values 
         */

    }, {
        key: "duplicate",
        value: function duplicate() {
            var app = this;
            app.expand(Study.expander.duplicate);
        }

        /**
         * abandon edits to the current study by refreshing the UI and editor from the cache
         */

    }, {
        key: "undo",
        value: function undo() {
            var app = this;
            app.choose(app.chosenStudyIndex);
        }

        /**
         * move the current study to the trash list
         */

    }, {
        key: "moveToTrash",
        value: function moveToTrash() {
            var app = this;
            var availableStudyFolders = app.availableStudyFolders,
                chosenStudyIndex = app.chosenStudyIndex;

            if (app.DB) {
                availableStudyFolders[chosenStudyIndex].trash().then(function () {
                    availableStudyFolders.splice(chosenStudyIndex, 1);
                    app.renderConfigSelector();
                    app.choose(0);
                }).catch(function (e) {
                    console.log(e);
                });
            }
        }

        /**
         * run the current study and display a visualization 
         */

    }, {
        key: "run",
        value: function run() {
            var app = this;
            $('#runError').html("");
            $('.postrun').removeClass("disabled");
            $('.postrun').addClass("disabled");
            $('.postrun').prop('disabled', true);
            $('.paramPlot').html("");
            $('.resultPlot').html("");
            $('#runButton .glyphicon').addClass("spinning");
            app.renderVisualSelector();
            setTimeout(function () {
                var studyConfig = (0, _clone2.default)(app.getStudyConfig());
                app.sims = app.simulations(studyConfig, true).map(function (s, i) {
                    return app.runSimulation(s, i);
                });
            }, 200);
        }

        /**
         * stop a run of the current study
         * should have no effect unless study is running
         */

    }, {
        key: "stop",
        value: function stop() {
            var app = this;
            // trigger normal completion
            app.sims.forEach(function (sim) {
                sim.config.periods = sim.period;
            });
        }

        /**
         * tries to save the current study from the editor. try to save in place if name is unchanged.  If new name, create a new StudyFolder and save.  Reload the browser after saving.
         *
         * Previous behavior was to Save to the top of the app DB saveList, if the title is changed.  Otherwise, in place (remove/save).  
         * Finally, reload the browser to give the app a clean restart.
         * 
         */

    }, {
        key: "save",
        value: function save() {
            var app = this;
            var myStudyFolder = app.getStudyFolder();
            var config = app.editor.getValue();

            /*
             * if name is unchanged, try to save in place 
             *
             */

            if (myStudyFolder && config.name === myStudyFolder.name) return myStudyFolder.setConfig({ config: config }).then(function () {
                return window.location.reload();
            });

            /*
             * name is different, or no myStudyFolder, so create a new Study Folder then save
             *
             */

            return app.DB.createStudyFolder({ name: config.name }).then(function (folder) {
                return folder.setConfig({ config: config });
            }).then(function () {
                return window.location.reload();
            });
        }

        /**
         * Select a visualization from the visualization list and refresh the UI.
         * @param {number} n Visualization index in Visuals array
         */

    }, {
        key: "setVisualNumber",
        value: function setVisualNumber(n) {
            var app = this;
            app.visualIndex = n;
            app.sims.forEach(function (s, j) {
                return app.showSimulation(s, j);
            });
        }

        /**
         * Create  .zip file containing study and simulation configurations and data and give it to the user
         */

    }, {
        key: "downloadData",
        value: function downloadData() {
            var app = this;
            $('#downloadButton').prop('disabled', true);
            $('#downloadButton').addClass("disabled");
            $('#downloadButton .glyphicon').addClass("spinning");
            setTimeout(function () {
                (0, _singleMarketRobotSimulatorSavezip2.default)({
                    config: (0, _clone2.default)(app.getStudyConfig()),
                    sims: app.sims,
                    download: true
                }).then(function () {
                    $('#downloadButton .spinning').removeClass("spinning");
                    $('#downloadButton').removeClass("disabled");
                    $('#downloadButton').prop('disabled', false);
                });
            }, 200);
        }

        /**
         * Create .zip file containing study and simulation configurations and data and upload it to the cloud
         */

    }, {
        key: "uploadData",
        value: function uploadData() {
            var app = this;
            var study = (0, _clone2.default)(app.getStudyConfig());
            var folder = app.getStudyFolder();
            if (folder) {
                $('#uploadButton').prop('disabled', true);
                $('#uploadButton').addClass('disabled');
                $('#uploadButton .glyphicon').addClass("spinning");
                setTimeout(function () {
                    (0, _singleMarketRobotSimulatorSavezip2.default)({
                        config: study,
                        sims: app.sims,
                        download: false }).then(function (zipBlob) {
                        folder.upload({
                            name: Study.myDateStamp() + '.zip',
                            blob: zipBlob,
                            onProgress: function onProgress(x) {
                                return console.log(x);
                            }
                        }).then(function (newfile) {
                            if (Array.isArray(app.study.zipfiles)) app.study.zipfiles.unshift(newfile);
                            $('#uploadButton .spinning').removeClass("spinning");
                            $('#uploadButton').removeClass("disabled");
                            $('#uploadButton').prop('disabled', false);
                        }).catch(function (e) {
                            return console.log(e);
                        });
                    });
                }, 200);
            }
        }

        /**
         * open a .zip file previously generated by app.downloadData() and load data and configurations as current study.  Check validity.  Hackish in places.
         */

    }, {
        key: "openZipFile",
        value: function openZipFile(chosenSavedRun) {
            var app = this;
            function showProgress(message) {
                $('div.openzip-progress').append("<p>" + message + "</p>");
            }
            function showError(e) {
                showProgress('<span class="red"> ERROR: ' + e + '</span>');
            }
            function restoreUI() {
                $('button.openzip-button').removeClass('disabled').prop('disabled', false);
            }
            function showSuccess() {
                showProgress('<span class="green"> SUCCESS.  The data in the zip file has been loaded.  You may click the "App" or "Edit" tabs now.  </span>');
                restoreUI();
            }
            function showFailure(e) {
                if (e) showError(e);
                showProgress('<span class="red"> FAILURE. I could not use that zip file.  You may try again, choosing a different zip file');
                restoreUI();
            }

            /**
             *
             * return a promise resolving to a zip file of saved data
             * if choice is numeric, download app.study.zipFiles[choice] from Google Drive
             * if choice is undefined, use the first HTML5 File element with class .openzip-file
             */

            function zipPromise(choice) {
                if (typeof choice === 'undefined') {
                    return new Promise(function (resolve, reject) {
                        var zipfile = $(".openzip-file")[0].files[0];
                        var reader = new FileReader();
                        reader.onload = function (event) {
                            resolve(event.target.result);
                        };
                        reader.onerror = function (e) {
                            reject(e);
                        };
                        showProgress("reading zip file from local filesystem...");
                        reader.readAsArrayBuffer(zipfile);
                    });
                }
                var n = +choice;
                try {
                    if (!(n >= 0 && n < app.study.zipFiles.length)) return Promise.reject("zip file choice out of range in openZipFile:zipPromise");
                } catch (e) {
                    return Promise.reject("Error in openZipFile:zipPromise: " + e);
                }
                var zipFile = app.study.zipFiles[n];
                showProgress("chosen zip file is:" + JSON.stringify(zipFile));
                if (zipFile.size > 50 * 1000 * 1000) return Promise.reject("zip file exceeds 50 MB, will not download to browser");
                showProgress("reading from Google Drive");
                return app.study.folder.download(zipFile);
            }

            $('div.openzip-progress').html('');
            $('button.openzip-button').prop('disabled', true).addClass("disabled");
            setTimeout(function () {

                (0, _singleMarketRobotSimulatorOpenzip2.default)(zipPromise(chosenSavedRun), app.SMRS, showProgress).then(function (data) {
                    if (!data.config) throw new Error("No master configuration file (config.json) was found in zip file.  Maybe this zip file is unrelated.");
                    if (!data.sims.length) throw new Error("No simulation configuration files (sim.json) in the zip file");
                    if (Array.isArray(data.config.configurations) && data.config.configurations.length !== data.sims.length) throw new Error("Missing files.  the number of configurations in config.json does not match the number of simulation directories and files I found");
                    if (data.sims.includes(undefined)) throw new Error("It seems a folder has been deleted from the zip file or I could not read it. ");
                    return data;
                }).then(function (data) {
                    app.sims = data.sims;
                    app.availableStudies = [data.config]; // deletes local cache of DB - pulled studiess. app only sees the loaded file.
                    app.renderConfigSelector(); // app only shows one choice in config selector -- can reload to get back to imported list
                    app.choose(0); // configure app to use the loaded file as the current study
                    app.renderVisualSelector(); // can render the list of available visualization only once the study is chosen as current study           
                }).then(showSuccess).catch(showFailure);
            }, 200);
        }

        /**
         * render into the div with id "trashList" the study folders found in Trash. Trash items can be clicked to restore to editor.
         */

    }, {
        key: "renderTrash",
        value: function renderTrash() {
            var app = this;
            var StudyFolder = app.DB.studyFolder;
            $('#trashList').html("");
            if (app.DB) {
                app.DB.listStudyFolders({ trashed: true }).then(function (items) {
                    items.forEach(function (item) {
                        $('#trashList').append('<pre class="pre-scrollable trash-item">' + JSON.stringify(item, null, 2) + '</pre>');
                    });
                    $('pre.trash-item').click(function () {

                        // this click function needs to be a full function with its own "this", not an anonymous ()=>{block}

                        var folder = new StudyFolder(JSON.parse($(this).text()));
                        if ((typeof folder === "undefined" ? "undefined" : _typeof(folder)) === 'object' && folder.id && folder.name) {
                            folder.untrash().then(function () {
                                return folder.getConfig();
                            }).then(function (response) {
                                return app.setStudy(response);
                            }).then(function () {
                                $('#editLink').click();
                            }).catch(function (e) {
                                return console.log(e);
                            });
                        }
                    });
                });
            }
        }
    }]);

    return App;
}();
