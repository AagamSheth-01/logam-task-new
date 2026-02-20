/**
 * HTTP Client
 * Base API client for all HTTP requests
 * Handles authentication, error handling, and response parsing
 */

import useAuthStore from '../../store/authStore.js';

class HttpClient {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
  }

  /**
   * Get authentication headers
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    // Try to get token from store first, then fallback to localStorage
    let token = null;
    try {
      token = useAuthStore.getState().token;
    } catch (error) {
      // Store might not be available, ignore
    }

    // Fallback to localStorage (current auth method)
    if (!token && typeof window !== 'undefined') {
      token = localStorage.getItem('token');
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle API response
   */
  async handleResponse(response) {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      // Handle authentication errors
      if (response.status === 401) {
        useAuthStore.getState().logout();
        throw new Error(data.message || 'Unauthorized');
      }

      const error = new Error(data.message || data.error || 'Request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * GET request
   */
  async get(endpoint, params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseURL}${endpoint}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error(`PUT ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data = {}) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(data),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error(`PATCH ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * DELETE request
   */
  async delete(endpoint) {
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error(`DELETE ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Upload file with FormData
   */
  async upload(endpoint, formData) {
    try {
      const token = useAuthStore.getState().token;
      const headers = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers,
        body: formData,
      });

      return await this.handleResponse(response);
    } catch (error) {
      console.error(`UPLOAD ${endpoint} failed:`, error);
      throw error;
    }
  }
}

// Export singleton instance
export const httpClient = new HttpClient();
export default httpClient;
