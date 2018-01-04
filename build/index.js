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

var App = exports.App = function () {

    /**
     * Create App with given settings.  Many of these settings are required.
     * @param {Object} options
     * @param {Object} options.SMRS reference to either the imported module single-market-robot-simulator or a fork 
     * @param {Object} options.DB "database" instance of single-market-robot-simulator-db-local or single-market-robot-simulator-webdismay for storing simulation configurations
     * @param {Object} options.Visuals object describing visualizations of completed simulations and parameters, to be interpreted by single-market-robot-simulator-viz-plotly
     * @param {Object} options.editorConfigSchema JSON Schema object for json-editor relevant to user editing of simulation configurations
     * @param {Object} options.editorStartValue default simulation configuration for editing if none are defined
     * @param {string} options.saveList name that will open list of save configurations when passed to options.DB.openList()
     * @param {string} options.trashList name that will open trash list of abandoned configurations when passed to options.DB.openList()
     * @param {Array<Array<string>>} options.behavior click and eventmap stored as Array of 2 or 3 element arrays [jqSelector, appMethodName, [ eventType = click ] ]
     */

    function App(options) {
        _classCallCheck(this, App);

        this.SMRS = options.SMRS;
        this.DB = options.DB;
        this.Visuals = options.Visuals;
        this.editorConfigSchema = options.editorConfigSchema;
        this.editorStartValue = options.editorStartValue;
        if (this.DB && this.DB.openList) {
            this.saveList = this.DB.openList(options.saveList);
            this.trashList = this.DB.openList(options.trashList);
        }
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
        value: function simulations(studyConfig) {
            var app = this;
            return (0, _singleMarketRobotSimulatorStudy.makeClassicSimulations)(studyConfig, app.SMRS.Simulation);
        }

        /** 
         * Get current study
         * @return {Object} study configuration
         */

    }, {
        key: "getStudy",
        value: function getStudy() {
            var app = this;
            return (0, _clone2.default)(app.study);
        }

        /**
         * Set current study 
         * @param {Object} studyConfig study configuraion
         */

    }, {
        key: "setStudy",
        value: function setStudy(study) {
            var app = this;
            if (study && study.config && study.schema) {
                app.study = (0, _clone2.default)(study);
                if (app.editor) {
                    app.initEditor({
                        config: (0, _clone2.default)(study.config),
                        schema: (0, _clone2.default)(study.schema)
                    });
                }
                $('#runError').html("Click >Run to run the simulation and see the new results");
                app.timeit((0, _clone2.default)(study.config));
                app.refresh();
            }
        }

        /**
         * Get number of periods for next run of study, looks in study.common.periods first or if study.common not found, looks in study.periods
         * @return {number} number of periods
         */

    }, {
        key: "getPeriods",
        value: function getPeriods() {
            var app = this;
            var study = app.study;
            return study.common ? study.common.periods : study.periods;
        }

        /**
         * Safely sets number of periods for the next run of the current study.  Affects config of cached app.study but not settings in editor.
         * @param {number} n number of periods
         */

    }, {
        key: "setPeriods",
        value: function setPeriods(n) {
            var app = this;
            var study = app.study;
            if (study && +n > 0 && +n <= 10000) {
                if (study.common) study.common.periods = +n;else study.periods = +n;
                app.refresh();
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
         * Clears all class .paramPlot UI elements and plots all parameters of simulations in a study. Calls app.simulations and app.plotParameters
         * @param {Object} conf A study configuration compatible with app.simulations()
         */

    }, {
        key: "showParameters",
        value: function showParameters(conf) {
            var app = this;
            $('.paramPlot').html("");
            app.simulations(conf).forEach(function (sim, slot) {
                return app.plotParameters(sim, slot);
            });
        }

        /**
         * Updates span.estimated-running-time with estimate of required running time for the current study, given the number of periods and the cached timing run, 
         * 
         */

    }, {
        key: "guessTime",
        value: function guessTime() {
            var app = this;
            var periodTimers = this.periodTimers;
            var periods = app.getPeriods();
            var l = periodTimers.length;
            var guess = 0;
            if (periods) {
                if (l > 2) {
                    guess = periods * (periodTimers[l - 1] - periodTimers[1]) / (l - 2) + periodTimers[1];
                } else if (l === 2) {
                    guess = periods * periodTimers[1];
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
         * Updates Array<number> app.periodTimers by running a study for up to 5 periods or 5 seconds to get period finishing times. Calls guessTIme to update span.estimated-running-time
         * @param {Object} studyConfig - A studyConfig as defined by app.simulations
         */

    }, {
        key: "timeit",
        value: function timeit(studyConfig) {
            var app = this;
            var t0 = Date.now();
            var periodTimers = app.periodTimers;
            periodTimers.length = 0;
            var studyConfig2p = (0, _clone2.default)(studyConfig);
            Promise.all(app.simulations(studyConfig2p).map(function (s) {
                return s.run({
                    update: function update(sim) {
                        var elapsed = Date.now() - t0;
                        periodTimers[sim.period] = elapsed;
                        // hack to end simulations if over 5 sec or 5 periods
                        if (elapsed > 5000 || sim.period > 5) sim.config.periods = sim.period;
                        return sim;
                    }
                });
            })).then(function () {
                app.guessTime();
            }).catch(function (e) {
                return console.log(e);
            });
        }

        /**
         * Choose study n from Array app.availableStudies if possible, get details from DB, send it to app.editor and app.periodsEditor if defined, then app.timeit, and then refresh UI with app.refresh
         * @param {number} n index of chosen study in app.availableStudies[]
         */

    }, {
        key: "choose",
        value: function choose(n) {
            var app = this;
            if (Array.isArray(app.availableStudies)) {
                app.chosenStudyIndex = Math.max(0, Math.min(Math.floor(n), app.availableStudies.length - 1));
                app.DB.getStudyConfig(app.availableStudies[app.chosenStudyIndex]).then(function (choice) {
                    return app.setStudy(choice);
                });
            }
        }

        /**
         * Render #selector if it exists, by erasing all options and reading each study .title from app.availableStudies  You should define an empty select element in index.html with id "selector"
         */

    }, {
        key: "renderConfigSelector",
        value: function renderConfigSelector() {
            var _this = this;

            var app = this;
            $("#selector > option").remove();
            app.availableStudies.forEach(function (c, n) {
                return $("#selector").append('<option value="' + n + '">' + c.title + '</option>');
            });
            $('#selector').on('change', function (evt) {
                return _this.choose(evt.target.selectedIndex);
            });
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
            function toSelectBox(v, i) {
                return ['<option value="', i, '"', i === app.visualIndex ? ' selected="selected" ' : '', '>', v.meta.title || v.meta.f, '</option>'].join('');
            }
            if (Array.isArray(visuals)) {
                var vizchoices = visuals.map(toSelectBox).join("");
                $('#vizselect').html(vizchoices);
            } else {
                console.log("invalid visuals", visuals);
            }
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
         * Fetches current study and modifies it for expansion.
         * If the number of buyers or sellers is 1, that number is unchanged.  Otherwise, multiplies the number of buyers and sellers by xfactor.
         * .buyerValues and .sellerCosts arrays in the current study are updated using supplied function how.  " x"+factor is appended to study title. 
         * @param {function(valuesOrCosts: number[], expansionFactor: number):number[]} how Function specifying how to modify the values and costs
         */

    }, {
        key: "expand",
        value: function expand(how) {
            var app = this;
            var xfactor = +$('#xfactor').val();
            var config = app.getStudy();
            if (xfactor) {
                config.title += ' x' + xfactor;
                config.configurations.forEach(function (sim) {
                    sim.buyerValues = how(sim.buyerValues, xfactor);
                    sim.sellerCosts = how(sim.sellerCosts, xfactor);
                    if (sim.numberOfBuyers > 1) sim.numberOfBuyers *= xfactor;
                    if (sim.numberOfSellers > 1) sim.numberOfSellers *= xfactor;
                });
                app.setStudy(config);
                app.timeit((0, _clone2.default)(config));
                app.refresh();
            }
        }

        /** Perform additional required initialization, NOT called by constructor. Sets up (1) app.behavior with jQuery.on; (2) JSON Editor in div with id editor; (3) begins reading database for saveList 
         */

    }, {
        key: "init",
        value: function init() {
            var app = this;
            app.initBehavior();
            app.initEditor({
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
        key: "initEditor",
        value: function initEditor(_ref) {
            var config = _ref.config,
                schema = _ref.schema;

            var app = this;
            if ((typeof config === "undefined" ? "undefined" : _typeof(config)) !== 'object') throw new Error("config must be an object, instead got: " + (typeof config === "undefined" ? "undefined" : _typeof(config)));
            if ((typeof schema === "undefined" ? "undefined" : _typeof(schema)) !== 'object') throw new Error("schema must be an object, instead got: " + (typeof schema === "undefined" ? "undefined" : _typeof(schema)));
            var editorElement = document.getElementById('editor');
            if (editorElement && window.JSONEditor) {
                while (editorElement.firstChild) {
                    editorElement.removeChild(editorElement.firstChild);
                }
                var editorOptions = {
                    schema: schema,
                    startval: config
                };
                app.editor = new window.JSONEditor(editorElement, editorOptions);
            }
        }
    }, {
        key: "initDB",
        value: function initDB() {
            var app = this;
            if (app.DB) app.DB.availableStudies(app.saveList).then(function (items) {
                if (Array.isArray(items) && items.length) {
                    app.availableStudies = items;
                    app.renderConfigSelector();
                    app.choose(0);
                }
            }).catch(function (e) {
                console.log("Error accessing simulation configuration database:" + e);
                app.DB = null;
            });
        }

        /**
         * updates running time estimate in span.estimated-running-time , using the current study
         */

    }, {
        key: "estimateTime",
        value: function estimateTime() {
            var app = this;
            app.timeit(app.getStudy());
        }

        /**
         * refreshes a number of UI elements
         */

    }, {
        key: "refresh",
        value: function refresh() {
            var app = this;
            var study = app.getStudy();
            var periods = app.getPeriods();
            if (study) {
                app.guessTime();
                app.showParameters(study);
                $('.configTitle').text(study.title);
                if (periods) {
                    $('input.periods').val(periods);
                    $('span.periods').text(periods);
                }
                var sims = app.simulations(study);
                $('#xsimbs').html("<tr>" + sims.map(function (sim, j) {
                    var data = [j, sim.numberOfBuyers, sim.numberOfSellers];
                    return "<td>" + data.join("</td><td>") + "</td>";
                }).join('</tr><tr>') + "</tr>");
                app.plotParameters(sims[0], "ScaleUp");
            }
        }

        /**
         * expands the current study by creating new values and costs by interpolation
         */

    }, {
        key: "interpolate",
        value: function interpolate() {
            var app = this;
            app.expand(function (a, n) {
                var result = [];
                for (var i = 0, l = a.length; i < l - 1; ++i) {
                    for (var j = 0; j < n; ++j) {
                        result.push((a[i] * (n - j) + a[i + 1] * j) / n);
                    }
                }
                var last = a[a.length - 1];
                for (var _j = 0; _j < n; ++_j) {
                    result.push(last);
                }return result;
            });
        }

        /**
         * expands the current study by duplicating unit costs and values 
         */

    }, {
        key: "duplicate",
        value: function duplicate() {
            var app = this;
            app.expand(function (a, n) {
                var result = [];
                for (var i = 0, l = a.length; i < l; ++i) {
                    for (var j = 0; j < n; ++j) {
                        result.push(a[i]);
                    }
                }
                return result;
            });
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
            var availableStudies = app.availableStudies,
                chosenStudyIndex = app.chosenStudyIndex,
                saveList = app.saveList,
                trashList = app.trashList;

            if (app.DB) {
                app.DB.trashStudy(availableStudies[chosenStudyIndex], saveList, trashList).then(function () {
                    availableStudies.splice(chosenStudyIndex, 1);
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
                var studyConfig = app.getStudy();
                app.sims = app.simulations(studyConfig).map(function (s, i) {
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
         * saves the current study from the editor.  Save is to the top of the app DB saveList, if the title is changed.  Otherwise, in place (remove/save).  
         * Finally, reload the browser to give the app a clean restart.
         * 
         */

    }, {
        key: "save",
        value: function save() {
            var app = this;
            function doSave() {
                app.DB.saveStudyConfig(app.editor.getValue(), app.saveList).then(function () {
                    return window.location.reload();
                });
            }
            if (app.DB) {
                if (app.availableStudies.length > 1 && app.availableStudies[app.chosenStudyIndex] && app.editor.getValue().title === app.availableStudies[app.chosenStudyIndex].title) {
                    app.DB.removeStudyConfig(app.availableStudies[app.chosenStudyIndex], app.saveList).then(doSave);
                } else {
                    doSave();
                }
            }
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
                    config: app.getStudy(),
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
            var study = app.getStudy();
            $('#uploadButton').prop('disabled', true);
            $('#uploadButton').addClass('disabled');
            $('#uploadButton .glyphicon').addClass("spinning");
            setTimeout(function () {
                (0, _singleMarketRobotSimulatorSavezip2.default)({
                    config: study,
                    sims: app.sims,
                    download: false }).then(function (zipBlob) {
                    app.DB.uploadStudyZip(zipBlob, { id: study.id }).then(function () {
                        $('#uploadButton .spinning').removeClass("spinning");
                        $('#uploadButton').removeClass("disabled");
                        $('#uploadButton').prop('disabled', false);
                    }).catch(function (e) {
                        return console.log(e);
                    });
                });
            }, 200);
        }

        /**
         * open a .zip file previously generated by app.downloadData() and load data and configurations as current study.  Check validity.  Hackish in places.
         */

    }, {
        key: "openZipFile",
        value: function openZipFile() {
            var app = this;
            function showProgress(message) {
                $('div.openzip-progress').append("<p>" + message + "</p>");
            }
            function showError(e) {
                showProgress('<span class="red"> ERROR: ' + e + '</span>');
            }
            function restoreUI() {
                $('button.openzip-button').removeClass('diosabled').prop('disabled', false);
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
            function hasMissing(a) {
                // JavaScript ignores missing elements in higher order functional operations like .some, and even .indexOf(), so we have to check this with an explicit loop
                if (Array.isArray(a)) {
                    var i = 0,
                        l = a.length,
                        u = false;
                    while (i < l && !u) {
                        u = typeof a[i] === "undefined";
                        i++;
                    }
                    return u;
                }
            }
            $('div.openzip-progress').html('');
            $('button.openzip-button').prop('disabled', true).addClass("disabled");
            setTimeout(function () {
                var zipPromise = new Promise(function (resolve, reject) {
                    var zipfile = $(".openzip-file")[0].files[0];
                    var reader = new FileReader();
                    reader.onload = function (event) {
                        resolve(event.target.result);
                    };
                    reader.onerror = function (e) {
                        reject(e);
                    };
                    reader.readAsArrayBuffer(zipfile);
                });
                (0, _singleMarketRobotSimulatorOpenzip2.default)(zipPromise, app.SMRS, showProgress).then(function (data) {
                    if (!data.config) throw new Error("No master configuration file (config.json) was found in zip file.  Maybe this zip file is unrelated.");
                    if (!data.sims.length) throw new Error("No simulation configuration files (sim.json) in the zip file");
                    if (Array.isArray(data.config.configurations) && data.config.configurations.length !== data.sims.length) throw new Error("Missing files.  the number of configurations in config.json does not match the number of simulation directories and files I found");
                    if (hasMissing(data.sims)) throw new Error("It seems a folder has been deleted from the zip file or I could not read it. ");
                    return data;
                }).then(function (data) {
                    app.sims = data.sims;
                    app.availableStudies = [data.config]; // deletes local cache of DB - pulled studiess. app only sees the loaded file.
                    app.renderConfigSelector(); // app only shows one choice in config selector -- can reload to get back to imported list
                    app.choose(0); // configure app to use the loaded file as the current study
                    app.renderVisualSelector(); // can render the list of available visualization only once the study is chosen as current study           
                }).then(showSuccess, showFailure);
            }, 200);
        }

        /**
         * render into the div with id "trashList" the first 20 discarded study configurations in the app.DB at name app.trashList.  Trash items can be clicked to restore to editor.
         */

    }, {
        key: "renderTrash",
        value: function renderTrash() {
            var app = this;
            $('#trashList').html("");
            if (app.DB) {
                app.DB.trashedStudyConfigs(app.trashList, 0, 20).then(function (items) {
                    items.forEach(function (item) {
                        $('#trashList').append('<pre class="pre-scrollable trash-item">' + JSON.stringify(item, null, 2) + '</pre>');
                    });
                    $('pre.trash-item').click(function () {

                        // this click function needs to be a full function with its own "this", not an anonymous ()=>{block}

                        try {
                            var restoredStudy = JSON.parse($(this).text());
                            if ((typeof restoredStudy === "undefined" ? "undefined" : _typeof(restoredStudy)) === 'object' && typeof restoredStudy.title === 'string' && _typeof(restoredStudy.common) === 'object' && Array.isArray(restoredStudy.configurations)) {
                                app.editor.setValue(restoredStudy);
                                $('#editLink').click();
                            } else {
                                console.log("trashed item is not a valid study");
                            }
                        } catch (e) {
                            console.log("could not send trashed item to editor: " + e);
                        }
                    });
                });
            }
        }
    }]);

    return App;
}();
