# MVC Architecture Documentation

This directory contains the new MVC (Model-View-Controller) architecture for the Logam Task Manager application. The architecture follows industry-standard patterns and best practices.

## Architecture Overview

```
src/
├── models/          # Data models and validation
├── repositories/    # Database access layer
├── services/        # Business logic layer
├── controllers/     # API route handlers (to be implemented)
├── middleware/      # Request processing middleware
├── validators/      # Input validation schemas
├── dto/            # Data Transfer Objects
└── utils/          # Utility functions and constants
```

## Layer Responsibilities

### 1. Models Layer (`/models`)

**Purpose**: Define data structure, validation rules, and data transformation.

**Files**:
- `user.model.js` - User data schema and validation
- `attendance.model.js` - Attendance data schema with field mapping
- `task.model.js` - Task data schema and validation
- `organization.model.js` - Organization data schema and validation

**Example**:
```javascript
import { UserModel } from '../models/user.model.js';

// Create model instance
const user = new UserModel({
  username: 'john',
  email: 'john@example.com',
  role: 'user',
  tenantId: 'org-123'
});

// Validate data
const validation = UserModel.validate(userData);
if (!validation.isValid) {
  console.error(validation.errors);
}

// Convert to safe object (removes password)
const safeUser = user.toSafeObject();
```

### 2. Repositories Layer (`/repositories`)

**Purpose**: Wrap database operations and provide a clean interface for data access.

**Files**:
- `base.repository.js` - Base repository with common operations
- `user.repository.js` - User database operations
- `attendance.repository.js` - Attendance database operations
- `task.repository.js` - Task database operations
- `organization.repository.js` - Organization database operations

**Features**:
- Wraps existing `firebaseService` functions
- Provides consistent error handling
- Handles field name mapping (clockIn ↔ checkIn, workMode ↔ workType)
- No breaking changes to existing code

**Example**:
```javascript
import { userRepository } from '../repositories/index.js';

// Find user by username
const user = await userRepository.findByUsername('john', 'org-123');

// Get all users for tenant
const users = await userRepository.findByTenant('org-123');

// Create new user
const newUser = await userRepository.create(userData, 'org-123');
```

### 3. Services Layer (`/services`)

**Purpose**: Contain business logic, orchestrate repository calls, and enforce business rules.

**Files**:
- `user.service.js` - User management business logic
- `attendance.service.js` - Attendance tracking business logic
- `task.service.js` - Task management business logic
- `organization.service.js` - Organization management business logic

**Features**:
- Input validation using models
- Business rule enforcement
- Multi-repository orchestration
- Data transformation and sanitization
- Password hashing and verification

**Example**:
```javascript
import { userService } from '../services/index.js';

// Create user (handles validation, password hashing, conflict checking)
const newUser = await userService.createUser({
  username: 'john',
  email: 'john@example.com',
  password: 'SecurePass123',
  role: 'user'
}, 'org-123');

// Verify credentials
const user = await userService.verifyCredentials('john', 'SecurePass123', 'org-123');

// Change password
await userService.changePassword(userId, 'oldPass', 'newPass', 'org-123');
```

### 4. Middleware Layer (`/middleware`)

**Purpose**: Process requests before they reach handlers (validation, auth, logging, error handling).

**Files**:
- `error.middleware.js` - Error handling and async wrapper
- `validation.middleware.js` - Input validation
- `auth.middleware.js` - Authentication and authorization
- `logging.middleware.js` - Request/activity logging

**Features**:
- JWT authentication
- Role-based access control
- Tenant isolation verification
- Input sanitization and validation
- Centralized error handling
- Activity and error logging

**Example**:
```javascript
import { asyncHandler, authenticate, requireAdmin } from '../middleware/index.js';
import { userService } from '../services/index.js';

export default asyncHandler(async (req, res) => {
  // Authenticate user
  await authenticate(req, res);

  // Require admin role
  await requireAdmin(req, res);

  // Process request
  const users = await userService.getUsersByTenant(req.user.tenantId);

  return res.status(200).json({
    success: true,
    data: users
  });
});
```

### 5. Utils Layer (`/utils`)

**Purpose**: Provide reusable utility functions, constants, and helpers.

**Files**:
- `response.util.js` - Standardized API response functions
- `constants.js` - Application-wide constants
- `errors.js` - Custom error classes

**Example**:
```javascript
import { successResponse, errorResponse } from '../utils/response.util.js';
import { USER_ROLES, TASK_STATUS } from '../utils/constants.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

// Send success response
return successResponse(res, data, 'User created successfully', 201);

// Throw custom error
throw new ValidationError('Invalid input', errors);

// Use constants
if (user.role === USER_ROLES.ADMIN) {
  // Admin logic
}
```

## Data Flow

```
Request
  ↓
Middleware (auth, validation)
  ↓
Controller/Handler
  ↓
Service (business logic)
  ↓
Repository (database access)
  ↓
Database (Firestore)
  ↓
Repository
  ↓
Service
  ↓
Controller/Handler
  ↓
Response
```

