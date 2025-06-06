// AI Summary: Comprehensive test suite for cli.js helper functions and main CLI logic.
// Tests checkPrerequisites, directoryExists, and main execution flow with extensive mocking.
// Includes tests for ZIP download fallback when Git is unavailable.

import { jest } from '@jest/globals';

// Mock external modules before importing
jest.unstable_mockModule('execa', () => ({
  execa: jest.fn(),
}));

// Mock fs/promises with a proper stat function
const mockStat = jest.fn();
const mockMkdtemp = jest.fn();
const mockReaddir = jest.fn();
const mockRename = jest.fn();
const mockRm = jest.fn();
jest.unstable_mockModule('fs/promises', () => ({
  stat: mockStat,
  mkdtemp: mockMkdtemp,
  readdir: mockReaddir,
  rename: mockRename,
  rm: mockRm,
  default: {
    stat: mockStat,
    mkdtemp: mockMkdtemp,
    readdir: mockReaddir,
    rename: mockRename,
    rm: mockRm,
  },
}));

// Mock https module
const mockHttpsGet = jest.fn();
jest.unstable_mockModule('https', () => ({
  get: mockHttpsGet,
  default: {
    get: mockHttpsGet,
  },
}));

// Mock unzipper module
const mockExtract = jest.fn();
jest.unstable_mockModule('unzipper', () => ({
  Extract: mockExtract,
  default: {
    Extract: mockExtract,
  },
}));

