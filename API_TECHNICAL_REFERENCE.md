# Logam Task Manager - Technical API & Functions Reference

## Table of Contents
1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Multi-Tenancy Architecture](#multi-tenancy-architecture)
4. [API Routes](#api-routes)
5. [Database Functions](#database-functions)
6. [Security Implementation](#security-implementation)
7. [Error Handling](#error-handling)
8. [Code Examples](#code-examples)

---

## Overview

This technical reference provides comprehensive documentation for all API routes, database functions, and implementation patterns in the Logam Task Manager application. The system is built with:

- **Framework**: Next.js 14 (React)
- **Database**: Firebase Firestore
- **Authentication**: JWT (JSON Web Tokens)
- **Architecture**: Multi-tenant SaaS with tenant isolation
- **Language**: JavaScript (Node.js)

### Base URL
```
Development: http://localhost:3000/api
Production: https://your-domain.com/api
```

### Global Headers
```javascript
{
  "Authorization": "Bearer <JWT_TOKEN>",
  "Content-Type": "application/json"
}
```

---

## Authentication

### Authentication Flow

The application uses JWT-based authentication with tenant context for multi-tenancy support.

#### File: `lib/auth.js`

### Core Authentication Functions

#### 1. `generateToken(user)`

Generates a JWT token with user and tenant information.

**Parameters:**
```javascript
user: {
  id: string,
  username: string,
  role: 'admin' | 'user',
  email: string,
  tenantId: string
}
```

**Returns:**
```javascript
string // JWT token valid for 24 hours
```

**Token Payload:**
```javascript
{
  id: string,
  username: string,
  role: string,
  email: string,
  tenantId: string,
  iat: number,
  exp: number
}
```

**Example:**
```javascript
import { generateToken } from './lib/auth.js';

const user = {
  id: 'user123',
  username: 'john.doe',
  role: 'user',
  email: 'john@example.com',
  tenantId: 'logam-digital-001'
};

const token = generateToken(user);
// Returns: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

#### 2. `verifyToken(token)`

Verifies a JWT token string.

**Parameters:**
```javascript
token: string // JWT token
```

**Returns:**
```javascript
{
  valid: boolean,
  user?: object,    // If valid: decoded token payload
  error?: string    // If invalid: error message
}
```

**Example:**
```javascript
import { verifyToken } from './lib/auth.js';

const result = verifyToken(token);

if (result.valid) {
  console.log('User:', result.user);
} else {
  console.error('Error:', result.error);
}
```

---

#### 3. `verifyTokenFromRequest(req)`

Extracts and verifies JWT token from HTTP request headers.

**Parameters:**
```javascript
req: NextApiRequest // Next.js request object
```

**Extracts Token From:**
- `Authorization: Bearer <token>` header
- `Authorization: <token>` header (fallback)

**Returns:**
```javascript
{
  valid: boolean,
  user?: {
    username: string,
    role: string,
    email: string,
    id: string,
    tenantId: string
  },
  message?: string  // Error message if invalid
}
```

**Example:**
```javascript
import { verifyTokenFromRequest } from './lib/auth.js';

export default async function handler(req, res) {
  const verification = verifyTokenFromRequest(req);

  if (!verification.valid) {
    return res.status(401).json({
      success: false,
      message: verification.message
    });
  }

  // Use verification.user data
}
```

---

#### 4. `authenticateUser(username, password)`

Authenticates a user with username and password.

**Parameters:**
```javascript
username: string,
password: string
```

**Process:**
1. Loads all users from Firebase
2. Finds user by username (case-insensitive)
3. Compares password using bcrypt
4. Generates JWT token if valid

**Returns:**
```javascript
{
  success: boolean,
  message: string,
  user?: {
    id: string,
    username: string,
    role: string,
    email: string,
    tenantId: string
  },
  token?: string
}
```

**Example:**
```javascript
import { authenticateUser } from './lib/auth.js';

const result = await authenticateUser('john.doe', 'password123');

if (result.success) {
  // Store token in localStorage or cookie
  localStorage.setItem('token', result.token);
  // Store user data
  localStorage.setItem('user', JSON.stringify(result.user));
} else {
  console.error(result.message);
}
```

---

### Authentication Middleware

#### 5. `requireAuth(handler)`

Middleware that requires valid JWT authentication.

**Usage:**
```javascript
import { requireAuth } from '../../../lib/auth.js';

async function handler(req, res) {
  // req.user is available here
  // req.tenantId is available here
  console.log('Authenticated user:', req.user);
  console.log('Tenant ID:', req.tenantId);

  // Your API logic here
}

export default requireAuth(handler);
```

**Behavior:**
- Verifies JWT token from request headers
- Returns 401 if token is invalid or missing
- Adds `req.user` and `req.tenantId` to request object
- Calls the handler function if authentication succeeds

---

#### 6. `requireRole(role)`

Middleware that requires a specific user role.

**Usage:**
```javascript
import { requireRole } from '../../../lib/auth.js';

async function handler(req, res) {
  // Only users with 'admin' role can access
  return res.json({ message: 'Admin access granted' });
}

export default requireRole('admin')(handler);
```

---

#### 7. `requireAdmin`

Shorthand for `requireRole('admin')`.

**Usage:**
```javascript
import { requireAdmin } from '../../../lib/auth.js';

async function handler(req, res) {
  // Only admins can access
  return res.json({ message: 'Admin access granted' });
}

export default requireAdmin(handler);
```

---

#### 8. `requireTenantId(handler)`

Middleware that ensures tenant context exists.

**Usage:**
```javascript
import { requireTenantId } from '../../../lib/auth.js';

async function handler(req, res) {
  // req.tenantId is guaranteed to exist
  const data = await loadData(req.tenantId);
  return res.json({ data });
}

export default requireTenantId(handler);
```

**Behavior:**
- Wraps `requireAuth` middleware
- Returns 403 if `req.tenantId` is null or undefined
- Ensures multi-tenancy isolation

---

#### 9. `getUserFromRequest(req)`

Utility function to extract user data from request.

**Returns:**
```javascript
{
  username: string,
  role: string,
  email: string,
  id: string,
  tenantId: string
} | null
```

---

## Multi-Tenancy Architecture

### Overview

The application implements a **shared database, multi-tenant architecture** where:
- All organizations share the same database
- Data is isolated using `tenantId` field
- Every query is filtered by `tenantId`
- JWT tokens carry tenant context
- Composite indexes optimize tenant-scoped queries

### Tenant Identification

**Tenant ID Format:**
```
{organization-name}-{number}
Example: logam-digital-001
```

### Data Model

Every collection has a `tenantId` field:

```javascript
// Users collection
{
  id: "user123",
  username: "john.doe",
  email: "john@example.com",
  role: "user",
  tenantId: "logam-digital-001",
  password: "$2a$10$..." // bcrypt hash
}

// Tasks collection
{
  id: "task456",
  task: "Design new feature",
  assigned_to: "john.doe",
  status: "in progress",
  tenantId: "logam-digital-001",
  deadline: "2025-12-31",
  priority: "High"
}

// Clients collection
{
  id: "client789",
  name: "Acme Corp",
  tenantId: "logam-digital-001",
  email: "contact@acme.com"
}
```

### Query Patterns

**Read Operations:**
```javascript
// Filter by tenantId
export const loadTasks = async (tenantId = null) => {
  let query = adminDb.collection('tasks');

  if (tenantId) {
    query = query.where('tenantId', '==', tenantId);
  }

  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
```

**Create Operations:**
```javascript
// Require tenantId
export const addTask = async (taskData, tenantId) => {
  if (!tenantId) {
    throw new Error('tenantId is required');
  }

  const docRef = await adminDb.collection('tasks').add({
    tenantId: tenantId,
    ...taskData,
    created_at: new Date().toISOString(),
    status: 'pending'
  });

  return { id: docRef.id, tenantId, ...taskData };
};
```

**Update/Delete Operations:**
```javascript
// Verify tenant ownership
export const updateTask = async (taskId, updateData, tenantId = null) => {
  if (tenantId) {
    const doc = await adminDb.collection('tasks').doc(taskId).get();

    if (!doc.exists) {
      throw new Error('Task not found');
    }

    if (doc.data().tenantId !== tenantId) {
      throw new Error('Unauthorized: Resource belongs to different organization');
    }
  }

  await adminDb.collection('tasks').doc(taskId).update(updateData);
  return true;
};
```

### Security Rules

**Application-Level:**
- Every API route extracts `tenantId` from JWT token
- Every database function filters by `tenantId`
- No cross-tenant data access possible

**Firestore Rules:**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Composite Indexes

Performance optimization for tenant-scoped queries:

```json
{
  "indexes": [
    {
      "collectionGroup": "tasks",
      "fields": [
        { "fieldPath": "tenantId", "order": "ASCENDING" },
        { "fieldPath": "assigned_to", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "users",
      "fields": [
        { "fieldPath": "tenantId", "order": "ASCENDING" },
        { "fieldPath": "username", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## API Routes

### Authentication Routes

#### POST `/api/auth/login`

Authenticate user and receive JWT token.

**File:** `pages/api/auth/login.js`

**Request:**
```json
{
  "username": "john.doe",
  "password": "password123"
}
```

**Response (Success - 200):**
```json
{
  "success": true,
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user123",
    "username": "john.doe",
    "role": "user",
    "email": "john@example.com",
    "tenantId": "logam-digital-001"
  }
}
```

**Response (Error - 401):**
```json
{
  "success": false,
  "message": "Invalid username or password"
}
```

**Validation:**
- Username and password are required
- Username is case-insensitive
- Password is verified using bcrypt

**Example:**
```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'john.doe',
    password: 'password123'
  })
});

const data = await response.json();
if (data.success) {
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
}
```

---

#### POST `/api/auth/logout`

Logout user (client-side token removal).

**File:** `pages/api/auth/logout.js`

**Request:**
- No body required

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Note:** Actual logout happens client-side by removing the token.

---

### Task Routes

#### GET `/api/tasks`

Retrieve tasks based on user role and query parameters.

**File:** `pages/api/tasks/index.js`

**Authentication:** Required

**Query Parameters:**
- `user` (string, optional): Filter tasks by username (admin or own user only)
- `all` (boolean, optional): Get all tasks (admin only)

**Request Examples:**
```javascript
// Get current user's tasks
GET /api/tasks
Authorization: Bearer <token>

// Get specific user's tasks (admin or own user)
GET /api/tasks?user=john.doe
Authorization: Bearer <token>

// Get all tasks (admin only)
GET /api/tasks?all=true
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "tasks": [
    {
      "id": "task123",
      "task": "Design homepage",
      "assigned_to": "john.doe",
      "given_by": "admin",
      "status": "in progress",
      "priority": "High",
      "deadline": "2025-12-31",
      "client_name": "Acme Corp",
      "tenantId": "logam-digital-001",
      "created_at": "2025-01-15T10:30:00Z"
    }
  ]
}
```

**Authorization Rules:**
- Users can only see their own tasks
- Admins can see any user's tasks or all tasks
- All tasks are filtered by `tenantId` automatically

---

#### POST `/api/tasks`

Create a new task.

**File:** `pages/api/tasks/index.js`

**Authentication:** Required (typically admin)

**Request:**
```json
{
  "task": "Design new homepage",
  "assigned_to": "john.doe",
  "client_name": "Acme Corp",
  "deadline": "2025-12-31",
  "priority": "High",
  "assignerNotes": "Please use blue color scheme",
  "assignerPrivateNotes": "Client is very demanding"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Task created successfully",
  "task": {
    "id": "task456",
    "task": "Design new homepage",
    "assigned_to": "john.doe",
    "given_by": "admin",
    "client_name": "Acme Corp",
    "deadline": "2025-12-31",
    "priority": "High",
    "status": "pending",
    "tenantId": "logam-digital-001",
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

**Response (400 - Validation Error):**
```json
{
  "success": false,
  "message": "Validation failed",
  "errors": [
    "Task description is required",
    "Deadline cannot be in the past"
  ]
}
```

**Validation Rules:**
- `task`: Required, non-empty string
- `assigned_to`: Required, non-empty string
- `deadline`: Required, must be today or future date, max 1 year in future
- `priority`: Optional, must be 'Low', 'Medium', or 'High' (default: 'Medium')
- `client_name`: Optional, max 100 characters
- `assignerNotes`: Optional, max 2000 characters
- `assignerPrivateNotes`: Optional, max 2000 characters

**Side Effects:**
- Sends email notification to assigned user
- Email failure does not fail the request

---

#### GET `/api/tasks/[id]`

Get a specific task by ID.

**File:** `pages/api/tasks/[id].js`

**Authentication:** Required

**Request:**
```javascript
GET /api/tasks/task123
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "task": {
    "id": "task123",
    "task": "Design homepage",
    "assigned_to": "john.doe",
    "status": "in progress",
    "priority": "High",
    "deadline": "2025-12-31",
    "tenantId": "logam-digital-001"
  }
}
```

**Response (404):**
```json
{
  "success": false,
  "message": "Task not found"
}
```

---

#### PUT `/api/tasks/[id]`

Update a specific task.

**File:** `pages/api/tasks/[id].js`

**Authentication:** Required

**Request:**
```json
{
  "status": "completed",
  "priority": "Medium",
  "assignerNotes": "Updated requirements"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Task updated successfully",
  "task": {
    "id": "task123",
    "task": "Design homepage",
    "status": "completed",
    "priority": "Medium",
    "tenantId": "logam-digital-001"
  }
}
```

**Multi-Tenancy:**
- Verifies task belongs to user's tenant
- Returns 403 if tenant mismatch

---

#### DELETE `/api/tasks/[id]`

Delete a specific task.

**File:** `pages/api/tasks/[id].js`

**Authentication:** Required (admin only)

**Request:**
```javascript
DELETE /api/tasks/task123
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "success": true,
  "message": "Task deleted successfully"
}
```

**Multi-Tenancy:**
- Verifies task belongs to user's tenant
- Returns 403 if tenant mismatch

---

#### GET `/api/tasks/[id]/comments`

Get all comments for a task.

**File:** `pages/api/tasks/[id]/comments.js`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "comments": [
    {
      "id": "comment123",
      "taskId": "task123",
      "text": "Great progress!",
      "author": "admin",
      "created_at": "2025-01-15T10:30:00Z",
      "tenantId": "logam-digital-001"
    }
  ]
}
```

---

#### POST `/api/tasks/[id]/comments`

Add a comment to a task.

**File:** `pages/api/tasks/[id]/comments.js`

**Authentication:** Required

**Request:**
```json
{
  "text": "I've completed the design mockups"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Comment added successfully",
  "comment": {
    "id": "comment456",
    "taskId": "task123",
    "text": "I've completed the design mockups",
    "author": "john.doe",
    "created_at": "2025-01-15T11:00:00Z",
    "tenantId": "logam-digital-001"
  }
}
```

---

#### GET `/api/tasks/[id]/notes`

Get all notes for a task.

**File:** `pages/api/tasks/[id]/notes.js`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "notes": [
    {
      "id": "note123",
      "taskId": "task123",
      "note": "Need to discuss color scheme",
      "added_by": "john.doe",
      "created_at": "2025-01-15T10:30:00Z",
      "tenantId": "logam-digital-001"
    }
  ]
}
```

---

#### POST `/api/tasks/[id]/notes`

Add a note to a task.

**File:** `pages/api/tasks/[id]/notes.js`

**Authentication:** Required

**Request:**
```json
{
  "note": "Client approved the design"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Note added successfully",
  "note": {
    "id": "note456",
    "taskId": "task123",
    "note": "Client approved the design",
    "added_by": "john.doe",
    "created_at": "2025-01-15T11:00:00Z",
    "tenantId": "logam-digital-001"
  }
}
```

---

#### GET `/api/tasks/[id]/remarks`

Get all remarks for a task.

**File:** `pages/api/tasks/[id]/remarks.js`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "remarks": [
    {
      "id": "remark123",
      "taskId": "task123",
      "remark": "Excellent work!",
      "added_by": "admin",
      "created_at": "2025-01-15T10:30:00Z",
      "tenantId": "logam-digital-001"
    }
  ]
}
```

---

#### POST `/api/tasks/[id]/remarks`

Add a remark to a task.

**File:** `pages/api/tasks/[id]/remarks.js`

**Authentication:** Required

**Request:**
```json
{
  "remark": "Please review the final version"
}
```

---

#### GET `/api/tasks/duplicates`

Check for duplicate tasks.

**File:** `pages/api/tasks/duplicates.js`

**Authentication:** Required

**Query Parameters:**
- `task` (string, required): Task description to check
- `assigned_to` (string, required): Username
- `deadline` (string, required): Deadline date

**Response (200):**
```json
{
  "success": true,
  "duplicate": false,
  "existingTask": null
}
```

**Or if duplicate found:**
```json
{
  "success": true,
  "duplicate": true,
  "existingTask": {
    "id": "task123",
    "task": "Design homepage",
    "assigned_to": "john.doe",
    "deadline": "2025-12-31"
  }
}
```

---

### Daily Tasks Routes

#### GET `/api/daily-tasks`

Get daily tasks for a user.

**File:** `pages/api/daily-tasks.js`

**Authentication:** Required

**Query Parameters:**
- `username` (string, optional): Filter by username
- `date` (string, optional): Filter by date (YYYY-MM-DD)

**Response (200):**
```json
{
  "success": true,
  "dailyTasks": [
    {
      "id": "daily123",
      "username": "john.doe",
      "date": "2025-01-15",
      "description": "Daily standup meeting",
      "status": "completed",
      "tenantId": "logam-digital-001"
    }
  ]
}
```

---

#### POST `/api/daily-tasks`

Create a new daily task.

**File:** `pages/api/daily-tasks.js`

**Authentication:** Required

**Request:**
```json
{
  "username": "john.doe",
  "date": "2025-01-15",
  "description": "Code review session",
  "status": "pending"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Daily task created successfully",
  "dailyTask": {
    "id": "daily456",
    "username": "john.doe",
    "date": "2025-01-15",
    "description": "Code review session",
    "status": "pending",
    "tenantId": "logam-digital-001"
  }
}
```

---

### User Routes

#### GET `/api/users`

Get all users (filtered by tenant).

**File:** `pages/api/users/index.js`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "users": [
    {
      "id": "user123",
      "username": "john.doe",
      "email": "john@example.com",
      "role": "user",
      "tenantId": "logam-digital-001"
    }
  ]
}
```

**Note:** Password fields are never returned in responses.

---

#### POST `/api/users`

Create a new user.

**File:** `pages/api/users/index.js`

**Authentication:** Required (admin only)

**Request:**
```json
{
  "username": "jane.smith",
  "email": "jane@example.com",
  "password": "password123",
  "role": "user"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "user": {
    "id": "user456",
    "username": "jane.smith",
    "email": "jane@example.com",
    "role": "user",
    "tenantId": "logam-digital-001"
  }
}
```

**Security:**
- Password is hashed using bcrypt (10 salt rounds)
- Password is never stored in plain text
- User is automatically assigned to admin's tenant

---

### Client Routes

#### GET `/api/clients`

Get all clients (filtered by tenant).

**File:** `pages/api/clients/index.js`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "clients": [
    {
      "id": "client123",
      "name": "Acme Corp",
      "email": "contact@acme.com",
      "phone": "+1-555-0100",
      "address": "123 Main St",
      "tenantId": "logam-digital-001"
    }
  ]
}
```

---

#### POST `/api/clients`

Create a new client.

**File:** `pages/api/clients/index.js`

**Authentication:** Required (admin only)

**Request:**
```json
{
  "name": "TechStart Inc",
  "email": "info@techstart.com",
  "phone": "+1-555-0200",
  "address": "456 Tech Blvd"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Client created successfully",
  "client": {
    "id": "client456",
    "name": "TechStart Inc",
    "email": "info@techstart.com",
    "phone": "+1-555-0200",
    "address": "456 Tech Blvd",
    "tenantId": "logam-digital-001"
  }
}
```

---

#### GET `/api/clients/[id]`

Get a specific client by ID.

**File:** `pages/api/clients/[id].js`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "client": {
    "id": "client123",
    "name": "Acme Corp",
    "email": "contact@acme.com",
    "tenantId": "logam-digital-001"
  }
}
```

---

#### PUT `/api/clients/[id]`

Update a client.

**File:** `pages/api/clients/[id].js`

**Authentication:** Required (admin only)

**Request:**
```json
{
  "email": "newemail@acme.com",
  "phone": "+1-555-0111"
}
```

---

#### DELETE `/api/clients/[id]`

Delete a client.

**File:** `pages/api/clients/[id].js`

**Authentication:** Required (admin only)

---

#### GET `/api/clients/[id]/tasks`

Get all tasks for a specific client.

**File:** `pages/api/clients/[id]/tasks.js`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "tasks": [
    {
      "id": "task123",
      "task": "Design homepage",
      "client_name": "Acme Corp",
      "assigned_to": "john.doe",
      "status": "in progress"
    }
  ]
}
```

---

#### GET `/api/clients/[id]/files`

Get all files for a specific client.

**File:** `pages/api/clients/[id]/files.js`

**Authentication:** Required

---

#### GET `/api/clients/[id]/meetings`

Get all meetings for a specific client.

**File:** `pages/api/clients/[id]/meetings.js`

**Authentication:** Required

---

#### GET `/api/clients/[id]/calendar`

Get calendar events for a specific client.

**File:** `pages/api/clients/[id]/calendar.js`

**Authentication:** Required

---

#### GET `/api/clients/[id]/users`

Get all users assigned to a specific client.

**File:** `pages/api/clients/[id]/users.js`

**Authentication:** Required

---

### Attendance Routes

#### GET `/api/attendance`

Get attendance records (filtered by tenant).

**File:** `pages/api/attendance/index.js`

**Authentication:** Required

**Query Parameters:**
- `username` (string, optional): Filter by username
- `date` (string, optional): Filter by date (YYYY-MM-DD)
- `startDate` (string, optional): Filter by date range start
- `endDate` (string, optional): Filter by date range end

**Response (200):**
```json
{
  "success": true,
  "attendance": [
    {
      "id": "att123",
      "username": "john.doe",
      "date": "2025-01-15",
      "status": "present",
      "check_in": "09:00:00",
      "check_out": "17:30:00",
      "tenantId": "logam-digital-001"
    }
  ]
}
```

---

#### POST `/api/attendance`

Record attendance.

**File:** `pages/api/attendance/index.js`

**Authentication:** Required

**Request:**
```json
{
  "username": "john.doe",
  "date": "2025-01-15",
  "status": "present",
  "check_in": "09:00:00",
  "check_out": "17:30:00"
}
```

---

#### GET `/api/attendance/[id]`

Get a specific attendance record.

**File:** `pages/api/attendance/[id].js`

**Authentication:** Required

---

#### PUT `/api/attendance/[id]`

Update an attendance record.

**File:** `pages/api/attendance/[id].js`

**Authentication:** Required

---

#### DELETE `/api/attendance/[id]`

Delete an attendance record.

**File:** `pages/api/attendance/[id].js`

**Authentication:** Required (admin only)

---

#### POST `/api/attendance/auto-absent`

Automatically mark absent users.

**File:** `pages/api/attendance/auto-absent.js`

**Authentication:** Required (admin only)

**Request:**
```json
{
  "date": "2025-01-15"
}
```

**Process:**
- Gets all users in tenant
- Checks attendance records for specified date
- Marks users without records as absent

---

#### GET `/api/attendance/export`

Export attendance records.

**File:** `pages/api/attendance/export.js`

**Authentication:** Required (admin only)

**Query Parameters:**
- `startDate` (string, required): Start date (YYYY-MM-DD)
- `endDate` (string, required): End date (YYYY-MM-DD)
- `format` (string, optional): 'json' or 'csv' (default: 'json')

---

### File Routes

#### POST `/api/files/upload`

Upload a file.

**File:** `pages/api/files/upload.js`

**Authentication:** Required

**Request:**
- Content-Type: multipart/form-data
- Body: File data

**Response (201):**
```json
{
  "success": true,
  "message": "File uploaded successfully",
  "file": {
    "id": "file123",
    "filename": "document.pdf",
    "path": "/uploads/logam-digital-001/document.pdf",
    "size": 1048576,
    "uploadedBy": "john.doe",
    "tenantId": "logam-digital-001",
    "uploaded_at": "2025-01-15T10:30:00Z"
  }
}
```

**Multi-Tenancy:**
- Files are stored in tenant-specific directories
- Path includes tenantId: `/uploads/{tenantId}/{filename}`

---

#### GET `/api/files/[...path]`

Download a file.

**File:** `pages/api/files/[...path].js`

**Authentication:** Required

**Request:**
```javascript
GET /api/files/logam-digital-001/document.pdf
Authorization: Bearer <token>
```

**Response:**
- Content-Type: Appropriate MIME type
- Body: File binary data

**Multi-Tenancy:**
- Tenant isolation enforced at upload level
- File paths include tenant context

---

#### GET `/api/files/[id]`

Get file metadata.

**File:** `pages/api/files/[id].js`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "file": {
    "id": "file123",
    "filename": "document.pdf",
    "path": "/uploads/logam-digital-001/document.pdf",
    "size": 1048576,
    "uploadedBy": "john.doe",
    "tenantId": "logam-digital-001"
  }
}
```

---

#### DELETE `/api/files/[id]`

Delete a file.

**File:** `pages/api/files/[id].js`

**Authentication:** Required (admin or file owner)

---

#### GET `/api/files/recent`

Get recently uploaded files.

**File:** `pages/api/files/recent.js`

**Authentication:** Required

**Query Parameters:**
- `limit` (number, optional): Number of files to return (default: 10)

---

### Meeting Routes

#### GET `/api/meetings`

Get all meetings (filtered by tenant).

**File:** `pages/api/meetings/index.js`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "meetings": [
    {
      "id": "meeting123",
      "title": "Project kickoff",
      "date": "2025-01-20",
      "time": "10:00:00",
      "participants": ["john.doe", "jane.smith"],
      "client_id": "client123",
      "tenantId": "logam-digital-001"
    }
  ]
}
```

---

#### POST `/api/meetings`

Create a new meeting.

**File:** `pages/api/meetings/index.js`

**Authentication:** Required (admin only)

---

### Dashboard Routes

#### GET `/api/dashboard/summary`

Get dashboard summary statistics.

**File:** `pages/api/dashboard/summary.js`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "summary": {
    "totalTasks": 150,
    "completedTasks": 75,
    "inProgressTasks": 50,
    "pendingTasks": 25,
    "totalUsers": 10,
    "totalClients": 5,
    "todayAttendance": 8
  }
}
```

**Multi-Tenancy:**
- All counts are filtered by `tenantId`
- Only shows data for user's organization

---

### Analytics Routes

#### GET `/api/analytics/graphics/[username]`

Get analytics data for a specific user.

**File:** `pages/api/analytics/graphics/[username].js`

**Authentication:** Required

**Response (200):**
```json
{
  "success": true,
  "analytics": {
    "username": "john.doe",
    "taskStats": {
      "total": 50,
      "completed": 30,
      "inProgress": 15,
      "pending": 5
    },
    "productivityTrend": [
      { "date": "2025-01-01", "tasksCompleted": 5 },
      { "date": "2025-01-02", "tasksCompleted": 3 }
    ]
  }
}
```

---

#### GET `/api/reports/performance`

Get performance reports.

**File:** `pages/api/reports/performance.js`

**Authentication:** Required (admin only)

**Query Parameters:**
- `startDate` (string, optional): Start date (YYYY-MM-DD)
- `endDate` (string, optional): End date (YYYY-MM-DD)
- `username` (string, optional): Filter by username

---

### Notification Routes

#### POST `/api/notifications/send`

Send a notification.

**File:** `pages/api/notifications/send.js`

**Authentication:** Required (admin only)

**Request:**
```json
{
  "recipient": "john.doe",
  "title": "New task assigned",
  "message": "You have been assigned a new task",
  "type": "task"
}
```

---

#### GET `/api/notifications/stream`

Server-Sent Events (SSE) for real-time notifications.

**File:** `pages/api/notifications/stream.js`

**Authentication:** Required

**Usage:**
```javascript
const eventSource = new EventSource('/api/notifications/stream', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

eventSource.onmessage = (event) => {
  const notification = JSON.parse(event.data);
  console.log('New notification:', notification);
};
```

---

## Database Functions

### File: `lib/firebaseService.js`

This file contains 70+ database functions organized by collection.

---

### User Functions

#### `loadUsers(tenantId = null)`

Load all users, optionally filtered by tenant.

**Parameters:**
```javascript
tenantId: string | null // If null, returns all users (super-admin)
```

**Returns:**
```javascript
Promise<Array<{
  id: string,
  username: string,
  email: string,
  role: string,
  tenantId: string
}>>
```

**Example:**
```javascript
import { loadUsers } from '../lib/firebaseService.js';

// Get users for specific tenant
const users = await loadUsers('logam-digital-001');

// Get all users (super-admin)
const allUsers = await loadUsers();
```

---

#### `getUsers(tenantId = null)`

Alias for `loadUsers()`.

---

#### `addUser(userData, tenantId)`

Create a new user.

**Parameters:**
```javascript
userData: {
  username: string,
  email: string,
  password: string,  // Will be hashed with bcrypt
  role: 'admin' | 'user'
},
tenantId: string  // Required
```

**Returns:**
```javascript
Promise<{
  id: string,
  username: string,
  email: string,
  role: string,
  tenantId: string
}>
```

**Security:**
- Password is automatically hashed using bcrypt (10 salt rounds)
- Password is never stored in plain text

**Example:**
```javascript
import { addUser } from '../lib/firebaseService.js';

const newUser = await addUser({
  username: 'jane.smith',
  email: 'jane@example.com',
  password: 'password123',
  role: 'user'
}, 'logam-digital-001');
```

---

#### `createUser(username, password, role, email, tenantId)`

Alternative method to create a user with individual parameters.

**Parameters:**
```javascript
username: string,
password: string,  // Will be hashed with bcrypt
role: 'admin' | 'user',
email: string,
tenantId: string  // Required
```

---

#### `updateUser(userId, updateData, tenantId = null)`

Update an existing user.

**Parameters:**
```javascript
userId: string,
updateData: {
  email?: string,
  role?: string,
  // Note: password updates handled separately
},
tenantId: string | null  // If provided, verifies tenant ownership
```

**Returns:**
```javascript
Promise<boolean>
```

**Example:**
```javascript
import { updateUser } from '../lib/firebaseService.js';

await updateUser('user123', {
  email: 'newemail@example.com',
  role: 'admin'
}, 'logam-digital-001');
```

---

#### `deleteUser(userId, tenantId = null)`

Delete a user.

**Parameters:**
```javascript
userId: string,
tenantId: string | null  // If provided, verifies tenant ownership
```

**Returns:**
```javascript
Promise<boolean>
```

**Multi-Tenancy:**
- If tenantId provided, verifies user belongs to tenant
- Throws error if user belongs to different organization

---

#### `getUserByUsername(username, tenantId = null)`

Find a user by username.

**Parameters:**
```javascript
username: string,
tenantId: string | null  // If provided, filters by tenant
```

**Returns:**
```javascript
Promise<{
  id: string,
  username: string,
  email: string,
  role: string,
  tenantId: string
} | null>
```

**Example:**
```javascript
import { getUserByUsername } from '../lib/firebaseService.js';

const user = await getUserByUsername('john.doe', 'logam-digital-001');
if (user) {
  console.log('User found:', user.email);
} else {
  console.log('User not found');
}
```

---

#### `getUserById(userId, tenantId = null)`

Find a user by ID.

**Parameters:**
```javascript
userId: string,
tenantId: string | null  // If provided, verifies tenant ownership
```

**Returns:**
```javascript
Promise<object | null>
```

---

### Task Functions

#### `loadTasks(tenantId = null)`

Load all tasks, optionally filtered by tenant.

**Parameters:**
```javascript
tenantId: string | null  // If null, returns all tasks
```

**Returns:**
```javascript
Promise<Array<{
  id: string,
  task: string,
  assigned_to: string,
  given_by: string,
  status: string,
  priority: string,
  deadline: string,
  client_name: string,
  tenantId: string,
  created_at: string
}>>
```

---

#### `getTasks(filters)`

Get tasks with optional filtering.

**Parameters:**
```javascript
filters: {
  tenantId?: string,
  assigned_to?: string,
  status?: string,
  client_name?: string
}
```

**Returns:**
```javascript
Promise<Array<Task>>
```

**Example:**
```javascript
import { getTasks } from '../lib/firebaseService.js';

// Get all pending tasks for a user
const tasks = await getTasks({
  tenantId: 'logam-digital-001',
  assigned_to: 'john.doe',
  status: 'pending'
});
```

---

#### `getUserTasks(username, tenantId = null)`

Get all tasks assigned to a specific user.

**Parameters:**
```javascript
username: string,
tenantId: string | null  // If provided, filters by tenant
```

**Returns:**
```javascript
Promise<Array<Task>>
```

---

#### `addTask(taskData, tenantId)`

Create a new task.

**Parameters:**
```javascript
taskData: {
  task: string,
  assigned_to: string,
  given_by: string,
  deadline: string,
  priority: 'Low' | 'Medium' | 'High',
  client_name?: string,
  assignerNotes?: string,
  assignerPrivateNotes?: string
},
tenantId: string  // Required
```

**Returns:**
```javascript
Promise<{
  id: string,
  ...taskData,
  tenantId: string,
  status: 'pending',
  created_at: string
}>
```

**Default Values:**
- `status`: 'pending'
- `created_at`: Current timestamp
- `priority`: 'Medium' (if not provided)

**Example:**
```javascript
import { addTask } from '../lib/firebaseService.js';

const task = await addTask({
  task: 'Design new homepage',
  assigned_to: 'john.doe',
  given_by: 'admin',
  deadline: '2025-12-31',
  priority: 'High',
  client_name: 'Acme Corp'
}, 'logam-digital-001');

console.log('Task created:', task.id);
```

---

#### `updateTask(taskId, updateData, tenantId = null)`

Update an existing task.

**Parameters:**
```javascript
taskId: string,
updateData: {
  status?: string,
  priority?: string,
  deadline?: string,
  assignerNotes?: string,
  // ... any task field
},
tenantId: string | null  // If provided, verifies tenant ownership
```

**Returns:**
```javascript
Promise<boolean>
```

**Multi-Tenancy:**
- If tenantId provided, verifies task belongs to tenant
- Throws error if task belongs to different organization

**Example:**
```javascript
import { updateTask } from '../lib/firebaseService.js';

await updateTask('task123', {
  status: 'completed',
  priority: 'Medium'
}, 'logam-digital-001');
```

---

#### `deleteTask(taskId, tenantId = null)`

Delete a task.

**Parameters:**
```javascript
taskId: string,
tenantId: string | null  // If provided, verifies tenant ownership
```

**Returns:**
```javascript
Promise<boolean>
```

---

#### `getTaskById(taskId, tenantId = null)`

Get a specific task by ID.

**Parameters:**
```javascript
taskId: string,
tenantId: string | null  // If provided, verifies tenant ownership
```

**Returns:**
```javascript
Promise<Task | null>
```

---

#### `checkDuplicateTask(task, assigned_to, deadline, tenantId)`

Check if a duplicate task exists.

**Parameters:**
```javascript
task: string,
assigned_to: string,
deadline: string,
tenantId: string
```

**Returns:**
```javascript
Promise<{
  duplicate: boolean,
  existingTask: Task | null
}>
```

**Example:**
```javascript
import { checkDuplicateTask } from '../lib/firebaseService.js';

const result = await checkDuplicateTask(
  'Design homepage',
  'john.doe',
  '2025-12-31',
  'logam-digital-001'
);

if (result.duplicate) {
  console.log('Duplicate found:', result.existingTask.id);
} else {
  console.log('No duplicate');
}
```

---

#### `getTaskComments(taskId, tenantId = null)`

Get all comments for a task.

**Parameters:**
```javascript
taskId: string,
tenantId: string | null
```

**Returns:**
```javascript
Promise<Array<{
  id: string,
  taskId: string,
  text: string,
  author: string,
  created_at: string,
  tenantId: string
}>>
```

---

#### `addTaskComment(taskId, comment, author, tenantId)`

Add a comment to a task.

**Parameters:**
```javascript
taskId: string,
comment: string,
author: string,
tenantId: string
```

**Returns:**
```javascript
Promise<Comment>
```

---

#### `getTaskNotes(taskId, tenantId = null)`

Get all notes for a task.

**Parameters:**
```javascript
taskId: string,
tenantId: string | null
```

**Returns:**
```javascript
Promise<Array<Note>>
```

---

#### `addTaskNote(taskId, note, added_by, tenantId)`

Add a note to a task.

**Parameters:**
```javascript
taskId: string,
note: string,
added_by: string,
tenantId: string
```

**Returns:**
```javascript
Promise<Note>
```

---

#### `getTaskRemarks(taskId, tenantId = null)`

Get all remarks for a task.

---

#### `addTaskRemark(taskId, remark, added_by, tenantId)`

Add a remark to a task.

---

#### `getTasksByStatus(status, tenantId = null)`

Get all tasks with a specific status.

**Parameters:**
```javascript
status: 'pending' | 'in progress' | 'completed' | 'cancelled',
tenantId: string | null
```

---

#### `getTasksByPriority(priority, tenantId = null)`

Get all tasks with a specific priority.

**Parameters:**
```javascript
priority: 'Low' | 'Medium' | 'High',
tenantId: string | null
```

---

#### `getTasksByClient(clientName, tenantId = null)`

Get all tasks for a specific client.

**Parameters:**
```javascript
clientName: string,
tenantId: string | null
```

---

#### `getTasksByDateRange(startDate, endDate, tenantId = null)`

Get tasks within a date range.

**Parameters:**
```javascript
startDate: string,  // YYYY-MM-DD
endDate: string,    // YYYY-MM-DD
tenantId: string | null
```

---

### Daily Task Functions

#### `getDailyTasks(filters)`

Get daily tasks with optional filtering.

**Parameters:**
```javascript
filters: {
  tenantId?: string,
  username?: string,
  date?: string
}
```

---

#### `addDailyTask(taskData, tenantId)`

Create a new daily task.

**Parameters:**
```javascript
taskData: {
  username: string,
  date: string,
  description: string,
  status: 'pending' | 'completed'
},
tenantId: string
```

---

#### `updateDailyTask(taskId, updateData, tenantId = null)`

Update a daily task.

---

#### `deleteDailyTask(taskId, tenantId = null)`

Delete a daily task.

---

#### `getDailyTasksByUser(username, tenantId = null)`

Get all daily tasks for a user.

---

### Client Functions

#### `getClients(tenantId = null)`

Get all clients.

**Parameters:**
```javascript
tenantId: string | null
```

**Returns:**
```javascript
Promise<Array<{
  id: string,
  name: string,
  email: string,
  phone: string,
  address: string,
  tenantId: string
}>>
```

---

#### `addClient(clientData, tenantId)`

Create a new client.

**Parameters:**
```javascript
clientData: {
  name: string,
  email: string,
  phone?: string,
  address?: string
},
tenantId: string
```

**Returns:**
```javascript
Promise<Client>
```

---

#### `getClientById(clientId, tenantId = null)`

Get a specific client by ID.

---

#### `updateClient(clientId, updateData, tenantId = null)`

Update a client.

---

#### `deleteClient(clientId, tenantId = null)`

Delete a client.

---

#### `getClientTasks(clientId, tenantId = null)`

Get all tasks for a client.

---

#### `getClientFiles(clientId, tenantId = null)`

Get all files for a client.

---

#### `getClientMeetings(clientId, tenantId = null)`

Get all meetings for a client.

---

#### `getClientUsers(clientId, tenantId = null)`

Get all users assigned to a client.

---

#### `getClientAnalytics(clientId, tenantId = null)`

Get analytics data for a client.

**Returns:**
```javascript
Promise<{
  totalTasks: number,
  completedTasks: number,
  inProgressTasks: number,
  pendingTasks: number,
  totalFiles: number,
  totalMeetings: number
}>
```

---

### Attendance Functions

#### `getAttendance(filters)`

Get attendance records with optional filtering.

**Parameters:**
```javascript
filters: {
  tenantId?: string,
  username?: string,
  date?: string,
  startDate?: string,
  endDate?: string
}
```

**Returns:**
```javascript
Promise<Array<{
  id: string,
  username: string,
  date: string,
  status: 'present' | 'absent' | 'half-day' | 'leave',
  check_in: string,
  check_out: string,
  tenantId: string
}>>
```

---

#### `addAttendance(attendanceData, tenantId)`

Record attendance.

**Parameters:**
```javascript
attendanceData: {
  username: string,
  date: string,
  status: 'present' | 'absent' | 'half-day' | 'leave',
  check_in?: string,
  check_out?: string
},
tenantId: string
```

---

#### `updateAttendance(attendanceId, updateData, tenantId = null)`

Update an attendance record.

---

#### `deleteAttendance(attendanceId, tenantId = null)`

Delete an attendance record.

---

#### `getAttendanceByUser(username, tenantId = null)`

Get all attendance records for a user.

---

#### `getAttendanceByDate(date, tenantId = null)`

Get all attendance records for a specific date.

---

#### `markAutoAbsent(date, tenantId)`

Automatically mark users as absent if they don't have attendance records.

**Parameters:**
```javascript
date: string,  // YYYY-MM-DD
tenantId: string
```

**Process:**
1. Gets all users for tenant
2. Checks attendance records for date
3. Marks users without records as absent

**Example:**
```javascript
import { markAutoAbsent } from '../lib/firebaseService.js';

await markAutoAbsent('2025-01-15', 'logam-digital-001');
```

---

#### `exportAttendance(startDate, endDate, tenantId)`

Export attendance records for a date range.

---

### File Functions

#### `getFiles(tenantId = null)`

Get all files.

**Returns:**
```javascript
Promise<Array<{
  id: string,
  filename: string,
  path: string,
  size: number,
  uploadedBy: string,
  uploaded_at: string,
  tenantId: string
}>>
```

---

#### `addFile(fileData, tenantId)`

Record a file upload.

**Parameters:**
```javascript
fileData: {
  filename: string,
  path: string,
  size: number,
  uploadedBy: string
},
tenantId: string
```

---

#### `getFileById(fileId, tenantId = null)`

Get a specific file by ID.

---

#### `deleteFile(fileId, tenantId = null)`

Delete a file record.

---

#### `getRecentFiles(limit, tenantId = null)`

Get recently uploaded files.

**Parameters:**
```javascript
limit: number,  // Max number of files to return
tenantId: string | null
```

---

#### `getFilesByUser(username, tenantId = null)`

Get all files uploaded by a user.

---

### Meeting Functions

#### `getMeetings(tenantId = null)`

Get all meetings.

---

#### `addMeeting(meetingData, tenantId)`

Create a new meeting.

**Parameters:**
```javascript
meetingData: {
  title: string,
  date: string,
  time: string,
  participants: string[],
  client_id?: string
},
tenantId: string
```

---

#### `getMeetingById(meetingId, tenantId = null)`

Get a specific meeting by ID.

---

#### `updateMeeting(meetingId, updateData, tenantId = null)`

Update a meeting.

---

#### `deleteMeeting(meetingId, tenantId = null)`

Delete a meeting.

---

#### `getMeetingsByClient(clientId, tenantId = null)`

Get all meetings for a client.

---

### Analytics Functions

#### `getUserAnalytics(username, tenantId = null)`

Get analytics data for a user.

**Returns:**
```javascript
Promise<{
  username: string,
  taskStats: {
    total: number,
    completed: number,
    inProgress: number,
    pending: number
  },
  productivityTrend: Array<{
    date: string,
    tasksCompleted: number
  }>
}>
```

---

#### `getDashboardSummary(tenantId)`

Get dashboard summary statistics.

**Returns:**
```javascript
Promise<{
  totalTasks: number,
  completedTasks: number,
  inProgressTasks: number,
  pendingTasks: number,
  totalUsers: number,
  totalClients: number,
  todayAttendance: number
}>
```

**Example:**
```javascript
import { getDashboardSummary } from '../lib/firebaseService.js';

const summary = await getDashboardSummary('logam-digital-001');
console.log('Total tasks:', summary.totalTasks);
console.log('Completed:', summary.completedTasks);
```

---

#### `getPerformanceReport(filters)`

Get performance report data.

**Parameters:**
```javascript
filters: {
  tenantId: string,
  startDate?: string,
  endDate?: string,
  username?: string
}
```

---

### Helper Functions

#### `safeDate(dateValue)`

Safely converts various date formats to string.

**Parameters:**
```javascript
dateValue: Timestamp | Date | string
```

**Returns:**
```javascript
string | null  // Format: YYYY-MM-DD HH:MM:SS
```

---

#### `convertFirestoreDoc(doc)`

Converts Firestore document to plain JavaScript object.

**Parameters:**
```javascript
doc: FirestoreDocument
```

**Returns:**
```javascript
{
  id: string,
  ...documentData  // All fields with Timestamps converted to strings
}
```

---

## Security Implementation

### Password Security

**Hashing:**
- All passwords are hashed using bcrypt
- Salt rounds: 10
- Passwords are NEVER stored in plain text
- Passwords are NEVER returned in API responses

**Example:**
```javascript
import bcrypt from 'bcryptjs';

// Hash password on user creation
const hashedPassword = await bcrypt.hash(password, 10);

// Verify password on login
const isValid = await bcrypt.compare(inputPassword, storedHash);
```

---

### JWT Token Security

**Token Generation:**
```javascript
{
  payload: {
    id: string,
    username: string,
    role: string,
    email: string,
    tenantId: string
  },
  expiresIn: '24h',
  algorithm: 'HS256'
}
```

**Token Verification:**
- Validates signature using JWT_SECRET
- Checks expiration time
- Extracts user and tenant context

**Best Practices:**
- Store JWT_SECRET in environment variables
- Tokens expire after 24 hours
- Tokens are stateless (no server-side storage)

---

### Multi-Tenancy Security

**Data Isolation:**
1. **Authentication Layer:**
   - JWT tokens include tenantId
   - Middleware extracts tenantId from token
   - Added to req.tenantId for all handlers

2. **Database Layer:**
   - All queries filter by tenantId
   - Create operations require tenantId
   - Update/delete operations verify tenant ownership

3. **Verification Pattern:**
```javascript
export const updateTask = async (taskId, updateData, tenantId = null) => {
  if (tenantId) {
    // Get existing document
    const doc = await adminDb.collection('tasks').doc(taskId).get();

    if (!doc.exists) {
      throw new Error('Task not found');
    }

    // Verify tenant ownership
    if (doc.data().tenantId !== tenantId) {
      throw new Error('Unauthorized: Resource belongs to different organization');
    }
  }

  // Proceed with update
  await adminDb.collection('tasks').doc(taskId).update(updateData);
  return true;
};
```

---

### API Security

**Authentication Requirements:**
- All API routes (except /api/auth/login) require authentication
- Use requireAuth middleware for all protected routes
- Use requireAdmin for admin-only routes
- Use requireTenantId for strict tenant validation

**Authorization Rules:**
- Users can only access their own data
- Admins can access all data within their tenant
- No cross-tenant access allowed
- Role-based access control enforced

**Example:**
```javascript
import { requireAuth, requireAdmin, requireTenantId } from '../../../lib/auth.js';

// Public route - no authentication
export default async function handler(req, res) {
  // Anyone can access
}

// Authenticated route
export default requireAuth(async (req, res) => {
  // Only authenticated users
  // req.user and req.tenantId available
});

// Admin-only route
export default requireAdmin(async (req, res) => {
  // Only admins in any tenant
});

// Strict tenant validation
export default requireTenantId(async (req, res) => {
  // Only users with valid tenantId
});
```

---

### Input Validation

**Best Practices:**
- Validate all input data
- Check required fields
- Validate data types
- Enforce length limits
- Sanitize user input

**Example:**
```javascript
// Validation errors array
const errors = [];

// Required fields
if (!task || !task.trim()) {
  errors.push('Task description is required');
}

// Date validation
if (deadline) {
  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (deadlineDate < today) {
    errors.push('Deadline cannot be in the past');
  }
}

// Enum validation
const validPriorities = ['Low', 'Medium', 'High'];
if (priority && !validPriorities.includes(priority)) {
  errors.push('Priority must be Low, Medium, or High');
}

// Length validation
if (notes && notes.length > 2000) {
  errors.push('Notes cannot exceed 2000 characters');
}

// Return errors
if (errors.length > 0) {
  return res.status(400).json({
    success: false,
    message: 'Validation failed',
    errors: errors
  });
}
```

---

## Error Handling

### Error Response Format

**Standard Error Response:**
```json
{
  "success": false,
  "message": "Error message here",
  "error": "Detailed error description",
  "errors": ["Validation error 1", "Validation error 2"]
}
```

---

### HTTP Status Codes

**Success Codes:**
- `200 OK`: Successful GET, PUT, DELETE
- `201 Created`: Successful POST (resource created)

**Client Error Codes:**
- `400 Bad Request`: Validation errors, malformed request
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Insufficient permissions, tenant mismatch
- `404 Not Found`: Resource not found
- `405 Method Not Allowed`: Invalid HTTP method

**Server Error Codes:**
- `500 Internal Server Error`: Unexpected server error

---

### Error Handling Pattern

```javascript
export default requireAuth(async (req, res) => {
  try {
    // Validation
    if (!requiredField) {
      return res.status(400).json({
        success: false,
        message: 'Required field missing'
      });
    }

    // Database operation
    const result = await performOperation();

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Resource not found'
      });
    }

    // Success
    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error:', error);

    // Specific error handling
    if (error.message.includes('Unauthorized')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    // Generic error
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});
```

---

### Database Error Handling

```javascript
export const getTaskById = async (taskId, tenantId = null) => {
  try {
    const doc = await adminDb.collection('tasks').doc(taskId).get();

    if (!doc.exists) {
      throw new Error('Task not found');
    }

    if (tenantId && doc.data().tenantId !== tenantId) {
      throw new Error('Unauthorized: Resource belongs to different organization');
    }

    return convertFirestoreDoc(doc);

  } catch (error) {
    console.error('Error fetching task:', error);
    throw error;  // Re-throw for API handler to catch
  }
};
```

---

## Code Examples

### Complete API Route Example

```javascript
// pages/api/tasks/[id].js
import { requireAuth } from '../../../lib/auth.js';
import { getTaskById, updateTask, deleteTask } from '../../../lib/firebaseService.js';

async function handler(req, res) {
  const { id } = req.query;
  const { tenantId } = req;

  // GET - Retrieve task
  if (req.method === 'GET') {
    try {
      const task = await getTaskById(id, tenantId);

      if (!task) {
        return res.status(404).json({
          success: false,
          message: 'Task not found'
        });
      }

      return res.status(200).json({
        success: true,
        task: task
      });

    } catch (error) {
      console.error('Error fetching task:', error);

      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to fetch task',
        error: error.message
      });
    }
  }

  // PUT - Update task
  if (req.method === 'PUT') {
    try {
      const updateData = req.body;

      // Validation
      if (updateData.priority && !['Low', 'Medium', 'High'].includes(updateData.priority)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid priority value'
        });
      }

      await updateTask(id, updateData, tenantId);

      const updatedTask = await getTaskById(id, tenantId);

      return res.status(200).json({
        success: true,
        message: 'Task updated successfully',
        task: updatedTask
      });

    } catch (error) {
      console.error('Error updating task:', error);

      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to update task',
        error: error.message
      });
    }
  }

  // DELETE - Delete task
  if (req.method === 'DELETE') {
    // Check admin role
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin role required'
      });
    }

    try {
      await deleteTask(id, tenantId);

      return res.status(200).json({
        success: true,
        message: 'Task deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting task:', error);

      if (error.message.includes('Unauthorized')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Failed to delete task',
        error: error.message
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    success: false,
    message: 'Method not allowed'
  });
}

