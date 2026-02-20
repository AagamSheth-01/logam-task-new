// lib/auth.js - Updated to use Firebase instead of Google Sheets
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { loadUsers } from './firebaseService.js';
import dotenv from 'dotenv';

// Always load environment variables first
if (!process.env.JWT_SECRET) {
  dotenv.config({ path: '.env.local' });
}

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

// Generate JWT token
export const generateToken = (user, options = {}) => {
  const payload = {
    id: user.id || user.username,
    username: user.username,
    role: user.role,
    email: user.email,
    tenantId: user.tenantId,  // Multi-tenancy support
    tokenType: options.tokenType || 'access'
  };

  // Different expiration times for different token types
  const expiresIn = options.tokenType === 'refresh' ? '7d' : '1h'; // 7 days for refresh, 1 hour for access
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
};

// Verify JWT token (original function for token string only)
export const verifyToken = (token) => {
  try {
    if (!token || typeof token !== 'string') {
      return { valid: false, error: 'Invalid token format' };
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, user: decoded };
  } catch (error) {
    return { valid: false, error: error.message };
  }
};

// NEW: Verify token from request object (for API routes)
export const verifyTokenFromRequest = (req) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return { valid: false, message: 'No authorization header' };
    }

    // Extract token from "Bearer TOKEN" format
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    if (!token) {
      return { valid: false, message: 'No token provided' };
    }

    // Ensure token is a string
    const tokenString = typeof token === 'string' ? token : String(token);

    if (!tokenString || tokenString === 'undefined' || tokenString === 'null') {
      return { valid: false, message: 'Invalid token format' };
    }

    // Verify the token using the existing function
    const result = verifyToken(tokenString);

    if (!result.valid) {
      return { valid: false, message: result.error };
    }

    if (!result.user || !result.user.username) {
      return { valid: false, message: 'Invalid token data' };
    }

    return {
      valid: true,
      user: {
        username: result.user.username,
        role: result.user.role || 'user',
        email: result.user.email || '',
        id: result.user.id || result.user.username,
        tenantId: result.user.tenantId  // Multi-tenancy support
      }
    };

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, message: 'Token expired' };
    } else if (error.name === 'JsonWebTokenError') {
      return { valid: false, message: 'Invalid token' };
    } else {
      return { valid: false, message: 'Token verification failed' };
    }
  }
};

// Authenticate user using Firebase
export const authenticateUser = async (username, password) => {
  try {
    // Load users from Firebase
    const users = await loadUsers();

    if (!users || users.length === 0) {
      return {
        success: false,
        message: 'No users found in system'
      };
    }

    // Find user by username (case-insensitive)
    const user = users.find(u =>
      u.username && u.username.toLowerCase().trim() === username.toLowerCase().trim()
    );

    if (!user) {
      return {
        success: false,
        message: 'Invalid username or password'
      };
    }

    // Check password using bcrypt (secure hash comparison)
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return {
        success: false,
        message: 'Invalid username or password'
      };
    }

    // Generate access and refresh tokens
    const accessToken = generateToken(user, { tokenType: 'access' });
    const refreshToken = generateToken(user, { tokenType: 'refresh' });

    // Return user data without password
    const safeUser = {
      id: user.id,
      username: user.username,
      role: user.role || 'user',
      email: user.email || '',
      tenantId: user.tenantId,  // Multi-tenancy support
      profileImage: user.profileImage || null  // Include profile image
    };

    return {
      success: true,
      message: 'Authentication successful',
      user: safeUser,
      token: accessToken, // For backward compatibility
      accessToken,
      refreshToken
    };

  } catch (error) {
    return {
      success: false,
      message: 'Authentication failed: ' + error.message
    };
  }
};

// Middleware to require authentication
export const requireAuth = (handler) => {
  return async (req, res) => {
    try {
      // Use the new function that handles request objects
      const verification = verifyTokenFromRequest(req);
      
      if (!verification.valid) {
        return res.status(401).json({
          success: false,
          message: verification.message || 'Invalid or expired token'
        });
      }

      // Add user and tenant context to request object
      req.user = verification.user;
      req.tenantId = verification.user.tenantId;  // Multi-tenancy support

      // Call the actual handler
      return handler(req, res);
      
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Authentication error'
      });
    }
  };
};

// Check if user has required role
export const requireRole = (requiredRole) => {
  return (handler) => {
    return requireAuth(async (req, res) => {
      const userRole = req.user.role?.toLowerCase();
      const required = requiredRole.toLowerCase();
      
      if (userRole !== required) {
        return res.status(403).json({ 
          success: false, 
          message: `${required} role required` 
        });
      }
      
      return handler(req, res);
    });
  };
};

// Check if user is admin
export const requireAdmin = requireRole('admin');

// Middleware to ensure tenantId is present (Multi-tenancy validation)
export const requireTenantId = (handler) => {
  return requireAuth(async (req, res) => {
    if (!req.tenantId) {
      return res.status(403).json({
        success: false,
        message: 'No tenant context found'
      });
    }

    return handler(req, res);
  });
};

// Utility function to extract user from request
export const getUserFromRequest = (req) => {
  return req.user || null;
};

// Export all functions
export default {
  generateToken,
  verifyToken,
  verifyTokenFromRequest,
  authenticateUser,
  requireAuth,
  requireRole,
  requireAdmin,
  requireTenantId,
  getUserFromRequest
};