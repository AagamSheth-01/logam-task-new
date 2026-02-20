/**
 * Attendance Feature - Public API
 * Export only what other features/components need
 */

// API
export { attendanceApi } from './api/attendanceApi.js';

// Store
export { default as useAttendanceStore } from './store/attendanceStore.js';

// Hooks
export { useAttendance } from './hooks/useAttendance.js';

// Re-export for convenience
export {
  attendanceApi as default
} from './api/attendanceApi.js';
