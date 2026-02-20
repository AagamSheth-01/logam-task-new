# 🏢 Multi-Tenancy Architecture Plan

## Overview
Transform the Logam Task Manager from a single-tenant application to a multi-tenant SaaS platform where multiple companies/organizations can use the same application with complete data isolation.

**Status:** Planning Phase
**Priority:** 🔴 CRITICAL for SaaS
**Estimated Time:** 4-6 hours implementation

---

## Current State (Single Tenant)

### Problem
```javascript
// All users share the same database
{
  username: "john",
  password: "$2b$...",
  role: "admin"
}

// Tasks from ALL companies mixed together
{
  task: "Deploy website",
  assigned_to: "john",  // Which company's John?
  status: "pending"
}
```

**Issues:**
- ❌ Can't sell to multiple companies
- ❌ Company A can see Company B's data
- ❌ No data isolation
- ❌ Can't have different pricing per company
- ❌ Can't have company-specific features

---

## Target State (Multi-Tenant)

### Solution
```javascript
// Each user belongs to an organization
{
  username: "john",
  password: "$2b$...",
  role: "admin",
  tenantId: "company-abc-123"  // ← NEW
}

// Tasks are tenant-isolated
{
  task: "Deploy website",
  assigned_to: "john",
  status: "pending",
  tenantId: "company-abc-123"  // ← NEW
}
```

**Benefits:**
- ✅ Sell to unlimited companies
- ✅ Complete data isolation
- ✅ Per-tenant billing
- ✅ Per-tenant features
- ✅ Scalable SaaS model

---

## Multi-Tenancy Strategy

### Option 1: Shared Database with Tenant Filtering (RECOMMENDED)

**Architecture:**
```
Single Firestore Database
├── Collection: organizations
│   ├── company-abc-123
│   ├── company-xyz-456
│   └── company-def-789
├── Collection: users (with tenantId)
│   ├── user1 (tenantId: company-abc-123)
│   ├── user2 (tenantId: company-abc-123)
│   └── user3 (tenantId: company-xyz-456)
└── Collection: tasks (with tenantId)
    ├── task1 (tenantId: company-abc-123)
    └── task2 (tenantId: company-xyz-456)
```

**Pros:**
- ✅ Cost effective (one database)
- ✅ Easy to maintain
- ✅ Fast to implement
- ✅ Works for 90% of SaaS apps

**Cons:**
- ⚠️ Must ensure queries ALWAYS filter by tenantId
- ⚠️ Noisy neighbor risk (one tenant can impact others)

### Option 2: Database Per Tenant (Enterprise)

**Architecture:**
```
Separate Firestore Projects
├── company-abc-firestore-db
├── company-xyz-firestore-db
└── company-def-firestore-db
```

**Pros:**
- ✅ Complete isolation
- ✅ No cross-tenant risk
- ✅ Can migrate tenant to own infrastructure

**Cons:**
- ❌ More expensive
- ❌ Complex management
- ❌ Only for large enterprise clients

**Decision: Start with Option 1 (Shared Database), offer Option 2 for enterprise tier**

---

## Implementation Steps

### Phase 1: Database Schema Changes

#### 1.1 Create Organizations Collection

```javascript
// Collection: organizations
{
  id: "company-abc-123",
  name: "ABC Corporation",
  slug: "abc-corp",  // For URLs: abc-corp.yourapp.com
  domain: "abc-corp.com",  // Optional custom domain

  // Subscription
  plan: "professional",  // starter, professional, enterprise
  status: "active",  // active, suspended, trial, cancelled
  trialEndsAt: Timestamp,
  subscriptionStarted: Timestamp,

  // Limits
  maxUsers: 50,
  maxStorage: 10737418240,  // 10GB in bytes

  // Features
  features: [
    "basic-tasks",
    "client-management",
    "file-uploads",
    "calendar",
    "analytics"
  ],

  // Settings
  settings: {
    timezone: "America/New_York",
    dateFormat: "MM/DD/YYYY",
    currency: "USD",
    logo: "url-to-logo",
    primaryColor: "#3b82f6",
    allowedDomains: ["abc-corp.com"],  // Email domain restrictions
  },

  // Billing
  billing: {
    email: "billing@abc-corp.com",
    address: "...",
    stripeCustomerId: "cus_...",
    currentPeriodEnd: Timestamp,
  },

  // Metadata
  createdAt: Timestamp,
  createdBy: "user-id",
  updatedAt: Timestamp,
  onboarded: true,
}
```

#### 1.2 Add tenantId to Existing Collections

**Collections to Update:**
1. ✅ `users`
2. ✅ `tasks`
3. ✅ `clients`
4. ✅ `client_users`
5. ✅ `client_files`
6. ✅ `client_meetings`
7. ✅ `client_calendar_events`
8. ✅ `client_activities`
9. ✅ `attendance`
10. ✅ `notifications`

**Migration Pattern:**
```javascript
// Before
{
  username: "john",
  password: "...",
  role: "admin"
}

// After
{
  tenantId: "company-abc-123",  // ← ADD THIS
  username: "john",
  password: "...",
  role: "admin"
}
```

