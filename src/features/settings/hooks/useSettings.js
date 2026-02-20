/**
 * useSettings Hook
 */

import { useEffect, useCallback } from 'react';
import useSettingsStore from '../store/settingsStore.js';
import settingsApi from '../api/settingsApi.js';

export function useSettings(options = {}) {
  const { autoLoad = true } = options;

  const {
    settings,
    attendanceSettings,
    userPreferences,
    notificationSettings,
    organizationSettings,
    loading,
    error,
    setSettings,
    setAttendanceSettings,
    setUserPreferences,
    setNotificationSettings,
    setOrganizationSettings,
    setLoading,
    setError,
    updateSettings: updateSettingsInStore,
    updateUserPreferences: updateUserPreferencesInStore,
    updateNotificationSettings: updateNotificationSettingsInStore
  } = useSettingsStore();

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await settingsApi.getSettings();

      if (response.success) {
        setSettings(response.settings || response.data || {});
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [setSettings, setLoading, setError]);

  const loadAttendanceSettings = useCallback(async () => {
    try {
      const response = await settingsApi.getAttendanceSettings();

      if (response.success) {
        setAttendanceSettings(response.settings || response.data || {});
      }
    } catch (err) {
      console.error('Error loading attendance settings:', err);
      setError(err.message);
    }
  }, [setAttendanceSettings, setError]);

  const loadUserPreferences = useCallback(async () => {
    try {
      const response = await settingsApi.getUserPreferences();

      if (response.success) {
        setUserPreferences(response.preferences || response.data || {});
      }
    } catch (err) {
      console.error('Error loading user preferences:', err);
      setError(err.message);
    }
  }, [setUserPreferences, setError]);

  const loadNotificationSettings = useCallback(async () => {
    try {
      const response = await settingsApi.getNotificationSettings();

      if (response.success) {
        setNotificationSettings(response.settings || response.data || {});
      }
    } catch (err) {
      console.error('Error loading notification settings:', err);
      setError(err.message);
    }
  }, [setNotificationSettings, setError]);

  const updateSettings = useCallback(async (settingsData) => {
    try {
      const result = await settingsApi.updateSettings(settingsData);
      if (result.success) {
        updateSettingsInStore(settingsData);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [updateSettingsInStore, setError]);

  const updateAttendanceSettings = useCallback(async (settingsData) => {
    try {
      const result = await settingsApi.updateAttendanceSettings(settingsData);
      if (result.success) {
        setAttendanceSettings({ ...attendanceSettings, ...settingsData });
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [attendanceSettings, setAttendanceSettings, setError]);

  const updateUserPreferences = useCallback(async (preferences) => {
    try {
      const result = await settingsApi.updateUserPreferences(preferences);
      if (result.success) {
        updateUserPreferencesInStore(preferences);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [updateUserPreferencesInStore, setError]);

  const updateNotificationSettings = useCallback(async (notificationSettingsData) => {
    try {
      const result = await settingsApi.updateNotificationSettings(notificationSettingsData);
      if (result.success) {
        updateNotificationSettingsInStore(notificationSettingsData);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [updateNotificationSettingsInStore, setError]);

  useEffect(() => {
    if (autoLoad) {
      loadSettings();
      loadUserPreferences();
    }
  }, [autoLoad]);

  return {
    settings,
    attendanceSettings,
    userPreferences,
    notificationSettings,
    organizationSettings,
    loading,
    error,
    loadSettings,
    loadAttendanceSettings,
    loadUserPreferences,
    loadNotificationSettings,
    updateSettings,
    updateAttendanceSettings,
    updateUserPreferences,
    updateNotificationSettings
  };
}

export default useSettings;
