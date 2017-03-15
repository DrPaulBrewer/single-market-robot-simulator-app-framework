single-market-robot-simulator-app-framework
===========================================

Provides an opinionated skeleton and logic for a webapp based on single-market-robot-simulator.
Does not provide HTML or CSS files, but makes assumptions about what might be there and what it means.

## Installation

    npm i single-market-robot-simulator-app-framework

## Usage

A full example ES6 Javascript webapp can be found in robot-trading-webapp.
Here is a snippet that shows initialization and usage.

```
import * as AF from "single-market-robot-simulator-app-framework"
...
const app = new AF.App({
    SMRS,  // a (possibly forked or modified) reference to the module single-market-robot-simulator 
    DB,    // an instance of single-market-robot-simulator-db-{webdismay,local}
    Visuals, //  visualizations object, by number of periods (small, medium, large) to be interpreted by single-market-robot-simulator-viz-plotly
    behavior, // an array of UI events and app methods to call [jquerySelector, app method to call, optional event name] 
    saveList:  "v1:saveList:active",  // name of saveList of simulation configurations in external database
    trashList: "v1:trashList",  // name of trashList in external database, consists of discards from saveList
    editorConfigSchema: configSchema, // JSON schema for user-configurable simulation -- consumer by  JSON Editor UI component
    editorStartValue: examplesHighLow // initial value for editor, only used if nothing in saveList
});
...
$(function(){
    app.init();
});
```

conventions and side-effects
============================
Some output is coded to be placed into particularly identified divs in the UI's HTML. Most of the time it is OK if a particular
div does not exist, as jQuery is used to find and act on it.


TODO
=====
Catalog of special div ids and classes.

Features should be made progressive. For example, omitting json-editor should result in a simulator that can not be adjusted,
not one that does not function at all.











