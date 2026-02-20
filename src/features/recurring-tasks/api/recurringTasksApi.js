/**
 * Recurring Tasks API Client
 */

import httpClient from '../../../shared/api/httpClient.js';

class RecurringTasksApi {
  async getRecurringTasks(params = {}) {
    return await httpClient.get('/recurring-tasks', params);
  }

  async getRecurringTaskById(taskId) {
    const response = await httpClient.get(`/recurring-tasks/${taskId}`);
    return response.data || response;
  }

  async createRecurringTask(taskData) {
    return await httpClient.post('/recurring-tasks', taskData);
  }

  async updateRecurringTask(taskId, updates) {
    return await httpClient.put(`/recurring-tasks/${taskId}`, updates);
  }

  async deleteRecurringTask(taskId) {
    return await httpClient.delete(`/recurring-tasks/${taskId}`);
  }

  async pauseRecurringTask(taskId) {
    return await httpClient.put(`/recurring-tasks/${taskId}`, {
      status: 'paused'
    });
  }

  async resumeRecurringTask(taskId) {
    return await httpClient.put(`/recurring-tasks/${taskId}`, {
      status: 'active'
    });
  }

  async getRecurringTaskOccurrences(taskId, params = {}) {
    return await httpClient.get(`/recurring-tasks/${taskId}/occurrences`, params);
  }
}

export const recurringTasksApi = new RecurringTasksApi();
export default recurringTasksApi;
