/**
 * Files API Client
 */

import httpClient from '../../../shared/api/httpClient.js';

class FilesApi {
  async getFiles(params = {}) {
    return await httpClient.get('/files', params);
  }

  async getFileById(fileId) {
    const response = await httpClient.get(`/files/${fileId}`);
    return response.data || response;
  }

  async uploadFile(fileData) {
    return await httpClient.post('/files/upload', fileData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  }

  async updateFile(fileId, updates) {
    return await httpClient.put(`/files/${fileId}`, updates);
  }

  async deleteFile(fileId) {
    return await httpClient.delete(`/files/${fileId}`);
  }

  async getRecentFiles(params = {}) {
    return await httpClient.get('/files/recent', params);
  }

  async getClientFiles(clientId, params = {}) {
    return await httpClient.get(`/clients/${clientId}/files`, params);
  }

  async downloadFile(fileId) {
    const response = await httpClient.get(`/files/${fileId}/download`, {
      responseType: 'blob'
    });
    return response;
  }
}

export const filesApi = new FilesApi();
export default filesApi;
