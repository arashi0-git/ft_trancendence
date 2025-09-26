# Design Document

## Overview

The user authentication system will be built using a layered architecture with clear separation of concerns. The system will start with establishing a solid database foundation and gradually build up the authentication features. The implementation follows the existing project structure using Fastify (Node.js), TypeScript, SQLite, and bcrypt for password hashing.

## Architecture

### Layer Structure
```
┌─────────────────────────────────────┐
│           API Routes Layer          │  ← HTTP endpoints
├─────────────────────────────────────┤
│         Middleware Layer            │  ← Authentication, validation
├─────────────────────────────────────┤
│         Service Layer               │  ← Business logic
├─────────────────────────────────────┤
│         Database Layer              │  ← Data access
└─────────────────────────────────────┘
```

### Technology Stack
- **Backend Framework**: Fastify with TypeScript
- **Database**: SQLite with better-sqlite3
- **Authentication**: JWT tokens with bcrypt password hashing
- **Validation**: Custom middleware for input validation
- **Security**: HTTPS, parameterized queries, input sanitization

## Components and Interfaces

### 1. Database Layer (Starting Point)

#### Database Connection
- **File**: `backend/src/database/connection.ts`
- **Purpose**: Manage SQLite database connection and provide query methods
- **Key Methods**:
  - `exec(sql: string)`: Execute schema/migration scripts
  - `run(sql: string, params?: any[])`: Execute INSERT/UPDATE/DELETE
  - `get(sql: string, params?: any[])`: Get single record
  - `all(sql: string, params?: any[])`: Get multiple records

#### Database Initialization
- **File**: `backend/src/database/init.ts`
- **Purpose**: Initialize database schema and handle migrations
- **Responsibilities**:
  - Load and execute schema.sql
  - Handle database setup errors
  - Ensure proper database state on startup

#### Database Schema
- **File**: `database/schema.sql`
- **Tables**:
  - `users`: Core user information with authentication data
  - `tournaments`, `matches`, `friendships`: Game-related tables
- **Indexes**: Optimized queries for username and email lookups

### 2. Data Models and Types

#### User Types
- **File**: `backend/src/types/user.ts`
- **Interfaces**:
  - `User`: Complete user record (including password_hash)
  - `UserProfile`: Public user data (excluding sensitive info)
  - `CreateUserRequest`: Registration input
  - `LoginRequest`: Login input
  - `AuthResponse`: Authentication response with token

### 3. Service Layer

#### UserService
- **File**: `backend/src/services/userService.ts`
- **Purpose**: Handle all user-related business logic
- **Key Methods**:
  - `createUser()`: Register new user with validation
  - `authenticateUser()`: Verify credentials and return profile
  - `getUserById()`: Retrieve user profile by ID
  - `updateUserProfile()`: Update user information
  - `updateUserOnlineStatus()`: Manage online/offline status

### 4. Authentication Utilities

#### AuthUtils
- **File**: `backend/src/utils/auth.ts`
- **Purpose**: Handle cryptographic operations and token management
- **Key Methods**:
  - `hashPassword()`: Bcrypt password hashing
  - `verifyPassword()`: Password verification
  - `generateToken()`: JWT token creation
  - `verifyToken()`: JWT token validation
  - `extractTokenFromHeader()`: Parse Authorization header

### 5. Middleware Layer

#### Authentication Middleware
- **File**: `backend/src/middleware/auth.ts`
- **Functions**:
  - `authenticateToken()`: Required authentication for protected routes
  - `optionalAuth()`: Optional authentication for public routes
- **Features**:
  - Token extraction and validation
  - User context injection into request
  - Error handling for invalid/expired tokens

### 6. API Routes Layer

#### Authentication Routes
- **File**: `backend/src/routes/auth.ts`
- **Endpoints**:
  - `POST /api/auth/register`: User registration
  - `POST /api/auth/login`: User login
  - `GET /api/auth/me`: Get current user profile
  - `PUT /api/auth/profile`: Update user profile
  - `POST /api/auth/logout`: User logout

## Data Models

### User Table Schema
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_online BOOLEAN DEFAULT FALSE,
    last_login DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### JWT Token Payload
```typescript
{
  id: number,
  username: string,
  email: string,
  iat: number,    // issued at
  exp: number     // expiration
}
```

## Error Handling

### Database Errors
- Connection failures: Graceful startup failure with logging
- Constraint violations: User-friendly error messages
- Query errors: Proper error logging without exposing internals

### Authentication Errors
- Invalid credentials: Generic "invalid email or password" message
- Expired tokens: Clear 401 responses with token refresh guidance
- Missing tokens: Appropriate 401 responses for protected routes

### Validation Errors
- Input validation: Specific field-level error messages
- Format validation: Clear guidance on expected formats
- Business rule violations: Contextual error explanations

## Testing Strategy (Test-Driven Development)

### TDD Approach
Following Red-Green-Refactor cycle:
1. **Red**: Write failing test first
2. **Green**: Write minimal code to pass test
3. **Refactor**: Improve code while keeping tests green

