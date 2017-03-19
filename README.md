single-market-robot-simulator-app-framework
===========================================

Provides an opinionated skeleton and logic for a webapp based on [single-market-robot-simulator](https://github.com/DrPaulBrewer/single-market-robot-simulator).

It is assumed that the goal is a comparitive study consisting of, say, simulation data from N different configurations of 
single-market-robot-simulator and various charts.

Here is a sampling of framework functions are available to help process a study:

`app.simulations(studyConfig)` Creates an array of new Simulations from the study configuration.

`app.getPeriods()` Number of periods in each simulation of the current study.

`app.setPeriods(n)` Set the number of periods to run in each simulation of the current study.

`app.getStudy()` Returns the current study.

`app.setStudy(studyConfig)` Sets the current study.

`app.run()` Runs the simulations for the current study

`app.stop()` Stops running the simulations for the current study.

`app.choose(n)` Choose study n from the saved list of studies.

`app.estimateTime()` Update the screen to show an estimate of how long it takes to run this study.

`app.interpolate()/app.duplicate()` Scale up a study to more buyers and sellers.

`app.undo()` Undo editing in the study editor.

`app.moveToTrash()` Move study configuration to trash can.

`app.save()` Save the edited study configuration to the saved list of studies, and prepare to run it.

`app.downloadData()` Download a .zip file of study simulation data and the original configuration.

`app.uploadData()` Upload to a cloud server a .zip file of a studies' simulation data and the original configuration.

`app.openZipFile()` Open a .zip file produced earlier with `app.downloadData()`

Does not provide HTML or CSS files, but makes assumptions about what might be there and what it means.

## Installation

    npm i single-market-robot-simulator-app-framework

## Usage

A full example ES6 Javascript webapp can be found in [robot-trading-webapp](https://github.com/DrPaulBrewer/robot-trading-webapp).
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

progressive features
====================
app.DB and window.JSONEditor/app.editor* are optional; leaving these undefined should be appropriate in apps that do not have to maintain a list of saved studies or allow editing by the end user

conventions and side-effects
============================
Some output is coded to be placed into particularly identified divs in the UI's HTML. Most of the time it is OK if a particular div does not exist, as a jQuery selector is used to find and modify it.


TODO
=====
Catalog of special div ids and classes.

More example apps












