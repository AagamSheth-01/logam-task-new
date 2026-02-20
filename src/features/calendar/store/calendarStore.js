/**
 * Calendar Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useCalendarStore = create(
  devtools(
    (set, get) => ({
      events: [],
      selectedEvent: null,
      loading: false,
      error: null,
      filters: {
        startDate: null,
        endDate: null,
        eventType: null,
        clientId: null
      },
      currentView: 'month', // month, week, day

      setEvents: (events) => set({ events }),
      setSelectedEvent: (event) => set({ selectedEvent: event }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),
      setCurrentView: (view) => set({ currentView: view }),

      addEvent: (event) => set((state) => ({
        events: [event, ...state.events]
      })),

      updateEventInList: (eventId, updates) => set((state) => ({
        events: state.events.map(e => e.id === eventId ? { ...e, ...updates } : e)
      })),

      removeEvent: (eventId) => set((state) => ({
        events: state.events.filter(e => e.id !== eventId)
      })),

      reset: () => set({
        events: [],
        selectedEvent: null,
        error: null
      })
    }),
    { name: 'Calendar Store' }
  )
);

export default useCalendarStore;
