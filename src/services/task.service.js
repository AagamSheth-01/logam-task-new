/**
 * Task Service
 * Contains business logic for task management
 * Uses TaskRepository for data access
 */

import { TaskRepository } from '../repositories/task.repository.js';
import { TaskModel } from '../models/task.model.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';

export class TaskService {
  constructor() {
    this.taskRepository = new TaskRepository();
  }

  /**
   * Get all tasks for a tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of tasks
   */
  async getTasksByTenant(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const tasks = await this.taskRepository.findByTenant(tenantId);
    return tasks.map(task => new TaskModel(task).toObject());
  }

  /**
   * Get tasks with filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Array>} List of tasks
   */
  async getTasks(filters = {}) {
    const tasks = await this.taskRepository.find(filters);
    return tasks.map(task => new TaskModel(task).toObject());
  }

  /**
   * Get tasks for a specific user
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of user's tasks
   */
  async getUserTasks(username, tenantId) {
    if (!username || !tenantId) {
      throw new ValidationError('Username and tenant ID are required');
    }

    const tasks = await this.taskRepository.findByUser(username, tenantId);
    return tasks.map(task => new TaskModel(task).toObject());
  }

  /**
   * Get task by ID
   * @param {string} taskId - Task ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object|null>} Task object or null
   */
  async getTaskById(taskId, tenantId) {
    if (!taskId || !tenantId) {
      throw new ValidationError('Task ID and tenant ID are required');
    }

    const task = await this.taskRepository.findById(taskId, tenantId);

    if (!task) return null;

    return new TaskModel(task).toObject();
  }

  /**
   * Get task by name
   * @param {string} taskName - Task name
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object|null>} Task object or null
   */
  async getTaskByName(taskName, username, tenantId) {
    if (!taskName || !username || !tenantId) {
      throw new ValidationError('Task name, username, and tenant ID are required');
    }

    const task = await this.taskRepository.findByName(taskName, username, tenantId);

    if (!task) return null;

    return new TaskModel(task).toObject();
  }

  /**
   * Create a new task
   * @param {Object} taskData - Task data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created task object
   */
  async createTask(taskData, tenantId) {
    // Validate input data
    const validation = TaskModel.validate(taskData);
    if (!validation.isValid) {
      throw new ValidationError('Invalid task data', validation.errors);
    }

    // Create task model
    const taskModel = new TaskModel({
      ...taskData,
      tenantId
    });

    // Save to database
    const newTask = await this.taskRepository.create(taskModel.toObject(), tenantId);

    return new TaskModel(newTask).toObject();
  }

  /**
   * Update task by ID
   * @param {string} taskId - Task ID
   * @param {Object} updateData - Update data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated task object
   */
  async updateTask(taskId, updateData, tenantId) {
    // Validate update data
    const validation = TaskModel.validate(updateData, true);
    if (!validation.isValid) {
      throw new ValidationError('Invalid update data', validation.errors);
    }

    // Check if task exists
    const existingTask = await this.taskRepository.findById(taskId, tenantId);
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    // Update in database
    const updatedTask = await this.taskRepository.update(taskId, updateData, tenantId);

    return new TaskModel(updatedTask).toObject();
  }

  /**
   * Update task status
   * @param {string} taskId - Task ID or task name
   * @param {string} username - Username
   * @param {string} newStatus - New status
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated task object
   */
  async updateTaskStatus(taskId, username, newStatus, tenantId) {
    if (!taskId || !username || !newStatus || !tenantId) {
      throw new ValidationError('Task ID, username, status, and tenant ID are required');
    }

    // Update status
    const updatedTask = await this.taskRepository.updateStatus(username, taskId, newStatus, tenantId);

    if (!updatedTask) {
      throw new NotFoundError('Task not found');
    }

    return new TaskModel(updatedTask).toObject();
  }