// Mock readline module
const mockQuestion = jest.fn();
const mockClose = jest.fn();
jest.unstable_mockModule('readline', () => ({
  createInterface: jest.fn().mockReturnValue({
    question: mockQuestion,
    close: mockClose,
  }),
  default: {
    createInterface: jest.fn().mockReturnValue({
      question: mockQuestion,
      close: mockClose,
    }),
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
  let mockConsoleWarn;
  let originalArgv;
  let originalCwd;

  beforeEach(() => {
    jest.clearAllMocks();
    mockStat.mockClear();
    mockMkdtemp.mockClear();
    mockReaddir.mockClear();
    mockRename.mockClear();
    mockRm.mockClear();
    mockHttpsGet.mockClear();
    mockExtract.mockClear();
    mockQuestion.mockClear();
    mockClose.mockClear();
    
    // Mock process methods
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {});
    mockChdir = jest.spyOn(process, 'chdir').mockImplementation(() => {});
    
    // Mock console methods
    mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    
    // Store original values
    originalArgv = process.argv;
    originalCwd = process.cwd();
    
    // Default mock for readline to simulate "yes" response
    mockQuestion.mockImplementation((query, callback) => callback('y'));
  });

  afterEach(() => {
    // Restore all mocks
    mockExit.mockRestore();
    mockChdir.mockRestore();
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
    mockConsoleWarn.mockRestore();
    
    // Restore original argv
    process.argv = originalArgv;
  });

  describe('checkPrerequisites', () => {
    it('should return object with both git and npm true when both are available', async () => {
      execa.mockResolvedValue({ stdout: 'version info' });
      
      const prerequisites = await checkPrerequisites();
      
      expect(prerequisites).toEqual({ git: true, npm: true });
      expect(execa).toHaveBeenCalledWith('git', ['--version']);
      expect(execa).toHaveBeenCalledWith('npm', ['--version']);
      expect(execa).toHaveBeenCalledTimes(2);
    });

    it('should return git false when git is not available', async () => {
      execa
        .mockRejectedValueOnce(new Error('Command not found: git'))
        .mockResolvedValueOnce({ stdout: 'npm version 8.0.0' });
      
      const prerequisites = await checkPrerequisites();
      
      expect(prerequisites).toEqual({ git: false, npm: true });
      expect(execa).toHaveBeenCalledWith('git', ['--version']);
      expect(execa).toHaveBeenCalledWith('npm', ['--version']);
    });

    it('should return npm false when npm is not available', async () => {
      execa
        .mockResolvedValueOnce({ stdout: 'git version 2.30.0' })
        .mockRejectedValueOnce(new Error('Command not found: npm'));
      
      const prerequisites = await checkPrerequisites();
      
      expect(prerequisites).toEqual({ git: true, npm: false });
      expect(execa).toHaveBeenCalledWith('git', ['--version']);
      expect(execa).toHaveBeenCalledWith('npm', ['--version']);
    });

    it('should return both false when neither git nor npm are available', async () => {
      execa
        .mockRejectedValueOnce(new Error('Command not found: git'))
        .mockRejectedValueOnce(new Error('Command not found: npm'));
      
      const prerequisites = await checkPrerequisites();
      
      expect(prerequisites).toEqual({ git: false, npm: false });
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
    it('should exit with error when npm is not available', async () => {
      process.argv = ['node', 'cli.js', 'test-dir'];
      
      // Mock npm not available
      execa.mockImplementation((cmd, args) => {
        if (cmd === 'git' && args[0] === '--version') {
          return Promise.resolve({ stdout: 'git version 2.30.0' });
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
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('npm is not installed or not in PATH'));
    });

    it('should use ZIP fallback when git is not available', async () => {
      process.argv = ['node', 'cli.js', 'test-dir'];
      
      // Mock git not available, but mock successful download
      execa.mockImplementation((cmd, args) => {
        if (cmd === 'git' && args[0] === '--version') {
          return Promise.reject(new Error('Command not found: git'));
        }
        if (cmd === 'npm' && args[0] === '--version') {
          return Promise.resolve({ stdout: '8.0.0' });
        }
        if (cmd === 'npm' && args[0] === 'ci') {
          return Promise.resolve({ stdout: 'Dependencies installed' });
        }
        return Promise.resolve({ stdout: '' });
      });
      
      // Mock successful file system operations
      mockMkdtemp.mockResolvedValue('/tmp/athanor-download-abc123');
      mockReaddir.mockResolvedValue(['athanor-main']);
      mockRename.mockResolvedValue();
      mockRm.mockResolvedValue();
      
      // Mock successful HTTPS download
      const mockResponse = {
        statusCode: 200,
        pipe: jest.fn((extractStream) => {
          setTimeout(() => extractStream.emit('close'), 0);
          return extractStream;
        })
      };
      
      const mockExtractStream = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(callback, 0);
          }
        }),
        emit: jest.fn()
      };
      
      mockHttpsGet.mockImplementation((url, callback) => {
        setTimeout(() => callback(mockResponse), 0);
        return { on: jest.fn() };
      });
      
      mockExtract.mockReturnValue(mockExtractStream);
      
      await main();
      
      // Verify no exit was called (success scenario with fallback)
      expect(mockExit).not.toHaveBeenCalled();
      
      // Verify git warning was displayed
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('⚠️  Git not found on your system'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Proceeding with ZIP download instead'));
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

  describe('user confirmation prompt', () => {
    beforeEach(() => {
      // Mock successful prerequisites and directory doesn't exist
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
      
      mockStat.mockRejectedValue(new Error('ENOENT: no such file or directory'));
    });

    it('should proceed with installation when user confirms with y', async () => {
      process.argv = ['node', 'cli.js', 'test-dir'];
      
      // Mock user input "y"
      mockQuestion.mockImplementation((query, callback) => callback('y'));
      
      await main();
      
      // Verify no exit was called (success scenario)
      expect(mockExit).not.toHaveBeenCalled();
      
      // Verify readline was used
      expect(mockQuestion).toHaveBeenCalledWith(expect.stringContaining('Do you want to proceed?'), expect.any(Function));
      expect(mockClose).toHaveBeenCalled();
      
      // Verify git clone was called (installation proceeded)
      expect(execa).toHaveBeenCalledWith('git', ['clone', 'https://github.com/lacerbi/athanor.git', 'test-dir']);
    });

    it('should proceed with installation when user confirms with Y (case insensitive)', async () => {
      process.argv = ['node', 'cli.js', 'test-dir'];
      
      // Mock user input "Y"
      mockQuestion.mockImplementation((query, callback) => callback('Y'));
      
      await main();
      
      // Verify no exit was called (success scenario)
      expect(mockExit).not.toHaveBeenCalled();
      
      // Verify git clone was called (installation proceeded)
      expect(execa).toHaveBeenCalledWith('git', ['clone', 'https://github.com/lacerbi/athanor.git', 'test-dir']);
    });

    it('should abort installation when user enters n', async () => {
      process.argv = ['node', 'cli.js', 'test-dir'];
      
      // Complete mock reset for this test
      jest.clearAllMocks();
      execa.mockClear();
      mockQuestion.mockClear();
      mockClose.mockClear();
      
      // Set up fresh mock implementations for this test
      execa.mockImplementation((cmd, args) => {
        if (cmd === 'git' && args[0] === '--version') {
          return Promise.resolve({ stdout: 'git version 2.30.0' });
        }
        if (cmd === 'npm' && args[0] === '--version') {
          return Promise.resolve({ stdout: '8.0.0' });
        }
        // Git clone should not be called in this test
        return Promise.resolve({ stdout: '' });
      });
      
      // Mock user input "n"
      mockQuestion.mockImplementation((query, callback) => callback('n'));
      
      await main();
      
      // Verify exit was called with code 0 (graceful abort)
      expect(mockExit).toHaveBeenCalledWith(0);
      
      // Verify readline was used
      expect(mockQuestion).toHaveBeenCalledWith(expect.stringContaining('Do you want to proceed?'), expect.any(Function));
      expect(mockClose).toHaveBeenCalled();
      
      // Verify git clone was NOT called (installation aborted)
      expect(execa).not.toHaveBeenCalledWith('git', ['clone', expect.any(String), expect.any(String)]);
      
      // Verify cancellation message was displayed
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Installation cancelled.'));
    });

    it('should abort installation when user enters invalid input', async () => {
      process.argv = ['node', 'cli.js', 'test-dir'];
      
      // Complete mock reset for this test
      jest.clearAllMocks();
      execa.mockClear();
      mockQuestion.mockClear();
      mockClose.mockClear();
      
      // Set up fresh mock implementations for this test
      execa.mockImplementation((cmd, args) => {
        if (cmd === 'git' && args[0] === '--version') {
          return Promise.resolve({ stdout: 'git version 2.30.0' });
        }
        if (cmd === 'npm' && args[0] === '--version') {
          return Promise.resolve({ stdout: '8.0.0' });
        }
        // Git clone should not be called in this test
        return Promise.resolve({ stdout: '' });
      });
      
      // Mock user input with invalid response
      mockQuestion.mockImplementation((query, callback) => callback('foo'));
      
      await main();
      
      // Verify exit was called with code 0 (graceful abort)
      expect(mockExit).toHaveBeenCalledWith(0);
      
      // Verify git clone was NOT called (installation aborted)
      expect(execa).not.toHaveBeenCalledWith('git', ['clone', expect.any(String), expect.any(String)]);
      
      // Verify cancellation message was displayed
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Installation cancelled.'));
    });

    it('should abort installation when user enters empty input', async () => {
      process.argv = ['node', 'cli.js', 'test-dir'];
      
      // Complete mock reset for this test
      jest.clearAllMocks();
      execa.mockClear();
      mockQuestion.mockClear();
      mockClose.mockClear();
      
      // Set up fresh mock implementations for this test
      execa.mockImplementation((cmd, args) => {
        if (cmd === 'git' && args[0] === '--version') {
          return Promise.resolve({ stdout: 'git version 2.30.0' });
        }
        if (cmd === 'npm' && args[0] === '--version') {
          return Promise.resolve({ stdout: '8.0.0' });
        }
        // Git clone should not be called in this test
        return Promise.resolve({ stdout: '' });
      });
      
      // Mock user input with empty string
      mockQuestion.mockImplementation((query, callback) => callback(''));
      
      await main();
      
      // Verify exit was called with code 0 (graceful abort)
      expect(mockExit).toHaveBeenCalledWith(0);
      
      // Verify git clone was NOT called (installation aborted)
      expect(execa).not.toHaveBeenCalledWith('git', ['clone', expect.any(String), expect.any(String)]);
    });

    it('should handle user input with whitespace correctly', async () => {
      process.argv = ['node', 'cli.js', 'test-dir'];
      
      // Mock user input "  y  " (with whitespace)
      mockQuestion.mockImplementation((query, callback) => callback('  y  '));
      
      await main();
      
      // Verify no exit was called (success scenario - whitespace trimmed)
      expect(mockExit).not.toHaveBeenCalled();
      
      // Verify git clone was called (installation proceeded)
      expect(execa).toHaveBeenCalledWith('git', ['clone', 'https://github.com/lacerbi/athanor.git', 'test-dir']);
    });
  });

  describe('main function with git missing (ZIP fallback)', () => {
    beforeEach(() => {
      // Mock prerequisites: npm available, git not available
      execa.mockImplementation((cmd, args) => {
        if (cmd === 'git' && args[0] === '--version') {
          return Promise.reject(new Error('Command not found: git'));
        }
        if (cmd === 'npm' && args[0] === '--version') {
          return Promise.resolve({ stdout: '8.0.0' });
        }
        if (cmd === 'npm' && args[0] === 'ci') {
          return Promise.resolve({ stdout: 'Dependencies installed' });
        }
        return Promise.resolve({ stdout: '' });
      });
      
      // Mock directory doesn't exist by default
      mockStat.mockRejectedValue(new Error('ENOENT: no such file or directory'));
      
      // Mock successful file system operations
      mockMkdtemp.mockResolvedValue('/tmp/athanor-download-abc123');
      mockReaddir.mockResolvedValue(['athanor-main']);
      mockRename.mockResolvedValue();
      mockRm.mockResolvedValue();
    });

    it('should successfully download and extract the repo when git is not available', async () => {
      process.argv = ['node', 'cli.js', 'test-athanor'];
      
      // Mock successful HTTPS download
      const mockResponse = {
        statusCode: 200,
        pipe: jest.fn((extractStream) => {
          // Simulate successful extraction
          setTimeout(() => extractStream.emit('close'), 0);
          return extractStream;
        })
      };
      
      const mockExtractStream = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(callback, 0);
          }
        }),
        emit: jest.fn()
      };
      
      mockHttpsGet.mockImplementation((url, callback) => {
        setTimeout(() => callback(mockResponse), 0);
        return { on: jest.fn() };
      });
      
      mockExtract.mockReturnValue(mockExtractStream);
      
      await main();
      
      // Verify no exit was called (success scenario)
      expect(mockExit).not.toHaveBeenCalled();
      
      // Verify prerequisite checks were performed
      expect(execa).toHaveBeenCalledWith('git', ['--version']);
      expect(execa).toHaveBeenCalledWith('npm', ['--version']);
      
      // Verify git warning was displayed
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('⚠️  Git not found on your system'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('For better version control support, consider installing Git'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('Proceeding with ZIP download instead'));
      
      // Verify download progress messages
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('1. Downloading Athanor repository (ZIP)'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('https://github.com/lacerbi/athanor/archive/refs/heads/main.zip'));
      
      // Verify file system operations
      expect(mockMkdtemp).toHaveBeenCalledWith(expect.stringContaining('athanor-download-'));
      expect(mockHttpsGet).toHaveBeenCalledWith('https://github.com/lacerbi/athanor/archive/refs/heads/main.zip', expect.any(Function));
      expect(mockExtract).toHaveBeenCalledWith({ path: '/tmp/athanor-download-abc123' });
      expect(mockReaddir).toHaveBeenCalledWith('/tmp/athanor-download-abc123');
      expect(mockRename).toHaveBeenCalledWith(
        expect.stringContaining('athanor-main'),
        expect.stringContaining('test-athanor')
      );
      expect(mockRm).toHaveBeenCalledWith('/tmp/athanor-download-abc123', { recursive: true, force: true });
      
      // Verify success messages
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Repository downloaded and extracted successfully'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✨ Success! Athanor has been set up!'));
      
      // Verify npm ci was called
      expect(execa).toHaveBeenCalledWith('npm', ['ci'], expect.objectContaining({
        cwd: expect.stringContaining('test-athanor'),
        stdio: ['inherit', 'pipe', 'pipe']
      }));
    });

    it('should handle HTTP redirect during download', async () => {
      process.argv = ['node', 'cli.js', 'test-athanor'];
      
      // Mock redirect response
      const mockRedirectResponse = {
        statusCode: 302,
        headers: { location: 'https://github.com/redirect-url/archive.zip' }
      };
      
      const mockFinalResponse = {
        statusCode: 200,
        pipe: jest.fn((extractStream) => {
          setTimeout(() => extractStream.emit('close'), 0);
          return extractStream;
        })
      };
      
      const mockExtractStream = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(callback, 0);
          }
        }),
        emit: jest.fn()
      };
      
      mockHttpsGet
        .mockImplementationOnce((url, callback) => {
          setTimeout(() => callback(mockRedirectResponse), 0);
          return { on: jest.fn() };
        })
        .mockImplementationOnce((url, callback) => {
          setTimeout(() => callback(mockFinalResponse), 0);
          return { on: jest.fn() };
        });
      
      mockExtract.mockReturnValue(mockExtractStream);
      
      await main();
      
      // Verify no exit was called (success scenario)
      expect(mockExit).not.toHaveBeenCalled();
      
      // Verify both HTTP requests were made
      expect(mockHttpsGet).toHaveBeenCalledTimes(2);
      expect(mockHttpsGet).toHaveBeenNthCalledWith(1, 'https://github.com/lacerbi/athanor/archive/refs/heads/main.zip', expect.any(Function));
      expect(mockHttpsGet).toHaveBeenNthCalledWith(2, 'https://github.com/redirect-url/archive.zip', expect.any(Function));
      
      // Verify success
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Repository downloaded and extracted successfully'));
    });

    it('should handle download network error', async () => {
      process.argv = ['node', 'cli.js', 'test-athanor'];
      
      // Mock network error
      mockHttpsGet.mockImplementation((url, callback) => {
        return { 
          on: jest.fn((event, errorCallback) => {
            if (event === 'error') {
              setTimeout(() => errorCallback(new Error('Network error: ENOTFOUND')), 0);
            }
          })
        };
      });
      
      await main();
      
      // Verify exit with error code
      expect(mockExit).toHaveBeenCalledWith(1);
      
      // Verify error messages
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('❌ Failed to download repository'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Download error: Network error: ENOTFOUND'));
    });

    it('should handle HTTP error status codes', async () => {
      process.argv = ['node', 'cli.js', 'test-athanor'];
      
      // Mock HTTP error response
      const mockResponse = {
        statusCode: 404
      };
      
      mockHttpsGet.mockImplementation((url, callback) => {
        setTimeout(() => callback(mockResponse), 0);
        return { on: jest.fn() };
      });
      
      await main();
      
      // Verify exit with error code
      expect(mockExit).toHaveBeenCalledWith(1);
      
      // Verify error messages
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('❌ Failed to download repository'));
      // The actual implementation shows generic network error for HTTP errors
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Network error: Unable to reach GitHub'));
    });

    it('should handle extraction errors', async () => {
      process.argv = ['node', 'cli.js', 'test-athanor'];
      
      // Mock successful download but failed extraction
      const mockResponse = {
        statusCode: 200,
        pipe: jest.fn((extractStream) => {
          setTimeout(() => extractStream.emit('error', new Error('Extraction failed')), 0);
          return extractStream;
        })
      };
      
      const mockExtractStream = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setTimeout(() => callback(new Error('Extraction failed')), 0);
          }
        }),
        emit: jest.fn()
      };
      
      mockHttpsGet.mockImplementation((url, callback) => {
        setTimeout(() => callback(mockResponse), 0);
        return { on: jest.fn() };
      });
      
      mockExtract.mockReturnValue(mockExtractStream);
      
      await main();
      
      // Verify exit with error code
      expect(mockExit).toHaveBeenCalledWith(1);
      
      // Verify error messages
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('❌ Failed to download repository'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Download error: Extraction failed'));
    });

    it('should handle missing extracted directory', async () => {
      process.argv = ['node', 'cli.js', 'test-athanor'];
      
      // Mock successful download and extraction but no athanor directory found
      const mockResponse = {
        statusCode: 200,
        pipe: jest.fn((extractStream) => {
          setTimeout(() => extractStream.emit('close'), 0);
          return extractStream;
        })
      };
      
      const mockExtractStream = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(callback, 0);
          }
        }),
        emit: jest.fn()
      };
      
      mockHttpsGet.mockImplementation((url, callback) => {
        setTimeout(() => callback(mockResponse), 0);
        return { on: jest.fn() };
      });
      
      mockExtract.mockReturnValue(mockExtractStream);
      mockReaddir.mockResolvedValue(['some-other-folder']); // No athanor- folder
      
      await main();
      
      // Verify exit with error code
      expect(mockExit).toHaveBeenCalledWith(1);
      
      // Verify error messages
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('❌ Failed to download repository'));
      expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Download error: Could not find extracted Athanor directory'));
    });

    it('should warn about cleanup failure but continue', async () => {
      process.argv = ['node', 'cli.js', 'test-athanor'];
      
      // Mock successful download and extraction but cleanup failure
      const mockResponse = {
        statusCode: 200,
        pipe: jest.fn((extractStream) => {
          setTimeout(() => extractStream.emit('close'), 0);
          return extractStream;
        })
      };
      
      const mockExtractStream = {
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setTimeout(callback, 0);
          }
        }),
        emit: jest.fn()
      };
      
      mockHttpsGet.mockImplementation((url, callback) => {
        setTimeout(() => callback(mockResponse), 0);
        return { on: jest.fn() };
      });
      
      mockExtract.mockReturnValue(mockExtractStream);
      mockRm.mockRejectedValue(new Error('Permission denied')); // Cleanup fails
      
      await main();
      
      // Verify no exit (success scenario despite cleanup failure)
      expect(mockExit).not.toHaveBeenCalled();
      
      // Verify cleanup warning was shown
      expect(mockConsoleWarn).toHaveBeenCalledWith(expect.stringContaining('Warning: Could not clean up temporary directory'));
      
      // Verify success messages still shown
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✓ Repository downloaded and extracted successfully'));
      expect(mockConsoleLog).toHaveBeenCalledWith(expect.stringContaining('✨ Success! Athanor has been set up!'));
    });
  });

  it('should have a placeholder test', () => {
    expect(true).toBe(true);
  });
});
