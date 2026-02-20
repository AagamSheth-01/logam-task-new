/**
 * Biometric Enrollment Component
 * Allows users to enroll their biometric credentials for quick attendance
 */

import React, { useState, useEffect } from 'react';
import {
  Fingerprint,
  Shield,
  Smartphone,
  CheckCircle,
  AlertCircle,
  X,
  RefreshCw,
  Zap,
  Clock,
  Lock
} from 'lucide-react';
import biometricService from '../lib/biometricService';

const BiometricEnrollment = ({ user, isOpen, onClose, onSuccess }) => {
  const [step, setStep] = useState('check'); // 'check', 'method-select', 'enroll', 'success', 'error'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [capabilities, setCapabilities] = useState(null);
  const [enrollmentResult, setEnrollmentResult] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState(null);

  useEffect(() => {
    if (isOpen) {
      checkBiometricCapabilities();
    }
  }, [isOpen]);

  const checkBiometricCapabilities = async () => {
    try {
      setLoading(true);
      setError('');

      console.log('🔍 [BiometricEnrollment] Checking biometric capabilities...');
      const caps = await biometricService.getBiometricCapabilities();
      console.log('🔍 [BiometricEnrollment] Capabilities result:', caps);
      setCapabilities(caps);

      if (caps.supported) {
        console.log('✅ [BiometricEnrollment] Biometrics supported, checking enrollment status...');
        // Check if already enrolled
        const isEnrolled = biometricService.isEnrolled(user.username);
        console.log(`🔍 [BiometricEnrollment] User ${user.username} enrolled:`, isEnrolled);
        if (isEnrolled) {
          const enrollmentInfo = biometricService.getEnrollmentInfo(user.username);
          setStep('already-enrolled');
          setEnrollmentResult(enrollmentInfo);
        } else {
          // Check if multiple methods available for selection
          if (caps.canSelectMethod && caps.availableMethods?.length > 1) {
            setStep('method-select');
          } else {
            // Use default method
            setSelectedMethod(caps.biometricType);
            setStep('ready');
          }
        }
      } else {
        setStep('not-supported');
      }
    } catch (err) {
      setError(err.message);
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleEnrollment = async () => {
    try {
      setLoading(true);
      setError('');
      setStep('enrolling');

      console.log('🚀 [BiometricEnrollment] Starting enrollment for user:', user);
      console.log('🔍 [BiometricEnrollment] User agent:', navigator?.userAgent);
      console.log('🔍 [BiometricEnrollment] Platform:', navigator?.platform);

      const result = await biometricService.enrollBiometric(user, selectedMethod);
      console.log('✅ [BiometricEnrollment] Enrollment result:', result);
      console.log('🎯 [BiometricEnrollment] Used method:', selectedMethod);

      if (result.success) {
        setEnrollmentResult(result);
        setStep('success');

        // Notify parent component
        if (onSuccess) {
          onSuccess(result);
        }
      } else {
        console.error('❌ [BiometricEnrollment] Enrollment failed:', result);
        setError(result.error || 'Enrollment failed');
        setStep('error');
      }
    } catch (err) {
      console.error('❌ [BiometricEnrollment] Enrollment error:', err);
      console.error('❌ [BiometricEnrollment] Error stack:', err.stack);
      setError(err.message || 'Biometric enrollment failed');
      setStep('error');
    } finally {
      setLoading(false);
    }
  };

  const handleUnenroll = async () => {
    try {
      setLoading(true);
      biometricService.unenrollBiometric(user.username);
      setStep('ready');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getBiometricIcon = () => {
    if (!capabilities?.biometricType) return <Fingerprint className="w-12 h-12" />;

    switch (capabilities.biometricType) {
      case 'touch-id-face-id':
        return <Smartphone className="w-12 h-12" />;
      case 'touch-id':
        return <Fingerprint className="w-12 h-12" />;
      case 'fingerprint':
        return <Fingerprint className="w-12 h-12" />;
      case 'windows-hello':
        return <Shield className="w-12 h-12" />;
      default:
        return <Fingerprint className="w-12 h-12" />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Shield className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Biometric Setup</h2>
              <p className="text-sm text-gray-600">Secure attendance with biometrics</p>
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
          {/* Checking capabilities */}
          {step === 'check' && (
            <div className="text-center">
              <div className="animate-spin mx-auto mb-4">
                <RefreshCw className="w-8 h-8 text-blue-600" />
              </div>
              <p className="text-gray-600">Checking device capabilities...</p>
            </div>
          )}

          {/* Not supported */}
          {step === 'not-supported' && (
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 bg-red-100 rounded-full w-fit">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Not Supported</h3>
              <p className="text-gray-600 mb-4">
                {capabilities?.reason || 'Biometric authentication is not available on this device.'}
              </p>
              <p className="text-sm text-gray-500">
                You can still use the regular attendance system.
              </p>
            </div>
          )}

          {/* Ready to enroll */}
          {step === 'ready' && (
            <div className="text-center">
              <div className="mx-auto mb-6 p-4 bg-blue-100 rounded-full w-fit">
                {getBiometricIcon()}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Quick Attendance with {biometricService.getBiometricDisplayName(capabilities?.biometricType)}
              </h3>

              <div className="space-y-4 mb-6">
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <Zap className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <span className="text-sm text-green-800">Lightning-fast clock in/out</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <Lock className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <span className="text-sm text-blue-800">Secure biometric verification</span>
                </div>
                <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                  <Clock className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <span className="text-sm text-purple-800">Save time every day</span>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-yellow-800 mb-2">Before you start:</p>
                <div className="text-xs text-yellow-700 space-y-1">
                  <p>• Your browser will ask for permission to use biometric authentication</p>
                  <p>• Click "Allow" when the security prompt appears</p>
                  <p>• Be ready to use your Touch ID, Face ID, or fingerprint</p>
                  <p>• Don't cancel or navigate away during the process</p>
                </div>
              </div>

              <button
                onClick={handleEnrollment}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Setting up...' : 'Enable Biometric Attendance'}
              </button>

              <p className="text-xs text-gray-500 mt-4">
                Your biometric data stays secure on your device and is never shared.
              </p>
            </div>
          )}

          {/* Method Selection */}
          {step === 'method-select' && (
            <div className="text-center">
              <div className="mx-auto mb-6 p-3 bg-blue-100 rounded-full w-fit">
                <Shield className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Choose Your Biometric Method
              </h3>
              <p className="text-gray-600 mb-6">
                Select which biometric authentication method you'd like to use for attendance.
              </p>

              <div className="space-y-3 mb-6">
                {capabilities?.availableMethods?.map((method) => (
                  <button
                    key={method}
                    onClick={() => {
                      setSelectedMethod(method);
                      setStep('ready');
                    }}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedMethod === method
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          {method.includes('face') || method === 'face-id' ? (
                            <Smartphone className="w-5 h-5 text-gray-600" />
                          ) : (
                            <Fingerprint className="w-5 h-5 text-gray-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {biometricService.getBiometricDisplayName(method)}
                          </p>
                          <p className="text-sm text-gray-500">
                            {method.includes('face') || method === 'face-id'
                              ? 'Use face recognition for attendance'
                              : 'Use fingerprint for attendance'
                            }
                          </p>
                        </div>
                      </div>
                      <CheckCircle className={`w-5 h-5 ${
                        selectedMethod === method ? 'text-blue-600' : 'text-gray-300'
                      }`} />
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Enrolling */}
          {step === 'enrolling' && (
            <div className="text-center">
              <div className="mx-auto mb-6 p-4 bg-blue-100 rounded-full w-fit animate-pulse">
                {getBiometricIcon()}
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Allow biometric authentication when prompted
              </h3>
              <div className="text-gray-600 mb-4 space-y-2">
                <p className="font-medium text-blue-600">Please follow these steps:</p>
                <div className="text-left bg-blue-50 p-4 rounded-lg">
                  <p>1. Your browser will show a security prompt</p>
                  <p>2. Click "Allow" or "Continue" when asked</p>
                  <p>3. Use your Touch ID, Face ID, or fingerprint when prompted</p>
                  <p>4. Do not cancel or click away from the prompt</p>
                </div>
              </div>
              <div className="animate-pulse">
                <div className="h-2 bg-blue-200 rounded-full">
                  <div className="h-2 bg-blue-600 rounded-full w-3/4"></div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4">
                If you accidentally canceled, you can try again by clicking the button above.
              </p>
            </div>
          )}

          {/* Success */}
          {step === 'success' && (
            <div className="text-center">
              <div className="mx-auto mb-6 p-3 bg-green-100 rounded-full w-fit">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Biometric Setup Complete!
              </h3>
              <p className="text-gray-600 mb-4">
                You can now use {biometricService.getBiometricDisplayName(enrollmentResult?.biometricType)}
                for quick attendance.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-700">
                  <div className="flex justify-between mb-2">
                    <span>Authentication Method:</span>
                    <span className="font-medium">
                      {biometricService.getBiometricDisplayName(enrollmentResult?.biometricType)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Enrolled:</span>
                    <span className="font-medium">
                      {enrollmentResult?.enrolledAt ? new Date(enrollmentResult.enrolledAt).toLocaleDateString() : 'Now'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={onClose}
                className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
              >
                Start Using Biometric Attendance
              </button>
            </div>
          )}

          {/* Already enrolled */}
          {step === 'already-enrolled' && (
            <div className="text-center">
              <div className="mx-auto mb-6 p-3 bg-green-100 rounded-full w-fit">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Biometric Authentication Active
              </h3>
              <p className="text-gray-600 mb-6">
                You've already set up {biometricService.getBiometricDisplayName(enrollmentResult?.biometricType)}
                for quick attendance.
              </p>

              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="text-sm text-gray-700">
                  <div className="flex justify-between mb-2">
                    <span>Authentication Method:</span>
                    <span className="font-medium">
                      {biometricService.getBiometricDisplayName(enrollmentResult?.biometricType)}
                    </span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Credentials:</span>
                    <span className="font-medium">{enrollmentResult?.credentialCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Enrolled:</span>
                    <span className="font-medium">
                      {enrollmentResult?.latestEnrollment ?
                        new Date(enrollmentResult.latestEnrollment).toLocaleDateString() : 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleUnenroll}
                  disabled={loading}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {step === 'error' && (
            <div className="text-center">
              <div className="mx-auto mb-4 p-3 bg-orange-100 rounded-full w-fit">
                <AlertCircle className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {error.includes('cancelled') || error.includes('not permitted') ? 'Setup Cancelled' : 'Setup Failed'}
              </h3>
              <p className="text-gray-600 mb-4">{error}</p>

              {(error.includes('cancelled') || error.includes('not permitted')) && (
                <div className="bg-blue-50 p-4 rounded-lg mb-4 text-left">
                  <p className="font-medium text-blue-800 mb-2">To enable biometric authentication:</p>
                  <div className="text-sm text-blue-700 space-y-1">
                    <p>• Click "Try Again" below</p>
                    <p>• Allow the browser prompt when it appears</p>
                    <p>• Follow your device's biometric instructions</p>
                    <p>• Don't cancel or click away during setup</p>
                  </div>
                </div>
              )}

              <div className="flex space-x-3">
                <button
                  onClick={checkBiometricCapabilities}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 py-2 px-4 rounded-lg font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BiometricEnrollment;