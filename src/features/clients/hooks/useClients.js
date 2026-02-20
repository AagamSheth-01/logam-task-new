/**
 * useClients Hook
 */

import { useEffect, useCallback } from 'react';
import useClientsStore from '../store/clientsStore.js';
import clientsApi from '../api/clientsApi.js';

export function useClients(initialFilters = {}, options = {}) {
  const { autoLoad = true } = options;

  const {
    clients,
    loading,
    error,
    filters,
    setClients,
    setLoading,
    setError,
    setFilters,
    addClient: addClientToStore,
    updateClientInList,
    removeClient: removeClientFromStore
  } = useClientsStore();

  const loadClients = useCallback(async (customFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const mergedFilters = { ...filters, ...customFilters };
      const response = await clientsApi.getClients(mergedFilters);

      if (response.success) {
        setClients(response.clients || response.data || []);
      }
    } catch (err) {
      console.error('Error loading clients:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, setClients, setLoading, setError]);

  const createClient = useCallback(async (clientData) => {
    try {
      const result = await clientsApi.createClient(clientData);
      if (result.success) {
        addClientToStore(result.client || result.data);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [addClientToStore, setError]);

  const updateClient = useCallback(async (clientId, updates) => {
    try {
      const result = await clientsApi.updateClient(clientId, updates);
      if (result.success) {
        updateClientInList(clientId, updates);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [updateClientInList, setError]);

  const deleteClient = useCallback(async (clientId) => {
    try {
      const result = await clientsApi.deleteClient(clientId);
      if (result.success) {
        removeClientFromStore(clientId);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [removeClientFromStore, setError]);

  useEffect(() => {
    if (autoLoad) {
      setFilters(initialFilters);
      loadClients(initialFilters);
    }
  }, [autoLoad]);

  return {
    clients,
    loading,
    error,
    filters,
    loadClients,
    createClient,
    updateClient,
    deleteClient,
    setFilters
  };
}

export default useClients;
