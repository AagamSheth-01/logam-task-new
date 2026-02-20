/**
 * Clients API Client
 */

import httpClient from '../../../shared/api/httpClient.js';

class ClientsApi {
  async getClients(params = {}) {
    return await httpClient.get('/clients', params);
  }

  async getClientById(clientId) {
    const response = await httpClient.get(`/clients/${clientId}`);
    return response.data || response;
  }

  async createClient(clientData) {
    return await httpClient.post('/clients', clientData);
  }

  async updateClient(clientId, updates) {
    return await httpClient.put(`/clients/${clientId}`, updates);
  }

  async deleteClient(clientId) {
    return await httpClient.delete(`/clients/${clientId}`);
  }

  async getClientTasks(clientId, params = {}) {
    return await httpClient.get(`/clients/${clientId}/tasks`, params);
  }

  async getClientUsers(clientId) {
    return await httpClient.get(`/clients/${clientId}/users`);
  }

  async getClientMeetings(clientId, params = {}) {
    return await httpClient.get(`/clients/${clientId}/meetings`, params);
  }

  async getClientFiles(clientId, params = {}) {
    return await httpClient.get(`/clients/${clientId}/files`, params);
  }

  async getClientCalendar(clientId, params = {}) {
    return await httpClient.get(`/clients/${clientId}/calendar`, params);
  }
}

export const clientsApi = new ClientsApi();
export default clientsApi;
