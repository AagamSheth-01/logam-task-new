/**
 * Users API Client
 */

import httpClient from '../../../shared/api/httpClient.js';

class UsersApi {
  async getUsers(params = {}) {
    return await httpClient.get('/users', params);
  }

  async getUserById(userId) {
    const response = await httpClient.get(`/users/${userId}`);
    return response.data || response;
  }

  async createUser(userData) {
    return await httpClient.post('/users', userData);
  }

  async updateUser(userId, updates) {
    return await httpClient.put(`/users/${userId}`, updates);
  }

  async deleteUser(userId) {
    return await httpClient.delete(`/users/${userId}`);
  }

  async updateProfile(profileData) {
    return await httpClient.put('/users/update-profile', profileData);
  }

  async uploadProfileImage(imageFile) {
    const formData = new FormData();
    formData.append('profileImage', imageFile);
    return await httpClient.upload('/users/upload-profile-image', formData);
  }

  async deleteProfileImage() {
    return await httpClient.delete('/users/delete-profile-image');
  }

  async changePassword(passwordData) {
    return await httpClient.post('/users/change-password', passwordData);
  }
}

export const usersApi = new UsersApi();
export default usersApi;
