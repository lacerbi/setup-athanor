#!/usr/bin/env node

// AI Summary: Main CLI script for setup-athanor. Clones Athanor repo and installs dependencies.
// Uses execa for shell commands and chalk for colored output. Entry point for npx setup-athanor.
// Fallback to ZIP download when Git is unavailable.

import { execa } from 'execa';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';
import https from 'https';
import os from 'os';
import { pipeline } from 'stream/promises';
import unzipper from 'unzipper';
import readline from 'readline';
import { fileURLToPath } from 'url';
import { realpathSync } from 'fs';

const ATHANOR_REPO_URL = 'https://github.com/lacerbi/athanor.git';
const ATHANOR_ZIP_URL = 'https://github.com/lacerbi/athanor/archive/refs/heads/main.zip';

export async function checkPrerequisites() {
  const prerequisites = {
    git: true,
    npm: true
  };
  
  // Check for Git
  try {
    await execa('git', ['--version']);
  } catch (error) {
    prerequisites.git = false;
  }
  
  // Check for npm (Node.js)
  try {
    await execa('npm', ['--version']);
  } catch (error) {
    prerequisites.npm = false;
  }
  
  return prerequisites;
}

export async function directoryExists(path) {
  try {
    const stats = await fs.stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

async function downloadAndExtract(targetPath) {
  // Create temporary directory
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'athanor-download-'));
  
  try {
    // Download ZIP file
    await new Promise((resolve, reject) => {
      https.get(ATHANOR_ZIP_URL, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          https.get(response.headers.location, (redirectResponse) => {
            if (redirectResponse.statusCode !== 200) {
              reject(new Error(`Failed to download: HTTP ${redirectResponse.statusCode}`));
              return;
            }
            
            const extractStream = unzipper.Extract({ path: tempDir });
            
            extractStream.on('error', reject);
            extractStream.on('close', resolve);
            
            redirectResponse.pipe(extractStream);
          }).on('error', reject);
          return;
        }
        
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: HTTP ${response.statusCode}`));
          return;
        }
        
        const extractStream = unzipper.Extract({ path: tempDir });
        
        extractStream.on('error', reject);
        extractStream.on('close', resolve);
        
        response.pipe(extractStream);
      }).on('error', reject);
    });
    
    // Find the extracted directory (should be 'athanor-main')
    const tempContents = await fs.readdir(tempDir);
    const extractedDir = tempContents.find(item => item.startsWith('athanor-'));
    
    if (!extractedDir) {
      throw new Error('Could not find extracted Athanor directory');
    }
    
    const extractedPath = path.join(tempDir, extractedDir);
    
    // Move the extracted directory to the target location
    await fs.rename(extractedPath, targetPath);
    
  } finally {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      // Log warning but don't fail the entire operation
      console.warn(chalk.yellow(`Warning: Could not clean up temporary directory: ${tempDir}`));
    }
  }
}

export async function main() {
  console.log(chalk.blue.bold('\n🚀 Athanor Setup Bootstrapper\n'));

  try {
    // Parse command line arguments
    const targetDirectoryArg = process.argv[2];
    const targetDirectoryName = targetDirectoryArg || 'athanor';
    const fullTargetPath = path.resolve(targetDirectoryName);

    // Check prerequisites
    console.log(chalk.cyan('Checking prerequisites...'));
    const prerequisites = await checkPrerequisites();
    
    // npm is always required
    if (!prerequisites.npm) {
      console.error(chalk.red.bold('\n❌ Prerequisites check failed:'));
      console.error(chalk.red('  • npm is not installed or not in PATH'));
      console.error(chalk.yellow('\nPlease install Node.js and npm, then try again.'));
      process.exit(1);
    }
    
    console.log(chalk.green('✓ Prerequisites check passed'));
    
    // Check if target directory already exists
    if (await directoryExists(fullTargetPath)) {
      console.error(chalk.red.bold(`\n❌ Directory already exists: ${fullTargetPath}`));
      console.error(chalk.yellow('Please choose a different directory name or remove the existing directory.'));
      process.exit(1);
    }

    console.log(chalk.green(`\n📁 Target directory: ${fullTargetPath}`));

    // Ask for user confirmation
    console.log(chalk.cyan('\nThis will:'));
    console.log(chalk.white('  • Clone the Athanor repository'));
    console.log(chalk.white('  • Install all dependencies'));
    console.log(chalk.white('  • Compile a native desktop application'));
    console.log(chalk.white('  • Set up a ready-to-use Athanor installation'));

    const confirmed = await new Promise((resolve) => {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      rl.question(chalk.yellow('Do you want to proceed? (y/n) '), (answer) => {
        rl.close();
        resolve(answer.trim().toLowerCase() === 'y');
      });
    });

    if (!confirmed) {
      console.log(chalk.red('\nInstallation cancelled.'));
      process.exit(0);
      return; // Ensure function stops in test environment where process.exit is mocked
    }

    // Step 1: Get Athanor Repository (Git or ZIP fallback)
    if (prerequisites.git) {
      console.log(chalk.cyan(`\n1. Cloning Athanor repository...`));
      console.log(chalk.gray(`   From: ${ATHANOR_REPO_URL}`));
      console.log(chalk.gray(`   To: ./${targetDirectoryName}`));
      
      const cloneSpinner = chalk.yellow('⏳ This may take a moment...');
      console.log(cloneSpinner);
      
      try {
        await execa('git', ['clone', ATHANOR_REPO_URL, targetDirectoryName]);
        console.log(chalk.green('✓ Repository cloned successfully'));
      } catch (error) {
        console.error(chalk.red.bold('\n❌ Failed to clone repository'));
        if (error.stderr && error.stderr.includes('fatal: destination path')) {
          console.error(chalk.red('The target directory already exists.'));
        } else if (error.stderr && error.stderr.includes('Could not resolve host')) {
          console.error(chalk.red('Network error: Unable to reach GitHub.'));
          console.error(chalk.yellow('Please check your internet connection.'));
        } else {
          console.error(chalk.red(`Git error: ${error.stderr || error.message}`));
        }
        process.exit(1);
      }
    } else {
      // Git not available - use ZIP download fallback
      console.log(chalk.yellow.bold('\n⚠️  Git not found on your system.'));
      console.log(chalk.yellow('   For better version control support, consider installing Git.'));
      console.log(chalk.yellow('   Proceeding with ZIP download instead...\n'));
      
      console.log(chalk.cyan(`1. Downloading Athanor repository (ZIP)...`));
      console.log(chalk.gray(`   From: ${ATHANOR_ZIP_URL}`));
      console.log(chalk.gray(`   To: ./${targetDirectoryName}`));
      
      const downloadSpinner = chalk.yellow('⏳ Downloading and extracting...');
      console.log(downloadSpinner);
      
      try {
        await downloadAndExtract(fullTargetPath);
        console.log(chalk.green('✓ Repository downloaded and extracted successfully'));
      } catch (error) {
        console.error(chalk.red.bold('\n❌ Failed to download repository'));
        if (error.message.includes('HTTP')) {
          console.error(chalk.red('Network error: Unable to reach GitHub.'));
          console.error(chalk.yellow('Please check your internet connection.'));
        } else {
          console.error(chalk.red(`Download error: ${error.message}`));
        }
        process.exit(1);
      }
    }

    // Step 2: Install Dependencies
    console.log(chalk.cyan(`\n2. Installing dependencies...`));
    console.log(chalk.gray('   Running npm ci in the cloned directory'));
    console.log(chalk.yellow('⏳ This may take several minutes...'));
    
    try {
      // Use npm ci for clean, reproducible install
      await execa('npm', ['ci'], { 
        cwd: fullTargetPath,
        stdio: ['inherit', 'pipe', 'pipe'] // Show npm progress
      });
      console.log(chalk.green('✓ Dependencies installed successfully'));
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Failed to install dependencies'));
      
      // Check for common npm errors
      if (error.stderr && error.stderr.includes('package-lock.json')) {
        console.error(chalk.red('Missing or invalid package-lock.json file.'));
        console.error(chalk.yellow('Attempting to use npm install instead...'));
        
        // Fallback to npm install
        try {
          await execa('npm', ['install'], { 
            cwd: fullTargetPath,
            stdio: ['inherit', 'pipe', 'pipe']
          });
          console.log(chalk.green('✓ Dependencies installed successfully (using npm install)'));
        } catch (installError) {
          console.error(chalk.red('npm install also failed:'));
          console.error(chalk.red(installError.stderr || installError.message));
          process.exit(1);
        }
      } else if (error.stderr && error.stderr.includes('EACCES')) {
        console.error(chalk.red('Permission denied error.'));
        console.error(chalk.yellow('You may need to fix npm permissions or use a Node version manager.'));
        process.exit(1);
      } else {
        console.error(chalk.red(`npm error: ${error.stderr || error.message}`));
        process.exit(1);
      }
    }

    // Step 3: Compile Application
    console.log(chalk.cyan(`\n3. Compiling Athanor application...`));
    console.log(chalk.gray('   Building native desktop application'));
    console.log(chalk.yellow('⏳ This may take several minutes...'));
    
    try {
      await execa('npm', ['run', 'package'], { 
        cwd: fullTargetPath,
        stdio: ['inherit', 'pipe', 'pipe']
      });
      console.log(chalk.green('✓ Application compiled successfully'));
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Failed to compile application'));
      console.error(chalk.red(`Build error: ${error.stderr || error.message}`));
      console.error(chalk.yellow('\nTo try again manually:'));
      console.error(chalk.white(`  cd ${targetDirectoryName}`));
      console.error(chalk.white(`  npm run package`));
      process.exit(1);
    }

    // Step 4: Success message and platform-specific instructions
    console.log(chalk.greenBright.bold('\n✨ Success! Athanor has been compiled and is ready to use!\n'));
    console.log(chalk.white('📍 Location: ') + chalk.yellow(fullTargetPath));
    
    // Provide platform-specific instructions
    const platform = os.platform();
    console.log(chalk.white('\nYour compiled Athanor application is ready:'));
    
    switch (platform) {
      case 'darwin': // macOS
        console.log(chalk.bgGray.white(`  Open: ${targetDirectoryName}/out/Athanor-darwin-*/Athanor.app  `));
        console.log('');
        console.log(chalk.yellow.bold('📋 macOS Users - Important:'));
        console.log(chalk.yellow('   If macOS prevents opening (Gatekeeper), right-click the app'));
        console.log(chalk.yellow('   and select "Open" to bypass the security warning.'));
        break;
        
      case 'win32': // Windows
        console.log(chalk.bgGray.white(`  Run: ${targetDirectoryName}\\out\\Athanor-win32-*\\Athanor.exe  `));
        break;
        
      default: // Linux and others
        console.log(chalk.bgGray.white(`  Run: ${targetDirectoryName}/out/Athanor-linux-*/Athanor  `));
        break;
    }
    
    console.log('');

  } catch (error) {
    // Catch any unexpected errors
    console.error(chalk.redBright.bold('\n❌ An unexpected error occurred:'));
    console.error(chalk.red(error.stack || error.message));
    console.error(chalk.yellow('\nIf this persists, please report an issue at the setup-athanor repository.'));
    process.exit(1);
  }
}

// Run the main function only when this script is the entry point.
// This is a robust way to handle direct execution (`node cli.js`),
// execution via `npx`, and global installs, while preventing the script
// from running automatically when imported by another module (e.g., tests).
// It works by comparing the real file path of the executed script
// (resolving any symlinks) with the real file path of this module.
let isMainModule = false;
if (process.argv[1]) {
  try {
    const scriptPath = realpathSync(process.argv[1]);
    const modulePath = fileURLToPath(import.meta.url);
    isMainModule = scriptPath === modulePath;
  } catch {
    // This can fail if process.argv[1] is not a valid file path (e.g., in the REPL).
    // In that case, we don't want to run main(), so we can safely ignore the error.
  }
}

if (isMainModule) {
  main().catch(error => {
    console.error(chalk.red.bold('\n❌ Fatal error:'));
    console.error(chalk.red(error));
    process.exit(1);
  });
}
