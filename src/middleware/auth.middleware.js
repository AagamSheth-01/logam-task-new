/**
 * Authentication Middleware
 * Handles JWT verification and authorization
 */

import { verifyToken } from '../../lib/auth.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import { USER_ROLES } from '../utils/constants.js';

/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token - returns { valid, user, error }
    const result = verifyToken(token);

    if (!result.valid || !result.user) {
      throw new UnauthorizedError(result.error || 'Invalid or expired token');
    }

    const decoded = result.user;

    // Attach user info to request
    req.user = {
      id: decoded.id,
      username: decoded.username,
      email: decoded.email,
      role: decoded.role,
      tenantId: decoded.tenantId
    };

    if (next) next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError('Authentication failed');
  }
};

/**
 * Require specific role(s)
 * @param  {...string} allowedRoles - Allowed roles
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      throw new ForbiddenError(
        `Access denied. Required role: ${allowedRoles.join(' or ')}`
      );
    }

    if (next) next();
  };
};

/**
 * Require admin role
 */
export const requireAdmin = (req, res, next) => {
  return requireRole(USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN)(req, res, next);
};

/**
 * Require super admin role
 */
export const requireSuperAdmin = (req, res, next) => {
  return requireRole(USER_ROLES.SUPER_ADMIN)(req, res, next);
};

/**
 * Verify tenant access
 * Ensures user can only access data from their own tenant
 */
export const verifyTenantAccess = (req, res, next) => {
  if (!req.user) {
    throw new UnauthorizedError('Authentication required');
  }

  // Get tenant ID from request (body, query, or params)
  const requestedTenantId = req.body?.tenantId || req.query?.tenantId;

  // Super admin can access any tenant
  if (req.user.role === USER_ROLES.SUPER_ADMIN) {
    if (next) next();
    return;
  }

  // Regular users can only access their own tenant
  if (requestedTenantId && requestedTenantId !== req.user.tenantId) {
    throw new ForbiddenError('Access denied to this organization');
  }

  // Ensure tenantId is set to user's tenant
  req.tenantId = req.user.tenantId;

  if (next) next();
};

/**
 * Optional authentication
 * Attaches user if token is valid, but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const result = verifyToken(token);

      if (result.valid && result.user) {
        const decoded = result.user;
        req.user = {
          id: decoded.id,
          username: decoded.username,
          email: decoded.email,
          role: decoded.role,
          tenantId: decoded.tenantId
        };
      }
    }
  } catch (error) {
    // Ignore errors for optional auth
    console.log('Optional auth failed:', error.message);
  }

  if (next) next();
};

/**
 * Verify user owns resource or is admin
 * @param {Function} getUsernameFromRequest - Function to extract username from request
 */
export const requireOwnerOrAdmin = (getUsernameFromRequest) => {
  return (req, res, next) => {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    const resourceUsername = getUsernameFromRequest(req);

    // Allow if user is admin or super admin
    if ([USER_ROLES.ADMIN, USER_ROLES.SUPER_ADMIN].includes(req.user.role)) {
      if (next) next();
      return;
    }

    // Allow if user owns the resource
    if (req.user.username === resourceUsername) {
      if (next) next();
      return;
    }

    throw new ForbiddenError('Access denied');
  };
};

export default {
  authenticate,
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  verifyTenantAccess,
  optionalAuth,
  requireOwnerOrAdmin
};
