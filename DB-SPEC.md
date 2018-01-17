# DB specification: DRAFT 20180116

This document specifies the expected behavior of the database component as of version 4.

The db-googledrive database is expected to provide all features.  

Others must provide the same calls, but can throw "unsupported feature" for unsupported features.

## Database contents

A database contains
* primary folders
* study folders
* trash folders

Each primary folder
* is uniquely named from the gmail account name before the @, e.g. someone@gmail.com ==> "Econ1Net-someone"
* contains zero or more study folders

Each study folder has metadata for these items:
* a human readable `.name` of the folder, must be unique within primary folder
* a human readable `.description` in plain text, must be unique within primary older
* a `.role` field set to "Econ1.Net Study Folder"
* an `.id` token needed to create new files in this folder or trash the folder

A study folder contains or otherwise can retrieve these files:
* config.json JSON configuration for running new realizations of this study.
* optional zero or one schema.json file containing JSON schema for displaying configuration options in JSONEditor
These are uploaded into a study folder as the result of data production
* optional zero or more dated .zip files containing a completed data realization for this study.  
* optional image files
* optional .xls files or sheets (<50MB)

## Behavior

all behavior is via `async function`

### private DB.myPrimaryFolder()
* probably called internaly, only in DB.createStudyFolder()

### DB.listStudyFolders({trashed: true| false })=>Array[StudyFolder]
* ordered with most recent first
* search term searches descriptions

### DB.createStudyFolder(name)=>StudyFolder

### StudyFolder.trash()
### StudyFolder.untrash()
### StudyFolder.getConfig()=>({config,schema,folder})
### StudyFolder.setConfig({config,schema})
### StudyFolder.listFiles()=>[list of filenames]
### StudyFolder.download(name)=>contents of file
### StudyFolder.upload(name, contents)