#### 1.3 Firestore Composite Indexes

```json
{
  "indexes": [
    {
      "collectionGroup": "users",
      "fields": [
        { "fieldPath": "tenantId", "order": "ASCENDING" },
        { "fieldPath": "username", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "fields": [
        { "fieldPath": "tenantId", "order": "ASCENDING" },
        { "fieldPath": "assigned_to", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "tasks",
      "fields": [
        { "fieldPath": "tenantId", "order": "ASCENDING" },
        { "fieldPath": "deadline", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

### Phase 2: Authentication Changes

#### 2.1 Update JWT Token Payload

```javascript
// OLD
const payload = {
  id: user.id,
  username: user.username,
  role: user.role,
  email: user.email
};

// NEW
const payload = {
  id: user.id,
  username: user.username,
  role: user.role,
  email: user.email,
  tenantId: user.tenantId  // ← ADD THIS
};
```

#### 2.2 Add Tenant Context to All Requests

```javascript
// In requireAuth middleware
export const requireAuth = (handler) => {
  return async (req, res) => {
    const verification = verifyTokenFromRequest(req);

    if (!verification.valid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Add both user AND tenant to request
    req.user = verification.user;
    req.tenantId = verification.user.tenantId;  // ← ADD THIS

    return handler(req, res);
  };
};
```

---

### Phase 3: Database Query Updates

#### 3.1 Update All Queries to Filter by Tenant

**Pattern for ALL database operations:**

```javascript
// OLD: Load all tasks (BAD - returns all tenants' data)
export const loadTasks = async () => {
  const snapshot = await db.collection('tasks').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// NEW: Load tasks for specific tenant only
export const loadTasks = async (tenantId) => {
  const snapshot = await db.collection('tasks')
    .where('tenantId', '==', tenantId)  // ← ALWAYS FILTER
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};
```

**Apply to ALL functions in firebaseService.js:**
- `loadTasks()` → `loadTasks(tenantId)`
- `loadUsers()` → `loadUsers(tenantId)`
- `loadClients()` → `loadClients(tenantId)`
- `getAttendance()` → `getAttendance(tenantId)`
- etc. (~50+ functions to update)

#### 3.2 Add tenantId Validation Middleware

```javascript
// New middleware to ensure tenantId is always present
export const requireTenantId = (handler) => {
  return requireAuth(async (req, res) => {
    if (!req.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'No tenant context found'
      });
    }

    return handler(req, res);
  });
};
```

---

### Phase 4: API Routes Updates

**Update ALL API routes to use tenant filtering:**

```javascript
// OLD
export default async function handler(req, res) {
  const tasks = await loadTasks();
  res.json({ tasks });
}

