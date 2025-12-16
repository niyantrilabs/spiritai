#!/usr/bin/env node

const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { io } = require("socket.io-client");
const readline = require('readline');
const os = require('os');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');

const execAsync = promisify(exec);

let currentWorkingDirectory = process.cwd();

const argv = yargs(hideBin(process.argv))
  .scriptName('spiritai')
  .command('connect <code>', 'Connect to session using connection code', (yargs) => {
    return yargs.positional('code', { describe: 'Connection code from web UI', type: 'string' })
  })
  .demandCommand(1, 'You must provide the "connect" command with a connection code.')
  .argv;

const connectionCode = argv.code;
const serverUrl ="https://python.thespiritai.com";
let socket;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'spiritai> ' // CHANGED: 'flutter-agent>' to 'v6-agent>'
});

async function getSystemInfo() {
  const info = {
    platform: os.platform(),
    arch: os.arch(),
    cwd: currentWorkingDirectory,
    node_version: process.version,
    user: os.userInfo().username,
    home_directory: os.homedir(),
    total_memory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + 'GB'
  };
  
  // Check for development tools
  const tools = [
    { name: 'java', command: 'java -version' },
    { name: 'adb', command: 'adb version' },
    { name: 'git', command: 'git --version' },
    { name: 'npm', command: 'npm --version' },
    { name: 'python', command: 'python --version' },
    { name: 'pip', command: 'pip --version' },
    { name: 'flutter', command: 'flutter --version' },
    { name: 'dart', command: 'dart --version' }
  ];
  
  for (const tool of tools) {
    try {
      const { stdout, stderr } = await execAsync(tool.command, { timeout: 3000 });
      info[`${tool.name}_available`] = true;
      info[`${tool.name}_version`] = (stdout || stderr).trim().split('\n')[0];
    } catch {
      info[`${tool.name}_available`] = false;
    }
  }
  
  return info;
}

class ToolExecutor {
  static async executeFileSystemTool(command, workingDir) {
    // console.log(`📁 File System Tool: ${command.substring(0, 60)}...`); // REMOVED
    // console.log(`📂 Working Directory: ${workingDir || currentWorkingDirectory}`); // REMOVED
    
    try {
      // SURGICAL PRECISION COMMANDS (NEW!)
      if (command.startsWith('DELETE_LINE:')) {
        return await this.handleDeleteLine(command, workingDir);
      }
      
      if (command.startsWith('REPLACE_LINE:')) {
        return await this.handleReplaceLine(command, workingDir);
      }
      
      if (command.startsWith('INSERT_BEFORE:')) {
        return await this.handleInsertBefore(command, workingDir);
      }
      
      if (command.startsWith('INSERT_AFTER:')) {
        return await this.handleInsertAfter(command, workingDir);
      }
      
      if (command.startsWith('REMOVE_IMPORT:')) {
        return await this.handleRemoveImport(command, workingDir);
      }
      
      if (command.startsWith('ADD_IMPORT:')) {
        return await this.handleAddImport(command, workingDir);
      }
      
      // EXISTING COMMANDS
      if (command.startsWith('WRITE_FILE:')) {
        return await this.handleDirectFileWrite(command, workingDir);
      }
      
      if (command.startsWith('READ_FILE:')) {
        return await this.handleDirectFileRead(command, workingDir);
      }
      
      // Handle special file operations
      if (command.includes('create file') || command.includes('write file')) {
        return await this.handleFileOperations(command, workingDir);
      } else {
        return await this.executeSystemCommand(command, workingDir);
      }
    } catch (error) {
      return {
        output: `File system error: ${error.message}`,
        success: false,
        cwd: workingDir || currentWorkingDirectory
      };
    }
  }

  // ========================================================================
  // SURGICAL PRECISION COMMANDS (NEW!)
  // ========================================================================

