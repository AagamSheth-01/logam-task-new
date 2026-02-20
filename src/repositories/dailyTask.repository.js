/**
 * DailyTask Repository
 * Handles data access for daily task operations
 * Wraps firebaseService functions for daily tasks
 */

import { BaseRepository } from './base.repository.js';
import {
  addDailyTask,
  getDailyTasks,
  getAllUsersDailyTasks,
  deleteDailyTask,
  getDailyTaskAnalytics
} from '../../lib/firebaseService.js';

export class DailyTaskRepository extends BaseRepository {
  constructor() {
    super('dailyTasks');
  }

  /**
   * Create a new daily task entry
   * @param {Object} dailyTaskData - Daily task data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created daily task object
   */
  async create(dailyTaskData, tenantId) {
    const newDailyTask = await addDailyTask(dailyTaskData, tenantId);
    return newDailyTask;
  }

  /**
   * Get daily tasks with optional filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of daily tasks
   */
  async findAll(filters = {}) {
    const dailyTasks = await getDailyTasks(filters);
    return dailyTasks || [];
  }

  /**
   * Get daily tasks by tenant ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of daily tasks
   */
  async findByTenant(tenantId) {
    const dailyTasks = await getDailyTasks({ tenantId });
    return dailyTasks || [];
  }

  /**
   * Get daily tasks by username
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<Array>} List of daily tasks for the user
   */
  async findByUsername(username, tenantId = null) {
    const filters = { username };
    if (tenantId) {
      filters.tenantId = tenantId;
    }
    const dailyTasks = await getDailyTasks(filters);
    return dailyTasks || [];
  }

  /**
   * Get daily task by username and date
   * @param {string} username - Username
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<Object|null>} Daily task object or null
   */
  async findByUsernameAndDate(username, date, tenantId = null) {
    const filters = { username, date };
    if (tenantId) {
      filters.tenantId = tenantId;
    }
    const dailyTasks = await getDailyTasks(filters);

    // Return the first matching task (should only be one per user per day)
    return dailyTasks && dailyTasks.length > 0 ? dailyTasks[0] : null;
  }

  /**
   * Get daily tasks by date
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<Array>} List of daily tasks for the date
   */
  async findByDate(date, tenantId = null) {
    const filters = { date };
    if (tenantId) {
      filters.tenantId = tenantId;
    }
    const dailyTasks = await getDailyTasks(filters);
    return dailyTasks || [];
  }

  /**
   * Get daily tasks by date range
   * @param {string} startDate - Start date in YYYY-MM-DD format
   * @param {string} endDate - End date in YYYY-MM-DD format
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<Array>} List of daily tasks in the date range
   */
  async findByDateRange(startDate, endDate, tenantId = null) {
    const filters = { startDate, endDate };
    if (tenantId) {
      filters.tenantId = tenantId;
    }
    const dailyTasks = await getDailyTasks(filters);
    return dailyTasks || [];
  }

  /**
   * Get daily tasks for all users (admin function)
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of all users' daily tasks
   */
  async findAllUsersTasks(filters = {}) {
    const result = await getAllUsersDailyTasks(filters);
    // Handle the case where getAllUsersDailyTasks returns an object with dailyTasks property
    if (result && typeof result === 'object' && result.dailyTasks) {
      return result.dailyTasks || [];
    }
    // Fallback for when it returns an array directly
    return result || [];
  }

  /**
   * Delete daily task entry
   * @param {string} username - Username
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<Object>} Delete result
   */
  async delete(username, date, tenantId = null) {
    const result = await deleteDailyTask(username, date, tenantId);
    return result;
  }

  /**
   * Get daily task analytics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(filters = {}) {
    const analytics = await getDailyTaskAnalytics(filters);
    return analytics || {
      totalTasks: 0,
      totalHours: 0,
      byUser: {},
      byDate: {},
      averageHoursPerDay: 0
    };
  }

  /**
   * Get daily task summary for user in date range
   * @param {string} username - Username
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<Object>} Summary data
   */
  async getUserSummary(username, startDate, endDate, tenantId = null) {
    const dailyTasks = await this.findByDateRange(startDate, endDate, tenantId);

    // Filter by username
    const userTasks = dailyTasks.filter(task => task.username === username);

    // Calculate summary
    const summary = {
      username,
      startDate,
      endDate,
      totalDays: userTasks.length,
      totalHours: 0,
      totalTasks: 0,
      averageHoursPerDay: 0,
      tasks: userTasks
    };

    userTasks.forEach(dayTask => {
      summary.totalHours += dayTask.totalHours || 0;
      summary.totalTasks += dayTask.tasks ? dayTask.tasks.length : 0;
    });

    if (summary.totalDays > 0) {
      summary.averageHoursPerDay = Math.round((summary.totalHours / summary.totalDays) * 100) / 100;
    }

    return summary;
  }

  /**
   * Get monthly summary for user
   * @param {string} username - Username
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<Object>} Monthly summary
   */
  async getMonthlySummary(username, year, month, tenantId = null) {
    // Create start and end dates for the month
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

    // Calculate last day of month
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    return await this.getUserSummary(username, startDate, endDate, tenantId);
  }

  /**
   * Check if daily task exists for user and date
   * @param {string} username - Username
   * @param {string} date - Date in YYYY-MM-DD format
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<boolean>} True if exists
   */
  async exists(username, date, tenantId = null) {
    const existing = await this.findByUsernameAndDate(username, date, tenantId);
    return existing !== null;
  }

  /**
   * Get recent daily tasks for user
   * @param {string} username - Username
   * @param {number} limit - Number of recent tasks to retrieve
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<Array>} Recent daily tasks
   */
  async getRecentByUsername(username, limit = 10, tenantId = null) {
    const dailyTasks = await this.findByUsername(username, tenantId);

    // Sort by date descending
    return dailyTasks
      .sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateB - dateA;
      })
      .slice(0, limit);
  }

  /**
   * Get count of daily tasks for tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<number>} Daily task count
   */
  async countByTenant(tenantId) {
    const dailyTasks = await this.findByTenant(tenantId);
    return dailyTasks.length;
  }

  /**
   * Get count of daily tasks for user
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<number>} Daily task count
   */
  async countByUsername(username, tenantId = null) {
    const dailyTasks = await this.findByUsername(username, tenantId);
    return dailyTasks.length;
  }
}

export default DailyTaskRepository;
