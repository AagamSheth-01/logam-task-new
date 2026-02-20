/**
 * Token Refresh Hook
 * Automatically refreshes tokens when they're about to expire
 */

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { authApi } from '../src/api/auth.api';

export const useTokenRefresh = () => {
  const router = useRouter();
  const refreshIntervalRef = useRef(null);
  const isRefreshingRef = useRef(false);

  /**
   * Check and refresh token if needed
   */
  const checkAndRefreshToken = useCallback(async () => {
    // Skip if already refreshing or not authenticated
    if (isRefreshingRef.current || !authApi.isAuthenticated()) {
      return;
    }

    try {
      // Check if token is expiring (5 minute buffer)
      if (authApi.isTokenExpiring(5)) {
        console.log('Access token is expiring, refreshing...');
        isRefreshingRef.current = true;

        await authApi.refreshTokens();
        console.log('Token refreshed successfully');
      }
    } catch (error) {
      console.error('Token refresh failed:', error);

      // If refresh fails, redirect to login
      authApi.logout();
      router.push('/login?reason=session-expired');
    } finally {
      isRefreshingRef.current = false;
    }
  }, [router]);

  /**
   * Initialize token refresh monitoring
   */
  useEffect(() => {
    // Only run on client side and if authenticated
    if (typeof window === 'undefined' || !authApi.isAuthenticated()) {
      return;
    }

    // Check token immediately
    checkAndRefreshToken();

    // Set up periodic checks every 30 seconds
    refreshIntervalRef.current = setInterval(checkAndRefreshToken, 30 * 1000);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [checkAndRefreshToken]);

  /**
   * Manual token refresh trigger
   */
  const refreshNow = useCallback(async () => {
    if (isRefreshingRef.current) {
      return;
    }

    try {
      isRefreshingRef.current = true;
      await authApi.refreshTokens();
      return true;
    } catch (error) {
      console.error('Manual token refresh failed:', error);
      authApi.logout();
      router.push('/login?reason=session-expired');
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [router]);

  return {
    refreshNow,
    isRefreshing: isRefreshingRef.current
  };
};

export default useTokenRefresh;