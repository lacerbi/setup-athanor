# ⚗️ Athanor — AI Workbench (setup)

> _where modern alchemists cook_

[![Version](https://img.shields.io/github/package-json/v/lacerbi/setup-athanor?label=Version)](https://github.com/lacerbi/athanor)
[![Node.js CI](https://github.com/lacerbi/setup-athanor/actions/workflows/ci.yml/badge.svg)](https://github.com/lacerbi/setup-athanor/actions/workflows/ci.yml)
[![Sponsor me on GitHub](https://img.shields.io/badge/Sponsor-%E2%9D%A4-%23db61a2.svg?logo=GitHub)](https://github.com/sponsors/lacerbi)
[![Node.js >=18.x](https://img.shields.io/badge/Node.js-%3E%3D18.x-brightgreen)](https://nodejs.org/)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

**`setup-athanor` is the official installer for **[Athanor](https://athanor.works/)**, an AI workbench for developers and creators.**

This simple, one-command CLI tool downloads and configures Athanor on your local machine, creating a ready-to-run application from the source code.

For full details on what Athanor is and how to use it, please visit the [Athanor website](https://athanor.works/) and [its main repository](https://github.com/lacerbi/athanor).

## What is Athanor?

> Athanor is a desktop app for AI-assisted workflows, from coding to technical writing. **Athanor does not require API keys.**
>
> Open a project folder, select files, specify your task, and quickly create effective prompts with all the relevant context to paste into any LLM chat interface like ChatGPT, Claude, or Gemini. Athanor then assists in efficiently integrating the AI-generated responses back into your project or codebase, ensuring **you remain in full control of all changes while minimizing tedious copy-paste**.

## Usage

To set up a local Athanor instance, run the following command in your terminal:

```bash
npx setup-athanor [athanor-installation-folder]
```

- `[athanor-installation-folder]` is optional. If you don't provide a name, it will default to `athanor`.

This command will:

1.  Clone the Athanor repository (or download a ZIP if Git is not installed).
2.  Install all necessary dependencies.
3.  Provide you with a ready-to-use local instance.

## Prerequisites

- **Node.js and npm:** Required to run the bootstrapper and Athanor itself. (Node.js `>=18.0.0` is recommended).
- **Git:** Recommended for cloning the repository with full version history. The tool will fall back to a ZIP download if Git is not available.

## How to Run Athanor After Setup

Once the setup is complete, you can launch Athanor by running:

```bash
cd [athanor-installation-folder]
npm start
```

## About This Repository

This repository contains the source code for the `setup-athanor` utility itself. If you encounter issues or have suggestions specifically for this setup tool, please [open an issue](https://github.com/lacerbi/setup-athanor/issues).

For all matters concerning Athanor—including feature requests, bug reports, and contributions—please refer to the [main Athanor repository](https://github.com/lacerbi/athanor).

## License

This project is licensed under the [Apache-2.0 License](LICENSE).
