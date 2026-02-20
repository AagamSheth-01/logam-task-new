/**
 * useDailyTasks Hook
 */

import { useEffect, useCallback } from 'react';
import useDailyTasksStore from '../store/dailyTasksStore.js';
import dailyTasksApi from '../api/dailyTasksApi.js';

export function useDailyTasks(initialFilters = {}, options = {}) {
  const { autoLoad = true } = options;

  const {
    dailyTasks,
    loading,
    error,
    filters,
    setDailyTasks,
    setLoading,
    setError,
    setFilters,
    addDailyTask: addDailyTaskToStore,
    updateDailyTaskInList,
    removeDailyTask: removeDailyTaskFromStore
  } = useDailyTasksStore();

  const loadDailyTasks = useCallback(async (customFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const mergedFilters = { ...filters, ...customFilters };

      // Remove null/undefined values from filters to prevent them being sent as "null" strings
      const cleanFilters = Object.fromEntries(
        Object.entries(mergedFilters).filter(([key, value]) => value !== null && value !== undefined && value !== '')
      );

      const response = await dailyTasksApi.getDailyTasks(cleanFilters);

      if (response.success) {
        // Handle nested data structure from API response
        if (response.data && response.data.dailyTasks) {
          setDailyTasks(response.data.dailyTasks);
        } else {
          setDailyTasks(response.dailyTasks || response.tasks || response.data || []);
        }
      } else {
        setError(response.message || 'Failed to load daily tasks');
      }
    } catch (err) {
      console.error('Error loading daily tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, setDailyTasks, setLoading, setError]);

  const createDailyTask = useCallback(async (taskData) => {
    try {
      const result = await dailyTasksApi.createDailyTask(taskData);
      if (result.success) {
        addDailyTaskToStore(result.dailyTask || result.task || result.data);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [addDailyTaskToStore, setError]);

  const updateDailyTask = useCallback(async (taskId, updates) => {
    try {
      const result = await dailyTasksApi.updateDailyTask(taskId, updates);
      if (result.success) {
        updateDailyTaskInList(taskId, updates);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [updateDailyTaskInList, setError]);

  const deleteDailyTask = useCallback(async (taskId) => {
    try {
      const result = await dailyTasksApi.deleteDailyTask(taskId);
      if (result.success) {
        removeDailyTaskFromStore(taskId);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [removeDailyTaskFromStore, setError]);

  const completeDailyTask = useCallback(async (taskId, completionData) => {
    try {
      const result = await dailyTasksApi.completeDailyTask(taskId, completionData);
      if (result.success) {
        updateDailyTaskInList(taskId, { status: 'completed', ...completionData });
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [updateDailyTaskInList, setError]);

  useEffect(() => {
    if (autoLoad) {
      setFilters(initialFilters);
      loadDailyTasks(initialFilters);
    }
  }, [autoLoad]);

  return {
    dailyTasks,
    loading,
    error,
    filters,
    loadDailyTasks,
    createDailyTask,
    updateDailyTask,
    deleteDailyTask,
    completeDailyTask,
    setFilters
  };
}

export default useDailyTasks;
