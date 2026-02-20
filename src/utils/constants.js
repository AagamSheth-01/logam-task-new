/**
 * Application Constants
 * Centralized location for all application constants
 */

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  SUPER_ADMIN: 'super_admin'
};

// Task Status
export const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  DONE: 'done',
  CANCELLED: 'cancelled'
};

// Task Priority
export const TASK_PRIORITY = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  URGENT: 'Urgent'
};

// Attendance Status
export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  ABSENT: 'absent',
  HALF_DAY: 'half-day',
  LEAVE: 'leave'
};

// Work Type
export const WORK_TYPE = {
  OFFICE: 'office',
  WFH: 'wfh',
  REMOTE: 'remote'
};

// Organization Status
export const ORGANIZATION_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  TRIAL: 'trial',
  SUSPENDED: 'suspended'
};

// Subscription Plans
export const SUBSCRIPTION_PLANS = {
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise'
};

// Plan Configurations
export const PLAN_CONFIGS = {
  starter: {
    maxUsers: 10,
    maxStorage: 5 * 1024 * 1024 * 1024, // 5GB in bytes
    features: ['basic-tasks', 'attendance', 'reports']
  },
  professional: {
    maxUsers: 50,
    maxStorage: 50 * 1024 * 1024 * 1024, // 50GB in bytes
    features: ['basic-tasks', 'attendance', 'reports', 'advanced-analytics', 'integrations']
  },
  enterprise: {
    maxUsers: -1, // unlimited
    maxStorage: -1, // unlimited
    features: ['basic-tasks', 'attendance', 'reports', 'advanced-analytics', 'integrations', 'custom-branding', 'priority-support']
  }
};

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500
};

// Error Messages
export const ERROR_MESSAGES = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid username or password',
  UNAUTHORIZED: 'Unauthorized access',
  TOKEN_EXPIRED: 'Token has expired',
  TOKEN_INVALID: 'Invalid token',

  // User
  USER_NOT_FOUND: 'User not found',
  USER_ALREADY_EXISTS: 'User already exists',
  USERNAME_TAKEN: 'Username is already taken',
  EMAIL_TAKEN: 'Email is already taken',

  // Organization
  ORGANIZATION_NOT_FOUND: 'Organization not found',
  ORGANIZATION_ALREADY_EXISTS: 'Organization already exists',

  // Task
  TASK_NOT_FOUND: 'Task not found',
  TASK_ALREADY_COMPLETED: 'Task is already completed',

  // Attendance
  ATTENDANCE_NOT_FOUND: 'Attendance record not found',
  ATTENDANCE_ALREADY_MARKED: 'Attendance already marked for today',

  // Validation
  VALIDATION_ERROR: 'Validation failed',
  REQUIRED_FIELD: 'This field is required',
  INVALID_FORMAT: 'Invalid format',

  // Generic
  SOMETHING_WENT_WRONG: 'Something went wrong',
  OPERATION_FAILED: 'Operation failed'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  // User
  USER_CREATED: 'User created successfully',
  USER_UPDATED: 'User updated successfully',
  USER_DELETED: 'User deleted successfully',

  // Task
  TASK_CREATED: 'Task created successfully',
  TASK_UPDATED: 'Task updated successfully',
  TASK_DELETED: 'Task deleted successfully',
  TASK_COMPLETED: 'Task marked as completed',

  // Attendance
  ATTENDANCE_MARKED: 'Attendance marked successfully',
  ATTENDANCE_UPDATED: 'Attendance updated successfully',
  CLOCK_OUT_SUCCESS: 'Clocked out successfully',

  // Organization
  ORGANIZATION_CREATED: 'Organization created successfully',
  ORGANIZATION_UPDATED: 'Organization updated successfully',

  // Generic
  OPERATION_SUCCESS: 'Operation completed successfully'
};

// Pagination Defaults
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 30,
  MAX_PAGE_SIZE: 100
};

// Date Formats
export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  DISPLAY: 'MMM DD, YYYY',
  DATETIME: 'YYYY-MM-DD HH:mm:ss',
  TIME: 'HH:mm'
};

// Regular Expressions
export const REGEX = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[0-9]{10}$/,
  USERNAME: /^[a-zA-Z0-9_-]{3,20}$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/
};