  /**
   * Mark task as completed
   * @param {string} taskId - Task ID
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated task object
   */
  async completeTask(taskId, username, tenantId) {
    return await this.updateTaskStatus(taskId, username, 'done', tenantId);
  }

  /**
   * Delete task
   * @param {string} taskId - Task ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<void>}
   */
  async deleteTask(taskId, tenantId) {
    if (!taskId || !tenantId) {
      throw new ValidationError('Task ID and tenant ID are required');
    }

    // Check if task exists
    const existingTask = await this.taskRepository.findById(taskId, tenantId);
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    await this.taskRepository.delete(taskId, tenantId);
  }

  /**
   * Add comment to task
   * @param {string} taskId - Task ID
   * @param {Object} commentData - Comment data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Added comment object
   */
  async addTaskComment(taskId, commentData, tenantId) {
    if (!taskId || !tenantId) {
      throw new ValidationError('Task ID and tenant ID are required');
    }

    if (!commentData.text || !commentData.username) {
      throw new ValidationError('Comment text and username are required');
    }

    // Check if task exists
    const existingTask = await this.taskRepository.findById(taskId, tenantId);
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    const comment = await this.taskRepository.addComment(taskId, commentData, tenantId);
    return comment;
  }

  /**
   * Get task comments
   * @param {string} taskId - Task ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of comments
   */
  async getTaskComments(taskId, tenantId) {
    if (!taskId || !tenantId) {
      throw new ValidationError('Task ID and tenant ID are required');
    }

    const comments = await this.taskRepository.getComments(taskId, tenantId);
    return comments;
  }

  /**
   * Delete task comment
   * @param {string} taskId - Task ID
   * @param {string} commentId - Comment ID
   * @param {string} userId - User ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<void>}
   */
  async deleteTaskComment(taskId, commentId, userId, tenantId) {
    if (!taskId || !commentId || !userId || !tenantId) {
      throw new ValidationError('Task ID, comment ID, user ID, and tenant ID are required');
    }

    await this.taskRepository.deleteComment(taskId, commentId, userId, tenantId);
  }

  /**
   * Update task notes (assigner notes)
   * @param {string} taskId - Task ID
   * @param {Object} notesData - Notes data
   * @param {string} userId - User ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated task object
   */
  async updateTaskNotes(taskId, notesData, userId, tenantId) {
    if (!taskId || !userId || !tenantId) {
      throw new ValidationError('Task ID, user ID, and tenant ID are required');
    }

    // Check if task exists
    const existingTask = await this.taskRepository.findById(taskId, tenantId);
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    const updatedTask = await this.taskRepository.updateNotes(taskId, notesData, userId, tenantId);
    return new TaskModel(updatedTask).toObject();
  }

  /**
   * Get task analytics
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Analytics data
   */
  async getTaskAnalytics(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const analytics = await this.taskRepository.getAnalytics(tenantId);
    return analytics;
  }

  /**
   * Get task statistics for a user
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Task statistics
   */
  async getUserTaskStats(username, tenantId) {
    if (!username || !tenantId) {
      throw new ValidationError('Username and tenant ID are required');
    }

    const counts = await this.taskRepository.countByStatus(username, tenantId);
    return counts;
  }

  /**
   * Get overdue tasks for a user
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of overdue tasks
   */
  async getOverdueTasks(username, tenantId) {
    if (!username || !tenantId) {
      throw new ValidationError('Username and tenant ID are required');
    }

    const tasks = await this.taskRepository.findByUser(username, tenantId);
    const today = new Date().toISOString().split('T')[0];

    const overdueTasks = tasks.filter(task => {
      const taskModel = new TaskModel(task);
      return taskModel.isOverdue();
    });

    return overdueTasks.map(task => new TaskModel(task).toObject());
  }

