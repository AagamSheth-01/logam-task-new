/**
 * Task Completion Controller Hook
 * MVC Pattern implementation for task completion management
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useTasks } from '../src/features/tasks/hooks/useTasks.js';
import tasksApi from '../src/features/tasks/api/tasksApi.js';

const useTaskCompletion = (user) => {
  const [completing, setCompleting] = useState(false);
  const [completionError, setCompletionError] = useState(null);

  // Use the existing tasks hook with user filter - only if user exists
  const {
    tasks: allTasks,
    loading,
    error,
    loadTasks,
    updateTask: updateTaskInStore
  } = useTasks(user?.username ? { assigned_to: user.username } : {}, { autoLoad: false });

  // Load user's tasks when component mounts or user changes
  const fetchUserTasks = useCallback(async () => {
    if (!user?.username) return;
    await loadTasks({ assigned_to: user.username });
  }, [user?.username, loadTasks]);

  // Helper function to check if task is overdue
  const isTaskOverdue = useCallback((task) => {
    if (!task.deadline || task.status === 'done') return false;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const deadline = new Date(task.deadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline < today;
    } catch (e) {
      return false;
    }
  }, []);

  // Get categorized tasks
  const categorizedTasks = useMemo(() => {
    // allTasks is already filtered by the hook
    const userTasks = allTasks || [];

    const overdue = userTasks.filter(t => isTaskOverdue(t));
    const pending = userTasks.filter(t => t.status === 'pending' && !isTaskOverdue(t));
    const completed = userTasks.filter(t => t.status === 'done');

    return {
      overdue,
      pending,
      completed,
      total: userTasks.length
    };
  }, [allTasks, isTaskOverdue]);

  // Calculate statistics
  const stats = useMemo(() => {
    const { overdue, pending, completed, total } = categorizedTasks;

    return {
      total,
      completed: completed.length,
      pending: pending.length,
      overdue: overdue.length,
      completionRate: total > 0 ? Math.round((completed.length / total) * 100) : 0
    };
  }, [categorizedTasks]);

  // Mark task as complete
  const completeTask = useCallback(async (taskName) => {
    if (!user?.username) return null;

    setCompleting(true);
    setCompletionError(null);

    try {
      // Find the task to get its ID
      const task = allTasks.find(t => t.task === taskName && t.assigned_to === user.username);
      if (!task) {
        throw new Error('Task not found');
      }

      // Update task status using the API
      const updates = {
        status: 'done',
        completed_at: new Date().toISOString(),
        updated_by: user.username
      };

      await tasksApi.updateTask(task.id, updates);

      // Update the store
      updateTaskInStore(task.id, { ...task, ...updates });

      return task;
    } catch (err) {
      console.error('Failed to complete task:', err);
      setCompletionError(err.message || 'Failed to complete task');
      throw err;
    } finally {
      setCompleting(false);
    }
  }, [allTasks, user?.username, updateTaskInStore]);

  // Mark multiple tasks as complete
  // Refresh tasks data
  const refresh = useCallback(async () => {
    await fetchUserTasks();
  }, [fetchUserTasks]);

  // Fetch tasks when user changes
  useEffect(() => {
    if (user?.username) {
      fetchUserTasks();
    }
  }, [user?.username, fetchUserTasks]);

  // Clear completion error after 5 seconds
  useEffect(() => {
    if (completionError) {
      const timeout = setTimeout(() => {
        setCompletionError(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [completionError]);

  return {
    // Data
    tasks: categorizedTasks,
    allTasks: allTasks,
    stats,

    // State
    loading,
    completing,
    error: error || completionError,

    // Actions
    completeTask,
    refresh,

    // Utilities
    isTaskOverdue
  };
};

export default useTaskCompletion;