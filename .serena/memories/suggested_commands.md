# Suggested Commands for ft_trancendence Development

## Development Commands
```bash
# Start development server
npm run dev

# Build the project
npm run build

# Type checking
npm run typecheck
```

## Code Quality Commands
```bash
# Run ESLint for code quality checks
npm run lint

# Auto-fix ESLint issues
npm run lint:fix
```

## Testing Commands
```bash
# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## System Commands (Darwin/macOS)
```bash
# List files and directories
ls -la

# Change directory
cd <directory>

# Search for text in files
grep -r "search_term" .

# Find files by name
find . -name "*.ts"

# Git operations
git status
git add .
git commit -m "message"
git push
git pull
```

## Docker Commands (Required for project)
```bash
# Build and run the application (single command requirement)
docker-compose up --build

# Stop containers
docker-compose down
```

## Package Management
```bash
# Install dependencies
npm install

# Install specific package
npm install <package-name>

# Install dev dependency
npm install --save-dev <package-name>

# Check for outdated packages
npm outdated

# Update packages
npm update
```

## Quick Development Workflow
1. `npm run dev` - Start development
2. Make changes to files in `src/`
3. `npm run lint` - Check code quality
4. `npm run typecheck` - Verify types
5. `npm run test` - Run tests
6. `npm run build` - Build for production