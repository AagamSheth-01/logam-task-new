/**
 * Performance API Client
 */

import httpClient from '../../../shared/api/httpClient.js';

class PerformanceApi {
  async getPerformanceMetrics(params = {}) {
    return await httpClient.get('/reports/performance', params);
  }

  async getUserPerformance(userId, params = {}) {
    return await httpClient.get(`/reports/performance/${userId}`, params);
  }

  async getTeamPerformance(params = {}) {
    return await httpClient.get('/reports/performance/team', params);
  }

  async getTaskCompletionStats(params = {}) {
    return await httpClient.get('/reports/performance/task-completion', params);
  }

  async getAttendanceStats(params = {}) {
    return await httpClient.get('/reports/performance/attendance', params);
  }

  async getProductivityMetrics(params = {}) {
    return await httpClient.get('/reports/performance/productivity', params);
  }

  async getLeaderboard(params = {}) {
    return await httpClient.get('/reports/performance/leaderboard', params);
  }
}

export const performanceApi = new PerformanceApi();
export default performanceApi;
