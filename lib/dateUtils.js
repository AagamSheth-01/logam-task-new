// Date utility functions for the Task Manager

/**
 * Validates if a date string or Date object is valid
 * @param {string|Date} date - The date to validate
 * @returns {boolean} - True if valid, false otherwise
 */
export const isValidDate = (date) => {
  if (!date) return false;
  
  try {
    const dateObj = new Date(date);
    return !isNaN(dateObj.getTime());
  } catch (error) {
    return false;
  }
};

/**
 * Safely converts a date to ISO string format (YYYY-MM-DD)
 * @param {string|Date} date - The date to convert
 * @returns {string|null} - ISO date string or null if invalid
 */
export const toISODateString = (date) => {
  if (!isValidDate(date)) return null;
  
  try {
    return new Date(date).toISOString().split('T')[0];
  } catch (error) {
    console.warn('Error converting date to ISO string:', error);
    return null;
  }
};

/**
 * Safely formats a date for display
 * @param {string|Date} date - The date to format
 * @param {object} options - Intl.DateTimeFormat options
 * @returns {string} - Formatted date string or 'Invalid Date'
 */
export const formatDate = (date, options = {}) => {
  if (!isValidDate(date)) return 'Invalid Date';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  try {
    return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
  } catch (error) {
    console.warn('Error formatting date:', error);
    return 'Invalid Date';
  }
};

/**
 * Checks if a task is overdue
 * @param {object} task - Task object with deadline property
 * @returns {boolean} - True if overdue, false otherwise
 */
export const isTaskOverdue = (task) => {
  if (!task || !task.deadline || task.status === 'done') return false;
  
  if (!isValidDate(task.deadline)) {
    console.warn(`Invalid deadline for task: ${task.task}`, task.deadline);
    return false;
  }
  
  try {
    const deadline = new Date(task.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today
    
    return deadline < today;
  } catch (error) {
    console.warn(`Error checking if task is overdue: ${task.task}`, error);
    return false;
  }
};

/**
 * Gets tasks for a specific date
 * @param {Array} tasks - Array of task objects
 * @param {Date} targetDate - The date to filter by
 * @returns {Array} - Tasks for the specified date
 */
export const getTasksForDate = (tasks, targetDate) => {
  if (!Array.isArray(tasks) || !isValidDate(targetDate)) return [];
  
  const targetDateStr = toISODateString(targetDate);
  if (!targetDateStr) return [];
  
  return tasks.filter(task => {
    if (!task || !task.deadline) return false;
    
    const taskDateStr = toISODateString(task.deadline);
    return taskDateStr === targetDateStr;
  });
};

/**
 * Calculates the number of days between two dates
 * @param {string|Date} date1 - First date
 * @param {string|Date} date2 - Second date
 * @returns {number|null} - Number of days or null if invalid dates
 */
export const daysBetween = (date1, date2) => {
  if (!isValidDate(date1) || !isValidDate(date2)) return null;
  
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    
    // Reset time to avoid time zone issues
    d1.setHours(0, 0, 0, 0);
    d2.setHours(0, 0, 0, 0);
    
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  } catch (error) {
    console.warn('Error calculating days between dates:', error);
    return null;
  }
};

/**
 * Gets the relative time string (e.g., "2 days ago", "in 3 days")
 * @param {string|Date} date - The date to compare
 * @returns {string} - Relative time string
 */
export const getRelativeTime = (date) => {
  if (!isValidDate(date)) return 'Invalid date';
  
  try {
    const targetDate = new Date(date);
    const now = new Date();
    const diffMs = targetDate - now;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    
    if (Math.abs(diffDays) > 0) {
      return diffDays > 0 ? `in ${diffDays} day${diffDays > 1 ? 's' : ''}` : `${Math.abs(diffDays)} day${Math.abs(diffDays) > 1 ? 's' : ''} ago`;
    } else if (Math.abs(diffHours) > 0) {
      return diffHours > 0 ? `in ${diffHours} hour${diffHours > 1 ? 's' : ''}` : `${Math.abs(diffHours)} hour${Math.abs(diffHours) > 1 ? 's' : ''} ago`;
    } else if (Math.abs(diffMinutes) > 5) {
      return diffMinutes > 0 ? `in ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}` : `${Math.abs(diffMinutes)} minute${Math.abs(diffMinutes) > 1 ? 's' : ''} ago`;
    } else {
      return 'Just now';
    }
  } catch (error) {
    console.warn('Error calculating relative time:', error);
    return 'Invalid date';
  }
};

/**
 * Validates and normalizes a date input for forms
 * @param {string} dateInput - Date input from form
 * @returns {object} - { isValid: boolean, date: Date|null, formatted: string }
 */
export const validateDateInput = (dateInput) => {
  if (!dateInput || typeof dateInput !== 'string') {
    return { isValid: false, date: null, formatted: '' };
  }
  
  try {
    const date = new Date(dateInput);
    const isValid = !isNaN(date.getTime());
    
    return {
      isValid,
      date: isValid ? date : null,
      formatted: isValid ? toISODateString(date) : ''
    };
  } catch (error) {
    return { isValid: false, date: null, formatted: '' };
  }
};

/**
 * Gets the start and end of a week for a given date
 * @param {Date} date - The date within the week
 * @returns {object} - { start: Date, end: Date }
 */
export const getWeekBounds = (date) => {
  if (!isValidDate(date)) return null;
  
  try {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Sunday is 0
    
    const start = new Date(d.setDate(diff));
    const end = new Date(d.setDate(diff + 6));
    
    return { start, end };
  } catch (error) {
    console.warn('Error getting week bounds:', error);
    return null;
  }
};

/**
 * Generates an array of dates for a calendar month view
 * @param {Date} date - Any date within the target month
 * @returns {Array} - Array of Date objects for calendar display
 */
export const getCalendarDates = (date) => {
  if (!isValidDate(date)) return [];
  
  try {
    const currentDate = new Date(date);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the Sunday of the week containing the first day
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // End at the Saturday of the week containing the last day
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    const dates = [];
    const currentDateIter = new Date(startDate);
    
    while (currentDateIter <= endDate) {
      dates.push(new Date(currentDateIter));
      currentDateIter.setDate(currentDateIter.getDate() + 1);
    }
    
    return dates;
  } catch (error) {
    console.warn('Error generating calendar dates:', error);
    return [];
  }
};