/**
 * Validation Middleware
 * Validates request data before processing
 */

import { ValidationError } from '../utils/errors.js';

/**
 * Validate request body against schema
 * @param {Function} validatorFn - Validation function (returns {isValid, errors})
 */
export const validateBody = (validatorFn) => {
  return (req, res, next) => {
    const validation = validatorFn(req.body);

    if (!validation.isValid) {
      throw new ValidationError('Validation failed', validation.errors);
    }

    // Continue to next middleware or handler
    if (next) next();
  };
};

/**
 * Validate query parameters
 * @param {Object} rules - Validation rules
 */
export const validateQuery = (rules) => {
  return (req, res, next) => {
    const errors = [];

    Object.keys(rules).forEach(field => {
      const rule = rules[field];
      const value = req.query[field];

      // Check required
      if (rule.required && !value) {
        errors.push({
          field,
          message: `${field} is required`
        });
      }

      // Check type
      if (value && rule.type) {
        if (rule.type === 'number' && isNaN(value)) {
          errors.push({
            field,
            message: `${field} must be a number`
          });
        }

        if (rule.type === 'boolean' && !['true', 'false'].includes(value)) {
          errors.push({
            field,
            message: `${field} must be a boolean`
          });
        }
      }

      // Check enum values
      if (value && rule.enum && !rule.enum.includes(value)) {
        errors.push({
          field,
          message: `${field} must be one of: ${rule.enum.join(', ')}`
        });
      }
    });

    if (errors.length > 0) {
      throw new ValidationError('Query validation failed', errors);
    }

    if (next) next();
  };
};

/**
 * Validate required fields in request body
 * @param {Array} requiredFields - Array of required field names
 */
export const validateRequired = (...requiredFields) => {
  return (req, res, next) => {
    const errors = [];

    requiredFields.forEach(field => {
      if (!req.body[field]) {
        errors.push({
          field,
          message: `${field} is required`
        });
      }
    });

    if (errors.length > 0) {
      throw new ValidationError('Missing required fields', errors);
    }

    if (next) next();
  };
};

/**
 * Sanitize request body
 * Removes unwanted fields and trims strings
 * @param {Array} allowedFields - Array of allowed field names
 */
export const sanitizeBody = (allowedFields = null) => {
  return (req, res, next) => {
    if (!req.body) {
      if (next) next();
      return;
    }

    // If allowedFields specified, remove unallowed fields
    if (allowedFields && Array.isArray(allowedFields)) {
      const sanitized = {};
      allowedFields.forEach(field => {
        if (req.body.hasOwnProperty(field)) {
          sanitized[field] = req.body[field];
        }
      });
      req.body = sanitized;
    }

    // Trim string values
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });

    if (next) next();
  };
};

/**
 * Validate tenant ID
 * Ensures tenantId is present in request
 */
export const validateTenantId = (req, res, next) => {
  const tenantId = req.body?.tenantId || req.query?.tenantId || req.user?.tenantId;

  if (!tenantId) {
    throw new ValidationError('Tenant ID is required');
  }

  // Attach to request for easy access
  req.tenantId = tenantId;

  if (next) next();
};

/**
 * Validate email format
 */
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate date format (YYYY-MM-DD)
 */
export const isValidDate = (dateString) => {
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(dateString)) return false;

  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
};

/**
 * Validate password strength
 */
export const isStrongPassword = (password, minLength = 8) => {
  if (!password || password.length < minLength) {
    return false;
  }

  // At least one uppercase, one lowercase, one number
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return hasUppercase && hasLowercase && hasNumber;
};

/**
 * Validate username format
 */
export const isValidUsername = (username) => {
  // Username must be 3-20 characters, alphanumeric with underscores
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

export default {
  validateBody,
  validateQuery,
  validateRequired,
  sanitizeBody,
  validateTenantId,
  isValidEmail,
  isValidDate,
  isStrongPassword,
  isValidUsername
};