export default requireAuth(handler);
```

---

### Complete Database Function Example

```javascript
// lib/firebaseService.js

/**
 * Get tasks with optional filtering
 * @param {Object} filters - Filter options
 * @param {string} filters.tenantId - Tenant ID (required for multi-tenancy)
 * @param {string} filters.assigned_to - Username to filter by
 * @param {string} filters.status - Status to filter by
 * @param {string} filters.client_name - Client name to filter by
 * @returns {Promise<Array>} Array of tasks
 */
export const getTasks = async (filters = {}) => {
  try {
    let query = adminDb.collection('tasks');

    // Multi-tenancy filter
    if (filters.tenantId) {
      query = query.where('tenantId', '==', filters.tenantId);
    }

    // Additional filters
    if (filters.assigned_to) {
      query = query.where('assigned_to', '==', filters.assigned_to);
    }

    if (filters.status) {
      query = query.where('status', '==', filters.status);
    }

    if (filters.client_name) {
      query = query.where('client_name', '==', filters.client_name);
    }

    // Execute query
    const snapshot = await query.get();

    if (snapshot.empty) {
      return [];
    }

    // Convert documents
    const tasks = [];
    snapshot.forEach(doc => {
      const task = convertFirestoreDoc(doc);
      if (task) {
        tasks.push(task);
      }
    });

    return tasks;

  } catch (error) {
    console.error('Error getting tasks:', error);
    throw error;
  }
};
```

---

### Client-Side API Call Example

```javascript
// React component example

