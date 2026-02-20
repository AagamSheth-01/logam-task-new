/**
 * Meetings Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useMeetingsStore = create(
  devtools(
    (set, get) => ({
      meetings: [],
      selectedMeeting: null,
      loading: false,
      error: null,
      filters: {
        startDate: null,
        endDate: null,
        clientId: null,
        status: null
      },

      setMeetings: (meetings) => set({ meetings }),
      setSelectedMeeting: (meeting) => set({ selectedMeeting: meeting }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

      addMeeting: (meeting) => set((state) => ({
        meetings: [meeting, ...state.meetings]
      })),

      updateMeetingInList: (meetingId, updates) => set((state) => ({
        meetings: state.meetings.map(m => m.id === meetingId ? { ...m, ...updates } : m)
      })),

      removeMeeting: (meetingId) => set((state) => ({
        meetings: state.meetings.filter(m => m.id !== meetingId)
      })),

      reset: () => set({
        meetings: [],
        selectedMeeting: null,
        error: null
      })
    }),
    { name: 'Meetings Store' }
  )
);

export default useMeetingsStore;
