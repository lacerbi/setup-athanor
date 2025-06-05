This project is about creating a CLI "installer" (more accurately, a project bootstrapper or scaffolder) for **Athanor** (https://github.com/lacerbi/athanor), with a strong focus on the "start simple" approach. This tool would be a separate npm package designed to streamline the setup of a local, source-based instance of Athanor.

**I. Concept: The Athanor CLI Bootstrapper**

- **Purpose:** Not a traditional installer (like an `.exe` or `.dmg` that installs pre-compiled binaries). Instead, this CLI tool's primary goal is to **automate the setup of a local development or source-based instance of Athanor**. It's for users who want to run Athanor directly from its source code, potentially to contribute, customize, debug, or access the very latest (unreleased) changes.
- **Mechanism:** It would be a Node.js-based command-line tool, published as a separate package to the npm registry.
- **Invocation:** Users would typically run it using `npx` to ensure they're always using the latest version of the bootstrapper without needing a global installation. For example: `npx setup-athanor` or `npx athanor-init my-athanor-project`.
- **Outcome for User:** A new directory on their system containing a cloned copy of the Athanor source code, with all necessary dependencies installed, ready to be launched in development mode (e.g., via `npm start`).

**II. The "Start Simple" Philosophy & Core Functionality**

The initial version of this CLI tool would focus on the essentials to minimize complexity and effort while still providing significant value:

1.  **Clone Athanor Repository:**
    - The CLI will execute `git clone <Athanor_GitHub_Repo_URL> [target-directory]`.
    - The `[target-directory]` could be a name provided by the user as an argument (e.g., `my-athanor-instance`) or default to a standard name (e.g., `athanor`).
2.  **Install Dependencies:**
    - After successful cloning, the CLI will navigate into the newly created project directory.
    - It will then execute `npm ci` to install Athanor's dependencies precisely as defined in its `package-lock.json`. This ensures a clean and reproducible build.
3.  **User Feedback & Guidance:**

    - During the process, the CLI will provide simple, clear messages to the user, such as:
      - "Cloning Athanor from GitHub..."
      - "Installing Athanor's dependencies (this may take a few minutes)..."
    - Upon successful completion, it will output a confirmation message and explicit instructions on how to run Athanor:

      ```
      Success! Athanor has been set up in: /path/to/your/my-athanor-project

      To start Athanor, run the following commands:
        cd my-athanor-project
        npm start
      ```

**III. Technical Implementation (Simple Version)**

- **Separate npm Package:**
  - Initialize a new Node.js project for this CLI tool (e.g., `mkdir setup-athanor && cd setup-athanor && npm init`).
  - Its `package.json` would include:
    - `name`: e.g., `setup-athanor` (this is what users type after `npx`).
    - `version`: Start with `1.0.0` or similar.
    - `bin`: This field maps a command name to an executable file within your package. E.g., `"setup-athanor": "./index.js"`. This makes `index.js` runnable when the package is invoked via `npx`.
    - `dependencies`:
      - `execa`: A library to run external commands like `git` and `npm` more robustly and with better error handling than Node's built-in `child_process`.
      - (Optional but recommended) `chalk` or `kleur`: For adding color to console output, improving readability.
      - (Optional for v1) `inquirer` or `prompts`: If you want to interactively ask the user for the project name instead of just taking it as a command-line argument. For "start simple," a command-line argument is sufficient.
    - `engines`: Specify the Node.js versions it's compatible with.
- **Main Executable Script (e.g., `index.js`):**
  - Shebang: Start with `#!/usr/bin/env node` to make it executable.
  - **Argument Parsing:** Get the target directory name from `process.argv` (simple) or use a minimal argument parsing library if preferred.
  - **Command Execution:**
    1.  Use `execa` to run `git clone ...`. Check the result for errors.
    2.  Use `process.chdir()` to change into the new directory.
    3.  Use `execa` to run `npm ci`. Check the result for errors.
  - **Error Handling:** Implement basic try/catch blocks around command executions. If a command fails, print a helpful error message and exit with a non-zero code.
  - **Output:** Use `console.log()` (optionally with `chalk`) for user messages.

**IV. Prerequisites for the User (of the CLI tool):**

- **Node.js and npm:** Required to execute `npx` and subsequently for Athanor itself to run and install its packages. The CLI documentation should clearly state recommended Node versions.
- **Git:** Required for the `git clone` operation.
- The CLI tool could perform a basic check for these (e.g., try running `git --version`) and provide a helpful error if they're missing, though for a "start simple" version, clear documentation might suffice initially.

**V. What "Start Simple" Excludes (For Now):**

This initial approach deliberately avoids more complex features that add significant overhead, such as:

- **Automatic Generation of Desktop Shortcuts/Launch Scripts:** No `.bat`, `.sh`, `.lnk`, macOS `.app` wrappers, or Linux `.desktop` files will be created by this simple CLI. Creating these is platform-specific and complex.
- **Advanced Interactive Prompts:** Keep user interaction minimal (e.g., just the project name as an argument).
- **Automatic First Launch:** The simple version will tell the user _how_ to launch Athanor, but not launch it for them automatically (though this could be a relatively easy subsequent addition).
- **Sophisticated Environment Checks or Dependency Management:** Beyond basic Git/Node presence.
- **Complex Error Recovery Logic:** Basic error reporting is key, but complex recovery paths are out of scope for "start simple."

**VI. Benefits of the "Start Simple" CLI Bootstrapper:**

- **Significantly Lowers Barrier to Entry:** Makes it much easier for users (especially those less familiar with Git or complex npm workflows) to get a working source-code instance of Athanor.
- **Reduces Setup Errors:** Automates standard steps, reducing the chance of typos or missed steps.
- **Faster Onboarding:** Users can get to running Athanor more quickly.
- **Foundation for Future Enhancements:** Provides a solid base. If popular and useful, more features could be added incrementally.
- **Manageable Scope:** Keeps the initial development effort for this tool contained.

**VII. Maintenance (Simple Version):**

- Ensure the GitHub URL for Athanor in the CLI tool is correct.
- Verify that the core commands (`git clone`, `npm ci`, and the Athanor project's `npm start` command) remain compatible with Athanor's evolution.
- Occasionally update the CLI tool's own dependencies (like `execa`).

This "start simple" CLI bootstrapper offers a pragmatic and valuable way to make Athanor more accessible for users wishing to engage with its source code, without immediately diving into the complexities of full-blown traditional installers or highly sophisticated CLI features. It addresses the user's desire for a streamlined setup process effectively.
