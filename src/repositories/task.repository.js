/**
 * Task Repository
 * Wraps existing firebaseService task functions
 * Provides clean interface for task database operations
 */

import { BaseRepository } from './base.repository.js';
import {
  loadTasks,
  getTasks,
  getUserTasks,
  addTask,
  getTaskById,
  getTaskByName,
  updateTask,
  updateTaskByName,
  updateTaskStatus,
  updateTaskNotes,
  deleteTask,
  addTaskComment,
  getTaskComments,
  deleteTaskComment,
  editTaskComment,
  getTaskAnalytics,
  searchTasks
} from '../../lib/firebaseService.js';

export class TaskRepository extends BaseRepository {
  constructor() {
    super('tasks');
  }

  /**
   * Get all tasks for a tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of tasks
   */
  async findByTenant(tenantId) {
    try {
      const tasks = await loadTasks(tenantId);
      return tasks || [];
    } catch (error) {
      this.handleError(error, 'find tasks by tenant');
    }
  }

  /**
   * Find tasks with filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Array>} List of tasks
   */
  async find(filters = {}) {
    try {
      const tasks = await getTasks(filters);
      return tasks || [];
    } catch (error) {
      this.handleError(error, 'find tasks');
    }
  }

  /**
   * Get tasks for a specific user
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of user's tasks
   */
  async findByUser(username, tenantId) {
    try {
      const tasks = await getUserTasks(username, tenantId);
      return tasks || [];
    } catch (error) {
      this.handleError(error, 'find tasks by user');
    }
  }

  /**
   * Find task by ID
   * @param {string} taskId - Task ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object|null>} Task object or null
   */
  async findById(taskId, tenantId) {
    try {
      const task = await getTaskById(taskId, tenantId);
      return task || null;
    } catch (error) {
      this.handleError(error, 'find task by ID');
    }
  }

  /**
   * Find task by name
   * @param {string} taskName - Task name
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object|null>} Task object or null
   */
  async findByName(taskName, username, tenantId) {
    try {
      const task = await getTaskByName(taskName, username, tenantId);
      return task || null;
    } catch (error) {
      this.handleError(error, 'find task by name');
    }
  }

  /**
   * Create a new task
   * @param {Object} taskData - Task data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created task object
   */
  async create(taskData, tenantId) {
    try {
      const newTask = await addTask(taskData, tenantId);
      return newTask;
    } catch (error) {
      this.handleError(error, 'create task');
    }
  }

  /**
   * Update task by ID
   * @param {string} taskId - Task ID
   * @param {Object} updateData - Update data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated task object
   */
  async update(taskId, updateData, tenantId) {
    try {
      const updatedTask = await updateTask(taskId, updateData, tenantId);
      return updatedTask;
    } catch (error) {
      this.handleError(error, 'update task');
    }
  }

  /**
   * Update task by name
   * @param {string} taskName - Task name
   * @param {string} username - Username
   * @param {Object} updateData - Update data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated task object
   */
  async updateByName(taskName, username, updateData, tenantId) {
    try {
      const updatedTask = await updateTaskByName(taskName, username, updateData, tenantId);
      return updatedTask;
    } catch (error) {
      this.handleError(error, 'update task by name');
    }
  }

  /**
   * Update task status
   * @param {string} username - Username
   * @param {string} taskName - Task name
   * @param {string} newStatus - New status (e.g., 'done', 'in-progress')
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated task object
   */
  async updateStatus(username, taskName, newStatus, tenantId) {
    try {
      const updatedTask = await updateTaskStatus(username, taskName, newStatus, tenantId);
      return updatedTask;
    } catch (error) {
      this.handleError(error, 'update task status');
    }
  }

  /**
   * Update task notes
   * @param {string} taskId - Task ID
   * @param {Object} notesData - Notes data (assignerNotes, assignerPrivateNotes)
   * @param {string} userId - User ID making the update
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated task object
   */
  async updateNotes(taskId, notesData, userId, tenantId) {
    try {
      const updatedTask = await updateTaskNotes(taskId, notesData, userId, tenantId);
      return updatedTask;
    } catch (error) {
      this.handleError(error, 'update task notes');
    }
  }

  /**
   * Delete task
   * @param {string} taskId - Task ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<void>}
   */
  async delete(taskId, tenantId) {
    try {
      await deleteTask(taskId, tenantId);
    } catch (error) {
      this.handleError(error, 'delete task');
    }
  }

  /**
   * Add comment to task
   * @param {string} taskId - Task ID
   * @param {Object} commentData - Comment data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Added comment object
   */
  async addComment(taskId, commentData, tenantId) {
    try {
      const comment = await addTaskComment(taskId, commentData, tenantId);
      return comment;
    } catch (error) {
      this.handleError(error, 'add task comment');
    }
  }

  /**
   * Get task comments
   * @param {string} taskId - Task ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of comments
   */
  async getComments(taskId, tenantId) {
    try {
      const comments = await getTaskComments(taskId, tenantId);
      return comments || [];
    } catch (error) {
      this.handleError(error, 'get task comments');
    }
  }

