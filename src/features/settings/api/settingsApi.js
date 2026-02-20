/**
 * Settings API Client
 */

import httpClient from '../../../shared/api/httpClient.js';

class SettingsApi {
  async getSettings() {
    return await httpClient.get('/settings');
  }

  async updateSettings(settingsData) {
    return await httpClient.put('/settings', settingsData);
  }

  async getAttendanceSettings() {
    return await httpClient.get('/attendance/settings');
  }

  async updateAttendanceSettings(settingsData) {
    return await httpClient.put('/attendance/settings', settingsData);
  }

  async getUserPreferences() {
    return await httpClient.get('/users/preferences');
  }

  async updateUserPreferences(preferences) {
    return await httpClient.put('/users/preferences', preferences);
  }

  async getNotificationSettings() {
    return await httpClient.get('/settings/notifications');
  }

  async updateNotificationSettings(notificationSettings) {
    return await httpClient.put('/settings/notifications', notificationSettings);
  }

  async getOrganizationSettings() {
    return await httpClient.get('/organizations/settings');
  }

  async updateOrganizationSettings(orgSettings) {
    return await httpClient.put('/organizations/settings', orgSettings);
  }
}

export const settingsApi = new SettingsApi();
export default settingsApi;
