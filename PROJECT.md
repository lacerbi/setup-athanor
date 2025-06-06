# `setup-athanor`

`setup-athanor` is a command-line interface (CLI) tool for bootstrapping a local, source-based instance of **Athanor** (https://github.com/lacerbi/athanor). It provides a simple, one-command setup for developers who want to run Athanor directly from its source code to contribute, customize, or access the latest unreleased changes.

## Core Features

- **One-Command Setup:** Get a complete Athanor source-code instance running with a single command.
- **Git Integration:** Clones the Athanor repository using `git` for full version control history.
- **Automatic Fallback:** If `Git` is not installed, it automatically downloads and extracts the latest version of the repository as a ZIP file.
- **Robust Dependency Installation:** Uses `npm ci` for a clean, reproducible build. Automatically falls back to `npm install` if `package-lock.json` is missing or invalid.
- **Prerequisite Checks:** Verifies that `Node.js` and `npm` are available before starting.
- **Clear Feedback:** Provides colorful, easy-to-understand progress messages and instructions.

## Usage

To use the bootstrapper, run the following command in your terminal. `npx` ensures you are always using the latest version of the tool.

```bash
npx setup-athanor [athanor-installation-folder]
```

- `[athanor-installation-folder]` is optional. If you don't provide a name, it will default to `athanor`.

Upon completion, you will have a new directory with the Athanor source code and all dependencies installed.

## How to Run Athanor After Setup

```bash
cd [athanor-installation-folder]
npm start
```

## Prerequisites

- **Node.js and npm:** Required to run the bootstrapper and Athanor itself. (Node.js `>=18.0.0` is required).
- **Git:** Recommended for cloning the repository. The tool will fall back to a ZIP download if Git is not available.

## Technical Overview

The tool is a simple Node.js script that automates the following steps:

1.  **Parses Arguments:** Determines the target directory for the installation.
2.  **Checks Prerequisites:** Verifies `npm` is installed and checks for `git`.
3.  **Checks Target Directory:** Ensures the target directory does not already exist to prevent overwriting.
4.  **Fetches Source Code:**
    - **Primary Method:** Executes `git clone` to download the repository.
    - **Fallback Method:** If `git` is unavailable, it downloads and extracts the repository from a ZIP archive.
5.  **Installs Dependencies:**
    - Changes into the new project directory.
    - Executes `npm ci` for a precise dependency installation.
    - If `npm ci` fails, it attempts a recovery by running `npm install`.
6.  **Provides Instructions:** Displays a success message with clear commands on how to launch Athanor.

The project uses `execa` for robust execution of external commands, `chalk` for styling console output, and `unzipper` for the ZIP extraction fallback.
