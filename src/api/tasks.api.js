/**
 * Tasks API Client
 * Handles all task-related API calls
 * Frontend MVC Layer - API Module
 */

import apiClient from './client.js';

export class TasksApi {
  /**
   * Get all tasks
   * @param {Object} params - Query parameters
   * @param {string} params.status - Filter by status
   * @param {string} params.assignedTo - Filter by assigned user
   * @param {string} params.priority - Filter by priority
   * @param {string} params.clientId - Filter by client
   * @returns {Promise<Object>} Tasks list
   */
  async getTasks(params = {}) {
    const response = await apiClient.get('/tasks', params);
    return response;
  }

  /**
   * Get task by ID
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task details
   */
  async getTaskById(taskId) {
    const response = await apiClient.get(`/tasks/${taskId}`);
    return response.data || response;
  }

  /**
   * Create new task
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Created task
   */
  async createTask(taskData) {
    const response = await apiClient.post('/tasks', taskData);
    return response;
  }

  /**
   * Update task
   * @param {string} taskId - Task ID
   * @param {Object} updates - Task updates
   * @returns {Promise<Object>} Updated task
   */
  async updateTask(taskId, updates) {
    const response = await apiClient.put(`/tasks/${taskId}`, updates);
    return response;
  }

  /**
   * Delete task
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteTask(taskId) {
    const response = await apiClient.delete(`/tasks/${taskId}`);
    return response;
  }

  /**
   * Get task comments
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task comments
   */
  async getTaskComments(taskId) {
    const response = await apiClient.get(`/tasks/${taskId}/comments`);
    return response;
  }

  /**
   * Add task comment
   * @param {string} taskId - Task ID
   * @param {Object} commentData - Comment data
   * @returns {Promise<Object>} Created comment
   */
  async addTaskComment(taskId, commentData) {
    const response = await apiClient.post(`/tasks/${taskId}/comments`, commentData);
    return response;
  }

  /**
   * Get task notes
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task notes
   */
  async getTaskNotes(taskId) {
    const response = await apiClient.get(`/tasks/${taskId}/notes`);
    return response;
  }

  /**
   * Add task note
   * @param {string} taskId - Task ID
   * @param {Object} noteData - Note data
   * @returns {Promise<Object>} Created note
   */
  async addTaskNote(taskId, noteData) {
    const response = await apiClient.post(`/tasks/${taskId}/notes`, noteData);
    return response;
  }

  /**
   * Get task remarks
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Task remarks
   */
  async getTaskRemarks(taskId) {
    const response = await apiClient.get(`/tasks/${taskId}/remarks`);
    return response;
  }

  /**
   * Add task remark
   * @param {string} taskId - Task ID
   * @param {Object} remarkData - Remark data
   * @returns {Promise<Object>} Created remark
   */
  async addTaskRemark(taskId, remarkData) {
    const response = await apiClient.post(`/tasks/${taskId}/remarks`, remarkData);
    return response;
  }

  /**
   * Find duplicate tasks
   * @param {Object} params - Search parameters
   * @returns {Promise<Object>} Duplicate tasks
   */
  async findDuplicates(params) {
    const response = await apiClient.post('/tasks/duplicates', params);
    return response;
  }
}

// Export singleton instance
export const tasksApi = new TasksApi();
export default tasksApi;
