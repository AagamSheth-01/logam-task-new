/**
 * Calendar API Client
 */

import httpClient from '../../../shared/api/httpClient.js';

class CalendarApi {
  async getEvents(params = {}) {
    return await httpClient.get('/calendar', params);
  }

  async getEventById(eventId) {
    const response = await httpClient.get(`/calendar/${eventId}`);
    return response.data || response;
  }

  async createEvent(eventData) {
    return await httpClient.post('/calendar', eventData);
  }

  async updateEvent(eventId, updates) {
    return await httpClient.put(`/calendar/${eventId}`, updates);
  }

  async deleteEvent(eventId) {
    return await httpClient.delete(`/calendar/${eventId}`);
  }

  async getEventsByDateRange(startDate, endDate, params = {}) {
    return await httpClient.get('/calendar', {
      ...params,
      startDate,
      endDate
    });
  }

  async getClientCalendar(clientId, params = {}) {
    return await httpClient.get(`/clients/${clientId}/calendar`, params);
  }
}

export const calendarApi = new CalendarApi();
export default calendarApi;
