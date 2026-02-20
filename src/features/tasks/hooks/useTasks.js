/**
 * useTasks Hook
 */

import { useEffect, useCallback } from 'react';
import useTasksStore from '../store/tasksStore.js';
import tasksApi from '../api/tasksApi.js';

export function useTasks(initialFilters = {}, options = {}) {
  const { autoLoad = true } = options;

  const {
    tasks,
    loading,
    error,
    filters,
    setTasks,
    setLoading,
    setError,
    setFilters,
    addTask: addTaskToStore,
    updateTaskInList,
    removeTask: removeTaskFromStore
  } = useTasksStore();

  const loadTasks = useCallback(async (customFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const mergedFilters = { ...filters, ...customFilters };
      const response = await tasksApi.getTasks(mergedFilters);

      if (response.success) {
        setTasks(response.tasks || response.data || []);
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters, setTasks, setLoading, setError]);

  const createTask = useCallback(async (taskData) => {
    try {
      const result = await tasksApi.createTask(taskData);
      if (result.success) {
        addTaskToStore(result.task || result.data);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [addTaskToStore, setError]);

  const updateTask = useCallback(async (taskId, updates) => {
    try {
      const result = await tasksApi.updateTask(taskId, updates);
      if (result.success) {
        updateTaskInList(taskId, updates);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [updateTaskInList, setError]);

  const deleteTask = useCallback(async (taskId) => {
    try {
      const result = await tasksApi.deleteTask(taskId);
      if (result.success) {
        removeTaskFromStore(taskId);
      }
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, [removeTaskFromStore, setError]);

  useEffect(() => {
    if (autoLoad) {
      setFilters(initialFilters);
      loadTasks(initialFilters);
    }
  }, [autoLoad]);

  return {
    tasks,
    loading,
    error,
    filters,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    setFilters
  };
}

export default useTasks;
