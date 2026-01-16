# Spirit AI

**Mobile Autonomous Developer for Multi-Platform App Development**

Spirit AI is an intelligent command-line interface agent that connects to your development server and enables autonomous mobile application development across Flutter, Android, iOS, React Native, and all major mobile frameworks.

## Overview

Spirit AI provides developers with an advanced autonomous development environment capable of executing complex mobile development tasks across multiple platforms. The system offers real-time connectivity to development servers, intelligent code manipulation, and comprehensive system integration.

## Key Capabilities

- Autonomous mobile application development across all major platforms
- Comprehensive file system operations with line-level precision editing
- Cross-platform support for Flutter, Android (Kotlin/Java), iOS (Swift/Objective-C), and React Native
- Real-time bidirectional communication with development servers
- Intelligent command execution with full system context awareness
- Advanced surgical code editing operations including targeted line modifications

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

Spirit AI automatically detects and reports the availability of the following development tools:

- Java Runtime Environment and Java Development Kit
- Android Debug Bridge (ADB)
- Flutter SDK and Dart SDK
- Git version control system
- Node Package Manager (npm)
- Python interpreter and pip package manager

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

Current stable release: 1.0.0

For detailed version history and release notes, refer to the project's GitHub releases page.