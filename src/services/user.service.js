/**
 * User Service
 * Contains business logic for user management
 * Uses UserRepository for data access
 */

import { UserRepository } from '../repositories/user.repository.js';
import { UserModel } from '../models/user.model.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';
import bcrypt from 'bcryptjs';

export class UserService {
  constructor() {
    this.userRepository = new UserRepository();
  }

  /**
   * Get all users for a tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of users (without passwords)
   */
  async getUsersByTenant(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const users = await this.userRepository.findByTenant(tenantId);

    // Remove passwords from response
    return users.map(user => {
      const userModel = new UserModel(user);
      return userModel.toSafeObject();
    });
  }

  /**
   * Get user by username
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @param {boolean} includeSensitive - Include sensitive data (default: false)
   * @returns {Promise<Object|null>} User object or null
   */
  async getUserByUsername(username, tenantId, includeSensitive = false) {
    if (!username || !tenantId) {
      throw new ValidationError('Username and tenant ID are required');
    }

    const user = await this.userRepository.findByUsername(username, tenantId);

    if (!user) return null;

    const userModel = new UserModel(user);
    return includeSensitive ? userModel.toObject() : userModel.toSafeObject();
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @param {string} tenantId - Organization ID
   * @param {boolean} includeSensitive - Include sensitive data (default: false)
   * @returns {Promise<Object|null>} User object or null
   */
  async getUserById(userId, tenantId, includeSensitive = false) {
    if (!userId || !tenantId) {
      throw new ValidationError('User ID and tenant ID are required');
    }

    const user = await this.userRepository.findById(userId, tenantId);

    if (!user) return null;

    const userModel = new UserModel(user);
    return includeSensitive ? userModel.toObject() : userModel.toSafeObject();
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created user object (without password)
   */
  async createUser(userData, tenantId) {
    // Validate input data
    const validation = UserModel.validate(userData);
    if (!validation.isValid) {
      throw new ValidationError('Invalid user data', validation.errors);
    }

    // Check if username already exists
    const existingUser = await this.userRepository.findByUsername(userData.username, tenantId);
    if (existingUser) {
      throw new ConflictError(`Username "${userData.username}" already exists in this organization`);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    // Create user model
    const userModel = new UserModel({
      ...userData,
      password: hashedPassword,
      tenantId
    });

    // Save to database
    const newUser = await this.userRepository.create(userModel.toObject(), tenantId);

    // Return without password
    const returnModel = new UserModel(newUser);
    return returnModel.toSafeObject();
  }

  /**
   * Update user
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated user object (without password)
   */
  async updateUser(userId, updateData, tenantId) {
    // Validate update data
    const validation = UserModel.validate(updateData, true);
    if (!validation.isValid) {
      throw new ValidationError('Invalid update data', validation.errors);
    }

    // Check if user exists
    const existingUser = await this.userRepository.findById(userId, tenantId);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    // If updating password, hash it
    if (updateData.password) {
      updateData.password = await bcrypt.hash(updateData.password, 10);
    }

    // If updating username, check for conflicts
    if (updateData.username && updateData.username !== existingUser.username) {
      const usernameExists = await this.userRepository.usernameExists(updateData.username, tenantId);
      if (usernameExists) {
        throw new ConflictError(`Username "${updateData.username}" already exists`);
      }
    }

    // Update in database
    await this.userRepository.update(userId, updateData, tenantId);

    // Fetch and return updated user
    const updatedUser = await this.userRepository.findById(userId, tenantId);
    const userModel = new UserModel(updatedUser);
    return userModel.toSafeObject();
  }

  /**
   * Delete user
   * @param {string} userId - User ID
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<void>}
   */
  async deleteUser(userId, username, tenantId) {
    // Check if user exists
    const existingUser = await this.userRepository.findById(userId, tenantId);
    if (!existingUser) {
      throw new NotFoundError('User not found');
    }

    await this.userRepository.delete(userId, username, tenantId);
  }

  /**
   * Verify user credentials (for login)
   * @param {string} username - Username
   * @param {string} password - Password
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object|null>} User object if credentials valid, null otherwise
   */
  async verifyCredentials(username, password, tenantId) {
    // Get user with password
    const user = await this.getUserByUsername(username, tenantId, true);

    if (!user) return null;

    // Check if user is active
    if (user.isActive === false) {
      throw new ValidationError('User account is inactive');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) return null;

    // Return user without password
    const userModel = new UserModel(user);
    return userModel.toSafeObject();
  }

  /**
   * Change user password
   * @param {string} userId - User ID
   * @param {string} currentPassword - Current password
   * @param {string} newPassword - New password
   * @param {string} tenantId - Organization ID
   * @returns {Promise<void>}
   */
  async changePassword(userId, currentPassword, newPassword, tenantId) {
    // Get user with password
    const user = await this.userRepository.findById(userId, tenantId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new ValidationError('Current password is incorrect');
    }

    // Validate new password
    if (newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters long');
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userRepository.update(userId, { password: hashedPassword }, tenantId);
  }

  /**
   * Get user count for tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<number>} User count
   */
  async getUserCount(tenantId) {
    return await this.userRepository.countByTenant(tenantId);
  }

  /**
   * Toggle user active status
   * @param {string} userId - User ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated user object
   */
  async toggleUserStatus(userId, tenantId) {
    const user = await this.userRepository.findById(userId, tenantId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const newStatus = !user.isActive;
    await this.userRepository.update(userId, { isActive: newStatus }, tenantId);

    const updatedUser = await this.userRepository.findById(userId, tenantId);
    const userModel = new UserModel(updatedUser);
    return userModel.toSafeObject();
  }

  /**
   * Get user by email
   * @param {string} email - User email
   * @param {string} tenantId - Organization ID (optional)
   * @param {boolean} includeSensitive - Include sensitive data (default: false)
   * @returns {Promise<Object|null>} User object or null
   */
  async getUserByEmail(email, tenantId = null, includeSensitive = false) {
    if (!email) {
      throw new ValidationError('Email is required');
    }

    const user = await this.userRepository.findByEmail(email, tenantId);

    if (!user) return null;

    const userModel = new UserModel(user);
    return includeSensitive ? userModel.toObject() : userModel.toSafeObject();
  }

  /**
   * Request password reset - generates token and saves it
   * @param {string} email - User email
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<Object>} Object with token (for email sending)
   */
  async requestPasswordReset(email, tenantId = null) {
    if (!email) {
      throw new ValidationError('Email is required');
    }

    // Find user by email
    const user = await this.userRepository.findByEmail(email, tenantId);

    if (!user) {
      // For security, don't reveal if email exists or not
      // Return success but don't actually do anything
      return {
        success: true,
        message: 'If the email exists, a password reset link will be sent'
      };
    }

    // Generate reset token
    const token = this.userRepository.generatePasswordResetToken();

    // Save token to user record
    await this.userRepository.savePasswordResetToken(user.id, token, tenantId);

    // Return token (in real app, this would be sent via email)
    return {
      success: true,
      token, // In production, don't return token, send via email instead
      userId: user.id,
      email: user.email,
      message: 'Password reset token generated'
    };
  }

  /**
   * Verify password reset token
   * @param {string} token - Reset token
   * @returns {Promise<Object>} Verification result
   */
  async verifyPasswordResetToken(token) {
    if (!token) {
      throw new ValidationError('Reset token is required');
    }

    try {
      const result = await this.userRepository.verifyPasswordResetToken(token);

      if (!result.isValid) {
        throw new ValidationError(result.error || 'Invalid or expired reset token');
      }

      return {
        isValid: true,
        userId: result.userId,
        email: result.email
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new ValidationError('Invalid or expired reset token');
    }
  }

  /**
   * Reset password using token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Success result
   */
  async resetPasswordWithToken(token, newPassword) {
    if (!token || !newPassword) {
      throw new ValidationError('Token and new password are required');
    }

    // Validate new password strength
    if (newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters long');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Reset password using token (firebaseService handles verification)
    const result = await this.userRepository.resetPasswordWithToken(token, hashedPassword);

    if (!result.success) {
      throw new ValidationError(result.error || 'Failed to reset password');
    }

    return {
      success: true,
      message: 'Password has been reset successfully'
    };
  }

  /**
   * Get users by role
   * @param {string} role - User role
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of users with specified role
   */
  async getUsersByRole(role, tenantId) {
    if (!role || !tenantId) {
      throw new ValidationError('Role and tenant ID are required');
    }

    const users = await this.userRepository.findByRole(role, tenantId);

    // Remove passwords from response
    return users.map(user => {
      const userModel = new UserModel(user);
      return userModel.toSafeObject();
    });
  }

  /**
   * Get active users for a tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of active users
   */
  async getActiveUsers(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const users = await this.userRepository.findActiveUsers(tenantId);

    // Remove passwords from response
    return users.map(user => {
      const userModel = new UserModel(user);
      return userModel.toSafeObject();
    });
  }

  /**
   * Check if email is available
   * @param {string} email - Email to check
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<boolean>} True if email is available (not taken)
   */
  async isEmailAvailable(email, tenantId = null) {
    if (!email) {
      throw new ValidationError('Email is required');
    }

    const exists = await this.userRepository.emailExists(email, tenantId);
    return !exists; // Return true if available (not exists)
  }

  /**
   * Check if username is available
   * @param {string} username - Username to check
   * @param {string} tenantId - Organization ID
   * @returns {Promise<boolean>} True if username is available (not taken)
   */
  async isUsernameAvailable(username, tenantId) {
    if (!username || !tenantId) {
      throw new ValidationError('Username and tenant ID are required');
    }

    const exists = await this.userRepository.usernameExists(username, tenantId);
    return !exists; // Return true if available (not exists)
  }
}

export default UserService;
