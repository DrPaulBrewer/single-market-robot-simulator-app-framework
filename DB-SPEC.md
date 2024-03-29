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
* a `.role` field set to "Econ1.Net Study Folder"
* an `.id` token needed to create new files in this folder or trash the folder

A study folder contains or otherwise can retrieve these files:
* config.json JSON configuration for running new realizations of this study.
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

### DB.createStudyFolder({name})=>StudyFolder
### StudyFolder.getConfig()=>({config,folder})
### StudyFolder.setConfig({config})
### StudyFolder.listFiles()=>[list of file objects, each with a .name property, and possibly other properties]
### StudyFolder.download({name, id})=>contents of file from file object containing .name or .id or both
### StudyFolder.upload({name, contents, blob, onProgress}) => uploads file, responsible for upload/clobber-prevention logic


## Removed features (Notes 2022-may;  actual removal was earlier)

Descriptions seem like a good idea but can get in the way of users trying new things. Also descriptions
can be stale even with the lock-in once data exists.

* a human readable `.description` in plain text, must be unique within primary older
* search term searches descriptions

Similarly trash seems like a good idea, but it is duplicating the wheel.  The drive app and other apps have
ways to delete items.

### StudyFolder.trash()
### StudyFolder.untrash()
