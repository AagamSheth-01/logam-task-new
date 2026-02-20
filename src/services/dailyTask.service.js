/**
 * DailyTask Service
 * Contains business logic for daily task management
 * Uses DailyTaskRepository for data access
 */

import { DailyTaskRepository } from '../repositories/dailyTask.repository.js';
import { DailyTaskModel } from '../models/dailyTask.model.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';

export class DailyTaskService {
  constructor() {
    this.dailyTaskRepository = new DailyTaskRepository();
  }

  /**
   * Get all daily tasks for a tenant
   * @param {string} tenantId - Organization ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} List of daily tasks
   */
  async getDailyTasksByTenant(tenantId, filters = {}) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const allFilters = { ...filters, tenantId };
    const dailyTasks = await this.dailyTaskRepository.findAll(allFilters);

    return dailyTasks.map(task => new DailyTaskModel(task).toObject());
  }

  /**
   * Get daily tasks by username
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of daily tasks
   */
  async getDailyTasksByUsername(username, tenantId) {
    if (!username || !tenantId) {
      throw new ValidationError('Username and tenant ID are required');
    }

    const dailyTasks = await this.dailyTaskRepository.findByUsername(username, tenantId);
    return dailyTasks.map(task => new DailyTaskModel(task).toObject());
  }

  /**
   * Get daily task for specific user and date
   * @param {string} username - Username
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object|null>} Daily task object or null
   */
  async getDailyTask(username, date, tenantId) {
    if (!username || !date || !tenantId) {
      throw new ValidationError('Username, date, and tenant ID are required');
    }

    // Validate date format
    if (!DailyTaskModel.isValidDateFormat(date)) {
      throw new ValidationError('Invalid date format. Must be YYYY-MM-DD');
    }

    const dailyTask = await this.dailyTaskRepository.findByUsernameAndDate(username, date, tenantId);

    if (!dailyTask) return null;

    return new DailyTaskModel(dailyTask).toObject();
  }

  /**
   * Get daily tasks by date
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of daily tasks for the date
   */
  async getDailyTasksByDate(date, tenantId) {
    if (!date || !tenantId) {
      throw new ValidationError('Date and tenant ID are required');
    }

    // Validate date format
    if (!DailyTaskModel.isValidDateFormat(date)) {
      throw new ValidationError('Invalid date format. Must be YYYY-MM-DD');
    }

    const dailyTasks = await this.dailyTaskRepository.findByDate(date, tenantId);
    return dailyTasks.map(task => new DailyTaskModel(task).toObject());
  }

  /**
   * Get daily tasks by date range
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of daily tasks in the date range
   */
  async getDailyTasksByDateRange(startDate, endDate, tenantId) {
    if (!startDate || !endDate || !tenantId) {
      throw new ValidationError('Start date, end date, and tenant ID are required');
    }

    // Validate date formats
    if (!DailyTaskModel.isValidDateFormat(startDate) || !DailyTaskModel.isValidDateFormat(endDate)) {
      throw new ValidationError('Invalid date format. Must be YYYY-MM-DD');
    }

    // Validate date range
    if (startDate > endDate) {
      throw new ValidationError('Start date must be before or equal to end date');
    }

    const dailyTasks = await this.dailyTaskRepository.findByDateRange(startDate, endDate, tenantId);
    return dailyTasks.map(task => new DailyTaskModel(task).toObject());
  }

  /**
   * Create or update daily task entry
   * @param {Object} dailyTaskData - Daily task data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created/updated daily task object
   */
  async createDailyTask(dailyTaskData, tenantId) {
    // Validate input data
    const validation = DailyTaskModel.validate({ ...dailyTaskData, tenantId });
    if (!validation.isValid) {
      throw new ValidationError('Invalid daily task data', validation.errors);
    }

    // Validate each task in the tasks array
    if (dailyTaskData.tasks && Array.isArray(dailyTaskData.tasks)) {
      for (let i = 0; i < dailyTaskData.tasks.length; i++) {
        const taskValidation = DailyTaskModel.validateTask(dailyTaskData.tasks[i]);
        if (!taskValidation.isValid) {
          throw new ValidationError(`Invalid task at index ${i}`, taskValidation.errors);
        }
      }
    }

    // Auto-calculate total hours if not provided
    if (!dailyTaskData.totalHours && dailyTaskData.tasks) {
      dailyTaskData.totalHours = DailyTaskModel.calculateTotalHours(dailyTaskData.tasks);
    }

    // Check if daily task already exists for this user and date
    const existingTask = await this.dailyTaskRepository.findByUsernameAndDate(
      dailyTaskData.username,
      dailyTaskData.date,
      tenantId
    );

    if (existingTask) {
      throw new ConflictError(
        `Daily task already exists for ${dailyTaskData.username} on ${dailyTaskData.date}. Use update instead.`
      );
    }

    // Create daily task model
    const dailyTaskModel = new DailyTaskModel({
      ...dailyTaskData,
      tenantId
    });

    // Save to database
    const newDailyTask = await this.dailyTaskRepository.create(dailyTaskModel.toObject(), tenantId);

    return new DailyTaskModel(newDailyTask).toObject();
  }

  /**
   * Delete daily task entry
   * @param {string} username - Username
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} tenantId - Organization ID
   * @returns {Promise<void>}
   */
  async deleteDailyTask(username, date, tenantId) {
    if (!username || !date || !tenantId) {
      throw new ValidationError('Username, date, and tenant ID are required');
    }

    // Validate date format
    if (!DailyTaskModel.isValidDateFormat(date)) {
      throw new ValidationError('Invalid date format. Must be YYYY-MM-DD');
    }

    // Check if daily task exists
    const existingTask = await this.dailyTaskRepository.findByUsernameAndDate(username, date, tenantId);
    if (!existingTask) {
      throw new NotFoundError(`Daily task not found for ${username} on ${date}`);
    }

    await this.dailyTaskRepository.delete(username, date, tenantId);
  }

  /**
   * Get daily task analytics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Analytics data
   */
  async getDailyTaskAnalytics(filters = {}) {
    const analytics = await this.dailyTaskRepository.getAnalytics(filters);
    return analytics;
  }

  /**
   * Get user summary for date range
   * @param {string} username - Username
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Summary data
   */
  async getUserSummary(username, startDate, endDate, tenantId) {
    if (!username || !startDate || !endDate || !tenantId) {
      throw new ValidationError('Username, start date, end date, and tenant ID are required');
    }

    // Validate date formats
    if (!DailyTaskModel.isValidDateFormat(startDate) || !DailyTaskModel.isValidDateFormat(endDate)) {
      throw new ValidationError('Invalid date format. Must be YYYY-MM-DD');
    }

    // Validate date range
    if (startDate > endDate) {
      throw new ValidationError('Start date must be before or equal to end date');
    }

    const summary = await this.dailyTaskRepository.getUserSummary(username, startDate, endDate, tenantId);
    return summary;
  }

  /**
   * Get monthly summary for user
   * @param {string} username - Username
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Monthly summary
   */
  async getMonthlySummary(username, year, month, tenantId) {
    if (!username || !year || !month || !tenantId) {
      throw new ValidationError('Username, year, month, and tenant ID are required');
    }

    // Validate year and month
    if (year < 2000 || year > 2100) {
      throw new ValidationError('Invalid year. Must be between 2000 and 2100');
    }

    if (month < 1 || month > 12) {
      throw new ValidationError('Invalid month. Must be between 1 and 12');
    }

    const summary = await this.dailyTaskRepository.getMonthlySummary(username, year, month, tenantId);
    return summary;
  }

  /**
   * Get recent daily tasks for user
   * @param {string} username - Username
   * @param {number} limit - Number of recent tasks to retrieve
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} Recent daily tasks
   */
  async getRecentDailyTasks(username, limit = 10, tenantId) {
    if (!username || !tenantId) {
      throw new ValidationError('Username and tenant ID are required');
    }

    if (limit < 1 || limit > 100) {
      throw new ValidationError('Limit must be between 1 and 100');
    }

    const dailyTasks = await this.dailyTaskRepository.getRecentByUsername(username, limit, tenantId);
    return dailyTasks.map(task => new DailyTaskModel(task).toObject());
  }

  /**
   * Get all users' daily tasks (admin function)
   * @param {string} tenantId - Organization ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} List of all users' daily tasks
   */
  async getAllUsersDailyTasks(tenantId, filters = {}) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const allFilters = { ...filters, tenantId };
    const dailyTasks = await this.dailyTaskRepository.findAllUsersTasks(allFilters);

    return dailyTasks.map(task => new DailyTaskModel(task).toObject());
  }

  /**
   * Check if daily task exists
   * @param {string} username - Username
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} tenantId - Organization ID
   * @returns {Promise<boolean>} True if exists
   */
  async dailyTaskExists(username, date, tenantId) {
    if (!username || !date || !tenantId) {
      throw new ValidationError('Username, date, and tenant ID are required');
    }

    // Validate date format
    if (!DailyTaskModel.isValidDateFormat(date)) {
      throw new ValidationError('Invalid date format. Must be YYYY-MM-DD');
    }

    return await this.dailyTaskRepository.exists(username, date, tenantId);
  }

  /**
   * Get daily task count for tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<number>} Daily task count
   */
  async getDailyTaskCount(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    return await this.dailyTaskRepository.countByTenant(tenantId);
  }

  /**
   * Get daily task count for user
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<number>} Daily task count
   */
  async getUserDailyTaskCount(username, tenantId) {
    if (!username || !tenantId) {
      throw new ValidationError('Username and tenant ID are required');
    }

    return await this.dailyTaskRepository.countByUsername(username, tenantId);
  }

  /**
   * Get today's date in proper format
   * @returns {string} Today's date in YYYY-MM-DD format
   */
  getTodayDate() {
    return DailyTaskModel.getTodayDate();
  }

  /**
   * Validate daily task data
   * @param {Object} dailyTaskData - Daily task data to validate
   * @param {boolean} isUpdate - True if validating an update
   * @returns {Object} Validation result
   */
  validateDailyTaskData(dailyTaskData, isUpdate = false) {
    return DailyTaskModel.validate(dailyTaskData, isUpdate);
  }
}

export default DailyTaskService;
