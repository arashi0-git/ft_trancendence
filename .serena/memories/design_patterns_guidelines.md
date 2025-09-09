# Design Patterns and Guidelines

## Project-Specific Guidelines

### Module System (from ft_transcendence requirements)
- **Modular Architecture**: Project requires selecting 7+ major modules from predefined categories
- **Technology Constraints**: Each module specifies required technologies (cannot be bypassed)
- **Integration Requirements**: Some modules depend on or conflict with others
- **Library Restrictions**: No complete solutions allowed - only small utilities for subcomponents

### Development Philosophy
- **Adaptation Focus**: Project emphasizes learning unknown technologies
- **Problem-Solving**: Prioritize adaptation and discovery over familiar tools
- **Team Collaboration**: Peer review and collaboration strongly encouraged
- **Quality over Speed**: Careful planning required before implementation

## Code Design Principles

### From User's CLAUDE.md Guidelines
1. **DRY (Don't Repeat Yourself)**
   - Extract common logic into shared functions
   - Create reusable components and utilities
   - Apply to both production and test code

2. **YAGNI (You Aren't Gonna Need It)**
   - Focus only on current requirements
   - Avoid "future-proofing" implementations
   - No speculative features

3. **KISS (Keep It Simple, Stupid)**
   - Avoid complex abstractions without clear benefit
   - Prioritize readability and maintainability
   - Especially important for C/C++/Python (avoid class/struct abuse)

4. **SRP (Single Responsibility Principle)**
   - One function = one responsibility
   - Functions doing "X and Y" are refactoring candidates

### TypeScript-Specific Patterns
- **Strict Typing**: Use explicit types, avoid `any`
- **Interface Definitions**: Clear contracts for data structures
- **Error Handling**: Proper exception handling and validation
- **Module Organization**: Clean imports/exports

### Security Patterns (Required by Project)
- **Password Security**: All passwords must be hashed
- **Input Validation**: All user input must be validated
- **HTTPS/WSS**: Secure connections required
- **SQL Injection/XSS Prevention**: Mandatory security measures
- **Environment Variables**: Secrets in .env files only

## Code Modification Standards
- **Minimal Comments**: Only add comments when explicitly requested
- **Meaningful Names**: Self-documenting code preferred
- **Existing Patterns**: Follow established codebase conventions
- **Edit vs Create**: Always prefer editing existing files over creating new ones