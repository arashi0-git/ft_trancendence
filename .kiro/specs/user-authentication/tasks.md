# Implementation Plan

- [ ] 1. Setup Test Infrastructure
  - Configure Jest testing framework for TypeScript
  - Create test database setup and cleanup utilities
  - Create test fixtures and mock data for users
  - Setup test environment configuration
  - _Requirements: 6.3, 6.4_

- [ ] 2. Create Authentication Utility Tests
  - [ ] 2.1 Write password hashing tests
    - Test bcrypt password hashing with proper salt rounds
    - Test password verification with correct and incorrect passwords
    - Test password hashing uniqueness (same password produces different hashes)
    - _Requirements: 5.1_

  - [ ] 2.2 Write JWT token tests
    - Test JWT token generation with user payload
    - Test JWT token validation with valid tokens
    - Test JWT token validation with expired tokens
    - Test JWT token validation with invalid signatures
    - Test token extraction from Authorization headers
    - _Requirements: 3.1, 3.2, 3.3, 5.5_

- [ ] 3. Implement Authentication Utilities
  - [ ] 3.1 Implement password hashing utilities
    - Create AuthUtils class with hashPassword method
    - Create verifyPassword method for password comparison
    - Ensure bcrypt salt rounds of 12 or higher
    - _Requirements: 5.1_

  - [ ] 3.2 Implement JWT token utilities
    - Create generateToken method for JWT creation
    - Create verifyToken method for JWT validation
    - Create extractTokenFromHeader method for token parsing
    - Handle token expiration (24 hours)
    - _Requirements: 3.1, 3.2, 5.5_

- [ ] 4. Create Database Layer Tests
  - [ ] 4.1 Write database connection tests
    - Test SQLite database connection initialization
    - Test database query execution methods (run, get, all, exec)
    - Test database error handling for invalid queries
    - Test database cleanup and connection closing
    - _Requirements: 6.1, 6.3_

  - [ ] 4.2 Write database schema tests
    - Test users table creation with proper constraints
    - Test unique constraints on username and email
    - Test foreign key constraints for related tables
    - Test database indexes creation
    - _Requirements: 6.1, 6.5_

- [ ] 5. Implement Database Layer
  - [x] 5.1 Implement database connection wrapper
    - Create DatabaseWrapper class with SQLite connection
    - Implement query methods (run, get, all, exec)
    - Add proper error handling and logging
    - Enable foreign key constraints
    - _Requirements: 6.1, 6.3_

  - [x] 5.2 Implement database initialization
    - Create database schema loading from SQL file
    - Handle database initialization errors gracefully
    - Ensure proper database state on startup
    - _Requirements: 6.1, 6.2_

- [ ] 6. Create User Service Tests
  - [ ] 6.1 Write user creation tests
    - Test successful user registration with valid data
    - Test user creation with duplicate email rejection
    - Test user creation with duplicate username rejection
    - Test password hashing during user creation
    - Test input validation for registration data
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [ ] 6.2 Write user authentication tests
    - Test successful login with valid credentials
    - Test login rejection with invalid email
    - Test login rejection with invalid password
    - Test online status update on successful login
    - Test last login timestamp update
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 6.3 Write user profile management tests
    - Test user profile retrieval by ID
    - Test user profile updates with valid data
    - Test profile update validation for email and username
    - Test online status management
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 7. Implement User Service
  - [ ] 7.1 Implement user creation service
    - Create UserService class with createUser method
    - Add user existence validation (email/username uniqueness)
    - Implement password hashing before storage
    - Add comprehensive input validation
    - _Requirements: 1.1, 1.2, 1.3, 5.1_

  - [ ] 7.2 Implement user authentication service
    - Create authenticateUser method for login
    - Implement password verification
    - Update user online status and last login
    - Return user profile without sensitive data
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [ ] 7.3 Implement user profile management
    - Create getUserById method for profile retrieval
    - Create updateUserProfile method for profile updates
    - Create updateUserOnlineStatus method
    - Add validation for profile updates
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 8. Create Authentication Middleware Tests
  - [ ] 8.1 Write token authentication middleware tests
    - Test middleware with valid JWT tokens
    - Test middleware with invalid JWT tokens
    - Test middleware with expired JWT tokens
    - Test middleware with missing Authorization header
    - Test user context injection into request object
    - _Requirements: 3.2, 3.3, 3.4_

  - [ ] 8.2 Write optional authentication middleware tests
    - Test optional auth with valid tokens
    - Test optional auth with invalid tokens
    - Test optional auth with missing tokens
    - Test graceful handling of authentication errors
    - _Requirements: 3.2, 3.3_

- [ ] 9. Implement Authentication Middleware
  - [ ] 9.1 Implement required authentication middleware
    - Create authenticateToken middleware function
    - Add JWT token extraction and validation
    - Inject user context into FastifyRequest
    - Handle authentication errors with proper HTTP status codes
    - _Requirements: 3.2, 3.3, 3.4_

  - [ ] 9.2 Implement optional authentication middleware
    - Create optionalAuth middleware function
    - Handle authentication gracefully without blocking requests
    - Inject user context when valid token is present
    - _Requirements: 3.2, 3.3_

- [ ] 10. Create API Routes Tests
  - [ ] 10.1 Write user registration endpoint tests
    - Test successful registration with valid data
    - Test registration validation errors
    - Test duplicate user registration rejection
    - Test registration response format with token
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ] 10.2 Write user login endpoint tests
    - Test successful login with valid credentials
    - Test login with invalid credentials
    - Test login response format with token
    - Test missing credentials handling
    - _Requirements: 2.1, 2.2, 2.5_

  - [ ] 10.3 Write protected routes tests
    - Test profile retrieval with valid authentication
    - Test profile updates with valid authentication
    - Test logout functionality
    - Test protected routes with invalid authentication
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 3.4_

- [ ] 11. Implement API Routes
  - [ ] 11.1 Implement user registration endpoint
    - Create POST /api/auth/register route
    - Add comprehensive input validation
    - Integrate with UserService for user creation
    - Return JWT token and user profile on success
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

  - [ ] 11.2 Implement user login endpoint
    - Create POST /api/auth/login route
    - Add input validation for credentials
    - Integrate with UserService for authentication
    - Return JWT token and user profile on success
    - _Requirements: 2.1, 2.2, 2.5_

  - [ ] 11.3 Implement protected routes
    - Create GET /api/auth/me route for profile retrieval
    - Create PUT /api/auth/profile route for profile updates
    - Create POST /api/auth/logout route for logout
    - Apply authentication middleware to protected routes
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 3.4_

- [ ] 12. Integration and Security Testing
  - [ ] 12.1 Write end-to-end authentication flow tests
    - Test complete registration → login → profile access flow
    - Test authentication state persistence across requests
    - Test token expiration and renewal scenarios
    - _Requirements: 1.7, 2.1, 3.1, 4.1_

  - [ ] 12.2 Write security validation tests
    - Test SQL injection prevention with parameterized queries
    - Test XSS prevention with input sanitization
    - Test password security with bcrypt verification
    - Test JWT security with signature validation
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ] 13. Final Integration
  - [ ] 13.1 Integrate authentication routes with main server
    - Register authentication routes in main Fastify instance
    - Update API documentation with authentication endpoints
    - Add proper error handling and logging
    - _Requirements: 6.3_

  - [ ] 13.2 Add environment configuration
    - Create environment variables for JWT secret
    - Add database path configuration
    - Create .env.example file with required variables
    - _Requirements: 5.6_