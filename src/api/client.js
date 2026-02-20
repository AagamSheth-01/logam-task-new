/**
 * Base API Client
 * Handles all HTTP requests with authentication and error handling
 * Frontend MVC Layer - API Client
 */

class ApiClient {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
  }

  /**
   * Get authentication token from localStorage
   * @returns {string|null} JWT token
   */
  getToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token');
    }
    return null;
  }

  /**
   * Get authorization headers
   * @returns {Object} Headers object with authorization
   */
  getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Handle API response with automatic token refresh
   * @param {Response} response - Fetch response object
   * @param {Object} originalRequest - Original request config for retry
   * @returns {Promise<Object>} Parsed response data
   */
  async handleResponse(response, originalRequest = null) {
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');

    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      // Handle authentication errors with token refresh
      if (response.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          // Try to refresh token using enhanced auth API
          const { authApi } = await import('../api/auth.api.js');
          await authApi.refreshTokens();

          // Retry original request with new token
          const newToken = localStorage.getItem('token') || localStorage.getItem('accessToken');
          if (newToken) {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

            // Retry the request
            const retryResponse = await fetch(originalRequest.url, originalRequest);
            return await this.handleResponse(retryResponse); // Recursive call without originalRequest to prevent infinite retry
          }
        } catch (refreshError) {
          console.error('Token refresh failed during request retry:', refreshError);
        }

        // If refresh fails, clear tokens and redirect
        if (typeof window !== 'undefined') {
          localStorage.removeItem('token');
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          window.location.href = '/login?reason=session-expired';
        }
        throw new Error(data.message || 'Unauthorized');
      }

      // Handle other errors
      const error = new Error(data.message || data.error || 'Request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * Make GET request
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} Response data
   */
  async get(endpoint, params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseURL}${endpoint}${queryString ? `?${queryString}` : ''}`;
      const headers = this.getHeaders();

      const requestConfig = {
        method: 'GET',
        headers,
        url
      };

      const response = await fetch(url, requestConfig);

      return await this.handleResponse(response, requestConfig);
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>} Response data
   */
  async post(endpoint, data = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = this.getHeaders();

      const requestConfig = {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
        url
      };

      const response = await fetch(url, requestConfig);

      return await this.handleResponse(response, requestConfig);
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>} Response data
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
   * Make PATCH request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>} Response data
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
   * Make DELETE request
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>} Response data
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
   * @param {string} endpoint - API endpoint
   * @param {FormData} formData - Form data with file
   * @returns {Promise<Object>} Response data
   */
  async upload(endpoint, formData) {
    try {
      const token = this.getToken();
      const headers = {};

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // Don't set Content-Type for FormData - browser will set it with boundary

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

// Create and export singleton instance
export const apiClient = new ApiClient();
export default apiClient;
