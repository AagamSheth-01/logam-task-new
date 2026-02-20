/**
 * Enhanced API Client with Automatic Token Refresh
 * Handles automatic token refresh and request retry on 401 errors
 */

class ApiClientWithRefresh {
  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
    this.isRefreshing = false;
    this.failedQueue = [];
  }

  /**
   * Get access token from localStorage
   */
  getAccessToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('token') || localStorage.getItem('accessToken');
    }
    return null;
  }

  /**
   * Get refresh token from localStorage
   */
  getRefreshToken() {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refreshToken');
    }
    return null;
  }

  /**
   * Set tokens in localStorage
   */
  setTokens(accessToken, refreshToken) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', accessToken); // For backward compatibility
      localStorage.setItem('accessToken', accessToken);
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
    }
  }

  /**
   * Clear all tokens
   */
  clearTokens() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }
  }

  /**
   * Check if token is expired or about to expire
   */
  isTokenExpiring(token, bufferMinutes = 5) {
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      const bufferTime = bufferMinutes * 60; // Convert to seconds
      return payload.exp < (now + bufferTime);
    } catch (error) {
      return true;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken() {
    const refreshToken = this.getRefreshToken();

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();

      if (data.success && data.accessToken) {
        this.setTokens(data.accessToken, data.refreshToken);

        // Update user data if provided
        if (data.user) {
          localStorage.setItem('user', JSON.stringify(data.user));
        }

        return data.accessToken;
      } else {
        throw new Error('Invalid refresh response');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearTokens();
      throw error;
    }
  }

  /**
   * Get authorization headers with automatic token refresh
   */
  async getHeaders() {
    const headers = {
      'Content-Type': 'application/json',
    };

    let accessToken = this.getAccessToken();

    // Check if token needs refresh
    if (this.isTokenExpiring(accessToken)) {
      try {
        accessToken = await this.refreshAccessToken();
      } catch (error) {
        // If refresh fails, redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login?reason=token-refresh-failed';
        }
        throw error;
      }
    }

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    return headers;
  }

  /**
   * Process queued requests after token refresh
   */
  processQueue(error, token = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });

    this.failedQueue = [];
  }

  /**
   * Handle response with automatic retry on 401
   */
  async handleResponse(response, originalRequest) {
    if (response.status === 401 && !originalRequest._retry) {
      if (this.isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          this.failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers['Authorization'] = `Bearer ${token}`;
          return fetch(originalRequest.url, originalRequest);
        });
      }

      originalRequest._retry = true;
      this.isRefreshing = true;

      try {
        const newToken = await this.refreshAccessToken();
        this.processQueue(null, newToken);

        // Retry original request with new token
        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
        return fetch(originalRequest.url, originalRequest);
      } catch (error) {
        this.processQueue(error, null);
        this.clearTokens();

        if (typeof window !== 'undefined') {
          window.location.href = '/login?reason=session-expired';
        }
        throw error;
      } finally {
        this.isRefreshing = false;
      }
    }

    // Parse response
    const contentType = response.headers.get('content-type');
    const isJson = contentType && contentType.includes('application/json');
    const data = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const error = new Error(data.message || data.error || 'Request failed');
      error.status = response.status;
      error.data = data;
      throw error;
    }

    return data;
  }

  /**
   * Make GET request with automatic token refresh
   */
  async get(endpoint, params = {}) {
    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseURL}${endpoint}${queryString ? `?${queryString}` : ''}`;
      const headers = await this.getHeaders();

      const requestConfig = {
        method: 'GET',
        headers,
        url
      };

      const response = await fetch(url, {
        method: 'GET',
        headers,
      });

      return await this.handleResponse(response, requestConfig);
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make POST request with automatic token refresh
   */
  async post(endpoint, data = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = await this.getHeaders();

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
   * Make PUT request with automatic token refresh
   */
  async put(endpoint, data = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = await this.getHeaders();

      const requestConfig = {
        method: 'PUT',
        headers,
        body: JSON.stringify(data),
        url
      };

      const response = await fetch(url, requestConfig);

      return await this.handleResponse(response, requestConfig);
    } catch (error) {
      console.error(`PUT ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make PATCH request with automatic token refresh
   */
  async patch(endpoint, data = {}) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = await this.getHeaders();

      const requestConfig = {
        method: 'PATCH',
        headers,
        body: JSON.stringify(data),
        url
      };

      const response = await fetch(url, requestConfig);

      return await this.handleResponse(response, requestConfig);
    } catch (error) {
      console.error(`PATCH ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Make DELETE request with automatic token refresh
   */
  async delete(endpoint) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      const headers = await this.getHeaders();

      const requestConfig = {
        method: 'DELETE',
        headers,
        url
      };

      const response = await fetch(url, requestConfig);

      return await this.handleResponse(response, requestConfig);
    } catch (error) {
      console.error(`DELETE ${endpoint} failed:`, error);
      throw error;
    }
  }

  /**
   * Upload file with automatic token refresh
   */
  async upload(endpoint, formData) {
    try {
      const url = `${this.baseURL}${endpoint}`;
      let accessToken = this.getAccessToken();

      // Check if token needs refresh
      if (this.isTokenExpiring(accessToken)) {
        try {
          accessToken = await this.refreshAccessToken();
        } catch (error) {
          if (typeof window !== 'undefined') {
            window.location.href = '/login?reason=token-refresh-failed';
          }
          throw error;
        }
      }

      const headers = {};
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const requestConfig = {
        method: 'POST',
        headers,
        body: formData,
        url
      };

      const response = await fetch(url, requestConfig);

      return await this.handleResponse(response, requestConfig);
    } catch (error) {
      console.error(`UPLOAD ${endpoint} failed:`, error);
      throw error;
    }
  }
}

// Create and export singleton instance
export const apiClientWithRefresh = new ApiClientWithRefresh();
export default apiClientWithRefresh;