# Spirit AI

**Mobile Autonomous Developer for Multi-Platform App Development**

Spirit AI is an intelligent CLI agent that connects to your development server and enables autonomous mobile application development across Flutter, Android, iOS, React Native, and all major mobile frameworks.

## Features

- 🤖 Autonomous mobile development across all platforms
- 🔧 Full file system operations with surgical precision
- 📱 Support for Flutter, Android (Kotlin/Java), iOS (Swift), React Native
- 🔌 Real-time connection to development server
- 🎯 Smart command execution with system awareness
- 🔪 Advanced code editing capabilities (line-level precision)

## Installation
```bash
npm install -g @niyantrilabs/spiritai
```

## Usage
```bash
# Connect to your development server
spiritai connect <your-connection-code>

# Show help
spiritai --help

# Show version
spiritai --version

# Using the shorter alias
spirit connect <code>
```

## Requirements

- Node.js >= 16.0.0
- Internet connection for server communication

## Supported Platforms

- macOS (x64, arm64)
- Linux (x64, arm64)
- Windows (x64, arm64)

## Development Tools Detection

Spirit AI automatically detects and reports:
- Java, ADB (Android development)
- Flutter, Dart
- Git, npm, Python, pip

## Commands

Once connected:
- `status` - Show connection status
- `help` - Show available commands
- `exit` - Exit the agent
- `clear` - Clear screen

## Security Notice

Spirit AI has full access to your file system and can execute shell commands. Only connect to trusted servers with valid connection codes.

## License

MIT

## Author

Niyantri Labs

## Repository

https://github.com/niyantrilabs/spiritai