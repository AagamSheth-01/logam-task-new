/**
 * User Repository
 * Wraps existing firebaseService user functions
 * Provides clean interface for user database operations
 */

import { BaseRepository } from './base.repository.js';
import {
  loadUsers,
  addUser,
  deleteUser,
  updateUser,
  getUserByUsername,
  getUserById,
  getUserByEmail,
  generatePasswordResetToken,
  savePasswordResetToken,
  verifyPasswordResetToken,
  resetPasswordWithToken
} from '../../lib/firebaseService.js';

export class UserRepository extends BaseRepository {
  constructor() {
    super('users');
  }

  /**
   * Get all users for a tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of users
   */
  async findByTenant(tenantId) {
    try {
      const users = await loadUsers(tenantId);
      return users || [];
    } catch (error) {
      this.handleError(error, 'find users by tenant');
    }
  }

  /**
   * Find user by username and tenant
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object|null>} User object or null
   */
  async findByUsername(username, tenantId) {
    try {
      const user = await getUserByUsername(username, tenantId);
      return user || null;
    } catch (error) {
      this.handleError(error, 'find user by username');
    }
  }

  /**
   * Find user by ID
   * @param {string} userId - User ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object|null>} User object or null
   */
  async findById(userId, tenantId) {
    try {
      const user = await getUserById(userId, tenantId);
      return user || null;
    } catch (error) {
      this.handleError(error, 'find user by ID');
    }
  }

  /**
   * Create a new user
   * @param {Object} userData - User data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created user object
   */
  async create(userData, tenantId) {
    try {
      const newUser = await addUser(userData, tenantId);
      return newUser;
    } catch (error) {
      this.handleError(error, 'create user');
    }
  }

  /**
   * Update user
   * @param {string} userId - User ID
   * @param {Object} updateData - Update data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<void>}
   */
  async update(userId, updateData, tenantId) {
    try {
      await updateUser(userId, updateData, tenantId);
    } catch (error) {
      this.handleError(error, 'update user');
    }
  }

  /**
   * Delete user
   * @param {string} userId - User ID
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<void>}
   */
  async delete(userId, username, tenantId) {
    try {
      await deleteUser(userId, username, tenantId);
    } catch (error) {
      this.handleError(error, 'delete user');
    }
  }

  /**
   * Check if username exists in tenant
   * @param {string} username - Username to check
   * @param {string} tenantId - Organization ID
   * @returns {Promise<boolean>} True if exists
   */
  async usernameExists(username, tenantId) {
    try {
      const user = await this.findByUsername(username, tenantId);
      return !!user;
    } catch (error) {
      this.handleError(error, 'check username existence');
    }
  }

  /**
   * Count users in tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<number>} User count
   */
  async countByTenant(tenantId) {
    try {
      const users = await this.findByTenant(tenantId);
      return users.length;
    } catch (error) {
      this.handleError(error, 'count users');
    }
  }

  /**
   * Find user by email
   * @param {string} email - User email
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<Object|null>} User object or null
   */
  async findByEmail(email, tenantId = null) {
    try {
      const user = await getUserByEmail(email, tenantId);
      return user || null;
    } catch (error) {
      this.handleError(error, 'find user by email');
    }
  }

  /**
   * Check if email exists in tenant
   * @param {string} email - Email to check
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<boolean>} True if exists
   */
  async emailExists(email, tenantId = null) {
    try {
      const user = await this.findByEmail(email, tenantId);
      return !!user;
    } catch (error) {
      this.handleError(error, 'check email existence');
    }
  }

  /**
   * Generate a password reset token
   * @returns {string} Generated token
   */
  generatePasswordResetToken() {
    return generatePasswordResetToken();
  }

  /**
   * Save password reset token for user
   * @param {string} userId - User ID
   * @param {string} token - Reset token
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<void>}
   */
  async savePasswordResetToken(userId, token, tenantId = null) {
    try {
      await savePasswordResetToken(userId, token, tenantId);
    } catch (error) {
      this.handleError(error, 'save password reset token');
    }
  }

  /**
   * Verify password reset token
   * @param {string} token - Reset token to verify
   * @returns {Promise<Object>} Verification result with user data
   */
  async verifyPasswordResetToken(token) {
    try {
      const result = await verifyPasswordResetToken(token);
      return result;
    } catch (error) {
      this.handleError(error, 'verify password reset token');
    }
  }

  /**
   * Reset password using token
   * @param {string} token - Reset token
   * @param {string} newPassword - New password
   * @returns {Promise<Object>} Result object
   */
  async resetPasswordWithToken(token, newPassword) {
    try {
      const result = await resetPasswordWithToken(token, newPassword);
      return result;
    } catch (error) {
      this.handleError(error, 'reset password with token');
    }
  }

  /**
   * Get users by role
   * @param {string} role - User role
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of users with specified role
   */
  async findByRole(role, tenantId) {
    try {
      const allUsers = await this.findByTenant(tenantId);
      return allUsers.filter(user => user.role === role);
    } catch (error) {
      this.handleError(error, 'find users by role');
    }
  }

  /**
   * Get active users only
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of active users
   */
  async findActiveUsers(tenantId) {
    try {
      const allUsers = await this.findByTenant(tenantId);
      return allUsers.filter(user => user.status === 'active' || !user.status);
    } catch (error) {
      this.handleError(error, 'find active users');
    }
  }
}

export default UserRepository;