// NEW
export default requireAuth(async (req, res) => {
  const { tenantId } = req;  // From JWT token
  const tasks = await loadTasks(tenantId);
  res.json({ tasks });
});
```

**Routes to update (~32 routes):**
- `/api/tasks/*`
- `/api/users/*`
- `/api/clients/*`
- `/api/attendance/*`
- `/api/files/*`
- `/api/meetings/*`
- `/api/notifications/*`

---

### Phase 5: Tenant Routing

#### Option A: Subdomain-based (RECOMMENDED)

```
company-abc.yourapp.com → tenantId: "company-abc-123"
company-xyz.yourapp.com → tenantId: "company-xyz-456"
```

**Implementation:**
```javascript
// middleware.js
export function middleware(request) {
  const hostname = request.headers.get('host');
  const subdomain = hostname.split('.')[0];

  // Map subdomain to tenantId
  const tenant = await getTenantBySlug(subdomain);

  if (!tenant) {
    return NextResponse.redirect('/404');
  }

  // Add tenant to request
  request.headers.set('x-tenant-id', tenant.id);
}
```

#### Option B: Path-based (Simpler)

```
yourapp.com/company-abc/dashboard → tenantId: "company-abc-123"
yourapp.com/company-xyz/dashboard → tenantId: "company-xyz-456"
```

**Decision: Start with Option B (simpler), add Option A later**

---

### Phase 6: Migration Script

Create script to add `tenantId` to existing data:

```javascript
// scripts/add-tenant-ids.js

// 1. Create default organization for existing users
const defaultOrg = {
  id: "default-org-001",
  name: "Default Organization",
  slug: "default",
  plan: "professional",
  status: "active",
  // ...
};

// 2. Add tenantId to all existing users
await db.collection('users').get().then(snapshot => {
  snapshot.forEach(doc => {
    doc.ref.update({ tenantId: defaultOrg.id });
  });
});

// 3. Add tenantId to all existing tasks
// 4. Add tenantId to all existing clients
// etc.
```

---

## Security Considerations

### 1. Row-Level Security (Critical!)

```javascript
// ALWAYS verify user can only access their tenant's data
export const getTask = async (taskId, tenantId) => {
  const task = await db.collection('tasks').doc(taskId).get();

  // SECURITY CHECK
  if (task.data().tenantId !== tenantId) {
    throw new Error('Unauthorized: Task belongs to different tenant');
  }

  return task.data();
};
```

### 2. Admin Super-User Access

```javascript
// Optional: Platform admins can access all tenants
export const isSuperAdmin = (user) => {
  return user.role === 'super-admin' && user.tenantId === 'platform';
};
```

### 3. Audit Logging

```javascript
// Log all cross-tenant access attempts
await logSecurityEvent({
  type: 'unauthorized_tenant_access',
  userId: req.user.id,
  attemptedTenantId: requestedTenantId,
  actualTenantId: req.tenantId,
  timestamp: new Date()
});
```

---

## Tenant Registration Flow

### 1. Sign-up Process

```
User visits: yourapp.com/signup
  ↓
Enter: Company Name, Email, Password
  ↓
System creates:
  - New organization (tenant)
  - First admin user (linked to tenant)
  - Default settings
  ↓
User redirected to: yourapp.com/company-slug/dashboard
  ↓
Onboarding wizard (optional)
```

### 2. User Invitation Flow

```
Admin invites user: john@company.com
  ↓
System sends email with invitation link
  ↓
User clicks link: yourapp.com/invite/TOKEN
  ↓
User sets password
  ↓
User created with admin's tenantId
  ↓
User can now access company's data only
```

---

## Billing Integration

### Per-Tenant Subscription

```javascript
// organizations collection
{
  billing: {
    stripeCustomerId: "cus_...",
    subscriptionId: "sub_...",
    plan: "professional",
    priceId: "price_...",
    status: "active",
    currentPeriodStart: Timestamp,
    currentPeriodEnd: Timestamp,
    cancelAtPeriodEnd: false,
  },
  usage: {
    users: 15,  // Current user count
    storage: 5368709120,  // 5GB used
    apiCalls: 10234,  // This month
  }
}
```

### Feature Gating

```javascript
export const requireFeature = (featureName) => {
  return requireAuth(async (req, res, next) => {
    const org = await getOrganization(req.tenantId);

    if (!org.features.includes(featureName)) {
      return res.status(402).json({
        success: false,
        message: `Feature '${featureName}' not available in your plan`,
        upgradeUrl: `/billing/upgrade?feature=${featureName}`
      });
    }

    next();
  });
};

// Usage
app.post('/api/analytics', requireFeature('advanced-analytics'), handler);
```

---

## Testing Multi-Tenancy

### Test Cases

```javascript
// 1. Create two tenants
const tenant1 = await createOrganization({ name: "Company A" });
const tenant2 = await createOrganization({ name: "Company B" });

// 2. Create users in each tenant
const user1 = await createUser({ tenantId: tenant1.id, username: "alice" });
const user2 = await createUser({ tenantId: tenant2.id, username: "bob" });

// 3. Create tasks in each tenant
const task1 = await createTask({ tenantId: tenant1.id, task: "Task A" });
const task2 = await createTask({ tenantId: tenant2.id, task: "Task B" });

// 4. Test data isolation
const tenant1Tasks = await loadTasks(tenant1.id);
expect(tenant1Tasks).toContain(task1);
expect(tenant1Tasks).not.toContain(task2);  // ← MUST PASS

// 5. Test cross-tenant access prevention
await expect(
  getTask(task2.id, tenant1.id)  // Wrong tenant
).rejects.toThrow('Unauthorized');
```

---

## Implementation Timeline

### Week 1: Foundation (16-20 hours)
- ✅ Create organizations collection schema
- ✅ Add tenantId to all collections
- ✅ Update authentication with tenant context
- ✅ Create migration script
- ✅ Run migration on dev database

### Week 2: Query Updates (16-20 hours)
- ✅ Update all firebaseService.js functions
- ✅ Update all API routes
- ✅ Add tenant filtering validation
- ✅ Test data isolation

### Week 3: Registration & UI (12-16 hours)
- ✅ Build tenant registration flow
- ✅ Build user invitation system
- ✅ Add tenant switcher (for super-admin)
- ✅ Update dashboard with tenant branding

### Week 4: Testing & Polish (8-12 hours)
- ✅ Comprehensive testing
- ✅ Fix bugs
- ✅ Documentation
- ✅ Deploy to production

**Total: 4-6 weeks for full implementation**

---

## Rollout Strategy

### Phase 1: Development (Week 1)
- Implement multi-tenancy
- Test with dummy tenants

### Phase 2: Beta (Week 2-3)
- Migrate existing users to "default" tenant
- Invite 2-3 pilot companies
- Gather feedback

### Phase 3: Production (Week 4)
- Open sign-ups
- Enable billing
- Monitor closely

---

## Success Metrics

- ✅ Zero cross-tenant data leaks
- ✅ Each query has tenantId filter
- ✅ Can onboard new tenant in < 5 minutes
- ✅ Existing users unaffected
- ✅ Performance not degraded

---

## Next Steps

1. **Review this plan** - Approve architecture decisions
2. **Start Phase 1** - Create organizations collection
3. **Create migration script** - Add tenantId to existing data
4. **Update authentication** - Include tenant in JWT
5. **Update queries** - Add tenant filtering everywhere

---

**Ready to start implementation?**

Type "start multi-tenancy" to begin Phase 1!
