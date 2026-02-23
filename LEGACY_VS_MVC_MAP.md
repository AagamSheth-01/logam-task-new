# Legacy vs New MVC Architecture: Counterpart Existence Map

This document answers the question: **Does a counterpart in the new MVC structure exist for every legacy file?**

> [!IMPORTANT]
> The `src/` MVC architecture is **surprisingly complete** at the backend/service level. The problem is not missing implementations — it's that the **legacy frontend components are not using them**. They need to be "wired up" to the new system.

---

## Comparison Table

| Legacy File / Endpoint | Uses Legacy | New MVC Counterpart | MVC Status |
| :--- | :--- | :--- | :--- |
| `hooks/useAttendance.js` | `fetch('/api/attendance')` | `src/features/attendance/hooks/useAttendance.js` | ✅ **FULLY EXISTS** |
| `hooks/useAttendanceDashboard.js` | `fetch('/api/attendance')` | `src/features/attendance/api/attendanceApi.js` | ✅ **FULLY EXISTS** |
| `hooks/useClientNotes.js` | `fetch('/api/clients')` | `src/features/clients/api/clientsApi.js` | ✅ **FULLY EXISTS** |
| `hooks/useReports.js` | `fetch('/api/tasks')` | `src/features/tasks/api/tasksApi.js` | ✅ **FULLY EXISTS** |
| `hooks/useMyTasks.js` | `fetch('/api/tasks')` | `src/features/tasks/hooks/` | ✅ **FULLY EXISTS** |
| `components/AttendanceManagement.js` | `fetch('/api/attendance')` | `src/services/attendance.service.js` | ✅ Service exists, component not wired |
| `components/ClientManagement.js` | `fetch('/api/clients')` | `src/services/client.service.js` | ✅ Service exists, component not wired |
| `components/TaskTable.js` | `fetch('/api/tasks')` | `src/services/task.service.js` | ✅ Service exists, component not wired |
| `components/UserProfile.js` | `fetch('/api/users/*')` | `src/features/users/api/usersApi.js` | ✅ **FULLY EXISTS** |
| `components/DailyTaskLogger.js` | `fetch('/api/daily-tasks')` | `src/services/dailyTask.service.js` | ✅ Service exists, component not wired |
| `components/dashboard/ClientNotesDashboard.js` | Multiple legacy fetches | `src/features/clients/api/clientsApi.js` | ✅ Client API exists, notes/POCs partial |
| `pages/dashboard.js` | `fetch('/api/tasks')`, `/api/users` | `src/features/tasks`, `src/features/users` | ✅ Features exist, page not yet migrated |
| `pages/admin.js` | `fetch('/api/tasks?all=true')`, `/api/users`, `/api/attendance` | All services exist in `src/services/` | ✅ Services exist, page not yet migrated |
| `pages/login.js` / `pages/index.js` | `fetch('/api/auth/login')` | ❌ **NO COUNTERPART** in `src/features/auth` | ❌ **NOT IMPLEMENTED** |

---

## Key Finding: The Gap is in "Wiring", Not Implementation

Here's the critical insight broken down by domain:

### ✅ Attendance — MVC Backend & Frontend Ready
- **New API Client**: `src/features/attendance/api/attendanceApi.js` — has `getAttendance`, `markAttendance`, `clockOut`, `getDailyLog`, etc.
- **New Hook**: `src/features/attendance/hooks/useAttendance.js` — fully implemented, uses Zustand store.
- **gap**: `components/AttendanceManagement.js` and `hooks/useAttendanceDashboard.js` are **ignoring** these and using raw `fetch` instead.

### ✅ Tasks — MVC Backend & Frontend Ready
- **New API Client**: `src/features/tasks/api/tasksApi.js` — has full CRUD plus comments and notes.
- **New Hook**: `src/features/tasks/hooks/` — exists.
- **Gap**: `components/TaskTable.js`, `modals/TaskDetailModal.js`, and `pages/dashboard.js` still use raw `fetch`.

### ✅ Clients — MVC Backend & Frontend Ready
- **New API Client**: `src/features/clients/api/clientsApi.js` — has full CRUD, users, meetings, files.
- **Gap**: `components/ClientManagement.js` and `dashboard/ClientNotesDashboard.js` still use raw `fetch`.

### ✅ Users — MVC Backend & Frontend Ready
- **New API Client**: `src/features/users/api/usersApi.js` — exists.
- **Gap**: `components/UserProfile.js`, `UserSelector.js` still use raw `fetch`.

### ❌ Auth — NOT IMPLEMENTED IN NEW STRUCTURE
- **Legacy**: `pages/login.js` and `pages/index.js` call `/api/auth/login`, `/api/auth/verify`, and `/api/auth/forgot-password`.
- **New MVC**: There is **no** `src/features/auth/` directory. Authentication has NOT been migrated.
- **Action Needed**: This needs to be built from scratch.

---

## What Needs to Happen to Complete Migration

For areas ✅ where the counterpart exists, migration is a **refactoring task**:
1. Replace `fetch('/api/...')` with the corresponding `api` class method (e.g., `attendanceApi.markAttendance(data)`).
2. Replace local `useState` + `useEffect` with the new hooks (e.g., import `useAttendance` from `src/features/attendance/hooks/useAttendance.js`).

For ❌ Auth (not implemented), the task is more complex:
1. Create `src/features/auth/api/authApi.js`.
2. Create `src/features/auth/hooks/useAuth.js`.
3. Refactor `pages/login.js` and `pages/index.js` to use the new auth hook.
