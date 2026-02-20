/**
 * My Tasks Controller - MVC Pattern
 * Handles business logic and coordinates between View and Model
 */

import { useState, useEffect, useMemo } from 'react';
import { useRealtimeTasks } from '../../../../hooks/useRealtimeTasks';
import { taskService } from '../services/taskService';

export const useMyTasksController = (user) => {
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Get real-time tasks data (Model layer)
  const {
    tasks: allTasks,
    loading: tasksLoading,
    error: tasksError
  } = useRealtimeTasks(user?.username, user?.role);

  // Derived state (computed properties)
  const myTasks = useMemo(() => {
    return allTasks.filter(task =>
      task.assigned_to === user?.username || task.created_by === user?.username
    );
  }, [allTasks, user?.username]);

  const taskStats = useMemo(() => {
    return taskService.calculateStats(allTasks, user?.username);
  }, [allTasks, user?.username]);

  const clientList = useMemo(() => {
    return taskService.extractClients(myTasks);
  }, [myTasks]);

  // Set combined loading and error states
  useEffect(() => {
    setLoading(tasksLoading);
    setError(tasksError);
  }, [tasksLoading, tasksError]);

  // Actions (Controller methods)
  const actions = {
    // Refresh tasks
    refresh: async () => {
      setRefreshing(true);
      try {
        // Real-time tasks will auto-refresh, just show visual feedback
        setTimeout(() => setRefreshing(false), 1000);
      } catch (error) {
        setError('Failed to refresh tasks');
        setRefreshing(false);
      }
    },

    // Update task
    updateTask: async (taskId, updates) => {
      try {
        setLoading(true);
        setError(null);

        await taskService.updateTask(taskId, updates);

        // Firebase real-time listener will update the UI automatically
        setLoading(false);
      } catch (error) {
        setError(error.message);
        setLoading(false);
        throw error;
      }
    },

    // Delete task
    deleteTask: async (taskId) => {
      try {
        setLoading(true);
        setError(null);

        await taskService.deleteTask(taskId);

        // Firebase real-time listener will update the UI automatically
        setLoading(false);
      } catch (error) {
        setError(error.message);
        setLoading(false);
        throw error;
      }
    },

    // Export tasks to CSV
    exportTasks: async () => {
      try {
        setLoading(true);
        setError(null);

        const csvContent = taskService.generateCSV(myTasks);
        const filename = `my-tasks-${new Date().toISOString().split('T')[0]}.csv`;

        taskService.downloadCSV(csvContent, filename);

        setLoading(false);
      } catch (error) {
        setError('Failed to export tasks');
        setLoading(false);
        throw error;
      }
    },

    // Clear error
    clearError: () => {
      setError(null);
    }
  };

  // Return controller interface (what the View will use)
  return {
    // Data
    tasks: myTasks,
    stats: taskStats,
    clientList,

    // State
    loading: loading || refreshing,
    refreshing,
    error,

    // Actions
    ...actions
  };
};

export default useMyTasksController;