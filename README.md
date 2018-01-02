# single-market-robot-simulator-app-framework

# Warning: major changes in 4.0 onward

version 4.0 is a development version; early 4.0 versions may not be working code. Changes will first address use changes to create compatibility with Google Drive and cloud-based simulation.

The previously prepared documentation, below, possibly includes obsolete functions that are no longer possible to use.

### Overview: versions 1-3

Provides an opinionated skeleton and logic for a webapp based on [single-market-robot-simulator](https://github.com/DrPaulBrewer/single-market-robot-simulator).

It is assumed that the goal is a comparitive study consisting of, say, simulation data from N different configurations of single-market-robot-simulator and various charts.

An example app (see github drpaulbrewer/robot-trading-webapp) built from single-market-robot-simulator-app-framework is structured as a single webpage javascript app.  The page for that example app is divided into 7 tabs for different functional areas:

* app - Pick a study, run it, choose charts to view, download a .zip file of the data or upload to cloud.
* edit - Edit the configuration of the study, such as buyers values, sellers costs, number of buyers and sellers, robot type for each buyer and seller, Poisson rate of arrival for each buyer and seller, various market rules
* open (.zip file) - Open a .zip file of study data and original configuration, to make additional plots, or run more simulations of this type.
* scale up - Scaling up tool - Increase the number of buyers and sellers while simultaneously interpolating or duplicating the aggregate buyers values and sellers costs for consistency.
* Archive - Web based file storage area for simulation data
* Trash - Recyclcing center for study configurations that are thought to be no longer needed.
* Version - Software version technical information.

No matter how an app is rendered onto the page, these methods are crucial in defining what a study is. In principal a study
can be defined by any JavaScript Object and the properties are left, in practice, for interpretation by these functions:

`app.simulations(studyConfig)` Creates an array of new Simulations from the study configuration object whenever we need
to run the study or when we need properties of the un-run simulations of a study.

`app.getPeriods()` Number of periods in each simulation of the current study.

`app.setPeriods(n)` Set the number of periods to run in each simulation of the current study.

`app.getStudy()` Returns the current study.

`app.setStudy(studyConfig)` Sets the current study.

Each of the 7 tabs in the example app is supported by code in `single-market-robot-simulator-app-framework` as follows:

The app tab - choose a study, run it, stop running it, look at charts, get the data, abandon the study:

* `app.choose(n)` Choose study at index n from the list of saved study configurations
* `app.run()` Runs the simulations for the current study
* `app.stop()` Stops running the simulations for the current study.
* `app.estimateTime()` Update the screen to show an estimate of how long it takes to run this study.
* `app.downloadData()` Download a .zip file of study simulation data and the original configuration.
* `app.uploadData()` Upload to a cloud server a .zip file of a studies' simulation data and the original configuration.
* `app.moveToTrash()` Move study configuration to trash can.

The edit tab - edit the parameters of a study:

* editing delegated to window.JSONEditor if it exists, using the app constructor property `editorConfigSchema` and either the chosen study config or `editorStartValue`
* `app.save()` Save the edited study configuration to the saved list of studies, and reload browser to prepare to run it.
* `app.undo()` Undo editing in the study editor.

The open tab - restore a study's configuration *and* **data** from a .zip file:

* `app.openZipFile()` Open a .zip file produced earlier with `app.downloadData()`

The scale up tab - increase the number of buyers and sellers and adjust aggregate values and costs appropriately:

* `app.interpolate()/app.duplicate()` Scale up a study to more buyers and sellers.

The Archive tab -- redirects user to an appropriate URL where data is archived

The Trash tab - a collection of abandoned configuration studies, with option to restore to the editor

Does not provide HTML or CSS files, but makes assumptions about what might be there and what it means.

## Creating Subclasses

This information is necessarily incomplete, but may be enough to get a good start.

To create your own simulator with a simplified or specialized editor, you would need to create a subclass of App overriding `app.simulations()` to translate from your study object format to an array of Simulations in the configuration format required by single-robot-market-simulator.  You would also probably need to override `app.getPeriods()` and `app.setPeriods()` if the number of periods is not stored in `study.common.periods`

A JSON Schema listing the fields required by the editor to create a new study, or edit an existing one, must be supplied in the property `editorConfigSchema` and an example study configuration set in `editorStartValue`.  It is also possible
to set up a saved list of studies in localStorage or in a remote database.  For samples of such a schema and values, I refer again to the example app in the separate github repository at **robot-trading-webapp**  -- look in [`./json/configSchema.json`](https://raw.githubusercontent.com/DrPaulBrewer/robot-trading-webapp/b7693c5bce293d1561ce3db78b2e10ea535ce9be/json/configSchema.json) for the schema and [`./json/examples-highlow.json`](https://raw.githubusercontent.com/DrPaulBrewer/robot-trading-webapp/b7693c5bce293d1561ce3db78b2e10ea535ce9be/json/examples-highlow.json) for an example configuration.

## Installation

    npm i single-market-robot-simulator-app-framework

## Usage

A full example ES6 Javascript webapp can be found in [robot-trading-webapp](https://github.com/DrPaulBrewer/robot-trading-webapp).
Here is a snippet that shows initialization and usage.

```javascript
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

## progressive features

app.DB and window.JSONEditor/app.editor* are optional; leaving these undefined should be appropriate in apps that do not have to maintain a list of saved studies or allow editing by the end user

## conventions and side-effects

Some output is coded to be placed into particularly identified divs in the UI's HTML. Most of the time it is OK if a particular div does not exist, as a jQuery selector is used to find and modify it.

## Catalog of special HTML ids and classes

### ids

* downloadButton -- button to click to download zipfile of study data
* editLink -- link to click to force switch to the "editor" tab
* paramPlot*n* -- receives parameter plot n=1,2,3,4,...
* resultPlot*n* -- receives study result plot n=1,2,3,4,....
* runButton -- button to click to run study (only accessed to spin associated glyphicon)
* runError -- currenty receives only notice to click Run because study has changed (deprecate?)
* selector -- study `<select>` element to choose from saved study configurations
* trashList -- receives list of abandoned study configurations with option to restore
* uploadBytton -- button to click to upload zipfile of study data
* vizselect -- visualization `<select>` element to choose from charts and plots
* xfactor -- input element for expansion factor for interploate/duplicate to multiply numberOfBuyers and numberOfSellers
* xsimbs -- receives table for numberOfBuyers and numberOfSellers for current study

### classes

* configTitle -- receives title of current study 
* estimated-running-time -- receives estimates of current study running time
* openzip-button -- button to click to open the selected zip file
* openzip-file -- `<input type=file>` for selecting zip file to open, holds reference to chosen file
* openzip-progress -- receives progress reports from openZipFile while unzipping/restoring study data
* paramPlot -- receives parameter plots
* periods -- reeives number of periods for next run of current study
* postrun -- disabled when running study, un-disabled on completion or error
* spinning -- invokes CSS spin animation
* trash-item -- an item in the trashList


## TODO

* More example apps
