/**
 * Middleware Layer Entry Point
 * Exports all middleware for easy importing
 */

// Error handling
export {
  asyncHandler,
  handleError,
  notFoundHandler,
  methodNotAllowedHandler
} from './error.middleware.js';

// Validation
export {
  validateBody,
  validateQuery,
  validateRequired,
  sanitizeBody,
  validateTenantId,
  isValidEmail,
  isValidDate,
  isStrongPassword,
  isValidUsername
} from './validation.middleware.js';

// Authentication & Authorization
export {
  authenticate,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  verifyTenantAccess,
  optionalAuth,
  requireOwnerOrAdmin
} from './auth.middleware.js';

// Logging
export {
  logRequest,
  logActivity,
  logError
} from './logging.middleware.js';

// Default export with all middleware
import errorMiddleware from './error.middleware.js';
import validationMiddleware from './validation.middleware.js';
import authMiddleware from './auth.middleware.js';
import loggingMiddleware from './logging.middleware.js';

export default {
  ...errorMiddleware,
  ...validationMiddleware,
  ...authMiddleware,
  ...loggingMiddleware
};
