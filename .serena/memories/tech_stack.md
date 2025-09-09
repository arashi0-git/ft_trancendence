# Technology Stack

## Core Technologies
- **Language**: TypeScript (ES2020 target)
- **Runtime**: Node.js 
- **Module System**: CommonJS
- **Package Manager**: npm

## Development Tools
- **TypeScript Compiler**: tsc (v5.3.3)
- **Development Server**: tsx (v4.7.1) - TypeScript execution engine
- **Testing Framework**: Jest (v29.7.0) with ts-jest
- **Linting**: ESLint (v8.57.0) with TypeScript rules
- **Type Checking**: @typescript-eslint/parser and plugins

## Project Structure
```
ft_trancendence/
├── src/           # Source code
├── config/        # Configuration files
├── dist/          # Build output
├── coverage/      # Test coverage reports
├── .github/       # GitHub Actions workflows
└── node_modules/  # Dependencies
```

## Build Configuration
- **Input**: `src/**/*`
- **Output**: `dist/` directory
- **Source Maps**: Enabled
- **Declarations**: Generated (.d.ts files)
- **Strict Mode**: Enabled

## Dependencies
### Development Dependencies
- `@types/jest`, `@types/node` - Type definitions
- `@typescript-eslint/*` - TypeScript ESLint support
- `eslint-plugin-unused-imports` - Remove unused imports
- `jest`, `ts-jest` - Testing framework
- `tsx` - TypeScript execution
- `typescript` - TypeScript compiler