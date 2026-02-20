/**
 * Calendar Tasks Hook
 * MVC Pattern implementation for calendar-specific task management
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRealtimeTasks } from './useRealtimeTasks';
import { calendarService } from '../services/calendarService';

const useCalendarTasks = (user) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [refreshing, setRefreshing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Get all tasks using the existing real-time hook
  const { tasks: allTasks, loading: tasksLoading, error } = useRealtimeTasks(user?.username, user?.role);

  // Filter tasks with deadlines for calendar view
  const userTasks = useMemo(() => {
    return allTasks.filter(task => task.deadline);
  }, [allTasks]);

  // Combined tasks and calendar events
  const tasks = useMemo(() => {
    return [...calendarEvents, ...userTasks];
  }, [calendarEvents, userTasks]);

  // Fetch calendar events for current month
  const fetchCalendarEvents = useCallback(async (date = currentMonth) => {
    setCalendarLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth();

      const events = await calendarService.getEventsForMonth(year, month, userTasks);

      // Separate calendar events from tasks to avoid duplication
      const calendarOnly = events.filter(event => event.type !== 'task');

      setCalendarEvents(calendarOnly);
    } catch (error) {
      console.error('Failed to fetch calendar events:', error);
      setCalendarEvents([]);
    } finally {
      setCalendarLoading(false);
    }
  }, [currentMonth, userTasks]);

  // Fetch calendar events when month changes or tasks change
  useEffect(() => {
    if (userTasks.length >= 0) { // Trigger even when tasks array is empty
      fetchCalendarEvents(currentMonth);
    }
  }, [currentMonth, userTasks.length, fetchCalendarEvents]);

  // Fetch tasks (for consistency with the component interface)
  const fetchTasks = useCallback(async () => {
    // Fetch both tasks and calendar events
    await fetchCalendarEvents(currentMonth);
    return Promise.resolve();
  }, [fetchCalendarEvents, currentMonth]);

  // Refresh tasks with visual feedback
  const refreshTasks = useCallback(async () => {
    setRefreshing(true);
    try {
      // Refresh both calendar events and tasks
      await fetchCalendarEvents(currentMonth);
      // Real-time tasks will auto-refresh, just show visual feedback
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setRefreshing(false);
    }
  }, [fetchCalendarEvents, currentMonth]);

  // Navigate calendar months
  const navigateMonth = useCallback((direction) => {
    const newMonth = new Date(currentMonth);
    newMonth.setMonth(newMonth.getMonth() + direction);
    setCurrentMonth(newMonth);
  }, [currentMonth]);

  return {
    // Data
    tasks,
    userTasks, // Just the user's tasks
    calendarEvents, // Just calendar events and holidays

    // State
    loading: tasksLoading || calendarLoading || refreshing,
    error,
    selectedDate,
    viewMode,
    currentMonth,

    // Actions
    fetchTasks,
    refreshTasks,
    setSelectedDate,
    setViewMode,
    setCurrentMonth,
    navigateMonth,
  };
};

export default useCalendarTasks;