import { useState, useEffect } from 'react';

function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);

      // Get token from localStorage
      const token = localStorage.getItem('token');

      if (!token) {
        throw new Error('No authentication token');
      }

      // Make API call
      const response = await fetch('/api/tasks', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch tasks');
      }

      if (data.success) {
        setTasks(data.tasks);
      } else {
        throw new Error(data.message);
      }

    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(taskData)
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.errors) {
          // Handle validation errors
          alert(data.errors.join('\n'));
        } else {
          throw new Error(data.message);
        }
        return;
      }

      if (data.success) {
        // Refresh task list
        await fetchTasks();
        alert('Task created successfully!');
      }

    } catch (err) {
      console.error('Error creating task:', err);
      alert(err.message);
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message);
      }

      if (data.success) {
        // Update local state
        setTasks(tasks.map(task =>
          task.id === taskId ? data.task : task
        ));
      }

    } catch (err) {
      console.error('Error updating task:', err);
      alert(err.message);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Tasks</h1>
      <ul>
        {tasks.map(task => (
          <li key={task.id}>
            <h3>{task.task}</h3>
            <p>Status: {task.status}</p>
            <p>Priority: {task.priority}</p>
            <p>Deadline: {task.deadline}</p>
            <button onClick={() => updateTask(task.id, { status: 'completed' })}>
              Mark Complete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TaskList;
```

---

### Authentication Flow Example

```javascript
// Login component
import { useState } from 'react';
import { useRouter } from 'next/router';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      if (data.success) {
        // Store token and user data
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirect to dashboard
        router.push('/dashboard');
      } else {
        setError(data.message);
      }

    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <h1>Login</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      <button type="submit">Login</button>
    </form>
  );
}

export default Login;
```

---

## Environment Variables

### Required Variables

```bash
# .env.local

# Firebase Configuration
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY=your-private-key
FIREBASE_CLIENT_EMAIL=your-client-email

# JWT Secret (minimum 32 characters)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-chars

# Email Configuration (optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@yourapp.com
```

---

## Deployment Checklist

### Before Deployment

1. **Environment Variables:**
   - [ ] All environment variables set in production
   - [ ] JWT_SECRET is strong and unique
   - [ ] Firebase credentials are correct

2. **Security:**
   - [ ] Firestore rules deployed
   - [ ] Composite indexes deployed
   - [ ] JWT_SECRET is not in version control
   - [ ] All API routes use authentication

3. **Testing:**
   - [ ] All API routes tested
   - [ ] Multi-tenancy isolation verified
   - [ ] Authentication flow tested
   - [ ] Error handling tested

4. **Database:**
   - [ ] Migration script executed
   - [ ] All data has tenantId
   - [ ] Indexes are enabled
   - [ ] Backup strategy in place

---

## Support

For technical support or questions about this API reference, please contact:
- **Email:** support@logam.com
- **GitHub:** https://github.com/logam-digital/task-manager
- **Documentation:** https://docs.logam.com

---

**Document Version:** 1.0
**Last Updated:** January 2025
**Application Version:** 1.0.0 (Multi-Tenant)
