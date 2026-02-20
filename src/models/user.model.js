/**
 * User Model
 * Defines user data structure and validation rules
 */

import { USER_ROLES } from '../utils/constants.js';

export class UserModel {
  constructor(data) {
    this.id = data.id || null;
    this.tenantId = data.tenantId;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password; // Hashed
    this.fullName = data.fullName || null;
    this.role = data.role || USER_ROLES.USER;
    this.phone = data.phone || null;
    this.department = data.department || null;
    this.jobTitle = data.jobTitle || null;
    this.profileImage = data.profileImage || null;
    this.isActive = data.isActive !== undefined ? data.isActive : true;
    this.lastLogin = data.lastLogin || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Convert to plain object for database storage
   */
  toObject() {
    return {
      ...(this.id && { id: this.id }),
      tenantId: this.tenantId,
      username: this.username,
      email: this.email,
      password: this.password,
      fullName: this.fullName,
      role: this.role,
      phone: this.phone,
      department: this.department,
      jobTitle: this.jobTitle,
      profileImage: this.profileImage,
      isActive: this.isActive,
      lastLogin: this.lastLogin,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Convert to safe object for API response (exclude password)
   */
  toSafeObject() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
  }

  /**
   * Validation rules
   */
  static validate(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate) {
      // Required fields for creation
      if (!data.tenantId) {
        errors.push({ field: 'tenantId', message: 'Tenant ID is required' });
      }
      if (!data.username || !data.username.trim()) {
        errors.push({ field: 'username', message: 'Username is required' });
      }
      if (!data.password) {
        errors.push({ field: 'password', message: 'Password is required' });
      }
    }

    // Username validation
    if (data.username && (data.username.length < 3 || data.username.length > 50)) {
      errors.push({ field: 'username', message: 'Username must be between 3 and 50 characters' });
    }

    // Email validation (if provided)
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    // Role validation
    if (data.role && !Object.values(USER_ROLES).includes(data.role)) {
      errors.push({ field: 'role', message: 'Invalid role' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default UserModel;
