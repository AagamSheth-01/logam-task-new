# Migration Guide: Legacy to MVC Architecture

This guide provides concrete examples and a step-by-step process for migrating legacy frontend code to the new MVC architecture in the `src/` folder.

## 1. The Core Difference

| Feature | Legacy Pattern (Old) | MVC Pattern (New) |
| :--- | :--- | :--- |
| **Data Fetching** | Raw `fetch()` in components/hooks | Dedicated API class (e.g., `attendanceApi`) |
| **Auth Handling** | Manual `localStorage.getItem('token')` | Handled automatically by `httpClient` |
| **State Management** | Local `useState` + `useEffect` | Centralized `Zustand` stores + Custom Hooks |
| **Error Handling** | Manual `try/catch` in every file | Consistent handling in the API wrapper |

---

## 2. Example 1: Single API Call Refactoring

### ❌ Before (Legacy)
Found in: `components/ClientManagement.js`
```javascript
const loadClients = async () => {
  setLoading(true);
  const token = localStorage.getItem('token');
  const response = await fetch('/api/clients', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  if (data.success) setClients(data.clients);
  setLoading(false);
};
```

### ✅ After (MVC)
Using the new structure:
```javascript
import { clientsApi } from '../src/features/clients/api/clientsApi';

const loadClients = async () => {
  setLoading(true);
  try {
    const response = await clientsApi.getClients(); // No manual token needed!
    if (response.success) setClients(response.clients);
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
```

---

## 3. Example 2: Full Hook Migration

### ❌ Before (Legacy)
Found in: `hooks/useAttendanceDashboard.js`
Over 400 lines of manual date calculation, fetching, and state management.

### ✅ After (MVC)
Modernized version using the existing MVC hook:
```javascript
import { useAttendance } from '../src/features/attendance/hooks/useAttendance';

const AttendanceComponent = ({ username }) => {
  // All state, loading, and methods come from one clean hook
  const { todayRecord, attendanceStats, loading, markAttendance } = useAttendance(username);

  if (loading) return <Spinner />;

  return (
    <div>
      <StatsCard data={attendanceStats} />
      <button onClick={() => markAttendance({ type: 'office' })}>
        Clock In
      </button>
    </div>
  );
};
```

---

## 4. Step-by-Step Migration Process

Follow these steps to migrate a component or hook:

### Step 1: Identify the Counterpart
Check `LEGACY_VS_MVC_MAP.md` to see if the `src/features/` API and Hooks already exist.

### Step 2: Clean up Imports
Remove any direct imports of legacy libraries like `../lib/auth` or manual `fetch` logic.
Import the new feature API or Hook from `src/features/...`.

### Step 3: Replace State and Effects
- Delete local `useState` for data that is now managed by the MVC store.
- Delete `useEffect` blocks that manually fetch data on mount.
- Use the new hook (e.g., `useTasks()`) which handles auto-loading and caching for you.

### Step 4: Refactor Methods
Replace raw `fetch` calls (POST/PUT/DELETE) with the methods from the API singleton (e.g., `tasksApi.updateTask(id, data)`).

### Step 5: Test via the new API Middleware
Verify the calls in the Network tab. You should see them hitting the same endpoints but with cleaner headers and standardized error responses.

---

## 5. Current Priority Checklist
- [ ] **Task Detail Modal**: Replace raw `fetch` calls with `tasksApi.addTaskComment` and `tasksApi.addTaskNote`.
- [ ] **Attendance Management**: Refactor to use the `useAttendance` hook from `src/features/attendance/hooks/`.
- [ ] **User Profile**: Refactor to use `usersApi` for all profile and image updates.
