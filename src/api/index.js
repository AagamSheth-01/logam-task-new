/**
 * API Layer Entry Point
 * Exports all API clients for easy importing
 * Frontend MVC Layer - API Module
 */

export { apiClient } from './client.js';
export { authApi } from './auth.api.js';
export { attendanceApi } from './attendance.api.js';
export { tasksApi } from './tasks.api.js';
export { usersApi } from './users.api.js';

export default {
  apiClient,
  authApi,
  attendanceApi,
  tasksApi,
  usersApi
};
