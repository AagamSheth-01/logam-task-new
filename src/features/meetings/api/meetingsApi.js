/**
 * Meetings API Client
 */

import httpClient from '../../../shared/api/httpClient.js';

class MeetingsApi {
  async getMeetings(params = {}) {
    return await httpClient.get('/meetings', params);
  }

  async getMeetingById(meetingId) {
    const response = await httpClient.get(`/meetings/${meetingId}`);
    return response.data || response;
  }

  async createMeeting(meetingData) {
    return await httpClient.post('/meetings', meetingData);
  }

  async updateMeeting(meetingId, updates) {
    return await httpClient.put(`/meetings/${meetingId}`, updates);
  }

  async deleteMeeting(meetingId) {
    return await httpClient.delete(`/meetings/${meetingId}`);
  }

  async getClientMeetings(clientId, params = {}) {
    return await httpClient.get(`/clients/${clientId}/meetings`, params);
  }

  async getMeetingsByDateRange(startDate, endDate, params = {}) {
    return await httpClient.get('/meetings', {
      ...params,
      startDate,
      endDate
    });
  }
}

export const meetingsApi = new MeetingsApi();
export default meetingsApi;
