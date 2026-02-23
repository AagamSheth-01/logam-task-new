# Frontend Legacy Implementation Map

This document provides a detailed breakdown of specific frontend files that still use the legacy system. These files bypass the new MVC architecture (`src/`) and instead interact directly with old API endpoints and manual data management patterns.

## 1. Core Legacy Containers (Pages)
These are the main entry points for users. They contain heavy amounts of legacy logic and direct API calls.

| File Path | Functionality | Why it's Legacy |
| :--- | :--- | :--- |
| `pages/admin.js` | Admin Panel | Direct `fetch` for tasks, users, and global attendance. |
| `pages/dashboard.js` | User Dashboard | Direct `fetch` for personal tasks and user verification. |
| `pages/index.js` | Login / Home | Manually handles login and token storage logic. |
| `pages/login.js` | Auth Page | Direct interaction with legacy `/api/auth` endpoints. |
| `pages/signup.js` | Registration | Direct interaction with `/api/organizations/register`. |

## 2. Legacy-Driven Components
These components represent major UI features that are not yet integrated into the new `src/` service layer.

### Attendance & User Management
- **`components/AttendanceManagement.js`**: A massive component managing all attendance UI. It makes direct calls to `/api/attendance` and `/api/attendance/clock-out`.
- **`components/UserProfile.js`**: Handles profile updates and password changes via direct calls to `/api/users/*`.
- **`components/users/UserSelector.js`**: Fetches user lists directly from `/api/users`.

### Client & Task Management
- **`components/ClientManagement.js`**: Core client CRUD operations using legacy fetch patterns.
- **`components/dashboard/ClientNotesDashboard.js`**: Extremely high density of direct fetch calls for Client details, Notes, and POCs.
- **`components/TaskTable.js`**: Updates and deletes tasks using direct PUT/DELETE calls to `/api/tasks`.
- **`components/modals/TaskDetailModal.js`**: Manages comments and notes for tasks via legacy endpoints.

### Daily Operations
- **`components/DailyTaskLogger.js`**: Interacts directly with `/api/daily-tasks`.
- **`components/DailyLogInput.js`**: Sends data to `/api/attendance/daily-log`.
- **`components/DailyTaskAnalytics.js`**: Fetches analytics data directly.

## 3. The "Legacy" Hooks (Hooks/)
These hooks act as the data layer for legacy components. They wrap legacy API calls but do not use the standardized `apiClientWithRefresh` or MVC services.

- **`hooks/useAttendance.js`**
- **`hooks/useAttendanceDashboard.js`**
- **`hooks/useClientNotes.js`**
- **`hooks/useReports.js`**
- **`hooks/useTaskAssignment.js`**

## Proper Idea of the Legacy System
When we say a file is "Legacy", it typically follows these patterns:

1.  **State Management**: Uses local `useState` or many interleaved `useEffect` calls to manage complex data instead of a centralized state store or Service injection.
2.  **Data Fetching**:
    ```javascript
    // LEGACY PATTERN
    const response = await fetch('/api/tasks', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    ```
    *Instead of:*
    ```javascript
    // NEW MVC PATTERN
    const response = await taskService.getTasks();
    ```
3.  **UI Density**: Many of these files (like `AttendanceManagement.js`) combine UI layout, business logic, and API calls in a single file exceeding 1,000 lines. This makes them difficult to test and maintain.

## Next Refactoring Priorities
If you are looking to migrate, I recommend this order:
1.  **Auth Flow**: Standardize `index.js` and `login.js` using a dedicated `useAuth` hook.
2.  **Attendance**: Refactor `AttendanceManagement.js` to use a data-agnostic UI and move the logic to a new `AttendanceController`.
3.  **Client Notes**: The `ClientNotesDashboard.js` is highly complex and would benefit significantly from the MVC Repository pattern.
