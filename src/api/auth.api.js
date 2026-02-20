/**
 * Authentication API Client
 * Handles all authentication-related API calls
 * Frontend MVC Layer - API Module
 */

import apiClient from './client.js';

export class AuthApi {
  /**
   * Login user
   * @param {Object} credentials - Login credentials
   * @param {string} credentials.username - Username
   * @param {string} credentials.password - Password
   * @returns {Promise<Object>} Login response with token and user data
   */
  async login(credentials) {
    // Login endpoint doesn't need auth token
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    // Store tokens and user in localStorage
    if (data.accessToken || data.token) {
      const accessToken = data.accessToken || data.token;
      localStorage.setItem('token', accessToken); // For backward compatibility
      localStorage.setItem('accessToken', accessToken);

      if (data.refreshToken) {
        localStorage.setItem('refreshToken', data.refreshToken);
      }

      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }
    }

    return data;
  }

  /**
   * Logout user
   * Clears local storage and redirects to login
   */
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }

  /**
   * Register new user
   * @param {Object} userData - Registration data
   * @returns {Promise<Object>} Registration response
   */
  async register(userData) {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Registration failed');
    }

    return data;
  }

  /**
   * Request password reset
   * @param {string} email - User email
   * @returns {Promise<Object>} Response
   */
  async forgotPassword(email) {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Request failed');
    }

    return data;
  }

  /**
   * Reset password with token
   * @param {string} token - Reset token
   * @param {string} password - New password
   * @returns {Promise<Object>} Response
   */
  async resetPassword(token, password) {
    const response = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Password reset failed');
    }

    return data;
  }

  /**
   * Get current user from localStorage
   * @returns {Object|null} Current user or null
   */
  getCurrentUser() {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          return JSON.parse(userStr);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} True if authenticated
   */
  isAuthenticated() {
    return !!apiClient.getToken();
  }

  /**
   * Check if user is admin
   * @returns {boolean} True if admin
   */
  isAdmin() {
    const user = this.getCurrentUser();
    return user && user.role?.toLowerCase() === 'admin';
  }

  /**
   * Refresh access token using refresh token
   * @returns {Promise<Object>} New tokens
   */
  async refreshTokens() {
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Token refresh failed');
    }

    // Store new tokens
    if (data.accessToken) {
      localStorage.setItem('token', data.accessToken); // For backward compatibility
      localStorage.setItem('accessToken', data.accessToken);
    }

    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }

    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
    }

    return data;
  }

  /**
   * Check if token is expired or about to expire
   * @param {number} bufferMinutes - Minutes buffer before expiration
   * @returns {boolean} True if token is expiring
   */
  isTokenExpiring(bufferMinutes = 5) {
    const token = localStorage.getItem('accessToken') || localStorage.getItem('token');
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      const bufferTime = bufferMinutes * 60;
      return payload.exp < (now + bufferTime);
    } catch (error) {
      return true;
    }
  }
}

// Export singleton instance
export const authApi = new AuthApi();
export default authApi;
