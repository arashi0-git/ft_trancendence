# Code Style and Conventions

## TypeScript Configuration

- **Target**: ES2020
- **Module**: CommonJS
- **Strict Mode**: Enabled
- **Source Maps**: Required for debugging
- **Declaration Files**: Generated for type definitions

## ESLint Rules and Code Style

### Core Principles (from user's CLAUDE.md)

- **DRY (Don't Repeat Yourself)**: Extract common code into functions/helpers
- **YAGNI (You Aren't Gonna Need It)**: Don't implement unused features
- **KISS (Keep It Simple, Stupid)**: Avoid complex abstractions
- **SRP (Single Responsibility Principle)**: One function, one responsibility

### ESLint Configuration

- **Parser**: @typescript-eslint/parser
- **Extends**: eslint:recommended
- **Environment**: Node.js + Jest

### Enforced Rules

- `@typescript-eslint/no-explicit-any`: error - No explicit any types
- `@typescript-eslint/no-unused-vars`: error - No unused variables (with \_ prefix exception)
- `unused-imports/no-unused-imports`: error - Remove unused imports
- Unused parameter pattern: Variables starting with `_` are ignored

### Naming Conventions

- Use meaningful function and variable names
- Follow existing codebase patterns
- Prefer descriptive names over comments

### File Organization

- Source code in `src/` directory
- Configuration in `config/` directory
- Tests alongside source files (`.test.ts` suffix)
- Build output in `dist/` (gitignored)

## Code Modification Guidelines

- Always provide brief modification comments (e.g., `// 共通処理に抽出`)
- Respect existing design philosophy
- Prefer editing existing files over creating new ones
- Never create documentation files unless explicitly requested