### Test Structure
```
backend/src/
├── __tests__/
│   ├── database/
│   │   ├── connection.test.ts
│   │   └── init.test.ts
│   ├── services/
│   │   └── userService.test.ts
│   ├── utils/
│   │   └── auth.test.ts
│   ├── middleware/
│   │   └── auth.test.ts
│   └── routes/
│       └── auth.test.ts
└── test-helpers/
    ├── database.ts      # Test database setup
    ├── fixtures.ts      # Test data fixtures
    └── mocks.ts         # Mock implementations
```

### Unit Tests (Test First)

#### Database Layer Tests
- **Connection Tests**: Database initialization, query execution, error handling
- **Schema Tests**: Table creation, constraints, indexes
- **CRUD Operations**: Insert, select, update, delete operations

#### Service Layer Tests  
- **UserService Tests**: User creation, authentication, profile management
- **Business Logic Tests**: Validation rules, error conditions, edge cases
- **Mock Database Tests**: Service logic without database dependencies

#### Utility Tests
- **Password Hashing**: Bcrypt operations, salt rounds, verification
- **JWT Operations**: Token generation, validation, expiration
- **Input Validation**: Format checking, sanitization

#### Middleware Tests
- **Authentication Middleware**: Token extraction, validation, user context
- **Error Handling**: Invalid tokens, missing headers, expired tokens

### Integration Tests

#### API Endpoint Tests
- **Registration Flow**: Complete user registration process
- **Login Flow**: Authentication and token generation
- **Protected Routes**: Access control and authorization
- **Profile Management**: Update operations and validation

#### Database Integration Tests
- **Real Database Operations**: Test with actual SQLite database
- **Transaction Handling**: Rollback on errors, data consistency
- **Concurrent Access**: Multiple user operations

### Test Data Management

#### Test Database
- **Separate Test DB**: Isolated test database file
- **Clean State**: Fresh database for each test suite
- **Fixtures**: Predefined test users and data

#### Mock Data
- **User Fixtures**: Valid and invalid user data
- **JWT Tokens**: Valid, expired, and malformed tokens
- **Request/Response Mocks**: HTTP request simulation

### Security Testing

#### Password Security Tests
- **Hash Strength**: Verify bcrypt salt rounds and uniqueness
- **Password Validation**: Length, complexity requirements
- **Timing Attacks**: Consistent response times

#### JWT Security Tests
- **Token Validation**: Signature verification, expiration checks
- **Token Tampering**: Modified payload detection
- **Secret Key Security**: Proper secret management

#### Input Validation Tests
- **XSS Prevention**: Script injection attempts
- **SQL Injection**: Parameterized query verification
- **Data Sanitization**: Input cleaning and validation

## Implementation Phases (TDD Approach)

### Phase 1: Test Infrastructure Setup
1. **Setup Test Environment**: Configure Jest, test database, test helpers
2. **Create Test Fixtures**: User data, mock objects, test utilities
3. **Database Test Setup**: Test database initialization and cleanup
4. **Write First Failing Tests**: Basic database connection tests

### Phase 2: Database Foundation (Test-First)
1. **Write Database Connection Tests**: Test connection, query methods, error handling
2. **Implement Database Wrapper**: Make connection tests pass
3. **Write Schema Tests**: Test table creation and constraints
4. **Implement Schema Initialization**: Make schema tests pass
5. **Write CRUD Tests**: Test basic database operations
6. **Implement CRUD Operations**: Make CRUD tests pass

### Phase 3: User Data Models (Test-First)
1. **Write Type Definition Tests**: Test user interfaces and types
2. **Create User Types**: Define interfaces and types
3. **Write Validation Tests**: Test input validation logic
4. **Implement Validation**: Create validation functions

### Phase 4: Authentication Utilities (Test-First)
1. **Write Password Hashing Tests**: Test bcrypt operations
2. **Implement Password Utilities**: Make hashing tests pass
3. **Write JWT Tests**: Test token generation and validation
4. **Implement JWT Utilities**: Make JWT tests pass

### Phase 5: User Service Layer (Test-First)
1. **Write UserService Tests**: Test user creation, authentication, profile operations
2. **Implement UserService**: Make service tests pass
3. **Write Business Logic Tests**: Test validation rules and error conditions
4. **Refine UserService**: Handle edge cases and errors

### Phase 6: Authentication Middleware (Test-First)
1. **Write Middleware Tests**: Test token extraction and validation
2. **Implement Auth Middleware**: Make middleware tests pass
3. **Write Authorization Tests**: Test access control logic
4. **Refine Middleware**: Handle error cases and edge conditions

### Phase 7: API Routes (Test-First)
1. **Write Route Tests**: Test registration, login, profile endpoints
2. **Implement Auth Routes**: Make route tests pass
3. **Write Integration Tests**: Test complete request/response cycles
4. **Refine API**: Add error handling and validation

### Phase 8: Security and Integration Testing
1. **Write Security Tests**: Test password security, JWT security, input validation
2. **Implement Security Measures**: Make security tests pass
3. **Write End-to-End Tests**: Test complete authentication flows
4. **Final Integration**: Ensure all components work together