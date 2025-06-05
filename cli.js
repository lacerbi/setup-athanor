#!/usr/bin/env node

// AI Summary: Main CLI script for setup-athanor. Clones Athanor repo and installs dependencies.
// Uses execa for shell commands and chalk for colored output. Entry point for npx setup-athanor.

import { execa } from 'execa';
import chalk from 'chalk';
import path from 'path';
import fs from 'fs/promises';

const ATHANOR_REPO_URL = 'https://github.com/lacerbi/athanor.git';

export async function checkPrerequisites() {
  const errors = [];
  
  // Check for Git
  try {
    await execa('git', ['--version']);
  } catch (error) {
    errors.push('Git is not installed or not in PATH');
  }
  
  // Check for npm (Node.js)
  try {
    await execa('npm', ['--version']);
  } catch (error) {
    errors.push('npm is not installed or not in PATH');
  }
  
  return errors;
}

export async function directoryExists(path) {
  try {
    const stats = await fs.stat(path);
    return stats.isDirectory();
  } catch {
    return false;
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
    const prerequisiteErrors = await checkPrerequisites();
    
    if (prerequisiteErrors.length > 0) {
      console.error(chalk.red.bold('\n❌ Prerequisites check failed:'));
      prerequisiteErrors.forEach(err => console.error(chalk.red(`  • ${err}`)));
      console.error(chalk.yellow('\nPlease install the missing dependencies and try again.'));
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

    // Step 1: Clone Athanor Repository
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

    // Step 3: Success message and instructions
    console.log(chalk.greenBright.bold('\n✨ Success! Athanor has been set up!\n'));
    console.log(chalk.white('📍 Location: ') + chalk.yellow(fullTargetPath));
    console.log(chalk.white('\nTo start Athanor, run:'));
    console.log(chalk.bgGray.white(`  cd ${targetDirectoryName}  `));
    console.log(chalk.bgGray.white(`  npm start           `));
    console.log('');

  } catch (error) {
    // Catch any unexpected errors
    console.error(chalk.redBright.bold('\n❌ An unexpected error occurred:'));
    console.error(chalk.red(error.stack || error.message));
    console.error(chalk.yellow('\nIf this persists, please report an issue at the setup-athanor repository.'));
    process.exit(1);
  }
}

// Run the main function only when executed directly (not when imported for testing)
if (process.argv[1] && process.argv[1].endsWith('cli.js')) {
  main().catch(error => {
    console.error(chalk.red.bold('\n❌ Fatal error:'));
    console.error(chalk.red(error));
    process.exit(1);
  });
}
