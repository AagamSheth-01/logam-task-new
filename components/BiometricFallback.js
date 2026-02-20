/**
 * Biometric Fallback Component
 * Provides alternative authentication methods when biometrics are not available
 */

import React, { useState } from 'react';
import {
  AlertCircle,
  Smartphone,
  Lock,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  X,
  RefreshCw,
  Shield,
  Clock,
  Fingerprint,
  HelpCircle
} from 'lucide-react';

const BiometricFallback = ({
  user,
  isOpen,
  onClose,
  onSuccess,
  action = 'clock_in',
  reason = 'Biometric authentication not available'
}) => {
  const [fallbackMethod, setFallbackMethod] = useState('password'); // 'password', 'pin', 'pattern'
  const [password, setPassword] = useState('');
  const [pin, setPin] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const maxAttempts = 3;

  const handlePasswordAuth = async () => {
    if (!password.trim()) {
      setError('Please enter your password');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Simulate password verification (replace with actual API call)
      const response = await fetch('/api/auth/verify-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          username: user.username,
          password: password
        })
      });

      const result = await response.json();

      if (result.success) {
        // Success - proceed with attendance action
        if (onSuccess) {
          onSuccess({
            method: 'password',
            timestamp: new Date().toISOString(),
            verified: true
          });
        }
      } else {
        setAttempts(prev => prev + 1);
        setError(result.message || 'Invalid password');

        if (attempts + 1 >= maxAttempts) {
          setError('Too many failed attempts. Please try again later.');
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      }
    } catch (err) {
      setError('Authentication failed. Please try again.');
    } finally {
      setLoading(false);
      setPassword('');
    }
  };

  const handlePinAuth = async () => {
    if (pin.length !== 4) {
      setError('Please enter a 4-digit PIN');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Simulate PIN verification
      const storedPin = localStorage.getItem(`pin_${user.username}`);

      if (!storedPin) {
        setError('No PIN set up. Please use password authentication.');
        setFallbackMethod('password');
        return;
      }

      if (pin === storedPin) {
        if (onSuccess) {
          onSuccess({
            method: 'pin',
            timestamp: new Date().toISOString(),
            verified: true
          });
        }
      } else {
        setAttempts(prev => prev + 1);
        setError('Invalid PIN');

        if (attempts + 1 >= maxAttempts) {
          setError('Too many failed attempts. Account temporarily locked.');
          setTimeout(() => {
            onClose();
          }, 2000);
        }
      }
    } catch (err) {
      setError('PIN verification failed');
    } finally {
      setLoading(false);
      setPin('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (fallbackMethod === 'password') {
      handlePasswordAuth();
    } else if (fallbackMethod === 'pin') {
      handlePinAuth();
    }
  };

  const getFallbackIcon = () => {
    switch (fallbackMethod) {
      case 'password':
        return <Key className="w-6 h-6 text-blue-600" />;
      case 'pin':
        return <Lock className="w-6 h-6 text-green-600" />;
      default:
        return <Shield className="w-6 h-6 text-gray-600" />;
    }
  };

  const getFallbackDescription = () => {
    switch (fallbackMethod) {
      case 'password':
        return 'Enter your account password to verify your identity';
      case 'pin':
        return 'Enter your 4-digit PIN for quick verification';
      default:
        return 'Choose an alternative authentication method';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Alternative Authentication</h2>
              <p className="text-sm text-gray-600">Verify your identity to continue</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Reason for fallback */}
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800 mb-1">Biometric Unavailable</h3>
                <p className="text-sm text-yellow-700">{reason}</p>
              </div>
            </div>
          </div>

          {/* Method Selection */}
          <div className="mb-6">
            <h3 className="font-medium text-gray-900 mb-3">Choose Authentication Method</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFallbackMethod('password')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  fallbackMethod === 'password'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Key className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                <div className="text-sm font-medium text-gray-900">Password</div>
                <div className="text-xs text-gray-500">Account password</div>
              </button>

              <button
                onClick={() => setFallbackMethod('pin')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  fallbackMethod === 'pin'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Lock className="w-6 h-6 mx-auto mb-2 text-green-600" />
                <div className="text-sm font-medium text-gray-900">PIN</div>
                <div className="text-xs text-gray-500">4-digit code</div>
              </button>
            </div>
          </div>

          {/* Authentication Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center mb-4">
              <div className="p-3 bg-gray-100 rounded-full w-fit mx-auto mb-3">
                {getFallbackIcon()}
              </div>
              <p className="text-sm text-gray-600">{getFallbackDescription()}</p>
            </div>

            {/* Password Input */}
            {fallbackMethod === 'password' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
                    placeholder="Enter your password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            )}

            {/* PIN Input */}
            {fallbackMethod === 'pin' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  4-Digit PIN
                </label>
                <input
                  type="password"
                  value={pin}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    setPin(value);
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-center text-lg tracking-widest"
                  placeholder="••••"
                  maxLength={4}
                  disabled={loading}
                />
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
                {attempts > 0 && attempts < maxAttempts && (
                  <p className="text-xs text-red-600 mt-1">
                    {maxAttempts - attempts} attempt{maxAttempts - attempts !== 1 ? 's' : ''} remaining
                  </p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading ||
                (fallbackMethod === 'password' && !password.trim()) ||
                (fallbackMethod === 'pin' && pin.length !== 4)
              }
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>
                    {action === 'clock_in' ? 'Clock In' : action === 'clock_out' ? 'Clock Out' : 'Verify & Continue'}
                  </span>
                </>
              )}
            </button>

            {/* Alternative Options */}
            <div className="pt-4 border-t border-gray-200">
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">Having trouble?</p>
                <div className="flex justify-center space-x-4 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      // Handle forgot password
                      console.log('Forgot password clicked');
                    }}
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Forgot Password?
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      // Contact support
                      console.log('Contact support clicked');
                    }}
                    className="text-gray-600 hover:text-gray-800 underline"
                  >
                    Contact Support
                  </button>
                </div>
              </div>

              {/* Future Feature Hint */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Fingerprint className="w-4 h-4" />
                  <span>
                    Enable biometric authentication in Settings for faster access
                  </span>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BiometricFallback;