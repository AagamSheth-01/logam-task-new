/**
 * Dashboard API Client
 */

import httpClient from '../../../shared/api/httpClient.js';

class DashboardApi {
  async getSummary(params = {}) {
    return await httpClient.get('/dashboard/summary', params);
  }

  async getStats(params = {}) {
    return await httpClient.get('/dashboard/stats', params);
  }

  async getRecentActivity(params = {}) {
    return await httpClient.get('/dashboard/activity', params);
  }

  async getUpcomingTasks(params = {}) {
    return await httpClient.get('/dashboard/upcoming-tasks', params);
  }

  async getTasksByStatus(params = {}) {
    return await httpClient.get('/dashboard/tasks-by-status', params);
  }

  async getAttendanceOverview(params = {}) {
    return await httpClient.get('/dashboard/attendance-overview', params);
  }

  async getClientMetrics(params = {}) {
    return await httpClient.get('/dashboard/client-metrics', params);
  }

  async getUserPerformance(userId, params = {}) {
    return await httpClient.get(`/dashboard/user-performance/${userId}`, params);
  }
}

export const dashboardApi = new DashboardApi();
export default dashboardApi;
