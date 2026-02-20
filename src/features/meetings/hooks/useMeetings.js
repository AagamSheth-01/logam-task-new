/**
 * useMeetings Hook
 */

import { useEffect, useCallback } from 'react';
import useMeetingsStore from '../store/meetingsStore.js';
import meetingsApi from '../api/meetingsApi.js';

export function useMeetings(initialFilters = {}, options = {}) {
  const { autoLoad = true } = options;

  const {
    meetings,
    loading,
    error,
    filters,
    setMeetings,
    setLoading,
    setError,
    setFilters,
    addMeeting: addMeetingToStore,
    updateMeetingInList,
    removeMeeting: removeMeetingFromStore
  } = useMeetingsStore();

  const loadMeetings = useCallback(async (customFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const mergedFilters = { ...filters, ...customFilters };
      const response = await meetingsApi.getMeetings(mergedFilters);

      if (response.success) {
        setMeetings(response.meetings || response.data || []);
      }
    } catch (err) {
      console.error('Error loading meetings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, setMeetings, setLoading, setError]);

  const createMeeting = useCallback(async (meetingData) => {
    try {
      const result = await meetingsApi.createMeeting(meetingData);
      if (result.success) {
        addMeetingToStore(result.meeting || result.data);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [addMeetingToStore, setError]);

  const updateMeeting = useCallback(async (meetingId, updates) => {
    try {
      const result = await meetingsApi.updateMeeting(meetingId, updates);
      if (result.success) {
        updateMeetingInList(meetingId, updates);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [updateMeetingInList, setError]);

  const deleteMeeting = useCallback(async (meetingId) => {
    try {
      const result = await meetingsApi.deleteMeeting(meetingId);
      if (result.success) {
        removeMeetingFromStore(meetingId);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [removeMeetingFromStore, setError]);

  useEffect(() => {
    if (autoLoad) {
      setFilters(initialFilters);
      loadMeetings(initialFilters);
    }
  }, [autoLoad]);

  return {
    meetings,
    loading,
    error,
    filters,
    loadMeetings,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    setFilters
  };
}

export default useMeetings;
