# Baseball Video Manager

Baseball Video Manager is a Windows desktop application designed for efficient management of video files and other file types.

## Introduction

This program helps users easily manage video files and other file types. Key features include file listing, file execution, rating system, search functionality, duplicate data removal, and empty folder cleanup.
It was quickly and easily developed using .NET Windows Forms.

### Key Features:

- **File Listing**: View all managed files at a glance
- **File Execution**: Convenient file access with built-in execution feature
- **Execution History**: Automatically record and display the last execution time of each file
- **Rating System**: User evaluation and scoring functionality for files
- **Powerful Search**: Quickly find desired files
- **Data Cleanup**: Remove duplicate data and automatically clean up empty folders
- **Library Management**: Maintain efficient file structure through library system

## Tech Stack

![C#](https://img.shields.io/badge/c%23-%23239120.svg?style=for-the-badge&logo=c-sharp&logoColor=white)
![.Net](https://img.shields.io/badge/.NET-5C2D91?style=for-the-badge&logo=.net&logoColor=white)
![Windows Forms](https://img.shields.io/badge/Windows%20Forms-0078D6?style=for-the-badge&logo=windows&logoColor=white)

- C# 8.0
- .NET Framework 4.7.2
- Windows Forms
- Newtonsoft.Json 13.0.1

## Setup

### data Folder

The program uses JSON files in the `data` folder to manage information:

- `data/lib.json`: Stores library path information
- `data/media/files.json`: Stores video file information
- `data/file/files.json`: Stores information for other file types

### Important: lib.json Configuration

For the program to function correctly, the `data/lib.json` file must exist in the execution path. This file should contain directory path information for management.
In the current version, library paths cannot be changed directly within the app, so users must manually edit the `lib.json` file.

Example `lib.json`:
```json
[
  {
    "Idx": 1,
    "Path": "C:\\Videos"
  },
  {
    "Idx": 2,
    "Path": "D:\\Documents"
  }
]
```

## Supported File Types

Baseball Video Manager supports the following file types:

### Video Files
Supported video file extensions:
.avi, .mp4, .mov, .wmv, .avchd, .flv, .f4v, .swf, .mkv, .mpeg2, .ts, .tp

### Other Files
Supported extensions for other file types:
.zip, .7z, .ezc, .alzip, .001, .zpaq

The program automatically recognizes and manages files with these extensions. Video files and other file types are managed in separate tabs.

**Note**: Extension configuration is not yet supported.
Supported file types are defined in the extensionsMedia and extensionsFils arrays of the FileManager class.
You can modify these arrays to change the supported file types as needed.
