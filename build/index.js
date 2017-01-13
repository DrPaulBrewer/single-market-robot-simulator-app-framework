"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.App = undefined;

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _clone = require("clone");

var _clone2 = _interopRequireDefault(_clone);

var _singleMarketRobotSimulatorSavezip = require("single-market-robot-simulator-savezip");

var _singleMarketRobotSimulatorSavezip2 = _interopRequireDefault(_singleMarketRobotSimulatorSavezip);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } } /* Copyright 2016 Paul Brewer, Economic and Financial Technology Consulting LLC */
/* This file is open source software.  The MIT License applies to this software. */

/* global Plotly:true, window:true, $:true */

/* eslint no-console: "off" */

// private

function commonFrom(config) {
    return function (c) {
        var result = Object.assign({}, (0, _clone2.default)(c), (0, _clone2.default)(config.common));
        return result;
    };
}

function adjustBook(sim) {
    sim.bookfixed = 1;
    sim.booklimit = Math.max.apply(Math, _toConsumableArray([sim.buySellBookLimit, sim.buyerImprovementRule, sim.sellerImprovementRule].filter(function (x) {
        return typeof x === 'number';
    }))) || 10;
    return sim;
}

var App = exports.App = function () {
    function App(options) {
        _classCallCheck(this, App);

        this.SMRS = options.SMRS;
        this.DB = options.DB;
        this.Visuals = options.Visuals;
        this.editorConfigSchema = options.editorConfigSchema;
        this.editorStartValue = options.editorStartValue;
        this.saveList = this.DB.openList(options.saveList);
        this.trashList = this.DB.openList(options.trashList);
        this.editor = 0;
        this.periodsEditor = 0;
        this.periodTimers = [];
        this.savedConfigs = [];
        this.chosenScenarioIndex = 0;
        this.sims = [];
        this.visual = 0;
    }

    _createClass(App, [{
        key: "allSim",
        value: function allSim(config) {
            var SMRS = this.SMRS;

            return config.configurations.map(commonFrom(config)).map(adjustBook).map(function (s) {
                return new SMRS.Simulation(s);
            });
        }
    }, {
        key: "plotParameters",
        value: function plotParameters(sim, slot) {
            var _Plotly;

            var plotlyParams = this.Visuals.params(sim);
            plotlyParams.unshift("paramPlot" + slot);
            (_Plotly = Plotly).newPlot.apply(_Plotly, _toConsumableArray(plotlyParams));
        }
    }, {
        key: "showParameters",
        value: function showParameters(conf) {
            var _this = this;

            $('.paramPlot').html("");
            conf.configurations.map(commonFrom(conf)).map(function (config) {
                return new _this.SMRS.Simulation(config);
            }).forEach(function (sim, slot) {
                return _this.plotParameters(sim, slot);
            });
        }
    }, {
        key: "guessTime",
        value: function guessTime() {
            var periodsEditor = this.periodsEditor;
            var periodTimers = this.periodTimers;

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
            var _this2 = this;

            var t0 = Date.now();
            var periodTimers = this.periodTimers;
            periodTimers.length = 0;
            var scenario2p = (0, _clone2.default)(scenario);
            scenario2p.common.periods = 5;
            Promise.all(this.allSim(scenario2p).map(function (s) {
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
                console.log("simulation period timers", periodTimers);
                _this2.guessTime();
            }).catch(function (e) {
                return console.log(e);
            });
        }
    }, {
        key: "choose",
        value: function choose(n) {
            this.chosenScenarioIndex = Math.max(0, Math.min(Math.floor(n), this.savedConfigs.length - 1));
            var choice = this.savedConfigs[this.chosenScenarioIndex];
            if (choice) {
                this.editor.setValue((0, _clone2.default)(choice));
                // initialize periodsEditor only after a scenario is chosen
                this.periodsEditor = this.editor.getEditor('root.common.periods');
                this.timeit((0, _clone2.default)(choice)); // time a separate clone
                this.refresh();
            }
        }
    }, {
        key: "renderConfigSelector",
        value: function renderConfigSelector() {
            var _this3 = this;

            $("#selector > option").remove();
            this.savedConfigs.forEach(function (c, n) {
                return $("#selector").append('<option value="' + n + '">' + c.title + '</option>');
            });
            $('#selector').on('change', function (evt) {
                return _this3.choose(evt.target.selectedIndex);
            });
        }
    }, {
        key: "getVisuals",
        value: function getVisuals(simConfig) {
            var visuals = [];
            var cfg = simConfig.config || simConfig;
            if (cfg.periods <= 50) visuals = this.Visuals.small;else if (cfg.periods <= 500) visuals = this.Visuals.medium;else visuals = this.Visuals.large;
            return visuals;
        }
    }, {
        key: "showSimulation",
        value: function showSimulation(simConfig, slot) {
            var _Plotly2;

            var visuals = this.getVisuals(simConfig);
            var plotParams = visuals[this.visual % visuals.length](simConfig);
            plotParams.unshift('resultPlot' + slot);
            (_Plotly2 = Plotly).newPlot.apply(_Plotly2, _toConsumableArray(plotParams));
        }
    }, {
        key: "runSimulation",
        value: function runSimulation(simConfig, slot) {
            // set up and run new simulation

            var that = this;

            function onPeriod(sim) {
                if (sim.period < sim.config.periods) {
                    $('#resultPlot' + slot).html("<h1>" + Math.round(100 * sim.period / sim.config.periods) + "% complete</h1>");
                } else {
                    $('#resultPlot' + slot).html("");
                }
                return sim;
            }

            function onDone(sim) {
                function toSelectBox(v, i) {
                    return ['<option value="', i, '"', i === that.visual ? ' selected="selected" ' : '', '>', v.meta.title || v.meta.f, '</option>'].join('');
                }
                var visuals = that.getVisuals(simConfig);
                if (Array.isArray(visuals)) {
                    var vizchoices = visuals.map(toSelectBox).join("");
                    $('#vizselect').html(vizchoices);
                } else {
                    console.log("invalid visuals", visuals);
                }
                that.showSimulation(sim, slot);
                $('.spinning').removeClass('spinning');
                $('.postrun').removeClass('disabled');
                $('.postrun').prop('disabled', false);
            }

            adjustBook(simConfig);

            var mysim = new this.SMRS.Simulation(simConfig);

            this.plotParameters(mysim, slot);

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
            var xfactor = +$('#xfactor').val();
            var config = this.editor.getValue();
            if (xfactor) {
                config.title += ' x' + xfactor;
                config.configurations.forEach(function (sim) {
                    sim.buyerValues = how(sim.buyerValues, xfactor);
                    sim.sellerCosts = how(sim.sellerCosts, xfactor);
                    if (sim.numberOfBuyers > 1) sim.numberOfBuyers *= xfactor;
                    if (sim.numberOfSellers > 1) sim.numberOfSellers *= xfactor;
                });
                this.editor.setValue(config);
                this.timeit((0, _clone2.default)(config));
                this.refresh();
            }
        }

        /* public: app functions for outside code below this line */

    }, {
        key: "init",
        value: function init() {
            var _this4 = this;

            $('.postrun').prop('disabled', true);
            var editorElement = document.getElementById('editor');
            var editorOptions = {
                schema: this.editorConfigSchema,
                startval: this.editorStartValue
            };
            this.editor = new window.JSONEditor(editorElement, editorOptions);
            this.editor.on('change', function () {
                $('#runError').html("Click >Run to run the simulation and see the new results");
            });
            this.DB.promiseList(this.saveList).then(function (configs) {
                if (Array.isArray(configs) && configs.length) {
                    _this4.savedConfigs = configs;
                    _this4.renderConfigSelector();
                    _this4.choose(0);
                }
            }).catch(function (e) {
                console.log("Error accessing simulation configuration database:" + e);
                _this4.DB = null;
            });
        }
    }, {
        key: "estimateTime",
        value: function estimateTime() {
            this.timeit(this.editor.getValue());
        }
    }, {
        key: "refresh",
        value: function refresh() {
            var periodsEditor = this.periodsEditor;
            var editor = this.editor;
            if (periodsEditor) {
                $('input.periods').val(periodsEditor.getValue());
                $('span.periods').text(periodsEditor.getValue());
                this.guessTime();
            }
            if (editor) {
                var current = editor.getValue();
                this.showParameters(current);
                $('.configTitle').text(current.title);
                $('#xsimbs').html("<tr>" + current.configurations.map(function (config, j) {
                    var data = [j, config.numberOfBuyers, config.numberOfSellers];
                    return "<td>" + data.join("</td><td>") + "</td>";
                }).join('</tr><tr>') + "</tr>");
                this.plotParameters(new this.SMRS.Simulation(commonFrom(current)(current.configurations[0])), "ScaleUp");
            }
        }
    }, {
        key: "interpolate",
        value: function interpolate() {
            this.expand(function (a, n) {
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
            this.expand(function (a, n) {
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
            this.choose(this.chosenScenarioIndex);
        }
    }, {
        key: "moveToTrash",
        value: function moveToTrash() {
            var _this5 = this;

            console.log("move-to-trash");
            var savedConfigs = this.savedConfigs;
            var chosenScenarioIndex = this.chosenScenarioIndex;
            var saveList = this.saveList;
            var trashList = this.trashList;

            this.DB.promiseMoveItem(savedConfigs[chosenScenarioIndex], saveList, trashList).then(function () {
                savedConfigs.splice(chosenScenarioIndex, 1);
                _this5.renderConfigSelector();
                _this5.choose(0);
            }).catch(function (e) {
                console.log(e);
            });
        }
    }, {
        key: "run",
        value: function run() {
            var _this6 = this;

            $('#runError').html("");
            $('.postrun').removeClass("disabled");
            $('.postrun').addClass("disabled");
            $('.postrun').prop('disabled', true);
            $('.paramPlot').html("");
            $('.resultPlot').html("");
            $('#runButton .glyphicon').addClass("spinning");
            setTimeout(function () {
                var config = _this6.editor.getValue();
                _this6.sims = config.configurations.map(commonFrom(config)).map(function (s, i) {
                    return _this6.runSimulation(s, i);
                });
            }, 200);
        }
    }, {
        key: "save",
        value: function save() {
            var that = this;
            function doSave() {
                that.DB.promiseSaveItem(that.editor.getValue(), that.saveList).then(function () {
                    return window.location.reload();
                });
            }
            if (that.savedConfigs.length && that.savedConfigs[that.chosenScenarioIndex] && that.editor.getValue().title === that.savedConfigs[that.chosenScenarioIndex].title) {
                that.DB.promiseRemoveItem(that.savedConfigs[that.chosenScenarioIndex], that.saveList).then(doSave);
            } else {
                doSave();
            }
        }
    }, {
        key: "setPeriods",
        value: function setPeriods(n) {
            this.periodsEditor.setValue(Math.floor(n));
            this.refresh();
        }
    }, {
        key: "setVisualNumber",
        value: function setVisualNumber(n) {
            var _this7 = this;

            this.visual = n;
            this.sims.forEach(function (s, j) {
                return _this7.showSimulation(s, j);
            });
        }
    }, {
        key: "downloadData",
        value: function downloadData() {
            var _this8 = this;

            $('#downloadButton').prop('disabled', true);
            $('#downloadButton').addClass("disabled");
            $('#downloadButton .glyphicon').addClass("spinning");
            setTimeout(function () {
                (0, _singleMarketRobotSimulatorSavezip2.default)({
                    config: _this8.editor.getValue(),
                    sims: _this8.sims,
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
            var _this9 = this;

            $('#uploadButton').prop('disabled', true);
            $('#uploadButton').addClass('disabled');
            $('#uploadButton .glyphicon').addClass("spinning");
            setTimeout(function () {
                (0, _singleMarketRobotSimulatorSavezip2.default)({
                    config: _this9.editor.getValue(),
                    sims: _this9.sims,
                    download: false }).then(function (zipBlob) {
                    _this9.DB.promiseUpload(zipBlob).then(function () {
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
        key: "renderTrash",
        value: function renderTrash() {
            var _this10 = this;

            $('#trashList').html("");
            var that = this;
            that.DB.promiseListRange(that.trashList, 0, 20).then(function (items) {
                items.forEach(function (item) {
                    $('#trashList').append('<pre class="pre-scrollable trash-item">' + JSON.stringify(item, null, 2) + '</pre>');
                });
                $('pre.trash-item').click(function () {
                    try {
                        var restoredScenario = JSON.parse($(_this10).text());
                        if ((typeof restoredScenario === "undefined" ? "undefined" : _typeof(restoredScenario)) === 'object' && typeof restoredScenario.title === 'string' && _typeof(restoredScenario.common) === 'object' && Array.isArray(restoredScenario.configurations)) {
                            that.editor.setValue(restoredScenario);
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
