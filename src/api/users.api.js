/**
 * Users API Client
 * Handles all user-related API calls
 * Frontend MVC Layer - API Module
 */

import apiClient from './client.js';

export class UsersApi {
  /**
   * Get all users
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Users list
   */
  async getUsers(params = {}) {
    const response = await apiClient.get('/users', params);
    return response;
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User details
   */
  async getUserById(userId) {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data || response;
  }

  /**
   * Create new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} Created user
   */
  async createUser(userData) {
    const response = await apiClient.post('/users', userData);
    return response;
  }

  /**
   * Update user
   * @param {string} userId - User ID
   * @param {Object} updates - User updates
   * @returns {Promise<Object>} Updated user
   */
  async updateUser(userId, updates) {
    const response = await apiClient.put(`/users/${userId}`, updates);
    return response;
  }

  /**
   * Delete user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteUser(userId) {
    const response = await apiClient.delete(`/users/${userId}`);
    return response;
  }

  /**
   * Update user profile
   * @param {Object} profileData - Profile data
   * @returns {Promise<Object>} Updated profile
   */
  async updateProfile(profileData) {
    const response = await apiClient.put('/users/update-profile', profileData);
    return response;
  }

  /**
   * Upload profile image
   * @param {File} imageFile - Image file
   * @returns {Promise<Object>} Upload result with image URL
   */
  async uploadProfileImage(imageFile) {
    const formData = new FormData();
    formData.append('profileImage', imageFile);

    const response = await apiClient.upload('/users/upload-profile-image', formData);
    return response;
  }

  /**
   * Delete profile image
   * @returns {Promise<Object>} Deletion result
   */
  async deleteProfileImage() {
    const response = await apiClient.delete('/users/delete-profile-image');
    return response;
  }

  /**
   * Change password
   * @param {Object} passwordData - Password data
   * @param {string} passwordData.currentPassword - Current password
   * @param {string} passwordData.newPassword - New password
   * @returns {Promise<Object>} Change result
   */
  async changePassword(passwordData) {
    const response = await apiClient.post('/users/change-password', passwordData);
    return response;
  }

  /**
   * View password (admin only)
   * @param {string} username - Username
   * @returns {Promise<Object>} Password data
   */
  async viewPassword(username) {
    const response = await apiClient.post('/users/view-password', { username });
    return response;
  }

  /**
   * Get decrypted password (admin only)
   * @param {string} username - Username
   * @returns {Promise<Object>} Decrypted password
   */
  async getPassword(username) {
    const response = await apiClient.post('/users/get-password', { username });
    return response;
  }
}

// Export singleton instance
export const usersApi = new UsersApi();
export default usersApi;
