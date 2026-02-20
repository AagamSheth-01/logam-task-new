/**
 * DailyTask Model
 * Represents a daily task log entry in the system
 */

export class DailyTaskModel {
  constructor(data) {
    this.id = data.id || null;
    this.tenantId = data.tenantId;
    this.username = data.username; // Username (for backward compatibility)
    this.user_id = data.user_id || null; // User ID (permanent reference)
    this.date = data.date; // Date in YYYY-MM-DD format
    this.tasks = data.tasks || []; // Array of task objects
    this.totalHours = data.totalHours || 0;
    this.notes = data.notes || '';
    this.submittedBy = data.submittedBy || data.username; // Username (for backward compatibility)
    this.submitted_by_id = data.submitted_by_id || null; // User ID (permanent reference)
    this.submittedAt = data.submittedAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.metadata = data.metadata || {};
  }

  /**
   * Convert model to plain object
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      username: this.username,
      user_id: this.user_id,
      date: this.date,
      tasks: this.tasks,
      totalHours: this.totalHours,
      notes: this.notes,
      submittedBy: this.submittedBy,
      submitted_by_id: this.submitted_by_id,
      submittedAt: this.submittedAt,
      updatedAt: this.updatedAt,
      metadata: this.metadata
    };
  }

  /**
   * Get task count
   * @returns {number} Number of tasks
   */
  getTaskCount() {
    return this.tasks ? this.tasks.length : 0;
  }

  /**
   * Calculate average hours per task
   * @returns {number} Average hours per task
   */
  getAverageHoursPerTask() {
    const taskCount = this.getTaskCount();
    if (taskCount === 0) return 0;
    return Math.round((this.totalHours / taskCount) * 100) / 100;
  }

  /**
   * Check if task is for today
   * @returns {boolean} True if task date is today
   */
  isToday() {
    if (!this.date) return false;
    const today = new Date().toISOString().split('T')[0];
    return this.date === today;
  }

  /**
   * Check if task is in the past
   * @returns {boolean} True if task date is in the past
   */
  isPast() {
    if (!this.date) return false;
    const today = new Date().toISOString().split('T')[0];
    return this.date < today;
  }

  /**
   * Get formatted date
   * @returns {string} Formatted date string
   */
  getFormattedDate() {
    if (!this.date) return '';

    try {
      const dateObj = new Date(this.date + 'T00:00:00');
      return dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      return this.date;
    }
  }

  /**
   * Get day of week
   * @returns {string} Day of week (e.g., "Monday")
   */
  getDayOfWeek() {
    if (!this.date) return '';

    try {
      const dateObj = new Date(this.date + 'T00:00:00');
      return dateObj.toLocaleDateString('en-US', { weekday: 'long' });
    } catch (error) {
      return '';
    }
  }

  /**
   * Validate daily task data
   * @param {Object} data - Daily task data to validate
   * @param {boolean} isUpdate - True if validating an update
   * @returns {Object} Validation result {isValid: boolean, errors: Array}
   */
  static validate(data, isUpdate = false) {
    const errors = [];

    // Required fields for new daily tasks
    if (!isUpdate) {
      if (!data.tenantId) {
        errors.push({ field: 'tenantId', message: 'Tenant ID is required' });
      }
      if (!data.username || !data.username.trim()) {
        errors.push({ field: 'username', message: 'Username is required' });
      }
      if (!data.date || !data.date.trim()) {
        errors.push({ field: 'date', message: 'Date is required' });
      }
    }

    // Validate date format (YYYY-MM-DD)
    if (data.date && !this.isValidDateFormat(data.date)) {
      errors.push({
        field: 'date',
        message: 'Invalid date format. Must be YYYY-MM-DD'
      });
    }

    // Validate tasks array
    if (data.tasks !== undefined) {
      if (!Array.isArray(data.tasks)) {
        errors.push({ field: 'tasks', message: 'Tasks must be an array' });
      } else {
        // Validate each task
        data.tasks.forEach((task, index) => {
          if (!task || typeof task !== 'object') {
            errors.push({
              field: `tasks[${index}]`,
              message: 'Each task must be an object'
            });
          }
        });
      }
    }

    // Validate totalHours
    if (data.totalHours !== undefined) {
      if (typeof data.totalHours !== 'number' || data.totalHours < 0) {
        errors.push({
          field: 'totalHours',
          message: 'Total hours must be a non-negative number'
        });
      }

      if (data.totalHours > 24) {
        errors.push({
          field: 'totalHours',
          message: 'Total hours cannot exceed 24 hours per day'
        });
      }
    }

    // Validate metadata (must be object)
    if (data.metadata && typeof data.metadata !== 'object') {
      errors.push({ field: 'metadata', message: 'Metadata must be an object' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if date string is valid YYYY-MM-DD format
   * @param {string} dateString - Date string to validate
   * @returns {boolean} True if valid
   */
  static isValidDateFormat(dateString) {
    // Check format YYYY-MM-DD
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) {
      return false;
    }

    // Check if date is valid
    try {
      const dateObj = new Date(dateString + 'T00:00:00');
      const [year, month, day] = dateString.split('-').map(Number);

      return (
        dateObj.getFullYear() === year &&
        dateObj.getMonth() === month - 1 &&
        dateObj.getDate() === day
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Get today's date in YYYY-MM-DD format
   * @returns {string} Today's date
   */
  static getTodayDate() {
    return new Date().toISOString().split('T')[0];
  }

  /**
   * Parse task array to calculate total hours
   * @param {Array} tasks - Tasks array
   * @returns {number} Total hours
   */
  static calculateTotalHours(tasks) {
    if (!tasks || !Array.isArray(tasks)) return 0;

    return tasks.reduce((total, task) => {
      const hours = parseFloat(task.hours) || 0;
      return total + hours;
    }, 0);
  }

  /**
   * Validate task object structure
   * @param {Object} task - Task object to validate
   * @returns {Object} Validation result
   */
  static validateTask(task) {
    const errors = [];

    if (!task || typeof task !== 'object') {
      errors.push({ field: 'task', message: 'Task must be an object' });
      return { isValid: false, errors };
    }

    // Common task fields that should be validated
    if (task.hours !== undefined) {
      const hours = parseFloat(task.hours);
      if (isNaN(hours) || hours < 0) {
        errors.push({ field: 'hours', message: 'Hours must be a non-negative number' });
      }
      if (hours > 24) {
        errors.push({ field: 'hours', message: 'Hours cannot exceed 24' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default DailyTaskModel;
