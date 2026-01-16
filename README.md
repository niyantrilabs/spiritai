# Spirit AI

**Autonomous Developer for Multi-Platform Development**

Spirit AI is an agentic development tool that lives in your terminal, understands your development environment, and helps you build faster by executing complex tasks, managing file operations, and handling development workflows -- all through natural language commands via your connected development server.

## Overview

Spirit AI connects to your development server and acts as an intelligent agent capable of understanding your codebase, executing development tasks, and managing your entire development workflow. The system provides real-time bidirectional communication, intelligent code manipulation, and comprehensive system integration.

## Key Capabilities

- Autonomous code generation and modification across your entire project
- Surgical precision file operations with line-level editing accuracy
- Real-time bidirectional communication with development servers
- Intelligent command execution with full system context awareness
- Advanced code editing operations including targeted modifications
- Comprehensive development environment detection and integration

## Installation

Install Spirit AI globally via npm:
```bash
npm install -g @niyantrilabs/spiritai
```

## Getting Started

### Basic Usage

Connect to your development server using a connection code:
```bash
spiritai connect <your-connection-code>
```

### Command Reference
```bash
spiritai connect <code>    # Establish connection to development server
spiritai --help            # Display help information
spiritai --version         # Show version number
spirit connect <code>      # Shorthand alias
```

## System Requirements

- Node.js version 16.0.0 or higher
- Active internet connection for server communication
- Compatible operating system (Windows, macOS, or Linux)

## Platform Support

Spirit AI is compatible with the following platforms:

- **macOS**: x64 and ARM64 architectures
- **Linux**: x64 and ARM64 architectures  
- **Windows**: x64 and ARM64 architectures

## Development Environment Detection

Spirit AI automatically detects and reports the availability of development tools in your environment, including version control systems, package managers, programming language runtimes, and development frameworks.

## Interactive Commands

Once connected to a development server, the following commands are available:

- `status` - Display current connection status and system information
- `help` - Show available commands and usage instructions
- `exit` or `quit` - Terminate the agent session
- `clear` - Clear the terminal screen

## Advanced Features

### Surgical Precision Code Editing

Spirit AI supports advanced code manipulation operations:

- **DELETE_LINE** - Remove specific lines from source files
- **REPLACE_LINE** - Replace content at specific line numbers
- **INSERT_BEFORE** - Insert new lines before specified positions
- **INSERT_AFTER** - Insert new lines after specified positions
- **REMOVE_IMPORT** - Remove unused import statements
- **ADD_IMPORT** - Add missing import declarations

### File System Operations

The agent provides comprehensive file system access including read, write, create, modify, and delete operations with full directory traversal capabilities.

## Security Considerations

**Important Notice**: Spirit AI operates with full file system access privileges and can execute arbitrary shell commands on the host system. Users should only establish connections to trusted development servers using verified connection codes. All operations are performed with the permissions of the user executing the agent.

## Technical Architecture

Spirit AI utilizes Socket.IO for real-time bidirectional communication, yargs for command-line argument parsing, and Node.js native modules for system integration and file operations.

## License

This project is licensed under the MIT License. See the LICENSE file for complete terms and conditions.

## Maintainer

Developed and maintained by Niyantri Labs.

## Source Code

The complete source code is available on GitHub:  
https://github.com/niyantrilabs/spiritai

## Support and Issues

For bug reports, feature requests, and technical support, please visit:  
https://github.com/niyantrilabs/spiritai/issues

## Version History

Current stable release: 1.0.2

For detailed version history and release notes, refer to the project's GitHub releases page.