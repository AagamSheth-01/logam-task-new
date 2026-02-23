# Legacy System Usage Report

This report identifies the parts of the frontend that are still calling the "old" system (legacy API routes) instead of using the new MVC architecture in the `src/` folder.

## Summary of Findings

The migration to the MVC architecture is currently **partial**. While a few optimized dashboard endpoints have been migrated, the core functionality of the application still relies on legacy patterns.

### 1. Legacy Frontend Hooks
These hooks are still making direct `fetch` calls to legacy API routes and manually handling authentication tokens.

| Hook | Legacy Endpoints Called | Description |
| :--- | :--- | :--- |
| `useAttendance.js` | `/api/attendance` | Main attendance fetching and marking. |
| `useAttendanceDashboard.js` | `/api/attendance`, `/api/attendance/clock-out` | Attendance actions for the dashboard. |
| `useClientNotes.js` | `/api/clients`, `/api/clients/[id]/notes`, `/api/clients/[id]/pocs` | All client and note management. |
| `useReports.js` | `/api/tasks` | Fetching tasks for report generation. |
| `useTaskAssignment.js` | `/api/tasks`, `/api/users` | (Based on research) Likely legacy task operations. |
| `useUserDashboardStore.js` | `/api/tasks`, `/api/attendance` | Mixed: Uses some new dashboard APIs but still falls back to legacy for core tasks. |

### 2. Legacy API Routes (Server-Side)
These routes are considered "Legacy" because they import directly from `lib/firebaseService.js` and do not use the `src/middleware` or `src/services` layers.

- **Attendance**: `pages/api/attendance/index.js`, `clock-out.js`, `daily-log.js`
- **Clients**: `pages/api/clients.js`, `pages/api/clients/[id].js`, `pages/api/clients/[id]/notes.js`
- **Tasks**: `pages/api/tasks/index.js`, `pages/api/tasks/[id].js`
- **Users**: `pages/api/users/index.js` (except for `users/[id].js` which is migrated)

### 3. Key Indicators of "Legacy" Code
To help you identify legacy code in the future:

#### In the Frontend:
- Uses `fetch()` directly with a manual header: `'Authorization': 'Bearer ' + localStorage.getItem('token')`.
- Does not use the `apiClientWithRefresh` or feature-specific API wrappers (like `dashboardApi`).

#### In the API Routes:
- Imports from `../../../lib/firebaseService`.
- Manually calls `verifyToken(token)` instead of using the `authenticate` middleware.
- Does not use `asyncHandler` for error wrapping.

## Recommendation for Migration

To move these components to the new architecture:
1.  **Migrate the API**: Create a corresponding Service in `src/services/` and a Repository in `src/repositories/`.
2.  **Update the API Handler**: Refactor the `pages/api` file to use `asyncHandler`, `authenticate` middleware, and the new Service.
3.  **Update the Hook**: Replace direct `fetch` calls with calls to an API feature wrapper (e.g., `attendanceApi`) that uses `apiClientWithRefresh`.