## Field Name Mapping

The system supports backward compatibility for field names:

| Database Field | Frontend Field | Supported By |
|---------------|---------------|--------------|
| `clockIn` | `checkIn` | AttendanceRepository |
| `clockOut` | `checkOut` | AttendanceRepository |
| `workMode` | `workType` | AttendanceRepository |

Both field names work interchangeably. The repository layer automatically adds both versions to ensure compatibility with existing code.

## Error Handling

The architecture uses custom error classes for consistent error handling:

```javascript
// Custom Errors
ValidationError    - 400 Bad Request
NotFoundError      - 404 Not Found
UnauthorizedError  - 401 Unauthorized
ForbiddenError     - 403 Forbidden
ConflictError      - 409 Conflict
DatabaseError      - 500 Internal Server Error
AppError           - Custom status codes
```

All errors are caught by `asyncHandler` and formatted consistently:

```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ],
  "timestamp": "2025-11-17T10:30:00.000Z"
}
```

## Authentication & Authorization

### JWT Authentication

```javascript
import { authenticate } from '../middleware/auth.middleware.js';

// In API route
await authenticate(req, res);

// User info now available in req.user
console.log(req.user.username);
console.log(req.user.tenantId);
console.log(req.user.role);
```

### Role-Based Access Control

```javascript
import { requireAdmin, requireRole } from '../middleware/auth.middleware.js';

// Require admin or super admin
await requireAdmin(req, res);

// Require specific role
await requireRole(USER_ROLES.SUPER_ADMIN)(req, res);
```

### Tenant Isolation

```javascript
import { verifyTenantAccess } from '../middleware/auth.middleware.js';

// Ensure user can only access their own tenant data
await verifyTenantAccess(req, res);

// Tenant ID now available in req.tenantId
const data = await service.getData(req.tenantId);
```

## Migration Strategy

The new architecture is designed to work alongside existing code without breaking changes:

1. **Phase 1** (COMPLETED):
   - ✅ Create folder structure
   - ✅ Create models, repositories, services, middleware
   - ✅ Wrap existing functions without modifying them

2. **Phase 2** (PENDING):
   - Create new API endpoints using new architecture
   - Test new endpoints thoroughly
   - Gradually migrate existing endpoints

3. **Phase 3** (FUTURE):
   - Update frontend to use new endpoints
   - Deprecate old code gradually
   - Remove legacy code once fully migrated

## Usage Examples

### Creating a New API Endpoint

```javascript
// pages/api/users/create.js
import { asyncHandler, authenticate, validateRequired } from '../../../src/middleware/index.js';
import { userService } from '../../../src/services/index.js';
import { successResponse } from '../../../src/utils/response.util.js';

export default asyncHandler(async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Authenticate
  await authenticate(req, res);

  // Validate required fields
  await validateRequired('username', 'email', 'password')(req, res);

  // Create user via service
  const newUser = await userService.createUser(req.body, req.user.tenantId);

  // Return success response
  return successResponse(res, newUser, 'User created successfully', 201);
});
```

### Using Services Directly

```javascript
import { attendanceService } from '../src/services/index.js';

// Mark attendance
const attendance = await attendanceService.markAttendance({
  username: 'john',
  clockIn: '09:00',
  workMode: 'office',
  location: 'Office'
}, 'org-123');

// Get today's attendance
const today = await attendanceService.getTodayAttendance('john', 'org-123');

// Get monthly summary
const summary = await attendanceService.getMonthlyAttendance('john', 'org-123', 2025, 11);
```

## Best Practices

1. **Always use services, never repositories directly in controllers**
   - ❌ `await userRepository.create(data)`
   - ✅ `await userService.createUser(data, tenantId)`

2. **Use middleware for cross-cutting concerns**
   - Authentication, validation, logging

3. **Use custom errors for business logic failures**
   - `throw new ValidationError('message', errors)`

4. **Always include tenantId for multi-tenant isolation**
   - Every operation should be scoped to a tenant

5. **Validate input at service layer**
   - Use model validation functions

6. **Use asyncHandler for all async routes**
   - Automatically catches and handles errors

7. **Return consistent response formats**
   - Use `successResponse` and `errorResponse` utilities

## Testing

```javascript
// Example test structure
import { userService } from '../services/index.js';

describe('UserService', () => {
  it('should create user successfully', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'SecurePass123',
      role: 'user'
    };

    const user = await userService.createUser(userData, 'org-test');

    expect(user.username).toBe('testuser');
    expect(user.password).toBeUndefined(); // Password should not be returned
  });

  it('should throw error for duplicate username', async () => {
    const userData = {
      username: 'existinguser',
      email: 'test2@example.com',
      password: 'SecurePass123'
    };

    await expect(
      userService.createUser(userData, 'org-test')
    ).rejects.toThrow(ConflictError);
  });
});
```

## Support

For questions or issues related to the new architecture:
1. Check this documentation
2. Review example implementations
3. Consult the team lead

---

**Note**: This architecture is backward compatible with all existing code. No functionality has been broken or changed during the implementation.
