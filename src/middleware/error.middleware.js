/**
 * Error Handling Middleware
 * Catches and formats errors for API responses
 */

import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError
} from '../utils/errors.js';
import { errorResponse } from '../utils/response.util.js';

/**
 * Error handler middleware
 * Wraps async route handlers and catches errors
 */
export const asyncHandler = (handler) => {
  return async (req, res) => {
    try {
      return await handler(req, res);
    } catch (error) {
      return handleError(error, req, res);
    }
  };
};

/**
 * Handle errors and send appropriate response
 */
export const handleError = (error, req, res) => {
  // Log error for debugging
  console.error('API Error:', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    path: req.url,
    method: req.method
  });

  // Handle operational errors
  if (error instanceof AppError && error.isOperational) {
    return errorResponse(
      res,
      error.message,
      error.statusCode,
      error.errors
    );
  }

  // Handle specific error types
  if (error instanceof ValidationError) {
    return errorResponse(res, error.message, 400, error.errors);
  }

  if (error instanceof NotFoundError) {
    return errorResponse(res, error.message, 404);
  }

  if (error instanceof UnauthorizedError) {
    return errorResponse(res, error.message, 401);
  }

  if (error instanceof ConflictError) {
    return errorResponse(res, error.message, 409);
  }

  // Handle Firebase errors
  if (error.code && error.code.startsWith('auth/')) {
    return errorResponse(res, 'Authentication error', 401);
  }

  if (error.code && error.code.startsWith('permission-denied')) {
    return errorResponse(res, 'Permission denied', 403);
  }

  // Handle validation errors from libraries
  if (error.name === 'ValidationError') {
    return errorResponse(res, 'Validation failed', 400, error.errors);
  }

  // Default to 500 Internal Server Error
  return errorResponse(
    res,
    process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : error.message,
    500,
    process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
  );
};

/**
 * Not found handler
 * Returns 404 for non-existent routes
 */
export const notFoundHandler = (req, res) => {
  return errorResponse(
    res,
    `Route ${req.method} ${req.url} not found`,
    404
  );
};

/**
 * Method not allowed handler
 * Returns 405 for unsupported HTTP methods
 */
export const methodNotAllowedHandler = (req, res, allowedMethods = []) => {
  res.setHeader('Allow', allowedMethods.join(', '));
  return errorResponse(
    res,
    `Method ${req.method} not allowed. Allowed methods: ${allowedMethods.join(', ')}`,
    405
  );
};

export default {
  asyncHandler,
  handleError,
  notFoundHandler,
  methodNotAllowedHandler
};
