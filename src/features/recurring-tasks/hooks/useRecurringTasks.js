/**
 * useRecurringTasks Hook
 */

import { useEffect, useCallback } from 'react';
import useRecurringTasksStore from '../store/recurringTasksStore.js';
import recurringTasksApi from '../api/recurringTasksApi.js';

export function useRecurringTasks(initialFilters = {}, options = {}) {
  const { autoLoad = true } = options;

  const {
    recurringTasks,
    loading,
    error,
    filters,
    setRecurringTasks,
    setLoading,
    setError,
    setFilters,
    addRecurringTask: addRecurringTaskToStore,
    updateRecurringTaskInList,
    removeRecurringTask: removeRecurringTaskFromStore
  } = useRecurringTasksStore();

  const loadRecurringTasks = useCallback(async (customFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const mergedFilters = { ...filters, ...customFilters };
      const response = await recurringTasksApi.getRecurringTasks(mergedFilters);

      if (response.success) {
        setRecurringTasks(response.recurringTasks || response.tasks || response.data || []);
      }
    } catch (err) {
      console.error('Error loading recurring tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, setRecurringTasks, setLoading, setError]);

  const createRecurringTask = useCallback(async (taskData) => {
    try {
      const result = await recurringTasksApi.createRecurringTask(taskData);
      if (result.success) {
        addRecurringTaskToStore(result.recurringTask || result.task || result.data);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [addRecurringTaskToStore, setError]);

  const updateRecurringTask = useCallback(async (taskId, updates) => {
    try {
      const result = await recurringTasksApi.updateRecurringTask(taskId, updates);
      if (result.success) {
        updateRecurringTaskInList(taskId, updates);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [updateRecurringTaskInList, setError]);

  const deleteRecurringTask = useCallback(async (taskId) => {
    try {
      const result = await recurringTasksApi.deleteRecurringTask(taskId);
      if (result.success) {
        removeRecurringTaskFromStore(taskId);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [removeRecurringTaskFromStore, setError]);

  const pauseRecurringTask = useCallback(async (taskId) => {
    try {
      const result = await recurringTasksApi.pauseRecurringTask(taskId);
      if (result.success) {
        updateRecurringTaskInList(taskId, { status: 'paused' });
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [updateRecurringTaskInList, setError]);

  const resumeRecurringTask = useCallback(async (taskId) => {
    try {
      const result = await recurringTasksApi.resumeRecurringTask(taskId);
      if (result.success) {
        updateRecurringTaskInList(taskId, { status: 'active' });
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [updateRecurringTaskInList, setError]);

  useEffect(() => {
    if (autoLoad) {
      setFilters(initialFilters);
      loadRecurringTasks(initialFilters);
    }
  }, [autoLoad]);

  return {
    recurringTasks,
    loading,
    error,
    filters,
    loadRecurringTasks,
    createRecurringTask,
    updateRecurringTask,
    deleteRecurringTask,
    pauseRecurringTask,
    resumeRecurringTask,
    setFilters
  };
}

export default useRecurringTasks;
