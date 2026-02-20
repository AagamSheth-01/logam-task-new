// Date and time utilities
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch (error) {
    return dateString;
  }
};

export const formatDateTime = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    return dateString;
  }
};

export const formatRelativeTime = (dateString) => {
  if (!dateString) return '';
  
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMilliseconds = now - date;
    const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays > 1) return `${diffInDays} days ago`;
    if (diffInDays === -1) return 'Tomorrow';
    if (diffInDays < -1) return `In ${Math.abs(diffInDays)} days`;
    
    return formatDate(dateString);
  } catch (error) {
    return dateString;
  }
};

export const getDaysUntilDeadline = (deadline) => {
  if (!deadline) return null;
  
  try {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    deadlineDate.setHours(0, 0, 0, 0);
    
    const diffInMilliseconds = deadlineDate - today;
    const diffInDays = Math.ceil(diffInMilliseconds / (1000 * 60 * 60 * 24));
    
    return diffInDays;
  } catch (error) {
    return null;
  }
};

export const isOverdue = (deadline, status = 'pending') => {
  if (status === 'done' || !deadline) return false;
  
  const daysUntil = getDaysUntilDeadline(deadline);
  return daysUntil < 0;
};

// String utilities
export const truncateText = (text, maxLength = 50) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const capitalizeFirst = (str) => {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
};

// Array utilities
export const sortBy = (array, key, direction = 'asc') => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });
};

export const groupBy = (array, key) => {
  return array.reduce((groups, item) => {
    const group = item[key];
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
    return groups;
  }, {});
};

export const filterBy = (array, filters) => {
  return array.filter(item => {
    return Object.entries(filters).every(([key, value]) => {
      if (value === '' || value === null || value === undefined) return true;
      return item[key] === value;
    });
  });
};

// Task utilities
export const getTaskStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800',
    done: 'bg-green-100 text-green-800',
    overdue: 'bg-red-100 text-red-800',
    'in-progress': 'bg-blue-100 text-blue-800'
  };
  
  return colors[status] || 'bg-gray-100 text-gray-800';
};

export const getPriorityColor = (priority) => {
  const colors = {
    High: 'bg-red-100 text-red-800',
    Medium: 'bg-yellow-100 text-yellow-800',
    Low: 'bg-green-100 text-green-800'
  };
  
  return colors[priority] || 'bg-gray-100 text-gray-800';
};

export const getTaskProgress = (tasks) => {
  if (!tasks || tasks.length === 0) return 0;
  
  const completed = tasks.filter(task => task.status === 'done').length;
  return Math.round((completed / tasks.length) * 100);
};

export const calculateTimeSpent = (startDate, endDate) => {
  if (!startDate || !endDate) return '';
  
  try {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffInMilliseconds = end - start;
    
    const days = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffInMilliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffInMilliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (days > 0) {
      return `${days} days, ${hours}:${minutes.toString().padStart(2, '0')}:00`;
    } else {
      return `${hours}:${minutes.toString().padStart(2, '0')}:00`;
    }
  } catch (error) {
    return '';
  }
};

// Validation utilities
export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password) => {
  // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validateRequired = (value) => {
  return value !== null && value !== undefined && value.toString().trim() !== '';
};

// Local storage utilities (client-side only)
export const getFromStorage = (key, defaultValue = null) => {
  if (typeof window === 'undefined') return defaultValue;
  
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error getting from storage:', error);
    return defaultValue;
  }
};

export const setToStorage = (key, value) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error setting to storage:', error);
  }
};

export const removeFromStorage = (key) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from storage:', error);
  }
};

// URL utilities
export const getBaseURL = () => {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  
  return process.env.NEXTAUTH_URL || 'http://localhost:3000';
};

export const buildApiURL = (endpoint) => {
  const baseURL = getBaseURL();
  return `${baseURL}/api${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
};

// Error handling utilities
export const handleAPIError = (error) => {
  console.error('API Error:', error);
  
  if (error.response) {
    // Server responded with error status
    return {
      success: false,
      message: error.response.data?.message || 'Server error occurred',
      status: error.response.status
    };
  } else if (error.request) {
    // Request was made but no response received
    return {
      success: false,
      message: 'Network error - please check your connection',
      status: 0
    };
  } else {
    // Something else happened
    return {
      success: false,
      message: error.message || 'An unexpected error occurred',
      status: 500
    };
  }
};

// Performance utilities
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

export const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Export utilities
export const downloadCSV = (data, filename) => {
  const csvContent = data.map(row => row.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

export const downloadJSON = (data, filename) => {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};

// Random utilities
export const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};

export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Class name utilities (for conditional styling)
export const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};