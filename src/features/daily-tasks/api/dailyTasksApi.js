/**
 * Daily Tasks API Client
 */

import httpClient from '../../../shared/api/httpClient.js';

class DailyTasksApi {
  async getDailyTasks(params = {}) {
    return await httpClient.get('/daily-tasks', params);
  }

  async getDailyTaskById(taskId) {
    const response = await httpClient.get(`/daily-tasks/${taskId}`);
    return response.data || response;
  }

  async createDailyTask(taskData) {
    return await httpClient.post('/daily-tasks', taskData);
  }

  async updateDailyTask(taskId, updates) {
    return await httpClient.put(`/daily-tasks/${taskId}`, updates);
  }

  async deleteDailyTask(taskId) {
    return await httpClient.delete(`/daily-tasks/${taskId}`);
  }

  async getDailyTasksByDate(date, params = {}) {
    return await httpClient.get('/daily-tasks', {
      ...params,
      date
    });
  }

  async completeDailyTask(taskId, completionData = {}) {
    return await httpClient.put(`/daily-tasks/${taskId}`, {
      ...completionData,
      status: 'completed',
      completedAt: new Date().toISOString()
    });
  }
}

export const dailyTasksApi = new DailyTasksApi();
export default dailyTasksApi;
