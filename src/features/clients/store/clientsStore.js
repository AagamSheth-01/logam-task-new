/**
 * Clients Store
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

const useClientsStore = create(
  devtools(
    (set, get) => ({
      clients: [],
      selectedClient: null,
      loading: false,
      error: null,
      filters: {
        status: null,
        search: null
      },

      setClients: (clients) => set({ clients }),
      setSelectedClient: (client) => set({ selectedClient: client }),
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (filters) => set({ filters: { ...get().filters, ...filters } }),

      addClient: (client) => set((state) => ({
        clients: [client, ...state.clients]
      })),

      updateClientInList: (clientId, updates) => set((state) => ({
        clients: state.clients.map(c => c.id === clientId ? { ...c, ...updates } : c)
      })),

      removeClient: (clientId) => set((state) => ({
        clients: state.clients.filter(c => c.id !== clientId)
      })),

      reset: () => set({
        clients: [],
        selectedClient: null,
        error: null
      })
    }),
    { name: 'Clients Store' }
  )
);

export default useClientsStore;
