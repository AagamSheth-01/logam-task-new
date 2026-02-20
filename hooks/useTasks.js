/**
 * useTasks Hook
 * Custom React hook for tasks data fetching
 * Frontend MVC Layer - Data Hook
 */

import { useState, useEffect, useCallback } from 'react';
import { tasksApi } from '../src/api/tasks.api.js';

/**
 * Hook for fetching and managing tasks
 * @param {Object} filters - Task filters
 * @param {Object} options - Hook options
 * @param {boolean} options.autoLoad - Auto-load on mount (default: true)
 * @returns {Object} Tasks data and methods
 */
export function useTasks(filters = {}, options = {}) {
  const { autoLoad = true } = options;

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Load tasks
   * @param {Object} customFilters - Custom filters to override defaults
   */
  const loadTasks = useCallback(async (customFilters = {}) => {
    try {
      setLoading(true);
      setError(null);

      const mergedFilters = { ...filters, ...customFilters };
      const response = await tasksApi.getTasks(mergedFilters);

      if (response.success) {
        setTasks(response.tasks || response.data || []);
      } else {
        setTasks([]);
      }
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError(err.message || 'Failed to load tasks');
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  /**
   * Create new task
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} Created task
   */
  const createTask = useCallback(async (taskData) => {
    try {
      const result = await tasksApi.createTask(taskData);
      await loadTasks(); // Refresh tasks list
      return result;
    } catch (err) {
      console.error('Error creating task:', err);
      throw err;
    }
  }, [loadTasks]);

  /**
   * Update task
   * @param {string} taskId - Task ID
   * @param {Object} updates - Task updates
   * @returns {Promise<Object>} Updated task
   */
  const updateTask = useCallback(async (taskId, updates) => {
    try {
      const result = await tasksApi.updateTask(taskId, updates);
      await loadTasks(); // Refresh tasks list
      return result;
    } catch (err) {
      console.error('Error updating task:', err);
      throw err;
    }
  }, [loadTasks]);

  /**
   * Delete task
   * @param {string} taskId - Task ID
   * @returns {Promise<Object>} Deletion result
   */
  const deleteTask = useCallback(async (taskId) => {
    try {
      const result = await tasksApi.deleteTask(taskId);
      await loadTasks(); // Refresh tasks list
      return result;
    } catch (err) {
      console.error('Error deleting task:', err);
      throw err;
    }
  }, [loadTasks]);

  /**
   * Refresh tasks
   */
  const refresh = useCallback(() => {
    return loadTasks();
  }, [loadTasks]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadTasks();
    }
  }, [autoLoad]); // Only run on mount

  return {
    tasks,
    loading,
    error,
    loadTasks,
    createTask,
    updateTask,
    deleteTask,
    refresh
  };
}

export default useTasks;