  /**
   * Get tasks due soon (within X days)
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @param {number} days - Number of days to look ahead (default: 7)
   * @returns {Promise<Array>} List of tasks due soon
   */
  async getTasksDueSoon(username, tenantId, days = 7) {
    if (!username || !tenantId) {
      throw new ValidationError('Username and tenant ID are required');
    }

    // Use repository method for consistency
    const tasks = await this.taskRepository.findDueSoon(days, tenantId);

    // Filter by username if provided
    const userTasks = username ? tasks.filter(task => task.username === username) : tasks;

    return userTasks.map(task => new TaskModel(task).toObject());
  }

  /**
   * Search tasks by term
   * @param {string} searchTerm - Search term
   * @param {string} tenantId - Organization ID
   * @param {Object} additionalFilters - Additional filters
   * @returns {Promise<Array>} List of matching tasks
   */
  async searchTasks(searchTerm, tenantId, additionalFilters = {}) {
    if (!searchTerm || !tenantId) {
      throw new ValidationError('Search term and tenant ID are required');
    }

    const filters = { ...additionalFilters, tenantId };
    const tasks = await this.taskRepository.search(searchTerm, filters);

    return tasks.map(task => new TaskModel(task).toObject());
  }

  /**
   * Edit task comment
   * @param {string} taskId - Task ID
   * @param {string} commentId - Comment ID
   * @param {string} newContent - New comment content
   * @param {string} userId - User ID making the edit
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated comment
   */
  async editTaskComment(taskId, commentId, newContent, userId, tenantId) {
    if (!taskId || !commentId || !newContent || !userId || !tenantId) {
      throw new ValidationError('Task ID, comment ID, content, user ID, and tenant ID are required');
    }

    // Check if task exists
    const existingTask = await this.taskRepository.findById(taskId, tenantId);
    if (!existingTask) {
      throw new NotFoundError('Task not found');
    }

    const updatedComment = await this.taskRepository.editComment(
      taskId,
      commentId,
      newContent,
      userId,
      tenantId
    );

    return updatedComment;
  }

