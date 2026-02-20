/**
 * Robust Location Service
 * Handles location errors gracefully with multiple fallback mechanisms
 * Ensures users can always mark attendance regardless of location issues
 */

export class RobustLocationService {
  constructor() {
    this.maxRetries = 3;
    this.timeoutMs = 15000; // 15 seconds
    this.fallbackTimeoutMs = 5000; // 5 seconds for fallback attempts
    this.lastKnownLocation = this.getLastKnownLocation();
  }

  /**
   * Get current position with robust error handling and fallbacks
   */
  async getCurrentPosition(options = {}) {
    const config = {
      enableHighAccuracy: true,
      timeout: this.timeoutMs,
      maximumAge: 300000, // 5 minutes cache
      allowFallback: true,
      ...options
    };

    // Check if geolocation is supported
    if (!this.isGeolocationSupported()) {
      if (config.allowFallback) {
        return this.getFallbackLocation('Geolocation not supported');
      }
      throw new Error('Geolocation is not supported by this browser');
    }

    let lastError = null;

    // Attempt to get location with retries
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Location attempt ${attempt}/${this.maxRetries}`);

        const position = await this.getPositionWithTimeout({
          ...config,
          timeout: attempt === 1 ? config.timeout : this.fallbackTimeoutMs
        });

        const locationData = this.formatLocationData(position);

        // Save as last known location
        this.saveLastKnownLocation(locationData);

        console.log('✅ Location obtained successfully');
        return locationData;

      } catch (error) {
        lastError = error;
        console.warn(`Location attempt ${attempt} failed:`, error.message);

        // If it's a permission error, don't retry
        if (error.code === 1) { // PERMISSION_DENIED
          break;
        }

        // Use less accurate settings for subsequent attempts
        if (attempt < this.maxRetries) {
          config.enableHighAccuracy = false;
          config.timeout = this.fallbackTimeoutMs;
        }
      }
    }

    // All attempts failed, use fallback if allowed
    if (config.allowFallback) {
      console.log('🔄 Using fallback location strategy');
      return this.getFallbackLocation(lastError?.message || 'Location access failed');
    }

    throw lastError || new Error('Failed to get location after multiple attempts');
  }

  /**
   * Get position with timeout wrapper
   */
  getPositionWithTimeout(options) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Location request timed out'));
      }, options.timeout);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          resolve(position);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(this.enhanceLocationError(error));
        },
        {
          enableHighAccuracy: options.enableHighAccuracy,
          timeout: options.timeout,
          maximumAge: options.maximumAge
        }
      );
    });
  }

  /**
   * Get fallback location when GPS fails
   */
  async getFallbackLocation(reason) {
    console.log('🔄 Attempting fallback location methods');

    // Try last known location first
    if (this.lastKnownLocation && this.isLocationRecent(this.lastKnownLocation)) {
      console.log('📍 Using recent cached location');
      return {
        ...this.lastKnownLocation,
        isFallback: true,
        fallbackReason: reason,
        fallbackType: 'cached'
      };
    }

    // Try network-based location (if available)
    const networkLocation = await this.tryNetworkLocation();
    if (networkLocation) {
      console.log('📍 Using network-based location');
      return {
        ...networkLocation,
        isFallback: true,
        fallbackReason: reason,
        fallbackType: 'network'
      };
    }

    // Use default office location or manual input
    const manualLocation = await this.getManualLocationInput();
    if (manualLocation) {
      console.log('📍 Using manual location input');
      return {
        ...manualLocation,
        isFallback: true,
        fallbackReason: reason,
        fallbackType: 'manual'
      };
    }

    // Last resort: return approximate location with user consent
    return this.getConsentBasedFallback(reason);
  }

  /**
   * Try network-based location (IP geolocation)
   */
  async tryNetworkLocation() {
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Network location timeout')), 5000);
      });

      // Race between fetch and timeout
      const response = await Promise.race([
        fetch('https://ipapi.co/json/'),
        timeoutPromise
      ]);

      if (response.ok) {
        const data = await response.json();
        if (data.latitude && data.longitude) {
          return {
            latitude: data.latitude,
            longitude: data.longitude,
            accuracy: 10000, // Low accuracy for IP-based location
            timestamp: new Date().toISOString(),
            source: 'ip_geolocation',
            city: data.city,
            region: data.region,
            country: data.country_name
          };
        }
      }
    } catch (error) {
      console.warn('Network location failed:', error.message);
    }
    return null;
  }

  /**
   * Get manual location input from user
   */
  async getManualLocationInput() {
    return new Promise((resolve) => {
      const modal = this.createLocationInputModal();
      document.body.appendChild(modal);

      const handleSubmit = (location) => {
        document.body.removeChild(modal);
        if (location) {
          resolve({
            latitude: location.latitude,
            longitude: location.longitude,
            accuracy: 1000,
            timestamp: new Date().toISOString(),
            source: 'manual_input',
            address: location.address
          });
        } else {
          resolve(null);
        }
      };

      // Set up modal event listeners
      modal.querySelector('#location-submit').onclick = () => {
        const address = modal.querySelector('#location-address').value.trim();
        if (address) {
          // In a real implementation, you'd geocode this address
          handleSubmit({
            latitude: 0, // Placeholder
            longitude: 0, // Placeholder
            address: address
          });
        } else {
          handleSubmit(null);
        }
      };

      modal.querySelector('#location-cancel').onclick = () => handleSubmit(null);

      // Auto-close after 30 seconds
      setTimeout(() => {
        if (document.body.contains(modal)) {
          handleSubmit(null);
        }
      }, 30000);
    });
  }

  /**
   * Create modal for manual location input
   */
  createLocationInputModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    modal.innerHTML = `
      <div class="bg-white p-6 rounded-lg max-w-md mx-4">
        <h3 class="text-lg font-semibold mb-4">Location Required</h3>
        <p class="text-gray-600 mb-4">
          We couldn't detect your location automatically. Please enter your current location to mark attendance.
        </p>
        <input
          id="location-address"
          type="text"
          placeholder="Enter your current address or location"
          class="w-full p-3 border border-gray-300 rounded mb-4"
        />
        <div class="flex space-x-3">
          <button id="location-submit" class="flex-1 bg-blue-500 text-white p-3 rounded hover:bg-blue-600">
            Submit
          </button>
          <button id="location-cancel" class="flex-1 bg-gray-300 text-gray-700 p-3 rounded hover:bg-gray-400">
            Skip
          </button>
        </div>
      </div>
    `;
    return modal;
  }

  /**
   * Get consent-based fallback location
   */
  async getConsentBasedFallback(reason) {
    const userConsent = confirm(
      `Location access failed: ${reason}\n\n` +
      `Would you like to mark attendance without precise location data? ` +
      `This will be noted in your attendance record.`
    );

    if (userConsent) {
      return {
        latitude: null,
        longitude: null,
        accuracy: null,
        timestamp: new Date().toISOString(),
        isFallback: true,
        fallbackReason: reason,
        fallbackType: 'user_consent',
        source: 'user_consent',
        note: 'User chose to proceed without location data'
      };
    }

    throw new Error('User declined to mark attendance without location');
  }

  /**
   * Format location data consistently
   */
  formatLocationData(position) {
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      altitudeAccuracy: position.coords.altitudeAccuracy,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: new Date().toISOString(),
      source: 'gps'
    };
  }

  /**
   * Enhance location error with user-friendly messages
   */
  enhanceLocationError(error) {
    const errorMessages = {
      1: 'Location access denied. Please allow location permissions in your browser settings.',
      2: 'Location information unavailable. Please check your device settings.',
      3: 'Location request timed out. Please try again or check your internet connection.'
    };

    const enhancedError = new Error(errorMessages[error.code] || error.message);
    enhancedError.code = error.code;
    enhancedError.originalError = error;
    return enhancedError;
  }

  /**
   * Check if geolocation is supported
   */
  isGeolocationSupported() {
    return 'geolocation' in navigator && typeof navigator.geolocation.getCurrentPosition === 'function';
  }

  /**
   * Check if location is recent enough to use
   */
  isLocationRecent(location, maxAgeMs = 1800000) { // 30 minutes default
    if (!location || !location.timestamp) return false;
    const age = Date.now() - new Date(location.timestamp).getTime();
    return age < maxAgeMs;
  }

  /**
   * Save location to local storage
   */
  saveLastKnownLocation(location) {
    try {
      localStorage.setItem('lastKnownLocation', JSON.stringify({
        ...location,
        savedAt: new Date().toISOString()
      }));
      this.lastKnownLocation = location;
    } catch (error) {
      console.warn('Could not save location to storage:', error);
    }
  }

  /**
   * Get last known location from storage
   */
  getLastKnownLocation() {
    try {
      if (typeof window === 'undefined') return null; // SSR safety
      const stored = localStorage.getItem('lastKnownLocation');
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.warn('Could not retrieve location from storage:', error);
      return null;
    }
  }

  /**
   * Get user-friendly location description
   */
  getLocationDescription(location) {
    if (!location) return 'Location unavailable';

    if (location.isFallback) {
      const fallbackTypes = {
        'cached': 'Using recent location',
        'network': 'Approximate location',
        'manual': 'Manual location entry',
        'user_consent': 'Location waived by user'
      };
      return fallbackTypes[location.fallbackType] || 'Fallback location';
    }

    const accuracy = location.accuracy;
    if (accuracy <= 10) return 'Precise location (GPS)';
    if (accuracy <= 100) return 'Accurate location (GPS)';
    if (accuracy <= 1000) return 'Approximate location';
    return 'General location';
  }

  /**
   * Validate location data for attendance
   */
  validateLocation(location) {
    const validation = {
      isValid: true,
      warnings: [],
      errors: []
    };

    if (!location) {
      validation.isValid = false;
      validation.errors.push('No location data available');
      return validation;
    }

    // Check for fallback location
    if (location.isFallback) {
      validation.warnings.push(`Using fallback location: ${location.fallbackReason}`);
    }

    // Check accuracy
    if (location.accuracy && location.accuracy > 1000) {
      validation.warnings.push('Location accuracy is low');
    }

    // Check if location is too old
    if (!this.isLocationRecent(location)) {
      validation.warnings.push('Location data is outdated');
    }

    return validation;
  }

  /**
   * Clear stored location data
   */
  clearStoredLocation() {
    try {
      localStorage.removeItem('lastKnownLocation');
      this.lastKnownLocation = null;
    } catch (error) {
      console.warn('Could not clear stored location:', error);
    }
  }
}

// Default instance
export const robustLocationService = new RobustLocationService();

// Backward compatibility functions
export const getCurrentPosition = (options) => robustLocationService.getCurrentPosition(options);
export const getLocationDescription = (location) => robustLocationService.getLocationDescription(location);
export const validateLocation = (location) => robustLocationService.validateLocation(location);

export default robustLocationService;