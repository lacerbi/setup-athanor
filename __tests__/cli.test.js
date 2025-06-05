// AI Summary: Comprehensive test suite for cli.js helper functions and main CLI logic.
// Tests checkPrerequisites, directoryExists, and main execution flow with extensive mocking.

import { jest } from '@jest/globals';

// Mock external modules before importing
jest.unstable_mockModule('execa', () => ({
  execa: jest.fn(),
}));

// Mock fs/promises with a proper stat function
const mockStat = jest.fn();
jest.unstable_mockModule('fs/promises', () => ({
  stat: mockStat,
  default: {
    stat: mockStat,
  },
}));

// Import modules after mocks are set up
const { execa } = await import('execa');
const { checkPrerequisites, directoryExists, main } = await import('../cli.js');

describe('CLI Tests', () => {
  let mockExit;
  let mockChdir;
  let mockConsoleLog;
  let mockConsoleError;
  let originalArgv;
  let originalCwd;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStat.mockClear();
    
    // Mock process methods
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    mockChdir = jest.spyOn(process, 'chdir').mockImplementation(() => {});
    
    // Mock console methods
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    
    // Store original values
    originalArgv = process.argv;
    originalCwd = process.cwd();
  });

  afterEach(() => {
    // Restore all mocks
    mockExit.mockRestore();
    mockChdir.mockRestore();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    
    // Restore original argv
    process.argv = originalArgv;
  });

  describe('checkPrerequisites', () => {
    it('should return empty array when both git and npm are available', async () => {
      execa.mockResolvedValue({ stdout: 'git version 2.30.0' });
      
      const errors = await checkPrerequisites();
      
      expect(errors).toEqual([]);
      expect(execa).toHaveBeenCalledWith('git', ['--version']);
      expect(execa).toHaveBeenCalledWith('npm', ['--version']);
      expect(execa).toHaveBeenCalledTimes(2);
    });

    it('should return error when git is not available', async () => {
      execa
        .mockRejectedValueOnce(new Error('Command not found: git'))
        .mockResolvedValueOnce({ stdout: 'npm version 8.0.0' });
      
      const errors = await checkPrerequisites();
      
      expect(errors).toEqual(['Git is not installed or not in PATH']);
      expect(execa).toHaveBeenCalledWith('git', ['--version']);
      expect(execa).toHaveBeenCalledWith('npm', ['--version']);
    });

    it('should return error when npm is not available', async () => {
      execa
        .mockResolvedValueOnce({ stdout: 'git version 2.30.0' })
        .mockRejectedValueOnce(new Error('Command not found: npm'));
      
      const errors = await checkPrerequisites();
      
      expect(errors).toEqual(['npm is not installed or not in PATH']);
      expect(execa).toHaveBeenCalledWith('git', ['--version']);
      expect(execa).toHaveBeenCalledWith('npm', ['--version']);
    });

    it('should return both errors when neither git nor npm are available', async () => {
      execa
        .mockRejectedValueOnce(new Error('Command not found: git'))
        .mockRejectedValueOnce(new Error('Command not found: npm'));
      
      const errors = await checkPrerequisites();
      
      expect(errors).toEqual([
        'Git is not installed or not in PATH',
        'npm is not installed or not in PATH'
      ]);
    });
  });

  describe('directoryExists', () => {
    it('should return true when directory exists', async () => {
      mockStat.mockResolvedValue({
        isDirectory: () => true
      });
      
      const result = await directoryExists('/some/path');
      
      expect(result).toBe(true);
      expect(mockStat).toHaveBeenCalledWith('/some/path');
    });

    it('should return false when path exists but is not a directory', async () => {
      mockStat.mockResolvedValue({
        isDirectory: () => false
      });
      
      const result = await directoryExists('/some/file.txt');
      
      expect(result).toBe(false);
      expect(mockStat).toHaveBeenCalledWith('/some/file.txt');
    });

    it('should return false when path does not exist', async () => {
      mockStat.mockRejectedValue(new Error('ENOENT: no such file or directory'));
      
      const result = await directoryExists('/nonexistent/path');
      
      expect(result).toBe(false);
      expect(mockStat).toHaveBeenCalledWith('/nonexistent/path');
    });

    it('should return false when stat throws any error', async () => {
      mockStat.mockRejectedValue(new Error('Permission denied'));
      
      const result = await directoryExists('/restricted/path');
      
      expect(result).toBe(false);
      expect(mockStat).toHaveBeenCalledWith('/restricted/path');
    });
  });

  describe('main function', () => {
    beforeEach(() => {
      // Mock successful prerequisites check by default
      execa.mockImplementation((cmd, args) => {
        if (cmd === 'git' && args[0] === '--version') {
          return Promise.resolve({ stdout: 'git version 2.30.0' });
        }
        if (cmd === 'npm' && args[0] === '--version') {
          return Promise.resolve({ stdout: '8.0.0' });
        }
        if (cmd === 'git' && args[0] === 'clone') {
          return Promise.resolve({ stdout: 'Cloning into...' });
        }
        if (cmd === 'npm' && args[0] === 'ci') {
          return Promise.resolve({ stdout: 'Dependencies installed' });
        }
        return Promise.resolve({ stdout: '' });
      });
      
      // Mock directory doesn't exist by default
      mockStat.mockRejectedValue(new Error('ENOENT: no such file or directory'));
    });

    it('should successfully setup Athanor with custom directory name', async () => {
      // Set command line arguments
      process.argv = ['node', 'cli.js', 'my-custom-athanor'];
      
      await main();
      
      // Verify no exit was called (success scenario)
      expect(mockExit).not.toHaveBeenCalled();
      
      // Verify prerequisite checks were performed
      expect(execa).toHaveBeenCalledWith('git', ['--version']);
      expect(execa).toHaveBeenCalledWith('npm', ['--version']);
      
      // Verify directory existence check
      expect(mockStat).toHaveBeenCalledWith(expect.stringContaining('my-custom-athanor'));
      
      // Verify git clone was called
      expect(execa).toHaveBeenCalledWith('git', ['clone', 'https://github.com/lacerbi/athanor.git', 'my-custom-athanor']);
      
      // Verify npm ci was called
      expect(execa).toHaveBeenCalledWith('npm', ['ci'], expect.objectContaining({
        cwd: expect.stringContaining('my-custom-athanor'),
        stdio: ['inherit', 'pipe', 'pipe']
      }));
      
      // Verify success messages were logged
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('🚀 Athanor Setup Bootstrapper'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✨ Success! Athanor has been set up!'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('cd my-custom-athanor'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('npm start'));
    });

    it('should successfully setup Athanor with default directory name', async () => {
      // Set command line arguments with no custom directory
      process.argv = ['node', 'cli.js'];
      
      await main();
      
      // Verify no exit was called (success scenario)
      expect(mockExit).not.toHaveBeenCalled();
      
      // Verify prerequisite checks were performed
      expect(execa).toHaveBeenCalledWith('git', ['--version']);
      expect(execa).toHaveBeenCalledWith('npm', ['--version']);
      
      // Verify directory existence check with default name
      expect(mockStat).toHaveBeenCalledWith(expect.stringContaining('athanor'));
      
      // Verify git clone was called with default directory
      expect(execa).toHaveBeenCalledWith('git', ['clone', 'https://github.com/lacerbi/athanor.git', 'athanor']);
      
      // Verify npm ci was called
      expect(execa).toHaveBeenCalledWith('npm', ['ci'], expect.objectContaining({
        cwd: expect.stringContaining('athanor'),
        stdio: ['inherit', 'pipe', 'pipe']
      }));
      
      // Verify success messages were logged with default directory name
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✨ Success! Athanor has been set up!'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('cd athanor'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('npm start'));
    });

    it('should display progress messages during execution', async () => {
      process.argv = ['node', 'cli.js', 'test-dir'];
      
      await main();
      
      // Verify progress messages are shown
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Checking prerequisites...'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Prerequisites check passed'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('1. Cloning Athanor repository...'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Repository cloned successfully'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('2. Installing dependencies...'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Dependencies installed successfully'));
    });
  });

  describe('main function error handling', () => {
    it('should exit with error when prerequisites check fails', async () => {
      process.argv = ['node', 'cli.js', 'test-dir'];
      
      // Mock prerequisite failures
      execa.mockImplementation((cmd, args) => {
        if (cmd === 'git' && args[0] === '--version') {
          return Promise.reject(new Error('Command not found: git'));
        }
        if (cmd === 'npm' && args[0] === '--version') {
          return Promise.reject(new Error('Command not found: npm'));
        }
        return Promise.resolve({ stdout: '' });
      });
      
      await main();
      
      // Verify exit with error code
      expect(mockExit).toHaveBeenCalledWith(1);
      
      // Verify error messages were logged
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('❌ Prerequisites check failed:'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Git is not installed or not in PATH'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('npm is not installed or not in PATH'));
    });

    it('should exit with error when target directory already exists', async () => {
      process.argv = ['node', 'cli.js', 'existing-dir'];
      
      // Mock prerequisites success
      execa.mockImplementation((cmd, args) => {
        if (cmd === 'git' && args[0] === '--version') {
          return Promise.resolve({ stdout: 'git version 2.30.0' });
        }
        if (cmd === 'npm' && args[0] === '--version') {
          return Promise.resolve({ stdout: '8.0.0' });
        }
        return Promise.resolve({ stdout: '' });
      });
      
      // Mock directory exists
      mockStat.mockResolvedValue({
        isDirectory: () => true
      });
      
      await main();
      
      // Verify exit with error code
      expect(mockExit).toHaveBeenCalledWith(1);
      
      // Verify error messages were logged
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('❌ Directory already exists:'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('existing-dir'));
    });

    it('should handle git clone network error', async () => {
      process.argv = ['node', 'cli.js', 'test-dir'];
      
      // Mock prerequisites success and directory doesn't exist
      execa.mockImplementation((cmd, args) => {
        if (cmd === 'git' && args[0] === '--version') {
          return Promise.resolve({ stdout: 'git version 2.30.0' });
        }
        if (cmd === 'npm' && args[0] === '--version') {
          return Promise.resolve({ stdout: '8.0.0' });
        }
        if (cmd === 'git' && args[0] === 'clone') {
          const error = new Error('Clone failed');
          error.stderr = 'fatal: Could not resolve host github.com';
          return Promise.reject(error);
        }
        return Promise.resolve({ stdout: '' });
      });
      
      mockStat.mockRejectedValue(new Error('ENOENT'));
      
      await main();
      
      // Verify exit with error code
      expect(mockExit).toHaveBeenCalledWith(1);
      
      // Verify specific network error messages
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('❌ Failed to clone repository'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Network error: Unable to reach GitHub'));
    });

    it('should handle git clone generic error', async () => {
      process.argv = ['node', 'cli.js', 'test-dir'];
      
      // Mock prerequisites success and directory doesn't exist
      execa.mockImplementation((cmd, args) => {
        if (cmd === 'git' && args[0] === '--version') {
          return Promise.resolve({ stdout: 'git version 2.30.0' });
        }
        if (cmd === 'npm' && args[0] === '--version') {
          return Promise.resolve({ stdout: '8.0.0' });
        }
        if (cmd === 'git' && args[0] === 'clone') {
          const error = new Error('Clone failed');
          error.stderr = 'fatal: some other git error';
          return Promise.reject(error);
        }
        return Promise.resolve({ stdout: '' });
      });
      
      mockStat.mockRejectedValue(new Error('ENOENT'));
      
      await main();
      
      // Verify exit with error code
      expect(mockExit).toHaveBeenCalledWith(1);
      
      // Verify error messages
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('❌ Failed to clone repository'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Git error: fatal: some other git error'));
    });

    it('should fallback to npm install when npm ci fails due to package-lock.json issues', async () => {
      process.argv = ['node', 'cli.js', 'test-dir'];
      
      // Mock prerequisites success, directory doesn't exist, git clone success
      execa.mockImplementation((cmd, args) => {
        if (cmd === 'git' && args[0] === '--version') {
          return Promise.resolve({ stdout: 'git version 2.30.0' });
        }
        if (cmd === 'npm' && args[0] === '--version') {
          return Promise.resolve({ stdout: '8.0.0' });
        }
        if (cmd === 'git' && args[0] === 'clone') {
          return Promise.resolve({ stdout: 'Cloning...' });
        }
        if (cmd === 'npm' && args[0] === 'ci') {
          const error = new Error('npm ci failed');
          error.stderr = 'npm ERR! The package-lock.json file is invalid';
          return Promise.reject(error);
        }
        if (cmd === 'npm' && args[0] === 'install') {
          return Promise.resolve({ stdout: 'Dependencies installed' });
        }
        return Promise.resolve({ stdout: '' });
      });
      
      mockStat.mockRejectedValue(new Error('ENOENT'));
      
      await main();
      
      // Verify no exit (success scenario)
      expect(mockExit).not.toHaveBeenCalled();
      
      // Verify both npm ci and npm install were called
      expect(execa).toHaveBeenCalledWith('npm', ['ci'], expect.any(Object));
      expect(execa).toHaveBeenCalledWith('npm', ['install'], expect.any(Object));
      
      // Verify fallback message
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Missing or invalid package-lock.json file'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Attempting to use npm install instead'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Dependencies installed successfully (using npm install)'));
    });

    it('should exit with error when both npm ci and npm install fail', async () => {
      process.argv = ['node', 'cli.js', 'test-dir'];
      
      // Mock prerequisites success, directory doesn't exist, git clone success
      execa.mockImplementation((cmd, args) => {
        if (cmd === 'git' && args[0] === '--version') {
          return Promise.resolve({ stdout: 'git version 2.30.0' });
        }
        if (cmd === 'npm' && args[0] === '--version') {
          return Promise.resolve({ stdout: '8.0.0' });
        }
        if (cmd === 'git' && args[0] === 'clone') {
          return Promise.resolve({ stdout: 'Cloning...' });
        }
        if (cmd === 'npm' && args[0] === 'ci') {
          const error = new Error('npm ci failed');
          error.stderr = 'npm ERR! The package-lock.json file is invalid';
          return Promise.reject(error);
        }
        if (cmd === 'npm' && args[0] === 'install') {
          const error = new Error('npm install failed');
          error.stderr = 'npm ERR! some installation error';
          return Promise.reject(error);
        }
        return Promise.resolve({ stdout: '' });
      });
      
      mockStat.mockRejectedValue(new Error('ENOENT'));
      
      await main();
      
      // Verify exit with error code
      expect(mockExit).toHaveBeenCalledWith(1);
      
      // Verify error messages - check for the actual message pattern in cli.js
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('npm install also failed:'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('npm ERR! some installation error'));
    });

    it('should handle npm ci permission error', async () => {
      process.argv = ['node', 'cli.js', 'test-dir'];
      
      // Mock prerequisites success, directory doesn't exist, git clone success
      execa.mockImplementation((cmd, args) => {
        if (cmd === 'git' && args[0] === '--version') {
          return Promise.resolve({ stdout: 'git version 2.30.0' });
        }
        if (cmd === 'npm' && args[0] === '--version') {
          return Promise.resolve({ stdout: '8.0.0' });
        }
        if (cmd === 'git' && args[0] === 'clone') {
          return Promise.resolve({ stdout: 'Cloning...' });
        }
        if (cmd === 'npm' && args[0] === 'ci') {
          const error = new Error('npm ci failed');
          error.stderr = 'npm ERR! Error: EACCES: permission denied';
          return Promise.reject(error);
        }
        return Promise.resolve({ stdout: '' });
      });
      
      mockStat.mockRejectedValue(new Error('ENOENT'));
      
      await main();
      
      // Verify exit with error code
      expect(mockExit).toHaveBeenCalledWith(1);
      
      // Verify permission error messages
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('❌ Failed to install dependencies'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Permission denied error'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('You may need to fix npm permissions'));
    });

    it('should handle unexpected errors with general error message', async () => {
      process.argv = ['node', 'cli.js', 'test-dir'];
      
      // Create a scenario where an unexpected error occurs during execution
      // We'll make the process.argv parsing throw an error by making it undefined
      const originalArgv = process.argv;
      process.argv = undefined;
      
      await main();
      
      // Restore argv
      process.argv = originalArgv;
      
      // Verify exit with error code
      expect(mockExit).toHaveBeenCalledWith(1);
      
      // Verify unexpected error message
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('❌ An unexpected error occurred:'));
    });
  });

  it('should have a placeholder test', () => {
    expect(true).toBe(true);
  });
});
