/**
 * Attendance Services - Model Layer
 * Contains all business logic and API calls for attendance management
 */

// Location Services
export const LocationService = {
  getCurrentPosition: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes cache
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          });
        },
        (error) => {
          let message = 'Location access denied';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out';
              break;
          }
          reject(new Error(message));
        },
        options
      );
    });
  },

  getAddress: async (latitude, longitude) => {
    try {
      const response = await fetch(
        `https://api.opencagedata.com/geocode/v1/json?q=${latitude}+${longitude}&key=YOUR_API_KEY`
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const result = data.results[0];
        const components = result.address_components;

        return {
          full_address: result.formatted,
          latitude,
          longitude,
          address: {
            road: components.road || '',
            suburb: components.suburb || components.neighbourhood || '',
            city: components.city || components.town || components.village || '',
            state: components.state || '',
            country: components.country || ''
          }
        };
      }

      throw new Error('No address found');
    } catch (error) {
      return {
        full_address: `${latitude}, ${longitude}`,
        latitude,
        longitude,
        error: error.message
      };
    }
  }
};

// Offline Services
export const OfflineService = {
  isOnline: () => navigator.onLine,

  saveOfflineRecord: (record) => {
    const offlineRecords = JSON.parse(localStorage.getItem('offlineAttendanceRecords') || '[]');
    offlineRecords.push({
      ...record,
      offlineTimestamp: Date.now()
    });
    localStorage.setItem('offlineAttendanceRecords', JSON.stringify(offlineRecords));
  },

  getOfflineRecords: () => {
    return JSON.parse(localStorage.getItem('offlineAttendanceRecords') || '[]');
  },

  clearOfflineRecords: () => {
    localStorage.removeItem('offlineAttendanceRecords');
  }
};

// WhatsApp Service
export const WhatsAppService = {
  ANAS_WHATSAPP: "919408391548",

  generateWFHMessage: (username, location) => {
    const locationText = location?.address
      ? `${location.address.city || 'Unknown City'}, ${location.address.state || 'Unknown State'}`
      : 'Location not available';

    return `Hello Anas Bhai,

${username} is working from home today.

Location: ${locationText}
Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

Best regards,
Logam Academy Task Manager`;
  },

  sendWhatsAppMessage: (username, location) => {
    const message = WhatsAppService.generateWFHMessage(username, location);
    const whatsappUrl = `https://wa.me/${WhatsAppService.ANAS_WHATSAPP}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  }
};

// Attendance API Service
export const AttendanceAPIService = {
  async loadAttendanceData(filters = {}) {
    const token = localStorage.getItem('token');

    let url = '/api/attendance';
    const params = new URLSearchParams();

    if (filters.user) params.append('user', filters.user);
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.all) params.append('all', filters.all);
    if (filters.page) params.append('page', filters.page);
    if (filters.pageSize) params.append('pageSize', filters.pageSize);

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    try {
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` },
        signal: AbortSignal.timeout(30000) // Increased to 30 seconds
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          throw new Error('Session expired - please login again');
        }
        throw new Error(`Failed to load attendance data (${response.status})`);
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'TimeoutError') {
        throw new Error('Request timed out - please check your connection');
      }
      throw error;
    }
  },

  async markAttendance(workType = 'office', location = null) {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workType,
          location,
          notes: location?.error ? `Location: ${location.error}` : ''
        }),
        signal: AbortSignal.timeout(15000) // 15 second timeout for mark attendance
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          throw new Error('Session expired - please login again');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark attendance');
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'TimeoutError') {
        throw new Error('Mark attendance timed out - please try again');
      }
      throw error;
    }
  },

  async clockOut() {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          throw new Error('Session expired - please login again');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clock out');
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'TimeoutError') {
        throw new Error('Clock out timed out - please try again');
      }
      throw error;
    }
  },

  async updateAttendanceRecord(recordId, updates) {
    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`/api/attendance/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updates),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          throw new Error('Session expired - please login again');
        }
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update record');
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'TimeoutError') {
        throw new Error('Update timed out - please try again');
      }
      throw error;
    }
  }
};