/**
 * Reports API Client
 */

import httpClient from '../../../shared/api/httpClient.js';

class ReportsApi {
  async getReports(params = {}) {
    return await httpClient.get('/reports', params);
  }

  async generateReport(reportData) {
    return await httpClient.post('/reports', reportData);
  }

  async getReportById(reportId) {
    const response = await httpClient.get(`/reports/${reportId}`);
    return response.data || response;
  }

  async deleteReport(reportId) {
    return await httpClient.delete(`/reports/${reportId}`);
  }

  async exportReport(reportId, format = 'pdf') {
    return await httpClient.get(`/reports/${reportId}/export`, {
      format,
      responseType: 'blob'
    });
  }

  async getAttendanceReport(params = {}) {
    return await httpClient.get('/reports/attendance', params);
  }

  async getTasksReport(params = {}) {
    return await httpClient.get('/reports/tasks', params);
  }

  async getPerformanceReport(params = {}) {
    return await httpClient.get('/reports/performance', params);
  }

  async getClientReport(clientId, params = {}) {
    return await httpClient.get(`/reports/client/${clientId}`, params);
  }

  async exportAttendanceReport(params = {}) {
    return await httpClient.get('/attendance/export', {
      ...params,
      responseType: 'blob'
    });
  }
}

export const reportsApi = new ReportsApi();
export default reportsApi;
