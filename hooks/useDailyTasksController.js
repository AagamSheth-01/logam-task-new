/**
 * Daily Tasks Controller Hook
 * MVC Pattern implementation for daily task management
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { dailyTasksApi } from '../src/features/daily-tasks/api/dailyTasksApi';
import useDailyTasksStore from '../src/features/daily-tasks/store/dailyTasksStore';

const useDailyTasksController = (user) => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const {
    dailyTasks,
    selectedTask,
    filters,
    setDailyTasks,
    setSelectedTask,
    addDailyTask,
    updateDailyTaskInList,
    removeDailyTask,
    setFilters,
    reset
  } = useDailyTasksStore();

  // Get tasks for selected date
  const tasksForDate = useMemo(() => {
    return dailyTasks.filter(task => {
      if (!selectedDate) return true;
      const taskDate = new Date(task.date || task.createdAt).toISOString().split('T')[0];
      return taskDate === selectedDate;
    });
  }, [dailyTasks, selectedDate]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalTasks = tasksForDate.length;
    const totalTime = tasksForDate.reduce((sum, task) => sum + (parseFloat(task.timeSpent) || 0), 0);
    const completedTasks = tasksForDate.filter(task => task.status === 'completed').length;
    const categoryCounts = {};

    tasksForDate.forEach(task => {
      categoryCounts[task.category] = (categoryCounts[task.category] || 0) + 1;
    });

    return {
      totalTasks,
      totalTime,
      completedTasks,
      pendingTasks: totalTasks - completedTasks,
      categoryCounts
    };
  }, [tasksForDate]);

  // Fetch daily tasks for selected date
  const fetchDailyTasks = useCallback(async (date = selectedDate) => {
    if (!user?.username) return;

    setLoading(true);
    setError(null);

    try {
      // Use direct fetch to match the working API call pattern
      const response = await fetch(`/api/daily-tasks?date=${date}`, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      const tasks = result.data?.dailyTasks || result.dailyTasks || [];

      setDailyTasks(tasks);
      return tasks;
    } catch (err) {
      console.error('Failed to fetch daily tasks:', err);
      setError(err.message || 'Failed to fetch daily tasks');
      return [];
    } finally {
      setLoading(false);
    }
  }, [user?.username, selectedDate, setDailyTasks]);

  // Create new daily task entry
  const createDailyTask = useCallback(async (taskData) => {
    if (!user?.username) return null;

    setSaving(true);
    setError(null);

    try {
      const newTaskData = {
        ...taskData,
        date: selectedDate,
        userId: user.username,
        tenantId: user.tenantId,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      const response = await dailyTasksApi.createDailyTask(newTaskData);
      const newTask = response.data?.task || response.task || response;

      addDailyTask(newTask);
      return newTask;
    } catch (err) {
      console.error('Failed to create daily task:', err);
      setError(err.message || 'Failed to create daily task');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [user, selectedDate, addDailyTask]);

  // Update existing daily task
  const updateDailyTask = useCallback(async (taskId, updates) => {
    setSaving(true);
    setError(null);

    try {
      const response = await dailyTasksApi.updateDailyTask(taskId, updates);
      const updatedTask = response.data?.task || response.task || response;

      updateDailyTaskInList(taskId, updatedTask);
      return updatedTask;
    } catch (err) {
      console.error('Failed to update daily task:', err);
      setError(err.message || 'Failed to update daily task');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [updateDailyTaskInList]);

  // Delete daily task
  const deleteDailyTask = useCallback(async (taskId) => {
    setSaving(true);
    setError(null);

    try {
      await dailyTasksApi.deleteDailyTask(taskId);
      removeDailyTask(taskId);
      return true;
    } catch (err) {
      console.error('Failed to delete daily task:', err);
      setError(err.message || 'Failed to delete daily task');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [removeDailyTask]);

  // Complete daily task
  const completeDailyTask = useCallback(async (taskId, completionData = {}) => {
    return updateDailyTask(taskId, {
      ...completionData,
      status: 'completed',
      completedAt: new Date().toISOString()
    });
  }, [updateDailyTask]);

  // Save multiple tasks at once
  const saveDailyTasksEntry = useCallback(async (tasksData, notes = '') => {
    if (!user?.username) return null;

    setSaving(true);
    setError(null);

    try {
      const entryData = {
        date: selectedDate,
        userId: user.username,
        tenantId: user.tenantId,
        tasks: tasksData,
        notes,
        totalTimeSpent: tasksData.reduce((sum, task) => sum + (parseFloat(task.timeSpent) || 0), 0),
        createdAt: new Date().toISOString()
      };

      const response = await fetch('/api/daily-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(entryData)
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const result = await response.json();
      const savedEntry = result.data?.task || result.task || result;

      // Add individual tasks to store
      if (tasksData?.length > 0) {
        tasksData.forEach(task => {
          addDailyTask({
            ...task,
            id: `${savedEntry.id || Date.now()}_${Date.now()}_${Math.random()}`,
            date: selectedDate,
            userId: user.username,
            entryId: savedEntry.id
          });
        });
      }

      // Refresh tasks to get latest data
      await fetchDailyTasks(selectedDate);

      return savedEntry;
    } catch (err) {
      console.error('Failed to save daily tasks entry:', err);
      setError(err.message || 'Failed to save daily tasks entry');
      throw err;
    } finally {
      setSaving(false);
    }
  }, [user, selectedDate, addDailyTask, fetchDailyTasks]);

  // Refresh data
  const refresh = useCallback(async () => {
    await fetchDailyTasks(selectedDate);
  }, [fetchDailyTasks, selectedDate]);

  // Update selected date and fetch tasks
  const changeDate = useCallback(async (newDate) => {
    setSelectedDate(newDate);
    setFilters({ date: newDate });
    await fetchDailyTasks(newDate);
  }, [fetchDailyTasks, setFilters]);

  // Fetch tasks when user or selected date changes
  useEffect(() => {
    if (user?.username && selectedDate) {
      fetchDailyTasks(selectedDate);
    }
  }, [user?.username, selectedDate, fetchDailyTasks]);

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
    dailyTasks: tasksForDate,
    allDailyTasks: dailyTasks,
    selectedTask,
    selectedDate,
    stats,

    // State
    loading,
    saving,
    error,
    filters,

    // Actions
    fetchDailyTasks,
    createDailyTask,
    updateDailyTask,
    deleteDailyTask,
    completeDailyTask,
    saveDailyTasksEntry,
    refresh,
    changeDate,
    setSelectedTask,

    // Utilities
    reset
  };
};

export default useDailyTasksController;