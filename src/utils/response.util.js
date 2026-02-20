/**
 * Standardized API Response Utilities
 * Provides consistent response format across all endpoints
 */

/**
 * Success response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code (default: 200)
 */
export const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Error response
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 * @param {*} errors - Validation errors or additional error details
 */
export const errorResponse = (res, message = 'An error occurred', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message,
    timestamp: new Date().toISOString()
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * Validation error response
 * @param {Object} res - Express response object
 * @param {Array} errors - Array of validation errors
 */
export const validationErrorResponse = (res, errors) => {
  return errorResponse(res, 'Validation failed', 400, errors);
};

/**
 * Not found response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name (e.g., 'User', 'Task')
 */
export const notFoundResponse = (res, resource = 'Resource') => {
  return errorResponse(res, `${resource} not found`, 404);
};

/**
 * Unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Custom message
 */
export const unauthorizedResponse = (res, message = 'Unauthorized access') => {
  return errorResponse(res, message, 401);
};

/**
 * Forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Custom message
 */
export const forbiddenResponse = (res, message = 'Access forbidden') => {
  return errorResponse(res, message, 403);
};

/**
 * Paginated response
 * @param {Object} res - Express response object
 * @param {Array} data - Array of items
 * @param {Object} pagination - Pagination metadata
 */
export const paginatedResponse = (res, data, pagination) => {
  return res.status(200).json({
    success: true,
    data,
    pagination: {
      page: pagination.page || 1,
      pageSize: pagination.pageSize || 30,
      totalItems: pagination.totalItems || data.length,
      totalPages: pagination.totalPages || Math.ceil((pagination.totalItems || data.length) / (pagination.pageSize || 30)),
      hasMore: pagination.hasMore || false
    },
    timestamp: new Date().toISOString()
  });
};