  static async handleDeleteLine(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    
    try {
      // Parse: DELETE_LINE:filepath:line_number
      const parts = command.substring(12).split(':');
      
      if (parts.length < 2) {
        throw new Error('Invalid DELETE_LINE format. Expected: DELETE_LINE:filepath:line_number');
      }
      
      const fileName = parts[0].trim();
      const lineNumber = parseInt(parts[1].trim());
      
      if (isNaN(lineNumber) || lineNumber < 1) {
        throw new Error('Invalid line number');
      }
      
      const filePath = path.resolve(targetDir, fileName);
      
      // console.log(`  🔪 DELETE_LINE: ${fileName}`); // REMOVED
      // console.log(`  📍 Line: ${lineNumber}`); // REMOVED
      
      // Read file
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      if (lineNumber > lines.length) {
        throw new Error(`Line ${lineNumber} does not exist (file has ${lines.length} lines)`);
      }
      
      // Delete the line (line numbers are 1-indexed)
      const deletedLine = lines[lineNumber - 1];
      lines.splice(lineNumber - 1, 1);
      
      // Write back
      await fs.writeFile(filePath, lines.join('\n'), 'utf8');
      
      return {
        output: `✅ Deleted line ${lineNumber} from ${fileName}\nDeleted: "${deletedLine.trim()}"`,
        success: true,
        cwd: targetDir
      };
      
    } catch (error) {
      return {
        output: `❌ DELETE_LINE failed: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }

  static async handleReplaceLine(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    
    try {
      // Parse: REPLACE_LINE:filepath:line_number:new_content
      const parts = command.substring(13).split(':');
      
      if (parts.length < 3) {
        throw new Error('Invalid REPLACE_LINE format. Expected: REPLACE_LINE:filepath:line_number:new_content');
      }
      
      const fileName = parts[0].trim();
      const lineNumber = parseInt(parts[1].trim());
      const newContent = parts.slice(2).join(':'); // Rejoin in case content has colons
      
      if (isNaN(lineNumber) || lineNumber < 1) {
        throw new Error('Invalid line number');
      }
      
      const filePath = path.resolve(targetDir, fileName);
      
      // console.log(`  🔄 REPLACE_LINE: ${fileName}`); // REMOVED
      // console.log(`  📍 Line: ${lineNumber}`); // REMOVED
      // console.log(`  ✨ New: ${newContent.substring(0, 60)}...`); // REMOVED
      
      // Read file
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      if (lineNumber > lines.length) {
        throw new Error(`Line ${lineNumber} does not exist (file has ${lines.length} lines)`);
      }
      
      // Replace the line
      const oldLine = lines[lineNumber - 1];
      lines[lineNumber - 1] = newContent;
      
      // Write back
      await fs.writeFile(filePath, lines.join('\n'), 'utf8');
      
      return {
        output: `✅ Replaced line ${lineNumber} in ${fileName}\nOld: "${oldLine.trim()}"\nNew: "${newContent.trim()}"`,
        success: true,
        cwd: targetDir
      };
      
    } catch (error) {
      return {
        output: `❌ REPLACE_LINE failed: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }

  static async handleInsertBefore(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    
    try {
      // Parse: INSERT_BEFORE:filepath:line_number:new_content
      const parts = command.substring(14).split(':');
      
      if (parts.length < 3) {
        throw new Error('Invalid INSERT_BEFORE format. Expected: INSERT_BEFORE:filepath:line_number:new_content');
      }
      
      const fileName = parts[0].trim();
      const lineNumber = parseInt(parts[1].trim());
      const newContent = parts.slice(2).join(':');
      
      if (isNaN(lineNumber) || lineNumber < 1) {
        throw new Error('Invalid line number');
      }
      
      const filePath = path.resolve(targetDir, fileName);
      
      // console.log(`  ➕ INSERT_BEFORE: ${fileName}`); // REMOVED
      // console.log(`  📍 Line: ${lineNumber}`); // REMOVED
      // console.log(`  ✨ Content: ${newContent.substring(0, 60)}...`); // REMOVED
      
      // Read file
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Insert before the line (line numbers are 1-indexed)
      lines.splice(lineNumber - 1, 0, newContent);
      
      // Write back
      await fs.writeFile(filePath, lines.join('\n'), 'utf8');
      
      return {
        output: `✅ Inserted line before line ${lineNumber} in ${fileName}\nInserted: "${newContent.trim()}"`,
        success: true,
        cwd: targetDir
      };
      
    } catch (error) {
      return {
        output: `❌ INSERT_BEFORE failed: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }

  static async handleInsertAfter(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    
    try {
      // Parse: INSERT_AFTER:filepath:line_number:new_content
      const parts = command.substring(13).split(':');
      
      if (parts.length < 3) {
        throw new Error('Invalid INSERT_AFTER format. Expected: INSERT_AFTER:filepath:line_number:new_content');
      }
      
      const fileName = parts[0].trim();
      const lineNumber = parseInt(parts[1].trim());
      const newContent = parts.slice(2).join(':');
      
      if (isNaN(lineNumber) || lineNumber < 1) {
        throw new Error('Invalid line number');
      }
      
      const filePath = path.resolve(targetDir, fileName);
      
      // console.log(`  ➕ INSERT_AFTER: ${fileName}`); // REMOVED
      // console.log(`  📍 Line: ${lineNumber}`); // REMOVED
      // console.log(`  ✨ Content: ${newContent.substring(0, 60)}...`); // REMOVED
      
      // Read file
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Insert after the line (line numbers are 1-indexed)
      lines.splice(lineNumber, 0, newContent);
      
      // Write back
      await fs.writeFile(filePath, lines.join('\n'), 'utf8');
      
      return {
        output: `✅ Inserted line after line ${lineNumber} in ${fileName}\nInserted: "${newContent.trim()}"`,
        success: true,
        cwd: targetDir
      };
      
    } catch (error) {
      return {
        output: `❌ INSERT_AFTER failed: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }

  static async handleRemoveImport(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    
    try {
      // Parse: REMOVE_IMPORT:filepath:import_package
      const parts = command.substring(14).split(':');
      
      if (parts.length < 2) {
        throw new Error('Invalid REMOVE_IMPORT format. Expected: REMOVE_IMPORT:filepath:import_package');
      }
      
      const fileName = parts[0].trim();
      const importPackage = parts.slice(1).join(':').trim();
      
      const filePath = path.resolve(targetDir, fileName);
      
      // console.log(`  🗑️ REMOVE_IMPORT: ${fileName}`); // REMOVED
      // console.log(`  📦 Package: ${importPackage}`); // REMOVED
      
      // Read file
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Find and remove the import line
      let removed = false;
      let removedLine = '';
      const newLines = lines.filter(line => {
        const trimmed = line.trim();
        // Match: import 'package:...' or import "package:..."
        if (trimmed.startsWith('import ') && trimmed.includes(importPackage)) {
          removed = true;
          removedLine = line;
          return false;
        }
        return true;
      });
      
      if (!removed) {
        throw new Error(`Import not found: ${importPackage}`);
      }
      
      // Write back
      await fs.writeFile(filePath, newLines.join('\n'), 'utf8');
      
      return {
        output: `✅ Removed import from ${fileName}\nRemoved: "${removedLine.trim()}"`,
        success: true,
        cwd: targetDir
      };
      
    } catch (error) {
      return {
        output: `❌ REMOVE_IMPORT failed: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }

  static async handleAddImport(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    
    try {
      // Parse: ADD_IMPORT:filepath:import_statement
      const parts = command.substring(11).split(':');
      
      if (parts.length < 2) {
        throw new Error('Invalid ADD_IMPORT format. Expected: ADD_IMPORT:filepath:import_statement');
      }
      
      const fileName = parts[0].trim();
      const importStatement = parts.slice(1).join(':').trim();
      
      const filePath = path.resolve(targetDir, fileName);
      
      // console.log(`  ➕ ADD_IMPORT: ${fileName}`); // REMOVED
      // console.log(`  📦 Import: ${importStatement}`); // REMOVED
      
      // Read file
      const content = await fs.readFile(filePath, 'utf8');
      const lines = content.split('\n');
      
      // Format the import statement
      let formattedImport = importStatement;
      if (!formattedImport.startsWith('import ')) {
        formattedImport = `import 'package:${importStatement}';`;
      }
      if (!formattedImport.endsWith(';')) {
        formattedImport += ';';
      }
      
      // Check if import already exists
      const importExists = lines.some(line => 
        line.trim().includes(importStatement) && line.trim().startsWith('import ')
      );
      
      if (importExists) {
        return {
          output: `ℹ️ Import already exists in ${fileName}`,
          success: true,
          cwd: targetDir
        };
      }
      
      // Find the last import statement
      let lastImportIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('import ')) {
          lastImportIndex = i;
        }
      }
      
      // Insert after the last import, or at the beginning if no imports
      if (lastImportIndex >= 0) {
        lines.splice(lastImportIndex + 1, 0, formattedImport);
      } else {
        // Insert at the beginning, after any leading comments
        let insertIndex = 0;
        for (let i = 0; i < lines.length; i++) {
          const trimmed = lines[i].trim();
          if (trimmed === '' || trimmed.startsWith('//') || trimmed.startsWith('/*')) {
            insertIndex = i + 1;
          } else {
            break;
          }
        }
        lines.splice(insertIndex, 0, formattedImport);
      }
      
      // Write back
      await fs.writeFile(filePath, lines.join('\n'), 'utf8');
      
      return {
        output: `✅ Added import to ${fileName}\nAdded: "${formattedImport}"`,
        success: true,
        cwd: targetDir
      };
      
    } catch (error) {
      return {
        output: `❌ ADD_IMPORT failed: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }

  // ========================================================================
  // EXISTING COMMANDS (UNCHANGED)
  // ========================================================================

  static async handleDirectFileWrite(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    
    try {
      // Parse command: WRITE_FILE:filepath|||CONTENT|||actual content here
      const parts = command.substring(11).split('|||CONTENT|||');
      
      if (parts.length !== 2) {
        throw new Error('Invalid WRITE_FILE command format');
      }
      
      const fileName = parts[0].trim();
      const fileContent = parts[1]; // Don't trim - preserve formatting
      const filePath = path.resolve(targetDir, fileName);
      
      // console.log(`  ✍️  Writing: ${fileName}`); // REMOVED
      // console.log(`  📏 Size: ${fileContent.length} bytes`); // REMOVED
      
      // Create directories if needed
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // Write file with UTF-8 encoding
      await fs.writeFile(filePath, fileContent, 'utf8');
      
      // Verify file was written
      const stats = await fs.stat(filePath);
      
      return {
        output: `✅ Created file: ${fileName} (${stats.size} bytes)`,
        success: true,
        cwd: targetDir,
        bytes_written: stats.size
      };
      
    } catch (error) {
      return {
        output: `❌ Failed to write file: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }

  static async handleDirectFileRead(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    
    try {
      // Parse command: READ_FILE:filepath
      const fileName = command.substring(10).trim(); // Remove 'READ_FILE:'
      
      // Handle both absolute and relative paths
      let filePath;
      if (path.isAbsolute(fileName)) {
        filePath = fileName;
      } else {
        filePath = path.resolve(targetDir, fileName);
      }
      
      // console.log(`  📖 Reading: ${fileName}`); // REMOVED
      // console.log(`  📍 Full path: ${filePath}`); // REMOVED
      
      // Check if file exists
      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      // Read file with UTF-8 encoding
      const content = await fs.readFile(filePath, 'utf8');
      
      // console.log(`  ✓ Read ${content.length} bytes`); // REMOVED
      
      return {
        output: content,
        success: true,
        cwd: targetDir,
        bytes_read: content.length,
        file_path: filePath
      };
      
    } catch (error) {
      // console.log(`  ❌ Read failed: ${error.message}`); // REMOVED
      return {
        output: `Failed to read file: ${error.message}`,
        success: false,
        cwd: targetDir,
        error: error.message
      };
    }
  }

  static async executeEmulatorTool(command, workingDir) {
    // console.log(`📱 Emulator Tool: ${command}`); // REMOVED
    return await this.executeSystemCommand(command, workingDir);
  }

  static async executeSystemTool(command, workingDir) {
    // console.log(`⚙️ System Tool: ${command}`); // REMOVED
    return await this.executeSystemCommand(command, workingDir);
  }

  static async handleFileOperations(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    const platform = os.platform();
    
    try {
      // Handle Windows-specific commands
      if (platform === 'win32') {
        // Handle Windows directory creation: md
        if (command.startsWith('md ')) {
          const dirName = command.replace('md ', '').trim();
          const dirPath = path.resolve(targetDir, dirName);
          
          await fs.mkdir(dirPath, { recursive: true });
          
          return {
            output: `Created directory: ${dirName} in ${targetDir}`,
            success: true,
            cwd: targetDir
          };
        }
        
        // Handle Windows file creation: echo. > filename
        if (command.includes('echo. >')) {
          const fileName = command.split('echo. >')[1].trim();
          const filePath = path.resolve(targetDir, fileName);
          
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, '', 'utf8');
          
          return {
            output: `Created file: ${fileName} in ${targetDir}`,
            success: true,
            cwd: targetDir
          };
        }
      }
      
      // Handle Unix/Linux commands
      if (command.startsWith('touch ')) {
        const fileName = command.replace('touch ', '').trim();
        const filePath = path.resolve(targetDir, fileName);
        
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, '', 'utf8');
        
        return {
          output: `Created file: ${fileName} in ${targetDir}`,
          success: true,
          cwd: targetDir
        };
      }

      // Handle mkdir commands with -p flag
      if (command.startsWith('mkdir ')) {
        const dirName = command.replace('mkdir -p ', '').replace('mkdir ', '').trim();
        const dirPath = path.resolve(targetDir, dirName);
        
        await fs.mkdir(dirPath, { recursive: true });
        
        return {
          output: `Created directory: ${dirName} in ${targetDir}`,
          success: true,
          cwd: targetDir
        };
      }
      
      // If no special handling matched, execute as system command
      return await this.executeSystemCommand(command, workingDir);
      
    } catch (error) {
      return {
        output: `File operation error: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }

  static async executeSystemCommand(command, workingDir) {
    const execDir = workingDir || currentWorkingDirectory;
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: execDir,
        timeout: 600000, // 10 minutes
        maxBuffer: 50 * 1024 * 1024, // 50MB buffer
        shell: true
      });
      
      // Return full output (stdout + stderr combined)
      const output = (stdout || '') + (stderr || '');
      
      // Success if no stderr or stderr is just warnings
      const success = !stderr || stderr.trim().length === 0;
      
      return {
        output: output || 'Command completed successfully',
        success: success,
        cwd: execDir,
        command: command
      };
      
    } catch (error) {
      // Return full error output (combine stdout and stderr)
      const output = (error.stdout || '') + (error.stderr || '') || error.message;
      
      return {
        output: `Command failed: ${output}`,
        success: false,
        cwd: execDir,
        command: command,
        exit_code: error.code
      };
    }
  }
}

async function executeCommand(taskData) {
  const { task_id, command, tool_type, working_directory } = taskData;
  
  // console.log(`\n📋 Task: ${task_id}`); // REMOVED
  // console.log(`🛠️ Tool: ${tool_type || 'system'}`); // REMOVED
  // console.log(`💻 Command: ${command.substring(0, 80)}...`); // REMOVED
  // console.log(`📂 Directory: ${working_directory || currentWorkingDirectory}`); // REMOVED
  
  try {
    let result;
    
    switch (tool_type) {
      case 'filesystem_tool':
        result = await ToolExecutor.executeFileSystemTool(command, working_directory);
        break;
        
      case 'emulator_tool':
        result = await ToolExecutor.executeEmulatorTool(command, working_directory);
        break;
        
      case 'system_tool':
        result = await ToolExecutor.executeSystemTool(command, working_directory);
        break;
        
      default:
        result = await ToolExecutor.executeSystemCommand(command, working_directory);
        break;
    }
    
    result.task_id = task_id;
    result.tool_type = tool_type;
    result.execution_time = new Date().toISOString();
    
    return result;
    
  } catch (error) {
    return {
      task_id: task_id,
      output: `Execution error: ${error.message}`,
      success: false,
      cwd: working_directory || currentWorkingDirectory,
      tool_type: tool_type,
      command: command,
      error: error.message
    };
  }
}

function connectToBrain() {
  // MODIFIED: Welcome message with a styled, detailed security box
  const whiteColor = '\x1b[37m'; // White for the main heading
  const grayColor = '\x1b[90m';  // Light gray for the security warning text
  const resetColor = '\x1b[0m';
  
  // Console log a large block of text with proper spacing and color
  const welcomeMessage = `${whiteColor}
● Welcome to Spirit AI
${resetColor}
${grayColor}
Spirit AI provides full access to your working environment, including the 
ability to read, create, modify, edit, and delete files, and execute shell 
commands with your consent.
This agent has extensive permissions - Use at your own risk
${resetColor}`;
  
  console.log(welcomeMessage);
  // console.log('🚀 Flutter Development Agent Starting...'); // REMOVED
  // console.log(`🌐 Connecting to: ${serverUrl}`); // REMOVED
  // console.log(`🔗 Connection code: ${connectionCode}`); // REMOVED
  // console.log('🔪 Surgical Precision Commands: ENABLED ✅'); // REMOVED
  
  socket = io(serverUrl, {
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 5,
    timeout: 20000
  });

  socket.on("connect", async () => {
    // Removed: console.log('✅ Connected to brain! Connection secured.');
    
    const systemInfo = await getSystemInfo();
    // System Info Logs REMOVED
    // console.log('📊 System Info:');
    // console.log(`   Platform: ${systemInfo.platform} (${systemInfo.arch})`);
    // console.log(`   Node: ${systemInfo.node_version}`);
    // console.log(`   Flutter: ${systemInfo.flutter_available ? '✅' : '❌'}`);
    // console.log(`   Dart: ${systemInfo.dart_available ? '✅' : '❌'}`);
    // console.log(`   Git: ${systemInfo.git_available ? '✅' : '❌'}`);
    
    socket.emit('cli_connect', {
      connection_code: connectionCode,
      system_info: systemInfo
    });
  });

  socket.on('cli_connected', (data) => {
    // CHANGED: ANSI escape codes for WHITE color (\x1b[37m) and reset (\x1b[0m)
    const whiteColor = '\x1b[37m';
    const resetColor = '\x1b[0m';
    
    const banner = `${whiteColor}
    ███████╗██████╗ ██╗██████╗ ██╗████████╗     █████╗ ██╗
    ██╔════╝██╔══██╗██║██╔══██╗██║╚══██╔══╝    ██╔══██╗██║
    ███████╗██████╔╝██║██████╔╝██║   ██║       ███████║██║
    ╚════██║██╔═══╝ ██║██╔══██╗██║   ██║       ██╔══██║██║
    ███████║██║     ██║██║  ██║██║   ██║       ██║  ██║██║
    ╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝   ╚═╝       ╚═╝  ╚═╝╚═╝

                                          by Niyantri Labs
              
${resetColor}`;


    console.log(banner);
    // console.log('🎯 Agent successfully connected and ready!'); // REMOVED
    // console.log('💬 You can now send commands through the web interface'); // REMOVED
    // console.log('📝 Type "status" to check connection, "exit" to quit\n'); // REMOVED
    rl.prompt();
  });

  socket.on('execute_command', async (data) => {
    // console.log('\n⚡ Received command from brain...'); // REMOVED
    
    const result = await executeCommand(data);
    
    socket.emit('command_result', {
      task_id: data.task_id,
      output: result.output,
      success: result.success,
      cwd: result.cwd,
      tool_type: result.tool_type,
      timestamp: new Date().toISOString(),
      working_directory: result.cwd
    });
    
    // const status = result.success ? '✅ Success' : '❌ Failed'; // Keep internal logic
    // console.log(`${status}: ${result.command || data.command}`); // REMOVED
    
    // if (!result.success) {
    //   console.log(`Error details: ${result.output}`); // REMOVED
    // } else if (result.output && result.output.length < 200) {
    //   console.log(`Output: ${result.output}`); // REMOVED
    // }
    
    // console.log(''); // REMOVED
    rl.prompt();
  });

  socket.on("disconnect", (reason) => {
    // console.log(`\n🔌 Disconnected: ${reason}`); // REMOVED
    if (reason === 'io server disconnect') {
      // console.log('Server initiated disconnect. Exiting...'); // REMOVED
      process.exit(0);
    } else {
      // console.log('Attempting to reconnect...'); // REMOVED
    }
  });

  socket.on('connect_error', (error) => {
    // console.log(`❌ Connection failed: ${error.message}`); // REMOVED
  });

  socket.on('reconnect', (attemptNumber) => {
    // console.log(`🔄 Reconnected after ${attemptNumber} attempts`); // REMOVED
    rl.prompt();
  });
}

// CLI interface (Local logs kept for usability)
rl.on('line', (input) => {
  const cmd = input.trim().toLowerCase();
  
  if (cmd === 'exit' || cmd === 'quit') {
    console.log('👋 Goodbye!');
    process.exit(0);
  }
  
  if (cmd === 'status') {
    console.log('\n📊 Agent Status:');
    console.log(`   Connected: ${socket?.connected ? '✅ Yes' : '❌ No'}`);
    console.log(`   Directory: ${currentWorkingDirectory}`);
    console.log(`   Server: ${serverUrl}`);
    console.log(`   Code: ${connectionCode}`);
    console.log(`   Surgical Mode: ✅ ENABLED`);
    console.log('');
  }
  
  if (cmd === 'help') {
    console.log('\n🆘 Available Commands:');
    console.log('   status  - Show connection status');
    console.log('   help    - Show this help');
    console.log('   exit    - Exit the agent');
    console.log('   clear   - Clear the screen');
    console.log('\n💬 Send commands through the web interface for mobile development!');
    console.log('\n🔪 Surgical Precision Commands Supported:');
    console.log('   DELETE_LINE    - Remove specific line');
    console.log('   REPLACE_LINE   - Replace specific line');
    console.log('   INSERT_BEFORE  - Insert line before position');
    console.log('   INSERT_AFTER   - Insert line after position');
    console.log('   REMOVE_IMPORT  - Remove unused import');
    console.log('   ADD_IMPORT     - Add missing import');
    console.log('');
  }
  
  if (cmd === 'clear') {
    console.clear();
    console.log('🚀 Spirit AI'); // CHANGED: 'Flutter Development Agent' to 'v6 Agent'
    console.log(`🔗 Connected to: ${serverUrl}`);
    console.log('🔪 Surgical Precision: ENABLED');
    console.log('');
  }
  
  if (input.trim() && !['exit', 'quit', 'status', 'help', 'clear'].includes(cmd)) {
    console.log('💬 For Flutter development, use the web interface.');
    console.log('   Direct commands are not supported in this mode.');
  }
  
  rl.prompt();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down Spirit AI...'); // CHANGED: 'Flutter Agent' to 'v6 Agent'
  if (socket && socket.connected) {
    socket.disconnect();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\n🛑 Received termination signal. Shutting down...');
  if (socket && socket.connected) {
    socket.disconnect();
  }
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start the connection
// console.log('🔧 Initializing Flutter Development Agent...'); // REMOVED
// console.log('🔪 Surgical Precision Mode: ENABLED'); // REMOVED
connectToBrain();