  /**
   * Get overdue tasks for user or tenant
   * @param {string} tenantId - Organization ID
   * @param {string} username - Username (optional)
   * @returns {Promise<Array>} List of overdue tasks
   */
  async getOverdueTasksForTenant(tenantId, username = null) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const tasks = await this.taskRepository.findOverdue(username, tenantId);
    return tasks.map(task => new TaskModel(task).toObject());
  }

  /**
   * Check if task name already exists for user
   * @param {string} taskName - Task name to check
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<boolean>} True if duplicate exists
   */
  async checkDuplicateTask(taskName, username, tenantId) {
    if (!taskName || !username || !tenantId) {
      throw new ValidationError('Task name, username, and tenant ID are required');
    }

    return await this.taskRepository.checkDuplicates(taskName, username, tenantId);
  }

  /**
   * Bulk create tasks
   * @param {Array} tasksArray - Array of task objects
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} Array of created tasks
   */
  async bulkCreateTasks(tasksArray, tenantId) {
    if (!Array.isArray(tasksArray) || tasksArray.length === 0) {
      throw new ValidationError('Tasks array is required and must not be empty');
    }

    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    // Validate each task
    const validationErrors = [];
    tasksArray.forEach((taskData, index) => {
      const validation = TaskModel.validate(taskData);
      if (!validation.isValid) {
        validationErrors.push({
          index,
          errors: validation.errors
        });
      }
    });

    if (validationErrors.length > 0) {
      throw new ValidationError('Some tasks have validation errors', validationErrors);
    }

    // Add tenantId to each task
    const tasksWithTenant = tasksArray.map(task => ({ ...task, tenantId }));

    const createdTasks = await this.taskRepository.bulkSave(tasksWithTenant, tenantId);
    return createdTasks.map(task => new TaskModel(task).toObject());
  }

  /**
   * Get tasks by priority
   * @param {string} priority - Priority level (Low, Medium, High, Urgent)
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of tasks with specified priority
   */
  async getTasksByPriority(priority, tenantId) {
    if (!priority || !tenantId) {
      throw new ValidationError('Priority and tenant ID are required');
    }

    const validPriorities = ['Low', 'Medium', 'High', 'Urgent'];
    if (!validPriorities.includes(priority)) {
      throw new ValidationError(`Invalid priority. Must be one of: ${validPriorities.join(', ')}`);
    }

    const tasks = await this.taskRepository.findByPriority(priority, tenantId);
    return tasks.map(task => new TaskModel(task).toObject());
  }

  /**
   * Get tasks by status
   * @param {string} status - Task status
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of tasks with specified status
   */
  async getTasksByStatus(status, tenantId) {
    if (!status || !tenantId) {
      throw new ValidationError('Status and tenant ID are required');
    }

    const validStatuses = ['pending', 'in_progress', 'done', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const tasks = await this.taskRepository.findByStatus(status, tenantId);
    return tasks.map(task => new TaskModel(task).toObject());
  }

  /**
   * Get tasks by assignee
   * @param {string} assignee - Assignee username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of tasks assigned to user
   */
  async getTasksByAssignee(assignee, tenantId) {
    if (!assignee || !tenantId) {
      throw new ValidationError('Assignee and tenant ID are required');
    }

    const tasks = await this.taskRepository.findByAssignee(assignee, tenantId);
    return tasks.map(task => new TaskModel(task).toObject());
  }

  /**
   * Get task count for tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<number>} Task count
   */
  async getTaskCount(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const tasks = await this.taskRepository.findByTenant(tenantId);
    return tasks.length;
  }

  /**
   * Get tasks by user (alias for getUserTasks for consistency)
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of user's tasks
   */
  async getTasksByUser(username, tenantId) {
    return await this.getUserTasks(username, tenantId);
  }

  /**
   * Get upcoming tasks with deadlines for all users
   * @param {string} tenantId - Organization ID
   * @param {number} limit - Maximum number of tasks to return
   * @returns {Promise<Array>} List of upcoming tasks
   */
  async getUpcomingTasks(tenantId, limit = 10) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const tasks = await this.taskRepository.findByTenant(tenantId);

    // Filter for tasks with deadlines that are not completed
    const upcomingTasks = tasks
      .filter(task => task.deadline && task.status !== 'done')
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, limit);

    return upcomingTasks.map(task => new TaskModel(task).toObject());
  }

  /**
   * Get upcoming tasks for a specific user
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @param {number} limit - Maximum number of tasks to return
   * @returns {Promise<Array>} List of user's upcoming tasks
   */
  async getUserUpcomingTasks(username, tenantId, limit = 10) {
    if (!username || !tenantId) {
      throw new ValidationError('Username and tenant ID are required');
    }

    const tasks = await this.taskRepository.findByUser(username, tenantId);

    // Filter for tasks with deadlines that are not completed
    const upcomingTasks = tasks
      .filter(task => task.deadline && task.status !== 'done')
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, limit);

    return upcomingTasks.map(task => new TaskModel(task).toObject());
  }

  /**
   * Get recent tasks for all users
   * @param {string} tenantId - Organization ID
   * @param {number} limit - Maximum number of tasks to return
   * @returns {Promise<Array>} List of recent tasks
   */
  async getRecentTasks(tenantId, limit = 20) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const tasks = await this.taskRepository.findByTenant(tenantId);

    const recentTasks = tasks
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, limit);

    return recentTasks.map(task => new TaskModel(task).toObject());
  }

  /**
   * Get recent tasks for a specific user
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @param {number} limit - Maximum number of tasks to return
   * @returns {Promise<Array>} List of user's recent tasks
   */
  async getUserRecentTasks(username, tenantId, limit = 20) {
    if (!username || !tenantId) {
      throw new ValidationError('Username and tenant ID are required');
    }

    const tasks = await this.taskRepository.findByUser(username, tenantId);

    const recentTasks = tasks
      .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at))
      .slice(0, limit);

    return recentTasks.map(task => new TaskModel(task).toObject());
  }
}

export default TaskService;
