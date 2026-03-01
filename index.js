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
  .command('connect <code>', 'Connect to session using connection code', (yargs) => {
    return yargs.positional('code', { describe: 'Connection code from web UI', type: 'string' })
  })
  .demandCommand(1, 'You must provide the "connect" command with a connection code.')
  .argv;

const connectionCode = argv.code;
const serverUrl = "https://desktop.thespiritai.com";
let socket;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'v6-agent> '
});

async function getSystemInfo() {
  const info = {
    platform: os.platform(),
    arch: os.arch(),
    cwd: currentWorkingDirectory,
    user: os.userInfo().username,
    home_directory: os.homedir(),
    total_memory: Math.round(os.totalmem() / (1024 * 1024 * 1024)) + 'GB'
  };
  
  return info;
}

class ToolExecutor {
  static async executeFileSystemTool(command, workingDir) {
    try {
      if (command.startsWith('FUNCTION_CALL:')) {
        return await this.handleFunctionCall(command, workingDir);
      }
      
      // FILE & DIRECTORY OPERATIONS
      if (command.startsWith('DELETE_FILE:')) {
        return await this.handleDeleteFile(command, workingDir);
      }
      
      if (command.startsWith('MOVE_FILE:')) {
        return await this.handleMoveFile(command, workingDir);
      }
      
      if (command.startsWith('COPY_FILE:')) {
        return await this.handleCopyFile(command, workingDir);
      }
      
      if (command.startsWith('CREATE_DIRECTORY:')) {
        return await this.handleCreateDirectory(command, workingDir);
      }
      
      if (command.startsWith('DELETE_DIRECTORY:')) {
        return await this.handleDeleteDirectory(command, workingDir);
      }
      
      if (command.startsWith('XML_STR_REPLACE:')) {
        return await this.handleXmlStrReplace(command, workingDir);
      }
      
      if (command.startsWith('WRITE_FILE:')) {
        return await this.handleDirectFileWrite(command, workingDir);
      }
      
      if (command.startsWith('READ_FILE:')) {
        return await this.handleDirectFileRead(command, workingDir);
      }
      
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

  static async handleFunctionCall(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    
    try {
      const parts = command.split('|||PARAMS|||');
      if (parts.length < 2) {
        throw new Error('Invalid format. Expected: FUNCTION_CALL:tool_name|||PARAMS|||{json}');
      }
      
      const toolName = parts[0].substring(14).trim();
      const paramsJson = parts[1].trim();
      const params = JSON.parse(paramsJson);
      
      switch (toolName) {
        case 'str_replace':
          return await this.functionStrReplace(params, targetDir);
        case 'create_file':
          return await this.functionCreateFile(params, targetDir);
        case 'delete_file':
          return await this.functionDeleteFile(params, targetDir);
        case 'read_file':
          return await this.functionReadFile(params, targetDir);
        case 'list_files':
          return await this.functionListFiles(params, targetDir);
        default:
          throw new Error(`Unknown function: ${toolName}`);
      }
    } catch (error) {
      return {
        output: `Function call error: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }
  
  static async functionStrReplace(params, targetDir) {
    try {
      const { path: filePath, old_str, new_str, description } = params;
      
      if (!filePath || !old_str || new_str === undefined) {
        throw new Error('Missing params: path, old_str, new_str');
      }
      
      const fullPath = path.resolve(targetDir, filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      const occurrences = content.split(old_str).length - 1;
      
      if (occurrences === 0) {
        return {
          output: `❌ str_replace failed: old_str not found\nFile: ${filePath}\nDescription: ${description || 'N/A'}`,
          success: false,
          cwd: targetDir
        };
      }
      
      if (occurrences > 1) {
        return {
          output: `❌ str_replace failed: old_str found ${occurrences} times (must be unique)\nFile: ${filePath}`,
          success: false,
          cwd: targetDir
        };
      }
      
      const newContent = content.replace(old_str, new_str);
      await fs.writeFile(fullPath, newContent, 'utf8');
      
      return {
        output: `✅ str_replace: ${filePath}\nDescription: ${description || 'Code modified'}`,
        success: true,
        cwd: targetDir
      };
    } catch (error) {
      return {
        output: `❌ str_replace error: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }
  
  static async handleXmlStrReplace(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    
    try {
      const xmlContent = command.substring(16).trim();
      
      const pathMatch   = xmlContent.match(/<path>([\s\S]*?)<\/path>/);
      const oldStrMatch = xmlContent.match(/<old_str>([\s\S]*?)<\/old_str>/);
      const newStrMatch = xmlContent.match(/<new_str>([\s\S]*?)<\/new_str>/);
      
      if (!pathMatch || !oldStrMatch || !newStrMatch) {
        return {
          output: `❌ XML_STR_REPLACE failed: Missing required tags. Need <path>, <old_str>, <new_str>`,
          success: false,
          cwd: targetDir
        };
      }
      
      const filePath = pathMatch[1].trim();
      
      const old_str = oldStrMatch[1].replace(/^\n/, '').replace(/\n$/, '');
      const new_str = newStrMatch[1].replace(/^\n/, '').replace(/\n$/, '');
      
      const fullPath = path.resolve(targetDir, filePath);
      const content  = await fs.readFile(fullPath, 'utf8');
      
      const occurrences = content.split(old_str).length - 1;
      
      if (occurrences === 0) {
        return {
          output: `❌ XML_STR_REPLACE failed: old_str not found in ${filePath}`,
          success: false,
          cwd: targetDir
        };
      }
      
      if (occurrences > 1) {
        return {
          output: `❌ XML_STR_REPLACE failed: old_str found ${occurrences} times in ${filePath} (must be unique)`,
          success: false,
          cwd: targetDir
        };
      }
      
      const newContent = content.replace(old_str, new_str);
      await fs.writeFile(fullPath, newContent, 'utf8');
      
      return {
        output: `✅ XML_STR_REPLACE: ${filePath}`,
        success: true,
        cwd: targetDir
      };
      
    } catch (error) {
      return {
        output: `❌ XML_STR_REPLACE error: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }

  static async functionCreateFile(params, targetDir) {
    try {
      const { path: filePath, content, description } = params;
      
      if (!filePath || content === undefined) {
        throw new Error('Missing params: path, content');
      }
      
      const fullPath = path.resolve(targetDir, filePath);
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf8');
      
      return {
        output: `✅ create_file: ${filePath}\nDescription: ${description || 'File created'}\nSize: ${content.length} chars`,
        success: true,
        cwd: targetDir
      };
    } catch (error) {
      return {
        output: `❌ create_file error: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }
  
  static async functionDeleteFile(params, targetDir) {
    try {
      const { path: filePath, description } = params;
      
      if (!filePath) {
        throw new Error('Missing param: path');
      }
      
      const fullPath = path.resolve(targetDir, filePath);
      await fs.unlink(fullPath);
      
      return {
        output: `✅ delete_file: ${filePath}\nDescription: ${description || 'File removed'}`,
        success: true,
        cwd: targetDir
      };
    } catch (error) {
      return {
        output: `❌ delete_file error: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }
  
  static async functionReadFile(params, targetDir) {
    try {
      const { path: filePath } = params;
      
      if (!filePath) {
        throw new Error('Missing param: path');
      }
      
      const fullPath = path.resolve(targetDir, filePath);
      const content = await fs.readFile(fullPath, 'utf8');
      
      return {
        output: content,
        success: true,
        cwd: targetDir
      };
    } catch (error) {
      return {
        output: `❌ read_file error: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }
  
  static async functionListFiles(params, targetDir) {
    try {
      const { path: dirPath = '.', recursive = false } = params;
      
      const fullPath = path.resolve(targetDir, dirPath);
      let files = [];
      
      if (recursive) {
        const walk = async (dir) => {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            const entryPath = path.join(dir, entry.name);
            const relPath = path.relative(fullPath, entryPath);
            if (entry.isDirectory()) {
              await walk(entryPath);
            } else {
              files.push(relPath);
            }
          }
        };
        await walk(fullPath);
      } else {
        const entries = await fs.readdir(fullPath, { withFileTypes: true });
        files = entries.map(e => e.name + (e.isDirectory() ? '/' : ''));
      }
      
      return {
        output: files.join('\n'),
        success: true,
        cwd: targetDir,
        files: files
      };
    } catch (error) {
      return {
        output: `❌ list_files error: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }

  static async handleDeleteFile(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    
    try {
      const fileName = command.substring(12).trim();
      
      if (!fileName) {
        throw new Error('Invalid DELETE_FILE format. Expected: DELETE_FILE:filepath');
      }
      
      const filePath = path.resolve(targetDir, fileName);
      
      try {
        await fs.access(filePath);
      } catch {
        throw new Error(`File not found: ${fileName}`);
      }
      
      await fs.unlink(filePath);
      
      return {
        output: `✅ Deleted file: ${fileName}`,
        success: true,
        cwd: targetDir
      };
      
    } catch (error) {
      return {
        output: `❌ DELETE_FILE failed: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }

  static async handleMoveFile(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    
    try {
      const parts = command.substring(10).split(':');
      
      if (parts.length < 2) {
        throw new Error('Invalid MOVE_FILE format. Expected: MOVE_FILE:source:destination');
      }
      
      const sourcePath = parts[0].trim();
      const destPath = parts.slice(1).join(':').trim();
      
      const sourceFullPath = path.resolve(targetDir, sourcePath);
      const destFullPath = path.resolve(targetDir, destPath);
      
      try {
        await fs.access(sourceFullPath);
      } catch {
        throw new Error(`Source file not found: ${sourcePath}`);
      }
      
      const destDir = path.dirname(destFullPath);
      await fs.mkdir(destDir, { recursive: true });
      
      await fs.rename(sourceFullPath, destFullPath);
      
      return {
        output: `✅ Moved file: ${sourcePath} → ${destPath}`,
        success: true,
        cwd: targetDir
      };
      
    } catch (error) {
      return {
        output: `❌ MOVE_FILE failed: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }

  static async handleCopyFile(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    
    try {
      const parts = command.substring(10).split(':');
      
      if (parts.length < 2) {
        throw new Error('Invalid COPY_FILE format. Expected: COPY_FILE:source:destination');
      }
      
      const sourcePath = parts[0].trim();
      const destPath = parts.slice(1).join(':').trim();
      
      const sourceFullPath = path.resolve(targetDir, sourcePath);
      const destFullPath = path.resolve(targetDir, destPath);
      
      try {
        await fs.access(sourceFullPath);
      } catch {
        throw new Error(`Source file not found: ${sourcePath}`);
      }
      
      const destDir = path.dirname(destFullPath);
      await fs.mkdir(destDir, { recursive: true });
      
      await fs.copyFile(sourceFullPath, destFullPath);
      
      return {
        output: `✅ Copied file: ${sourcePath} → ${destPath}`,
        success: true,
        cwd: targetDir
      };
      
    } catch (error) {
      return {
        output: `❌ COPY_FILE failed: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }

  static async handleCreateDirectory(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    
    try {
      const dirPath = command.substring(17).trim();
      
      if (!dirPath) {
        throw new Error('Invalid CREATE_DIRECTORY format. Expected: CREATE_DIRECTORY:directory_path');
      }
      
      const fullPath = path.resolve(targetDir, dirPath);
      
      await fs.mkdir(fullPath, { recursive: true });
      
      return {
        output: `✅ Created directory: ${dirPath}`,
        success: true,
        cwd: targetDir
      };
      
    } catch (error) {
      return {
        output: `❌ CREATE_DIRECTORY failed: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }

  static async handleDeleteDirectory(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    
    try {
      const dirPath = command.substring(17).trim();
      
      if (!dirPath) {
        throw new Error('Invalid DELETE_DIRECTORY format. Expected: DELETE_DIRECTORY:directory_path');
      }
      
      const fullPath = path.resolve(targetDir, dirPath);
      
      try {
        await fs.access(fullPath);
      } catch {
        throw new Error(`Directory not found: ${dirPath}`);
      }
      
      await fs.rm(fullPath, { recursive: true, force: true });
      
      return {
        output: `✅ Deleted directory: ${dirPath}`,
        success: true,
        cwd: targetDir
      };
      
    } catch (error) {
      return {
        output: `❌ DELETE_DIRECTORY failed: ${error.message}`,
        success: false,
        cwd: targetDir
      };
    }
  }

  static async handleDirectFileWrite(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    
    try {
      const parts = command.substring(11).split('|||CONTENT|||');
      
      if (parts.length !== 2) {
        throw new Error('Invalid WRITE_FILE command format');
      }
      
      const fileName = parts[0].trim();
      const fileContent = parts[1];
      const filePath = path.resolve(targetDir, fileName);
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      await fs.writeFile(filePath, fileContent, 'utf8');
      
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
      const fileName = command.substring(10).trim();
      
      let filePath;
      if (path.isAbsolute(fileName)) {
        filePath = fileName;
      } else {
        filePath = path.resolve(targetDir, fileName);
      }
      
      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      const content = await fs.readFile(filePath, 'utf8');
      
      return {
        output: content,
        success: true,
        cwd: targetDir,
        bytes_read: content.length,
        file_path: filePath
      };
      
    } catch (error) {
      return {
        output: `Failed to read file: ${error.message}`,
        success: false,
        cwd: targetDir,
        error: error.message
      };
    }
  }

  static async executeSystemTool(command, workingDir) {
    return await this.executeSystemCommand(command, workingDir);
  }

  static async handleFileOperations(command, workingDir) {
    const targetDir = workingDir || currentWorkingDirectory;
    const platform = os.platform();
    
    try {
      // Handle Windows-specific commands
      if (platform === 'win32') {
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
      
      const output = (stdout || '') + (stderr || '');
      
      const success = !stderr || stderr.trim().length === 0;
      
      return {
        output: output || 'Command completed successfully',
        success: success,
        cwd: execDir,
        command: command
      };
      
    } catch (error) {
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
  
  try {
    let result;
    
    switch (tool_type) {
      case 'filesystem_tool':
        result = await ToolExecutor.executeFileSystemTool(command, working_directory);
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
  const gray = '\x1b[90m';
  const reset = '\x1b[0m';
  console.log(`${gray}  ███████╗██████╗ ██╗██████╗ ██╗████████╗     █████╗ ██╗${reset}`);
  console.log(`${gray}  ██╔════╝██╔══██╗██║██╔══██╗██║╚══██╔══╝    ██╔══██╗██║${reset}`);
  console.log(`${gray}  ███████╗██████╔╝██║██████╔╝██║   ██║       ███████║██║${reset}`);
  console.log(`${gray}  ╚════██║██╔═══╝ ██║██╔══██╗██║   ██║       ██╔══██║██║${reset}`);
  console.log(`${gray}  ███████║██║     ██║██║  ██║██║   ██║       ██║  ██║██║${reset}`);
  console.log(`${gray}  ╚══════╝╚═╝     ╚═╝╚═╝  ╚═╝╚═╝   ╚═╝       ╚═╝  ╚═╝╚═╝${reset}`);
  console.log(`${gray}                          by Niyantri Labs${reset}`);

  socket = io(serverUrl, {
    reconnection: true,
    reconnectionDelay: 2000,
    reconnectionAttempts: 5,
    timeout: 20000
  });

  socket.on("connect", async () => {
    const systemInfo = await getSystemInfo();
    socket.emit('cli_connect', {
      connection_code: connectionCode,
      system_info: systemInfo
    });
  });

  socket.on('cli_connected', (data) => {
    console.log('\x1b[37mSpirit AI — connected\x1b[0m');
    rl.prompt();
  });

  socket.on('execute_command', async (data) => {
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
    rl.prompt();
  });

  socket.on("disconnect", (reason) => {
    if (reason === 'io server disconnect') {
      process.exit(0);
    }
  });

  socket.on('connect_error', (error) => {
  });

  socket.on('reconnect', (attemptNumber) => {
    rl.prompt();
  });
}

rl.on('line', (input) => {
  const cmd = input.trim().toLowerCase();
  
  if (cmd === 'exit' || cmd === 'quit') {
    console.log('bye.');
    process.exit(0);
  }
  
  if (cmd === 'status') {
    console.log(`connected: ${socket?.connected ? 'yes' : 'no'} | dir: ${currentWorkingDirectory}`);
  }
  
  if (cmd === 'help') {
    console.log('status | help | clear | exit');
  }
  
  if (cmd === 'clear') {
    console.clear();
  }
  
  if (input.trim() && !['exit', 'quit', 'status', 'help', 'clear'].includes(cmd)) {
    console.log('use the web interface to send commands.');
  }
  
  rl.prompt();
});

process.on('SIGINT', () => {
  console.log('shutting down.');
  if (socket && socket.connected) {
    socket.disconnect();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('shutting down.');
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
connectToBrain();