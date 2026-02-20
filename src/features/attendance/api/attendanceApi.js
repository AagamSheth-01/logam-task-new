/**
 * Attendance API Client
 * Handles all attendance-related API calls
 */

import httpClient from '../../../shared/api/httpClient.js';

class AttendanceApi {
  /**
   * Get attendance records
   */
  async getAttendance(params = {}) {
    return await httpClient.get('/attendance', params);
  }

  /**
   * Get today's attendance for a user
   */
  async getTodayAttendance(username) {
    return await httpClient.get('/attendance', { user: username });
  }

  /**
   * Get attendance for date range
   */
  async getAttendanceRange(username, startDate, endDate) {
    return await httpClient.get('/attendance', {
      user: username,
      startDate,
      endDate
    });
  }

  /**
   * Get attendance record by ID
   */
  async getAttendanceById(id) {
    const response = await httpClient.get(`/attendance/${id}`);
    return response.data || response;
  }

  /**
   * Mark attendance (clock in)
   */
  async markAttendance(data) {
    return await httpClient.post('/attendance', data);
  }

  /**
   * Clock out
   */
  async clockOut(attendanceId, data) {
    return await httpClient.patch('/attendance/clock-out', {
      attendanceId,
      ...data
    });
  }

  /**
   * Mark user as absent
   */
  async markAbsent(data) {
    return await httpClient.post('/attendance/mark-absent', data);
  }

  /**
   * Run auto-absent job
   */
  async runAutoAbsent() {
    return await httpClient.post('/attendance/auto-absent');
  }

  /**
   * Get attendance settings
   */
  async getSettings() {
    const response = await httpClient.get('/attendance/settings');
    return response.data || response;
  }

  /**
   * Update attendance settings
   */
  async updateSettings(settings) {
    return await httpClient.put('/attendance/settings', settings);
  }

  /**
   * Get daily log entries
   */
  async getDailyLog(params = {}) {
    return await httpClient.get('/attendance/daily-log', params);
  }

  /**
   * Create daily log entry
   */
  async createDailyLog(data) {
    return await httpClient.post('/attendance/daily-log', data);
  }
}

// Export singleton instance
export const attendanceApi = new AttendanceApi();
export default attendanceApi;