  /**
   * Delete task comment
   * @param {string} taskId - Task ID
   * @param {string} commentId - Comment ID
   * @param {string} userId - User ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<void>}
   */
  async deleteComment(taskId, commentId, userId, tenantId) {
    try {
      await deleteTaskComment(taskId, commentId, userId, tenantId);
    } catch (error) {
      this.handleError(error, 'delete task comment');
    }
  }

  /**
   * Get task analytics
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(tenantId) {
    try {
      const analytics = await getTaskAnalytics(tenantId);
      return analytics || {};
    } catch (error) {
      this.handleError(error, 'get task analytics');
    }
  }

  /**
   * Count tasks by status for a user
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Count by status
   */
  async countByStatus(username, tenantId) {
    try {
      const tasks = await this.findByUser(username, tenantId);
      const counts = {
        total: tasks.length,
        pending: 0,
        'in-progress': 0,
        done: 0,
        overdue: 0
      };

      const today = new Date().toISOString().split('T')[0];

      tasks.forEach(task => {
        if (task.status) {
          counts[task.status] = (counts[task.status] || 0) + 1;
        }

        // Count overdue tasks
        if (task.status !== 'done' && task.deadline && task.deadline < today) {
          counts.overdue++;
        }
      });

      return counts;
    } catch (error) {
      this.handleError(error, 'count tasks by status');
    }
  }

  /**
   * Search tasks by term
   * @param {string} searchTerm - Search term
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} List of matching tasks
   */
  async search(searchTerm, filters = {}) {
    try {
      const tasks = await searchTasks(searchTerm, filters);
      return tasks || [];
    } catch (error) {
      this.handleError(error, 'search tasks');
    }
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
  async editComment(taskId, commentId, newContent, userId, tenantId) {
    try {
      const updatedComment = await editTaskComment(taskId, commentId, newContent, userId, tenantId);
      return updatedComment;
    } catch (error) {
      this.handleError(error, 'edit task comment');
    }
  }

  /**
   * Find overdue tasks
   * @param {string} username - Username (optional, if null returns all overdue tasks for tenant)
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of overdue tasks
   */
  async findOverdue(username = null, tenantId) {
    try {
      const today = new Date().toISOString().split('T')[0];

      let tasks;
      if (username) {
        tasks = await this.findByUser(username, tenantId);
      } else {
        tasks = await this.findByTenant(tenantId);
      }

      // Filter overdue tasks (not done and past deadline)
      return tasks.filter(task =>
        task.status !== 'done' &&
        task.deadline &&
        task.deadline < today
      );
    } catch (error) {
      this.handleError(error, 'find overdue tasks');
    }
  }

  /**
   * Check for duplicate tasks
   * @param {string} taskName - Task name to check
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<boolean>} True if duplicate exists
   */
  async checkDuplicates(taskName, username, tenantId) {
    try {
      const existing = await this.findByName(taskName, username, tenantId);
      return !!existing;
    } catch (error) {
      this.handleError(error, 'check duplicate tasks');
    }
  }

  /**
   * Bulk save tasks
   * @param {Array} tasksArray - Array of task objects
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} Array of created tasks
   */
  async bulkSave(tasksArray, tenantId) {
    try {
      if (!Array.isArray(tasksArray)) {
        throw new Error('Tasks must be an array');
      }

      const createdTasks = [];

      // Create each task sequentially
      for (const taskData of tasksArray) {
        const newTask = await this.create(taskData, tenantId);
        createdTasks.push(newTask);
      }

      return createdTasks;
    } catch (error) {
      this.handleError(error, 'bulk save tasks');
    }
  }

  /**
   * Find tasks by priority
   * @param {string} priority - Priority level (Low, Medium, High, Urgent)
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of tasks with specified priority
   */
  async findByPriority(priority, tenantId) {
    try {
      const allTasks = await this.findByTenant(tenantId);
      return allTasks.filter(task => task.priority === priority);
    } catch (error) {
      this.handleError(error, 'find tasks by priority');
    }
  }

  /**
   * Find tasks by status
   * @param {string} status - Task status
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of tasks with specified status
   */
  async findByStatus(status, tenantId) {
    try {
      const allTasks = await this.findByTenant(tenantId);
      return allTasks.filter(task => task.status === status);
    } catch (error) {
      this.handleError(error, 'find tasks by status');
    }
  }

  /**
   * Find tasks by assignee
   * @param {string} assignee - Assignee username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of tasks assigned to user
   */
  async findByAssignee(assignee, tenantId) {
    try {
      const allTasks = await this.findByTenant(tenantId);
      return allTasks.filter(task => task.assignee === assignee);
    } catch (error) {
      this.handleError(error, 'find tasks by assignee');
    }
  }

  /**
   * Find tasks due within specified days
   * @param {number} days - Number of days
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of tasks due soon
   */
  async findDueSoon(days = 7, tenantId) {
    try {
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);

      const todayStr = today.toISOString().split('T')[0];
      const futureDateStr = futureDate.toISOString().split('T')[0];

      const allTasks = await this.findByTenant(tenantId);

      return allTasks.filter(task =>
        task.status !== 'done' &&
        task.deadline &&
        task.deadline >= todayStr &&
        task.deadline <= futureDateStr
      );
    } catch (error) {
      this.handleError(error, 'find tasks due soon');
    }
  }
}

export default TaskRepository;
