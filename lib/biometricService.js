/**
 * Biometric Authentication Service
 * Implements WebAuthn API for Touch ID, Face ID, and Fingerprint authentication
 * Supports iOS Touch ID/Face ID, Android Fingerprint, Windows Hello
 */

import { getIndiaDateTime, getIndiaDate, getIndiaLocaleTimeString } from './timezoneClient';

class BiometricService {
  constructor() {
    this.isSupported = this.checkSupport();
    this.enrolledCredentials = new Map();
    this.challengeTimeout = 60000; // 60 seconds
  }

  /**
   * Check if WebAuthn and biometric authentication is supported
   */
  checkSupport() {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return false;
    }

    return !!(
      window.PublicKeyCredential &&
      window.navigator.credentials &&
      window.navigator.credentials.create &&
      window.navigator.credentials.get
    );
  }

  /**
   * Get device biometric capabilities
   */
  async getBiometricCapabilities() {
    if (!this.isSupported) {
      return {
        supported: false,
        reason: 'WebAuthn not supported on this device'
      };
    }

    // Check if we're in a browser environment
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return {
        supported: false,
        reason: 'Running in server environment'
      };
    }

    try {
      console.log('🔍 [BiometricService] Checking platform authenticator availability...');
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      console.log('🔍 [BiometricService] Platform authenticator available:', available);

      // Also check for conditional mediation support
      let conditionalMediationSupported = false;
      if (PublicKeyCredential.isConditionalMediationAvailable) {
        conditionalMediationSupported = await PublicKeyCredential.isConditionalMediationAvailable();
        console.log('🔍 [BiometricService] Conditional mediation available:', conditionalMediationSupported);
      }

      // Be more lenient - allow if WebAuthn is supported even without platform authenticator
      if (!available) {
        console.log('⚠️ [BiometricService] No platform authenticator, but WebAuthn is available');
        return {
          supported: true, // Allow WebAuthn even without platform auth
          reason: 'WebAuthn available, platform authenticator not detected',
          biometricType: 'webauthn',
          platformAuthenticator: false
        };
      }

      // Detect device type and available biometric methods
      const userAgent = navigator.userAgent.toLowerCase();
      let availableMethods = [];
      let primaryMethod = 'fingerprint'; // default

      if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
        // iOS devices - could have both Touch ID and Face ID
        availableMethods = ['touch-id', 'face-id'];
        primaryMethod = 'touch-id'; // Default to Touch ID if available
      } else if (userAgent.includes('mac')) {
        // macOS - usually Touch ID
        availableMethods = ['touch-id'];
        primaryMethod = 'touch-id';
      } else if (userAgent.includes('windows')) {
        // Windows Hello - face, fingerprint, or PIN
        availableMethods = ['windows-hello-face', 'windows-hello-fingerprint'];
        primaryMethod = 'windows-hello-fingerprint';
      } else if (userAgent.includes('android')) {
        // Android - usually fingerprint, sometimes face
        availableMethods = ['fingerprint', 'face-unlock'];
        primaryMethod = 'fingerprint';
      } else {
        // Generic biometric support
        availableMethods = ['biometric'];
        primaryMethod = 'biometric';
      }

      return {
        supported: true,
        biometricType: primaryMethod,
        availableMethods: availableMethods,
        canSelectMethod: availableMethods.length > 1,
        userAgent: userAgent
      };

    } catch (error) {
      return {
        supported: false,
        reason: 'Error checking biometric capabilities',
        error: error.message
      };
    }
  }

  /**
   * Generate a random challenge for authentication
   */
  generateChallenge() {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    return challenge;
  }

  /**
   * Convert string to Uint8Array
   */
  stringToUint8Array(str) {
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }

  /**
   * Convert Uint8Array to base64
   */
  uint8ArrayToBase64(uint8Array) {
    // Handle large arrays by processing in chunks to avoid call stack limits
    let binary = '';
    const chunkSize = 0x8000; // 32KB chunks
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, chunk);
    }
    return btoa(binary);
  }

  /**
   * Convert base64 to Uint8Array
   */
  base64ToUint8Array(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Enroll user for biometric authentication
   * @param {Object} user - User object
   * @param {string} preferredMethod - Specific biometric method: 'fingerprint', 'face-id', 'touch-id', etc.
   */
  async enrollBiometric(user, preferredMethod = null) {
    if (!this.isSupported) {
      throw new Error('Biometric authentication not supported on this device');
    }

    const capabilities = await this.getBiometricCapabilities();
    if (!capabilities.supported) {
      throw new Error(capabilities.reason);
    }

    // Check if preferred method is available
    if (preferredMethod && capabilities.availableMethods) {
      if (!capabilities.availableMethods.includes(preferredMethod)) {
        throw new Error(`${this.getBiometricDisplayName(preferredMethod)} is not available on this device. Available methods: ${capabilities.availableMethods.map(m => this.getBiometricDisplayName(m)).join(', ')}`);
      }
    }

    try {
      const challenge = this.generateChallenge();
      const userId = this.stringToUint8Array(user.username);

      // Configure authenticator selection based on preferred method
      let authenticatorSelection = {
        authenticatorAttachment: "platform", // Built-in authenticators only
        userVerification: "preferred", // Prefer biometric but allow fallback
        residentKey: "preferred", // Store credential on device if possible
        requireResidentKey: false, // Don't require resident key
      };

      // Adjust settings for specific biometric methods
      if (preferredMethod) {
        console.log(`🎯 [BiometricService] Configuring for specific method: ${preferredMethod}`);

        if (preferredMethod.includes('face') || preferredMethod === 'face-id') {
          // Face-based authentication - require biometric verification
          authenticatorSelection.userVerification = "required";
        } else if (preferredMethod.includes('fingerprint') || preferredMethod === 'touch-id') {
          // Fingerprint-based authentication - require biometric verification
          authenticatorSelection.userVerification = "required";
        }
      }

      const publicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "Logam Task Manager",
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: user.email || user.username,
          displayName: user.displayName || user.username,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection,
        timeout: this.challengeTimeout,
        attestation: "direct",
      };

      console.log('🚀 [BiometricService] Starting biometric enrollment for:', user.username);
      console.log('🔍 [BiometricService] RP ID:', window.location.hostname);
      console.log('🔍 [BiometricService] Credential creation options:', publicKeyCredentialCreationOptions);

      let credential;
      try {
        credential = await navigator.credentials.create({
          publicKey: publicKeyCredentialCreationOptions,
        });
        console.log('✅ [BiometricService] Platform credential created:', credential);
      } catch (platformError) {
        console.log('⚠️ [BiometricService] Platform authenticator failed:', platformError);
        console.log('🔄 [BiometricService] Trying with cross-platform authenticator...');

        // Try again without platform restriction
        const fallbackOptions = {
          ...publicKeyCredentialCreationOptions,
          authenticatorSelection: {
            userVerification: "preferred",
            residentKey: "preferred",
            requireResidentKey: false,
            // Remove authenticatorAttachment to allow any authenticator
          }
        };

        console.log('🔍 [BiometricService] Fallback options:', fallbackOptions);
        credential = await navigator.credentials.create({
          publicKey: fallbackOptions,
        });
        console.log('✅ [BiometricService] Cross-platform credential created:', credential);
      }

      if (!credential) {
        throw new Error('Failed to create biometric credential');
      }

      // Store credential info locally (in production, also store on server)
      const credentialData = {
        credentialId: this.uint8ArrayToBase64(credential.rawId),
        publicKey: this.uint8ArrayToBase64(credential.response.getPublicKey()),
        enrolledAt: getIndiaDateTime().toISOString(),
        biometricType: preferredMethod || capabilities.biometricType,
        preferredMethod: preferredMethod,
        availableMethods: capabilities.availableMethods,
        deviceInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
        }
      };

      // Save to localStorage (in production, send to server)
      const existingCreds = JSON.parse(localStorage.getItem(`biometric_${user.username}`) || '[]');
      existingCreds.push(credentialData);
      localStorage.setItem(`biometric_${user.username}`, JSON.stringify(existingCreds));

      console.log('Biometric enrollment successful');
      return {
        success: true,
        credentialId: credentialData.credentialId,
        biometricType: capabilities.biometricType,
        enrolledAt: credentialData.enrolledAt
      };

    } catch (error) {
      console.error('❌ [BiometricService] Biometric enrollment failed:', error);
      console.error('❌ [BiometricService] Error name:', error.name);
      console.error('❌ [BiometricService] Error message:', error.message);
      console.error('❌ [BiometricService] Error stack:', error.stack);

      let userFriendlyMessage = 'Biometric enrollment failed';
      if (error.name === 'NotAllowedError') {
        userFriendlyMessage = 'Biometric enrollment was cancelled or not permitted';
      } else if (error.name === 'NotSupportedError') {
        userFriendlyMessage = 'Biometric authentication not supported on this device';
      } else if (error.name === 'SecurityError') {
        userFriendlyMessage = 'Security error during biometric enrollment';
      } else if (error.name === 'AbortError') {
        userFriendlyMessage = 'Biometric enrollment was aborted';
      } else if (error.name === 'InvalidStateError') {
        userFriendlyMessage = 'Biometric device is not available or already in use';
      }

      console.error('❌ [BiometricService] User-friendly message:', userFriendlyMessage);
      throw new Error(userFriendlyMessage);
    }
  }

  /**
   * Authenticate user using biometrics for attendance
   */
  async authenticateBiometric(username, action = 'attendance') {
    if (!this.isSupported) {
      throw new Error('Biometric authentication not supported on this device');
    }

    try {
      // Get stored credentials for user
      const storedCreds = JSON.parse(localStorage.getItem(`biometric_${username}`) || '[]');

      if (storedCreds.length === 0) {
        throw new Error('No biometric credentials enrolled for this user');
      }

      // Prepare challenge
      const challenge = this.generateChallenge();

      // Get all credential IDs
      const allowCredentials = storedCreds.map(cred => ({
        id: this.base64ToUint8Array(cred.credentialId),
        type: "public-key",
        transports: ["internal"], // Platform authenticator
      }));

      const publicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials,
        userVerification: "required",
        timeout: this.challengeTimeout,
      };

      console.log(`Starting biometric authentication for ${action}:`, username);
      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions,
      });

      if (!assertion) {
        throw new Error('Biometric authentication failed');
      }

      // Find the used credential
      const usedCredId = this.uint8ArrayToBase64(assertion.rawId);
      const usedCredential = storedCreds.find(cred => cred.credentialId === usedCredId);

      console.log('Biometric authentication successful');

      // Log successful authentication
      const authLog = {
        username,
        action,
        timestamp: getIndiaDateTime().toISOString(),
        date: getIndiaDate(),
        time: getIndiaLocaleTimeString(),
        biometricType: usedCredential?.biometricType || 'unknown',
        credentialId: usedCredId
      };

      // Store authentication log
      const authHistory = JSON.parse(localStorage.getItem(`biometric_auth_${username}`) || '[]');
      authHistory.unshift(authLog); // Add to beginning

      // Keep only last 50 authentications
      if (authHistory.length > 50) {
        authHistory.splice(50);
      }

      localStorage.setItem(`biometric_auth_${username}`, JSON.stringify(authHistory));

      return {
        success: true,
        timestamp: authLog.timestamp,
        biometricType: authLog.biometricType,
        credentialUsed: usedCredId
      };

    } catch (error) {
      console.error('Biometric authentication failed:', error);

      let userFriendlyMessage = 'Biometric authentication failed';
      if (error.name === 'NotAllowedError') {
        userFriendlyMessage = 'Biometric authentication was cancelled';
      } else if (error.name === 'InvalidStateError') {
        userFriendlyMessage = 'Please enroll biometric authentication first';
      } else if (error.name === 'SecurityError') {
        userFriendlyMessage = 'Security error during authentication';
      } else if (error.name === 'AbortError') {
        userFriendlyMessage = 'Biometric authentication timed out';
      } else if (error.message.includes('No biometric credentials')) {
        userFriendlyMessage = 'Please enroll biometric authentication first';
      }

      throw new Error(userFriendlyMessage);
    }
  }

  /**
   * Check if user has enrolled biometric credentials
   */
  isEnrolled(username) {
    const storedCreds = JSON.parse(localStorage.getItem(`biometric_${username}`) || '[]');
    return storedCreds.length > 0;
  }

  /**
   * Get display name for biometric method
   */
  getBiometricDisplayName(method) {
    const displayNames = {
      'touch-id': 'Touch ID',
      'face-id': 'Face ID',
      'fingerprint': 'Fingerprint',
      'face-unlock': 'Face Unlock',
      'windows-hello-face': 'Windows Hello (Face)',
      'windows-hello-fingerprint': 'Windows Hello (Fingerprint)',
      'windows-hello': 'Windows Hello',
      'biometric': 'Biometric Authentication'
    };
    return displayNames[method] || method;
  }

  /**
   * Get biometric enrollment info for user
   */
  getEnrollmentInfo(username) {
    const storedCreds = JSON.parse(localStorage.getItem(`biometric_${username}`) || '[]');

    if (storedCreds.length === 0) {
      return null;
    }

    const latest = storedCreds[storedCreds.length - 1];
    return {
      enrolled: true,
      credentialCount: storedCreds.length,
      latestEnrollment: latest.enrolledAt,
      biometricType: latest.biometricType,
      deviceInfo: latest.deviceInfo
    };
  }

  /**
   * Remove biometric credentials for user
   */
  unenrollBiometric(username) {
    localStorage.removeItem(`biometric_${username}`);
    localStorage.removeItem(`biometric_auth_${username}`);
    return { success: true, message: 'Biometric credentials removed' };
  }

  /**
   * Get biometric authentication history
   */
  getAuthHistory(username, limit = 10) {
    const authHistory = JSON.parse(localStorage.getItem(`biometric_auth_${username}`) || '[]');
    return authHistory.slice(0, limit);
  }

  /**
   * Quick clock in with biometrics
   */
  async quickClockIn(username, workType = 'office') {
    try {
      // Authenticate with biometrics
      const authResult = await this.authenticateBiometric(username, 'clock_in');

      if (!authResult.success) {
        throw new Error('Biometric authentication failed');
      }

      // Return clock-in data with biometric verification
      return {
        success: true,
        biometricAuth: true,
        authTimestamp: authResult.timestamp,
        biometricType: authResult.biometricType,
        workType,
        verified: true
      };

    } catch (error) {
      console.error('Quick clock in failed:', error);
      throw error;
    }
  }

  /**
   * Quick clock out with biometrics
   */
  async quickClockOut(username) {
    try {
      // Authenticate with biometrics
      const authResult = await this.authenticateBiometric(username, 'clock_out');

      if (!authResult.success) {
        throw new Error('Biometric authentication failed');
      }

      // Return clock-out data with biometric verification
      return {
        success: true,
        biometricAuth: true,
        authTimestamp: authResult.timestamp,
        biometricType: authResult.biometricType,
        verified: true
      };

    } catch (error) {
      console.error('Quick clock out failed:', error);
      throw error;
    }
  }

  /**
   * Get friendly name for biometric type
   */
  getBiometricDisplayName(biometricType) {
    switch (biometricType) {
      case 'touch-id-face-id':
        return 'Touch ID / Face ID';
      case 'touch-id':
        return 'Touch ID';
      case 'face-id':
        return 'Face ID';
      case 'fingerprint':
        return 'Fingerprint';
      case 'windows-hello':
        return 'Windows Hello';
      default:
        return 'Biometric Authentication';
    }
  }
}

// Create singleton instance
const biometricService = new BiometricService();

export default biometricService;