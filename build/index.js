"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.App = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /* Copyright 2016, 2017 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

/* global Plotly:true, window:true, $:true */

/* eslint no-console: "off" */
/* eslint consistent-this: ["error", "app", "that"] */

var _clone = require("clone");

var _clone2 = _interopRequireDefault(_clone);

var _singleMarketRobotSimulatorSavezip = require("single-market-robot-simulator-savezip");

var _singleMarketRobotSimulatorSavezip2 = _interopRequireDefault(_singleMarketRobotSimulatorSavezip);

var _singleMarketRobotSimulatorOpenzip = require("single-market-robot-simulator-openzip");

var _singleMarketRobotSimulatorOpenzip2 = _interopRequireDefault(_singleMarketRobotSimulatorOpenzip);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

// private

function commonFrom(obj) {
    return function (c) {
        var result = Object.assign({}, (0, _clone2.default)(c), (0, _clone2.default)(obj.common));
        return result;
    };
}

var App = exports.App = function () {
    function App(options) {
        _classCallCheck(this, App);

        this.SMRS = options.SMRS;
        this.DB = options.DB;
        this.Visuals = options.Visuals;
        this.editorConfigSchema = options.editorConfigSchema;
        this.editorStartValue = options.editorStartValue;
        this.editorPostProcess = options.editorPostProcess;
        this.saveList = this.DB.openList(options.saveList);
        this.trashList = this.DB.openList(options.trashList);
        this.behavior = options.behavior;
        this.editor = 0;
        this.periodsEditor = 0;
        this.periodTimers = [];
        this.savedConfigs = [];
        this.chosenScenarioIndex = 0;
        this.sims = [];
        this.visual = 0;
    }

    _createClass(App, [{
        key: "simulations",
        value: function simulations(cfg) {
            var SMRS = this.SMRS;

            if (!cfg) return [];
            if (!Array.isArray(cfg.configurations)) return [];
            return cfg.configurations.map(commonFrom(cfg)).map(function (s) {
                return new SMRS.Simulation(s);
            });
        }
    }, {
        key: "getConfig",
        value: function getConfig() {
            var app = this;
            var config = null;
            if (app.editor && _typeof(app.editor.getValue === "function")) {
                config = app.editor.getValue();
                if (typeof app.editorPostProcess === "function") config = app.editorPostProcess(config);
            } else {
                config = app.editorStartValue;
            }
            return config;
        }
    }, {
        key: "plotParameters",
        value: function plotParameters(sim, slot) {
            var _Plotly;

            var app = this;
            var plotlyParams = app.Visuals.params(sim);
            plotlyParams.unshift("paramPlot" + slot);
            (_Plotly = Plotly).newPlot.apply(_Plotly, _toConsumableArray(plotlyParams));
        }
    }, {
        key: "showParameters",
        value: function showParameters(conf) {
            var app = this;
            $('.paramPlot').html("");
            app.simulations(conf).forEach(function (sim, slot) {
                return app.plotParameters(sim, slot);
            });
        }
    }, {
        key: "guessTime",
        value: function guessTime() {
            var periodsEditor = this.periodsEditor,
                periodTimers = this.periodTimers;

            var l = periodTimers.length;
            var guess = 0;
            if (l > 2) {
                guess = periodsEditor.getValue() * (periodTimers[l - 1] - periodTimers[1]) / (l - 2) + periodTimers[1];
            } else if (l === 2) {
                guess = periodsEditor.getValue() * periodTimers[1];
            }
            if (guess) {
                var seconds = Math.round(guess / 1000.0);
                var minutes = Math.ceil(seconds / 60);
                $('span.estimated-running-time').text(minutes > 1 ? '~' + minutes + 'min' : '~' + seconds + 'sec');
            } else {
                $('span.estimated-running-time').text("?");
            }
        }
    }, {
        key: "timeit",
        value: function timeit(scenario) {
            var app = this;
            var t0 = Date.now();
            var periodTimers = app.periodTimers;
            periodTimers.length = 0;
            var scenario2p = (0, _clone2.default)(scenario);
            scenario2p.common.periods = 5;
            Promise.all(app.simulations(scenario2p).map(function (s) {
                return s.run({
                    update: function update(sim) {
                        var elapsed = Date.now() - t0;
                        periodTimers[sim.period] = elapsed;
                        // hack to end simulations if over 5 sec
                        if (elapsed > 5000) sim.config.periods = 0;
                        return sim;
                    }
                });
            })).then(function () {
                app.guessTime();
            }).catch(function (e) {
                return console.log(e);
            });
        }
    }, {
        key: "choose",
        value: function choose(n) {
            var app = this;
            if (Array.isArray(app.savedConfigs)) {
                app.chosenScenarioIndex = Math.max(0, Math.min(Math.floor(n), app.savedConfigs.length - 1));
                var choice = app.savedConfigs[app.chosenScenarioIndex];
                if (choice) {
                    if (app.editor) {
                        app.editor.setValue((0, _clone2.default)(choice));
                        // initialize periodsEditor only after a scenario is chosen
                        app.periodsEditor = app.editor.getEditor('root.common.periods');
                    }
                    app.timeit((0, _clone2.default)(choice)); // time a separate clone
                    app.refresh();
                }
            }
        }
    }, {
        key: "renderConfigSelector",
        value: function renderConfigSelector() {
            var _this = this;

            var app = this;
            $("#selector > option").remove();
            app.savedConfigs.forEach(function (c, n) {
                return $("#selector").append('<option value="' + n + '">' + c.title + '</option>');
            });
            $('#selector').on('change', function (evt) {
                return _this.choose(evt.target.selectedIndex);
            });
        }
    }, {
        key: "getVisuals",
        value: function getVisuals(conf) {
            var app = this;
            var visuals = [];
            var periods = conf.periods || conf.config && conf.config.periods || conf.common && conf.common.periods || conf.configurations && conf.configurations[0].periods;
            if (periods <= 50) visuals = app.Visuals.small;else if (periods <= 500) visuals = app.Visuals.medium;else visuals = app.Visuals.large;
            return visuals;
        }
    }, {
        key: "adjustTitle",
        value: function adjustTitle(plotParams, modifier) {
            var layout = plotParams[1];
            if (layout) {
                if (layout.title) {
                    if (modifier.prepend && modifier.prepend.length > 0) layout.title = modifier.prepend + layout.title;
                    if (modifier.append && modifier.append.length > 0) layout.title += modifier.append;
                }
                if (modifier.replace && modifier.replace.length > 0) layout.title = modifier.replace;
            }
        }
    }, {
        key: "showSimulation",
        value: function showSimulation(simConfig, slot) {
            var _Plotly2;

            var app = this;
            var visuals = app.getVisuals(simConfig);
            var plotParams = visuals[app.visual % visuals.length](simConfig);
            var config = simConfig.config;
            app.adjustTitle(plotParams, {
                prepend: config.titlePrepend,
                append: config.titleAppend,
                replace: config.titleReplace
            });
            plotParams.unshift('resultPlot' + slot);
            (_Plotly2 = Plotly).newPlot.apply(_Plotly2, _toConsumableArray(plotParams));
        }
    }, {
        key: "renderVisualSelector",
        value: function renderVisualSelector(simConfig) {
            var app = this;
            function toSelectBox(v, i) {
                return ['<option value="', i, '"', i === app.visual ? ' selected="selected" ' : '', '>', v.meta.title || v.meta.f, '</option>'].join('');
            }
            var visuals = app.getVisuals(simConfig);
            if (Array.isArray(visuals)) {
                var vizchoices = visuals.map(toSelectBox).join("");
                $('#vizselect').html(vizchoices);
            } else {
                console.log("invalid visuals", visuals);
            }
        }
    }, {
        key: "runSimulation",
        value: function runSimulation(simConfig, slot) {
            // set up and run simulation

            var app = this;

            function onPeriod(sim) {
                if (sim.period < sim.config.periods) {
                    $('#resultPlot' + slot).html("<sh1>" + Math.round(100 * sim.period / sim.config.periods) + "% complete</h1>");
                } else {
                    $('#resultPlot' + slot).html("");
                }
                return sim;
            }

            function onDone(sim) {
                app.showSimulation(sim, slot);
                $('.spinning').removeClass('spinning');
                $('.postrun').removeClass('disabled');
                $('.postrun').prop('disabled', false);
            }

            var mysim = simConfig; // this line used to call new Simulation based on simConfig... but that is done in .simulations already 

            app.plotParameters(mysim, slot);

            mysim.run({ update: onPeriod }).then(onDone).catch(function (e) {
                console.log(e);
            });
            if (mysim.config.periods > 500) {
                delete mysim.logs.buyorder;
                delete mysim.logs.sellorder;
            }

            return mysim;
        }
    }, {
        key: "expand",
        value: function expand(how) {
            var app = this;
            var xfactor = +$('#xfactor').val();
            var config = app.editor.getValue();
            if (xfactor) {
                config.title += ' x' + xfactor;
                config.configurations.forEach(function (sim) {
                    sim.buyerValues = how(sim.buyerValues, xfactor);
                    sim.sellerCosts = how(sim.sellerCosts, xfactor);
                    if (sim.numberOfBuyers > 1) sim.numberOfBuyers *= xfactor;
                    if (sim.numberOfSellers > 1) sim.numberOfSellers *= xfactor;
                });
                app.editor.setValue(config);
                app.timeit((0, _clone2.default)(config));
                app.refresh();
            }
        }

        /* public: app functions for outside code below this line */

    }, {
        key: "init",
        value: function init() {
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
            var editorElement = document.getElementById('editor');
            var editorOptions = {
                schema: app.editorConfigSchema,
                startval: app.editorStartValue
            };
            app.editor = new window.JSONEditor(editorElement, editorOptions);
            app.editor.on('change', function () {
                $('#runError').html("Click >Run to run the simulation and see the new results");
            });
            app.DB.promiseList(app.saveList).then(function (configs) {
                if (Array.isArray(configs) && configs.length) {
                    app.savedConfigs = configs;
                    app.renderConfigSelector();
                    app.choose(0);
                }
            }).catch(function (e) {
                console.log("Error accessing simulation configuration database:" + e);
                app.DB = null;
            });
        }
    }, {
        key: "estimateTime",
        value: function estimateTime() {
            var app = this;
            app.timeit(app.getConfig());
        }
    }, {
        key: "refresh",
        value: function refresh() {
            var app = this;
            var periodsEditor = app.periodsEditor;
            var config = app.getConfig();
            if (periodsEditor) {
                $('input.periods').val(periodsEditor.getValue());
                $('span.periods').text(periodsEditor.getValue());
                app.guessTime();
            }
            if (config) {
                app.renderVisualSelector(config);
                app.showParameters(config);
                $('.configTitle').text(config.title);
                $('#xsimbs').html("<tr>" + config.configurations.map(function (sim, j) {
                    var data = [j, sim.numberOfBuyers, sim.numberOfSellers];
                    return "<td>" + data.join("</td><td>") + "</td>";
                }).join('</tr><tr>') + "</tr>");
                app.plotParameters(new app.SMRS.Simulation(commonFrom(config)(config.configurations[0])), "ScaleUp");
            }
        }
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
    }, {
        key: "undo",
        value: function undo() {
            var app = this;
            app.choose(app.chosenScenarioIndex);
        }
    }, {
        key: "moveToTrash",
        value: function moveToTrash() {
            var app = this;
            var savedConfigs = app.savedConfigs,
                chosenScenarioIndex = app.chosenScenarioIndex,
                saveList = app.saveList,
                trashList = app.trashList;

            app.DB.promiseMoveItem(savedConfigs[chosenScenarioIndex], saveList, trashList).then(function () {
                savedConfigs.splice(chosenScenarioIndex, 1);
                app.renderConfigSelector();
                app.choose(0);
            }).catch(function (e) {
                console.log(e);
            });
        }
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
            setTimeout(function () {
                var config = app.getConfig();
                app.sims = app.simulations(config).map(function (s, i) {
                    return app.runSimulation(s, i);
                });
            }, 200);
        }
    }, {
        key: "save",
        value: function save() {
            var app = this;
            function doSave() {
                app.DB.promiseSaveItem(app.editor.getValue(), app.saveList).then(function () {
                    return window.location.reload();
                });
            }
            if (app.savedConfigs.length > 1 && app.savedConfigs[app.chosenScenarioIndex] && app.editor.getValue().title === app.savedConfigs[app.chosenScenarioIndex].title) {
                app.DB.promiseRemoveItem(app.savedConfigs[app.chosenScenarioIndex], app.saveList).then(doSave);
            } else {
                doSave();
            }
        }
    }, {
        key: "setPeriods",
        value: function setPeriods(n) {
            var app = this;
            app.periodsEditor.setValue(Math.floor(n));
            app.refresh();
        }
    }, {
        key: "setVisualNumber",
        value: function setVisualNumber(n) {
            var app = this;
            app.visual = n;
            app.sims.forEach(function (s, j) {
                return app.showSimulation(s, j);
            });
        }
    }, {
        key: "downloadData",
        value: function downloadData() {
            var app = this;
            $('#downloadButton').prop('disabled', true);
            $('#downloadButton').addClass("disabled");
            $('#downloadButton .glyphicon').addClass("spinning");
            setTimeout(function () {
                (0, _singleMarketRobotSimulatorSavezip2.default)({
                    config: app.getConfig(),
                    sims: app.sims,
                    download: true
                }).then(function () {
                    $('#downloadButton .spinning').removeClass("spinning");
                    $('#downloadButton').removeClass("disabled");
                    $('#downloadButton').prop('disabled', false);
                });
            }, 200);
        }
    }, {
        key: "uploadData",
        value: function uploadData() {
            var app = this;
            $('#uploadButton').prop('disabled', true);
            $('#uploadButton').addClass('disabled');
            $('#uploadButton .glyphicon').addClass("spinning");
            setTimeout(function () {
                (0, _singleMarketRobotSimulatorSavezip2.default)({
                    config: app.getConfig(),
                    sims: app.sims,
                    download: false }).then(function (zipBlob) {
                    app.DB.promiseUpload(zipBlob).then(function () {
                        $('#uploadButton .spinning').removeClass("spinning");
                        $('#uploadButton').removeClass("disabled");
                        $('#uploadButton').prop('disabled', false);
                    }).catch(function (e) {
                        return console.log(e);
                    });
                });
            }, 200);
        }
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
            function restoreUI() {
                $('button.openzip-button').removeClass('diosabled').prop('disabled', false);
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
                    if (!data.config.common) throw new Error("No 'common' section in configuration (config.json). These simulations are incompatible.");
                    if (!Array.isArray(data.config.configurations)) throw new Error("No 'configurations' section in config.json.  These simulations are incompatible.");
                    if (!data.sims.length) throw new Error("No simulation configuration files (sim.json) in the zip file");
                    if (data.config.configurations.length !== data.sims.length) throw new Error("Missing files.  the number of configurations in config.json does not match the number of simulation directories and files I found");
                    if (hasMissing(data.sims)) throw new Error("It seems a folder has been deleted from the zip file or I could not read it. ");
                    return data;
                }).then(function (data) {
                    app.sims = data.sims;
                    app.savedConfigs = [data.config]; // deletes local cache of DB - pulled scenarios. app only sees the loaded file.
                    app.renderConfigSelector(); // app only shows one choice in config selector -- can reload to get back to imported list 
                    app.choose(0); // configure app to use the loaded file
                }).then(restoreUI, function (e) {
                    showError(e);restoreUI();
                });
            }, 200);
        }
    }, {
        key: "renderTrash",
        value: function renderTrash() {
            var app = this;
            $('#trashList').html("");
            app.DB.promiseListRange(app.trashList, 0, 20).then(function (items) {
                items.forEach(function (item) {
                    $('#trashList').append('<pre class="pre-scrollable trash-item">' + JSON.stringify(item, null, 2) + '</pre>');
                });
                $('pre.trash-item').click(function () {

                    // this click function needs to be a full function with its own "this", not an anonymous ()=>{block}

                    try {
                        var restoredScenario = JSON.parse($(this).text());
                        if ((typeof restoredScenario === "undefined" ? "undefined" : _typeof(restoredScenario)) === 'object' && typeof restoredScenario.title === 'string' && _typeof(restoredScenario.common) === 'object' && Array.isArray(restoredScenario.configurations)) {
                            app.editor.setValue(restoredScenario);
                            $('#editLink').click();
                        } else {
                            console.log("trashed item is not a valid scenario");
                        }
                    } catch (e) {
                        console.log("could not send trashed item to editor: " + e);
                    }
                });
            });
        }
    }]);

    return App;
}();
