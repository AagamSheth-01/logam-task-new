// Enhanced Session Timeout Hook with Real-time Monitoring
import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';

const TIMEOUT_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const WARNING_DURATION = 5 * 60 * 1000; // 5 minutes before timeout
const CHECK_INTERVAL = 30 * 1000; // Check every 30 seconds

export const useSessionTimeout = (onTimeout, onWarning) => {
  const [timeRemaining, setTimeRemaining] = useState(TIMEOUT_DURATION);
  const [showWarning, setShowWarning] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [lastActivity, setLastActivity] = useState(Date.now());
  
  const router = useRouter();
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const intervalRef = useRef(null);

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    const now = Date.now();
    setLastActivity(now);
    setTimeRemaining(TIMEOUT_DURATION);
    setShowWarning(false);
    
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    
    // Set new warning timer
    warningRef.current = setTimeout(() => {
      setShowWarning(true);
      if (onWarning) onWarning();
    }, TIMEOUT_DURATION - WARNING_DURATION);
    
    // Set new timeout timer
    timeoutRef.current = setTimeout(() => {
      handleTimeout();
    }, TIMEOUT_DURATION);
  }, [onWarning]);

  // Handle session timeout
  const handleTimeout = useCallback(() => {
    setIsActive(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    if (onTimeout) {
      onTimeout();
    } else {
      // Default timeout behavior
      router.push('/login?reason=timeout');
    }
  }, [onTimeout, router]);

  // Extend session
  const extendSession = useCallback(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const now = Date.now() / 1000;
        
        if (payload.exp > now) {
          updateActivity();
          return true;
        }
      } catch (error) {
        // Invalid token
      }
    }
    
    handleTimeout();
    return false;
  }, [updateActivity, handleTimeout]);

  // Activity event handlers
  const handleUserActivity = useCallback(() => {
    if (isActive) {
      updateActivity();
    }
  }, [isActive, updateActivity]);

  // Initialize session monitoring
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setIsActive(false);
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      
      if (payload.exp <= now) {
        handleTimeout();
        return;
      }
      
      const remaining = (payload.exp - now) * 1000;
      setTimeRemaining(Math.min(remaining, TIMEOUT_DURATION));
      
      // Set initial timers
      updateActivity();
      
    } catch (error) {
      handleTimeout();
    }
  }, [handleTimeout, updateActivity]);

  // Add activity listeners
  useEffect(() => {
    if (!isActive) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Set up interval to check remaining time
    intervalRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastActivity;
      const remaining = TIMEOUT_DURATION - elapsed;
      
      setTimeRemaining(Math.max(0, remaining));
      
      if (remaining <= 0) {
        handleTimeout();
      } else if (remaining <= WARNING_DURATION && !showWarning) {
        setShowWarning(true);
        if (onWarning) onWarning();
      }
    }, CHECK_INTERVAL);

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleUserActivity);
      });
      
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, lastActivity, showWarning, handleUserActivity, handleTimeout, onWarning]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (warningRef.current) clearTimeout(warningRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Format time remaining
  const formatTimeRemaining = useCallback((ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  return {
    isActive,
    timeRemaining,
    showWarning,
    lastActivity,
    extendSession,
    updateActivity,
    formatTimeRemaining,
    timeRemainingFormatted: formatTimeRemaining(timeRemaining),
    isExpiring: timeRemaining <= WARNING_DURATION,
    isExpired: timeRemaining <= 0
  };
};

// Session Timeout Warning Component
export const SessionTimeoutWarning = ({ 
  isVisible, 
  timeRemaining, 
  onExtend, 
  onLogout 
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Session Expiring</h3>
            <p className="text-sm text-gray-600">Your session will expire soon</p>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-700 mb-2">
            Time remaining: <span className="font-mono font-bold text-red-600">{timeRemaining}</span>
          </p>
          <p className="text-sm text-gray-600">
            Click "Stay Logged In" to extend your session, or you'll be automatically logged out.
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={onExtend}
            className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Stay Logged In
          </button>
          <button
            onClick={onLogout}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400 transition-colors"
          >
            Logout Now
          </button>
        </div>
      </div>
    </div>
  );
};

// Session Status Indicator Component
export const SessionStatusIndicator = ({ 
  isActive, 
  timeRemaining, 
  isExpiring,
  onExtend 
}) => {
  if (!isActive) return null;

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return `${Math.floor(totalSeconds)}s`;
    }
  };

  return (
    <div className={`fixed top-4 right-4 px-3 py-2 rounded-lg shadow-lg transition-all duration-300 ${
      isExpiring 
        ? 'bg-red-100 border border-red-300 text-red-800' 
        : 'bg-green-100 border border-green-300 text-green-800'
    }`}>
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 rounded-full ${
          isExpiring ? 'bg-red-500 animate-pulse' : 'bg-green-500'
        }`} />
        <span className="text-sm font-medium">
          Session: {formatTime(timeRemaining)}
        </span>
        {isExpiring && (
          <button
            onClick={onExtend}
            className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 transition-colors"
          >
            Extend
          </button>
        )}
      </div>
    </div>
  );
};

export default useSessionTimeout;