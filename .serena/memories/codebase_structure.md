# Codebase Structure and Architecture

## Current Directory Structure

```
ft_trancendence/
├── .github/
│   └── workflows/
│       └── pr-check.yml          # CI/CD pipeline
├── .serena/                      # Serena agent memories
├── config/
│   ├── .eslintrc.js             # ESLint configuration
│   └── jest.config.mjs          # Jest testing configuration
├── src/
│   ├── index.ts                 # Main entry point
│   ├── index.test.ts            # Tests for main module
│   └── subject.txt              # Project requirements document
├── .gitignore                   # Git ignore rules
├── package.json                 # Project dependencies and scripts
├── package-lock.json            # Locked dependency versions
├── README.md                    # Project documentation
└── tsconfig.json                # TypeScript configuration
```

## Key Files and Their Purpose

### Configuration Files

- **tsconfig.json**: TypeScript compiler configuration
- **config/.eslintrc.js**: Code quality and style rules
- **config/jest.config.mjs**: Test framework configuration
- **package.json**: Project metadata, dependencies, and npm scripts

### Source Code

- **src/index.ts**: Main application entry point (currently minimal)
- **src/index.test.ts**: Test file for main module
- **src/subject.txt**: Complete project requirements (42 School subject)

### CI/CD

- **.github/workflows/pr-check.yml**: Automated quality checks on PRs

## Current Implementation Status

- **Minimal Setup**: Basic TypeScript project with testing framework
- **Hello World**: Simple function demonstrating the setup
- **Ready for Development**: All tooling configured and working

## Development Patterns

- **Test-Driven Development**: Tests alongside source files
- **Configuration Separation**: All config files in dedicated directory
- **Strict TypeScript**: Comprehensive type checking enabled
- **Quality Gates**: Automated linting and testing in CI/CD

## Future Architecture Considerations

Based on project requirements, the codebase will likely expand to include:

- Frontend components (single-page application)
- Game logic (Pong implementation)
- Real-time communication (WebSocket for multiplayer)
- User management system
- Docker configuration
- Database integration (if backend module chosen)
- Additional game modules and features
