/**
 * Tasks API Client
 */

import httpClient from '../../../shared/api/httpClient.js';

class TasksApi {
  async getTasks(params = {}) {
    return await httpClient.get('/tasks', params);
  }

  async getTaskById(taskId) {
    const response = await httpClient.get(`/tasks/${taskId}`);
    return response.data || response;
  }

  async createTask(taskData) {
    return await httpClient.post('/tasks', taskData);
  }

  async updateTask(taskId, updates) {
    return await httpClient.put(`/tasks/${taskId}`, updates);
  }

  async deleteTask(taskId) {
    return await httpClient.delete(`/tasks/${taskId}`);
  }

  async getTaskComments(taskId) {
    return await httpClient.get(`/tasks/${taskId}/comments`);
  }

  async addTaskComment(taskId, commentData) {
    return await httpClient.post(`/tasks/${taskId}/comments`, commentData);
  }

  async getTaskNotes(taskId) {
    return await httpClient.get(`/tasks/${taskId}/notes`);
  }

  async addTaskNote(taskId, noteData) {
    return await httpClient.post(`/tasks/${taskId}/notes`, noteData);
  }

  async getTaskRemarks(taskId) {
    return await httpClient.get(`/tasks/${taskId}/remarks`);
  }

  async addTaskRemark(taskId, remarkData) {
    return await httpClient.post(`/tasks/${taskId}/remarks`, remarkData);
  }

  async findDuplicates(params) {
    return await httpClient.post('/tasks/duplicates', params);
  }
}

export const tasksApi = new TasksApi();
export default tasksApi;
