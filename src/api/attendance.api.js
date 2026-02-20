/**
 * Attendance API Client
 * Handles all attendance-related API calls
 * Frontend MVC Layer - API Module
 */

import apiClient from './client.js';

export class AttendanceApi {
  /**
   * Get attendance records
   * @param {Object} params - Query parameters
   * @param {string} params.user - Username filter
   * @param {string} params.startDate - Start date filter
   * @param {string} params.endDate - End date filter
   * @returns {Promise<Object>} Attendance data
   */
  async getAttendance(params = {}) {
    const response = await apiClient.get('/attendance', params);
    return response;
  }

  /**
   * Get today's attendance record for a user
   * @param {string} username - Username
   * @returns {Promise<Object>} Today's attendance record
   */
  async getTodayAttendance(username) {
    const response = await apiClient.get('/attendance', { user: username });
    return response;
  }

  /**
   * Get attendance for date range
   * @param {string} username - Username
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Attendance records and stats
   */
  async getAttendanceRange(username, startDate, endDate) {
    const response = await apiClient.get('/attendance', {
      user: username,
      startDate,
      endDate
    });
    return response;
  }

  /**
   * Get attendance record by ID
   * @param {string} id - Attendance record ID
   * @returns {Promise<Object>} Attendance record
   */
  async getAttendanceById(id) {
    const response = await apiClient.get(`/attendance/${id}`);
    return response.data || response;
  }

  /**
   * Mark attendance (clock in)
   * @param {Object} data - Attendance data
   * @param {string} data.username - Username
   * @param {string} data.date - Date
   * @param {string} data.clockIn - Clock in time
   * @returns {Promise<Object>} Created attendance record
   */
  async markAttendance(data) {
    const response = await apiClient.post('/attendance', data);
    return response;
  }

  /**
   * Clock out
   * @param {string} attendanceId - Attendance record ID
   * @param {Object} data - Clock out data
   * @param {string} data.clockOut - Clock out time
   * @returns {Promise<Object>} Updated attendance record
   */
  async clockOut(attendanceId, data) {
    const response = await apiClient.patch(`/attendance/clock-out`, {
      attendanceId,
      ...data
    });
    return response;
  }

  /**
   * Mark user as absent
   * @param {Object} data - Absent data
   * @param {string} data.username - Username
   * @param {string} data.date - Date
   * @param {string} data.reason - Reason for absence
   * @returns {Promise<Object>} Created absence record
   */
  async markAbsent(data) {
    const response = await apiClient.post('/attendance/mark-absent', data);
    return response;
  }

  /**
   * Run auto-absent job
   * @returns {Promise<Object>} Job results
   */
  async runAutoAbsent() {
    const response = await apiClient.post('/attendance/auto-absent');
    return response;
  }

  /**
   * Get attendance settings
   * @returns {Promise<Object>} Attendance settings
   */
  async getSettings() {
    const response = await apiClient.get('/attendance/settings');
    return response.data || response;
  }

  /**
   * Update attendance settings
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  async updateSettings(settings) {
    const response = await apiClient.put('/attendance/settings', settings);
    return response;
  }

  /**
   * Export attendance data
   * @param {Object} params - Export parameters
   * @param {string} params.format - Export format (csv, xlsx)
   * @param {string} params.startDate - Start date
   * @param {string} params.endDate - End date
   * @returns {Promise<Blob>} Export file
   */
  async exportAttendance(params) {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/attendance/export?${queryString}`;

    const token = apiClient.getToken();
    const response = await fetch(url, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {},
    });

    if (!response.ok) {
      throw new Error('Export failed');
    }

    return await response.blob();
  }

  /**
   * Get daily log entries
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Daily log data
   */
  async getDailyLog(params = {}) {
    const response = await apiClient.get('/attendance/daily-log', params);
    return response;
  }

  /**
   * Create daily log entry
   * @param {Object} data - Daily log data
   * @returns {Promise<Object>} Created log entry
   */
  async createDailyLog(data) {
    const response = await apiClient.post('/attendance/daily-log', data);
    return response;
  }
}

// Export singleton instance
export const attendanceApi = new AttendanceApi();
export default attendanceApi;
