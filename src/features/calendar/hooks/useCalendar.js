/**
 * useCalendar Hook
 */

import { useEffect, useCallback } from 'react';
import useCalendarStore from '../store/calendarStore.js';
import calendarApi from '../api/calendarApi.js';

export function useCalendar(initialFilters = {}, options = {}) {
  const { autoLoad = true } = options;

  const {
    events,
    loading,
    error,
    filters,
    currentView,
    setEvents,
    setLoading,
    setError,
    setFilters,
    setCurrentView,
    addEvent: addEventToStore,
    updateEventInList,
    removeEvent: removeEventFromStore
  } = useCalendarStore();

  const loadEvents = useCallback(async (customFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const mergedFilters = { ...filters, ...customFilters };
      const response = await calendarApi.getEvents(mergedFilters);

      if (response.success) {
        setEvents(response.events || response.data || []);
      }
    } catch (err) {
      console.error('Error loading calendar events:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, setEvents, setLoading, setError]);

  const createEvent = useCallback(async (eventData) => {
    try {
      const result = await calendarApi.createEvent(eventData);
      if (result.success) {
        addEventToStore(result.event || result.data);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [addEventToStore, setError]);

  const updateEvent = useCallback(async (eventId, updates) => {
    try {
      const result = await calendarApi.updateEvent(eventId, updates);
      if (result.success) {
        updateEventInList(eventId, updates);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [updateEventInList, setError]);

  const deleteEvent = useCallback(async (eventId) => {
    try {
      const result = await calendarApi.deleteEvent(eventId);
      if (result.success) {
        removeEventFromStore(eventId);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [removeEventFromStore, setError]);

  useEffect(() => {
    if (autoLoad) {
      setFilters(initialFilters);
      loadEvents(initialFilters);
    }
  }, [autoLoad]);

  return {
    events,
    loading,
    error,
    filters,
    currentView,
    loadEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    setFilters,
    setCurrentView
  };
}

export default useCalendar;
