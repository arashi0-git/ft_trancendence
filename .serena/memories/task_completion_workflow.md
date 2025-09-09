# Task Completion Workflow

## Required Steps When Completing Tasks

### 1. Code Quality Checks (MANDATORY)
After any code changes, always run these commands in order:
```bash
# Type checking
npm run typecheck

# Code linting
npm run lint

# Build verification
npm run build

# Test execution
npm run test
```

### 2. Fix Any Issues
- **TypeScript Errors**: Must be resolved before completion
- **ESLint Warnings/Errors**: Use `npm run lint:fix` for auto-fixable issues
- **Build Failures**: Resolve compilation errors
- **Test Failures**: Fix broken tests or update them appropriately

### 3. Verification Workflow
1. Ensure all lint rules pass
2. Verify TypeScript compilation succeeds
3. Confirm all tests pass
4. Check that build output is generated correctly

### 4. Git Workflow (when ready to commit)
```bash
# Check current status
git status

# Stage changes
git add .

# Commit with meaningful message
git commit -m "feat: implement feature X"

# Push to remote (if appropriate)
git push
```

### 5. CI/CD Integration
The project uses GitHub Actions that will automatically run:
- Multi-version Node.js testing (18.x, 20.x)
- TypeScript type checking
- ESLint code quality checks
- Jest tests with coverage
- Build verification

### 6. Quality Standards
- No unhandled TypeScript errors
- No ESLint rule violations
- All tests must pass
- Build must succeed without warnings
- Code coverage should be maintained or improved

## Development Best Practices
- Run `npm run dev` during development for hot reloading
- Use `npm run test:watch` for test-driven development
- Check `npm run typecheck` frequently while coding
- Regularly run `npm run lint:fix` to maintain code quality