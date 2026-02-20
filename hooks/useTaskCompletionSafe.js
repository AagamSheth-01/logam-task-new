/**
 * Safe Task Completion Controller Hook
 * Simplified MVC Pattern implementation without complex dependencies
 */

import { useState, useCallback, useEffect, useMemo } from 'react';

const useTaskCompletionSafe = (user) => {
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);

  // Fetch user's pending tasks using direct API call
  const fetchUserTasks = useCallback(async () => {
    if (!user?.username) return;

    setLoading(true);
    setError(null);

    try {
      // Use direct fetch to avoid hook dependencies
      const response = await fetch(`/api/tasks?assigned_to=${user.username}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      const userTasks = result.data?.tasks || result.tasks || [];
      setTasks(userTasks);
    } catch (err) {
      console.error('Failed to fetch user tasks:', err);
      setError(err.message || 'Failed to fetch tasks');
    } finally {
      setLoading(false);
    }
  }, [user?.username]);

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
    const overdue = tasks.filter(t => isTaskOverdue(t));
    const pending = tasks.filter(t => t.status === 'pending' && !isTaskOverdue(t));
    const completed = tasks.filter(t => t.status === 'done');

    return {
      overdue,
      pending,
      completed,
      total: tasks.length
    };
  }, [tasks, isTaskOverdue]);

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
    setError(null);

    try {
      // Find the task to get its ID
      const task = tasks.find(t => t.task === taskName && t.assigned_to === user.username);
      if (!task) {
        throw new Error('Task not found');
      }

      // Update task status using direct API call
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          status: 'done',
          completed_at: new Date().toISOString(),
          updated_by: user.username
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.status}`);
      }

      // Update local state
      setTasks(prevTasks =>
        prevTasks.map(t =>
          t.id === task.id
            ? { ...t, status: 'done', completed_at: new Date().toISOString() }
            : t
        )
      );

      return task;
    } catch (err) {
      console.error('Failed to complete task:', err);
      setError(err.message || 'Failed to complete task');
      throw err;
    } finally {
      setCompleting(false);
    }
  }, [tasks, user?.username]);

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

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timeout = setTimeout(() => {
        setError(null);
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [error]);

  return {
    // Data
    tasks: categorizedTasks,
    allTasks: tasks,
    stats,

    // State
    loading,
    completing,
    error,

    // Actions
    completeTask,
    refresh,

    // Utilities
    isTaskOverdue
  };
};

export default useTaskCompletionSafe;