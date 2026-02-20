/**
 * Daily Tasks Dashboard Component
 * MVC Pattern implementation for daily task logging and management
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Save,
  Calendar,
  Clock,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader,
  Play,
  Pause,
  Timer,
  Target,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
  Edit2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Button from '../ui/Button';
import useDailyTasksController from '../../hooks/useDailyTasksController';

const DailyTasksDashboard = ({ user }) => {
  const {
    dailyTasks,
    stats,
    loading,
    saving,
    error,
    selectedDate,
    fetchDailyTasks,
    createDailyTask,
    saveDailyTasksEntry,
    changeDate,
    refresh
  } = useDailyTasksController(user);



  // Optimized date navigation - minimal reloading
  const navigateDate = useCallback((direction) => {
    if (isNavigating) return; // Prevent multiple rapid clicks

    setIsNavigating(true);
    const current = new Date(selectedDate);
    if (direction === 'prev') {
      current.setDate(current.getDate() - 1);
    } else if (direction === 'next') {
      current.setDate(current.getDate() + 1);
    }

    const newDate = current.toISOString().split('T')[0];

    // Use a timeout to debounce navigation and avoid heavy reloads
    setTimeout(() => {
      changeDate(newDate);
      setIsNavigating(false);
    }, 100); // Small delay to make navigation feel smoother

  }, [selectedDate, changeDate]);

  const goToToday = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    changeDate(today);
  }, [changeDate]);

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Date range functions
  const toggleDateRangeMode = useCallback(() => {
    setDateRangeMode(prev => {
      const newMode = !prev;
      if (prev) {
        // Reset to single date mode
        setStartDate('');
        setEndDate('');
        setRangeData([]);
        setIsRangeActive(false);
        fetchDailyTasks(selectedDate);
      } else {
        // Set default range (last 7 days)
        const today = new Date();
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 6);

        setStartDate(sevenDaysAgo.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
      }
      return newMode;
    });
  }, [selectedDate, fetchDailyTasks]);

  const applyDateRange = useCallback(async (start, end) => {
    const startDateToUse = start || startDate;
    const endDateToUse = end || endDate;

    if (startDateToUse && endDateToUse) {
      setRangeLoading(true);

      try {
        // Fetch tasks for date range using the API
        const response = await fetch(`/api/daily-tasks?startDate=${startDateToUse}&endDate=${endDateToUse}`, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });

        if (response.ok) {
          const result = await response.json();
          const rangeTasks = result.data?.dailyTasks || result.dailyTasks || [];

          console.log('Date range tasks fetched:', rangeTasks);

          // Store range data and activate range mode
          setRangeData(rangeTasks);
          setIsRangeActive(true);

          // Show success message with range info
          setMessage({
            type: 'success',
            text: `Found ${rangeTasks.length} task entries from ${startDateToUse} to ${endDateToUse}`
          });

        } else {
          throw new Error(`Failed to fetch date range: ${response.statusText}`);
        }
      } catch (err) {
        console.error('Failed to fetch date range:', err);
        setMessage({
          type: 'error',
          text: `Failed to fetch tasks for date range: ${err.message}`
        });
      } finally {
        setRangeLoading(false);
      }
    }
  }, []);

  // Fetch daily tasks when component mounts or user/date changes
  useEffect(() => {
    if (user?.username) {
      fetchDailyTasks(selectedDate);
    }
  }, [user?.username, selectedDate, fetchDailyTasks]);


  // Auto-save storage keys
  const AUTO_SAVE_KEY = `daily_tasks_autosave_${user?.username}_${selectedDate}`;
  const NOTES_SAVE_KEY = `daily_tasks_notes_autosave_${user?.username}_${selectedDate}`;

  // Helper function to get initial tasks
  const getInitialTasks = () => {
    if (typeof window !== 'undefined') {
      let tasksToReturn = [];

      // First, check for auto-saved tasks
      const saved = localStorage.getItem(AUTO_SAVE_KEY);
      if (saved) {
        try {
          const parsedTasks = JSON.parse(saved);
          // Validate tasks have required structure
          if (Array.isArray(parsedTasks) && parsedTasks.length > 0) {
            tasksToReturn = parsedTasks.map(task => ({
              id: task.id || `task_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
              description: task.description || '',
              timeSpent: task.timeSpent || 0,
              category: task.category || 'general',
              startTime: task.startTime || null,
              isRunning: task.isRunning || false,
              priority: task.priority || 'medium'
            }));
          }
        } catch (error) {
          console.warn('Failed to parse auto-saved tasks:', error);
        }
      }

      // Second, check for pending tasks from completed work tasks
      const pendingKey = `pending_daily_tasks_${user?.username}_${selectedDate}`;
      const pendingTasks = localStorage.getItem(pendingKey);
      if (pendingTasks) {
        try {
          const parsedPendingTasks = JSON.parse(pendingTasks);
          if (Array.isArray(parsedPendingTasks) && parsedPendingTasks.length > 0) {
            const formattedPendingTasks = parsedPendingTasks.map(task => ({
              id: task.id || `task_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
              description: task.description || '',
              timeSpent: task.timeSpent || 0,
              category: task.category || 'general',
              startTime: task.startTime || null,
              isRunning: task.isRunning || false,
              priority: task.priority || 'medium'
            }));

            // Merge with existing auto-saved tasks (pending tasks go first)
            if (tasksToReturn.length > 0) {
              tasksToReturn = [...formattedPendingTasks, ...tasksToReturn];
            } else {
              tasksToReturn = formattedPendingTasks;
            }

            console.log('✅ Loaded pending daily tasks from completed work tasks:', formattedPendingTasks.length);
          }
        } catch (error) {
          console.warn('Failed to parse pending daily tasks:', error);
        }
      }

      // If no tasks found, return default empty task
      if (tasksToReturn.length === 0) {
        return [{
          id: `task_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
          description: '',
          timeSpent: 0,
          category: 'general',
          startTime: null,
          isRunning: false,
          priority: 'medium'
        }];
      }

      return tasksToReturn;
    }

    return [{
      id: `task_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      description: '',
      timeSpent: 0,
      category: 'general',
      startTime: null,
      isRunning: false,
      priority: 'medium'
    }];
  };

  // Helper function to get initial notes
  const getInitialNotes = () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(NOTES_SAVE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (error) {
          console.warn('Failed to parse auto-saved notes:', error);
        }
      }
    }
    return '';
  };

  // Local component state with auto-save restoration
  const [tasks, setTasks] = useState(getInitialTasks);
  const [notes, setNotes] = useState(getInitialNotes);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [runningTasks, setRunningTasks] = useState(new Set());
  const [taskTimers, setTaskTimers] = useState({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Date range state
  const [dateRangeMode, setDateRangeMode] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Local navigation state to avoid unnecessary reloads
  const [isNavigating, setIsNavigating] = useState(false);

  // Range data state
  const [rangeData, setRangeData] = useState([]);
  const [isRangeActive, setIsRangeActive] = useState(false);
  const [rangeLoading, setRangeLoading] = useState(false);

  const categories = [
    { value: 'general', label: 'General Work', color: 'bg-gray-100 text-gray-800' },
    { value: 'development', label: 'Development', color: 'bg-blue-100 text-blue-800' },
    { value: 'design', label: 'Design', color: 'bg-purple-100 text-purple-800' },
    { value: 'meeting', label: 'Meetings', color: 'bg-green-100 text-green-800' },
    { value: 'research', label: 'Research', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'documentation', label: 'Documentation', color: 'bg-indigo-100 text-indigo-800' },
    { value: 'testing', label: 'Testing & QA', color: 'bg-red-100 text-red-800' },
    { value: 'support', label: 'Support', color: 'bg-orange-100 text-orange-800' },
    { value: 'client-work', label: 'Client Work', color: 'bg-teal-100 text-teal-800' },
    { value: 'admin', label: 'Administrative', color: 'bg-pink-100 text-pink-800' }
  ];

  const priorities = [
    { value: 'low', label: 'Low', color: 'bg-green-50 text-green-700 border-green-200' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    { value: 'high', label: 'High', color: 'bg-red-50 text-red-700 border-red-200' }
  ];

  const taskTemplates = [
    { description: 'Daily Standup Meeting', category: 'meeting', estimatedTime: 0.5, priority: 'medium' },
    { description: 'Code Review', category: 'development', estimatedTime: 1.0, priority: 'high' },
    { description: 'Client Call', category: 'meeting', estimatedTime: 1.0, priority: 'high' },
    { description: 'Bug Fixing', category: 'development', estimatedTime: 2.0, priority: 'high' },
    { description: 'Documentation Update', category: 'documentation', estimatedTime: 1.5, priority: 'medium' },
    { description: 'Testing & QA', category: 'testing', estimatedTime: 2.0, priority: 'medium' },
    { description: 'Email & Admin Tasks', category: 'admin', estimatedTime: 0.5, priority: 'low' },
    { description: 'Project Planning', category: 'general', estimatedTime: 1.0, priority: 'medium' },
    { description: 'Research & Analysis', category: 'research', estimatedTime: 2.0, priority: 'medium' },
    { description: 'Design Review', category: 'design', estimatedTime: 1.0, priority: 'medium' }
  ];

  // Helper functions
  const generateTaskId = () => `task_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  const formatTime = (hours) => {
    if (hours === 0) return '0m';
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes}m`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) {
      return `${h}h`;
    }
    return `${h}h ${m}m`;
  };

  const minutesToHours = (minutes) => minutes / 60;

  const addTask = () => {
    setTasks(prev => [...prev, {
      id: generateTaskId(),
      description: '',
      timeSpent: 0,
      category: 'general',
      startTime: null,
      isRunning: false,
      priority: 'medium'
    }]);
    setHasUnsavedChanges(true);
  };

  const updateTask = (id, field, value) => {
    setTasks(prev => prev.map(task =>
      task.id === id ? { ...task, [field]: value } : task
    ));
    setHasUnsavedChanges(true);
  };

  const removeTask = (id) => {
    setTasks(prev => prev.filter(task => task.id !== id));
    const newRunning = new Set(runningTasks);
    newRunning.delete(id);
    setRunningTasks(newRunning);
    setHasUnsavedChanges(true);
  };

  const addFromTemplate = (template) => {
    setTasks(prev => [...prev, {
      id: generateTaskId(),
      description: template.description,
      timeSpent: template.estimatedTime || 0,
      category: template.category,
      priority: template.priority,
      startTime: null,
      isRunning: false
    }]);
    setShowTemplates(false);
    setHasUnsavedChanges(true);
  };

  const validateTasks = useCallback(() => {
    const issues = [];
    const validTasks = tasks.filter(task => task.description && task.description.trim());

    if (validTasks.length === 0) {
      return issues;
    }

    validTasks.forEach((task, index) => {
      if (task.timeSpent === 0) {
        issues.push(`Task ${index + 1}: Time must be greater than 0`);
      }
      if (task.timeSpent > 12) {
        issues.push(`Task ${index + 1}: ${task.timeSpent}h exceeds maximum (12h per task)`);
      }
      if (task.description.length < 3) {
        issues.push(`Task ${index + 1}: Description too brief (minimum 3 characters)`);
      }
    });

    return issues;
  }, [tasks]);

  const handleSave = async () => {
    const issues = validateTasks();
    setValidationIssues(issues);

    if (issues.length > 0) {
      setMessage({ type: 'error', text: 'Please fix validation issues before saving' });
      return;
    }

    const validTasks = tasks.filter(task => task.description && task.description.trim() && task.timeSpent > 0);

    if (validTasks.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one task with time spent' });
      return;
    }

    try {
      await saveDailyTasksEntry(validTasks, notes);
      setMessage({ type: 'success', text: 'Daily tasks saved successfully!' });

      // Reset form and clear auto-saved data
      setTasks([{
        id: generateTaskId(),
        description: '',
        timeSpent: 0,
        category: 'general',
        startTime: null,
        isRunning: false,
        priority: 'medium'
      }]);
      setNotes('');
      setValidationIssues([]);

      // Clear auto-saved data after successful save
      try {
        localStorage.removeItem(AUTO_SAVE_KEY);
        localStorage.removeItem(NOTES_SAVE_KEY);

        // Also clear pending daily tasks from completed work tasks
        const pendingKey = `pending_daily_tasks_${user?.username}_${selectedDate}`;
        localStorage.removeItem(pendingKey);
        console.log('✅ Cleared pending daily tasks after successful save');

        setHasUnsavedChanges(false);
      } catch (error) {
        console.warn('Failed to clear auto-saved data after save:', error);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Failed to save daily tasks' });
    }
  };

  const handleRefresh = async () => {
    await refresh();
  };

  // Clear auto-saved data manually
  const clearAutoSavedData = () => {
    try {
      localStorage.removeItem(AUTO_SAVE_KEY);
      localStorage.removeItem(NOTES_SAVE_KEY);

      // Also clear pending daily tasks from completed work tasks
      const pendingKey = `pending_daily_tasks_${user?.username}_${selectedDate}`;
      localStorage.removeItem(pendingKey);

      setHasUnsavedChanges(false);
      setMessage({ type: 'success', text: 'Auto-saved data cleared' });
    } catch (error) {
      console.warn('Failed to clear auto-saved data:', error);
    }
  };

  // Check if there's auto-saved data when component mounts
  const hasAutoSavedData = () => {
    if (typeof window !== 'undefined') {
      const savedTasks = localStorage.getItem(AUTO_SAVE_KEY);
      const savedNotes = localStorage.getItem(NOTES_SAVE_KEY);
      return !!(savedTasks || savedNotes);
    }
    return false;
  };

  // Auto-save tasks to localStorage
  useEffect(() => {
    if (hasUnsavedChanges && tasks.length > 0) {
      const saveTimer = setTimeout(() => {
        try {
          localStorage.setItem(AUTO_SAVE_KEY, JSON.stringify(tasks));
          console.log('Auto-saved tasks to localStorage');
        } catch (error) {
          console.warn('Failed to auto-save tasks:', error);
        }
      }, 1000); // Save after 1 second of inactivity

      return () => clearTimeout(saveTimer);
    }
  }, [tasks, hasUnsavedChanges, AUTO_SAVE_KEY]);

  // Auto-save notes to localStorage
  useEffect(() => {
    if (notes !== getInitialNotes()) {
      const saveTimer = setTimeout(() => {
        try {
          localStorage.setItem(NOTES_SAVE_KEY, JSON.stringify(notes));
          console.log('Auto-saved notes to localStorage');
        } catch (error) {
          console.warn('Failed to auto-save notes:', error);
        }
      }, 1000); // Save after 1 second of inactivity

      return () => clearTimeout(saveTimer);
    }
  }, [notes, NOTES_SAVE_KEY]);

  // Clear auto-saved data after successful save
  useEffect(() => {
    if (message.type === 'success' && message.text.includes('saved successfully')) {
      try {
        localStorage.removeItem(AUTO_SAVE_KEY);
        localStorage.removeItem(NOTES_SAVE_KEY);
        setHasUnsavedChanges(false);
        console.log('Cleared auto-saved data after successful save');
      } catch (error) {
        console.warn('Failed to clear auto-saved data:', error);
      }
    }
  }, [message, AUTO_SAVE_KEY, NOTES_SAVE_KEY]);

  // Load saved data when date changes
  useEffect(() => {
    const restoredTasks = getInitialTasks();
    const restoredNotes = getInitialNotes();

    setTasks(restoredTasks);
    setNotes(restoredNotes);
    setHasUnsavedChanges(false);

    // Show notification if data was restored
    if (hasAutoSavedData()) {
      setMessage({
        type: 'info',
        text: 'Previous unsaved work has been restored automatically'
      });
    }
  }, [selectedDate]);

  // Initial data restoration notification (only on first mount)
  useEffect(() => {
    if (hasAutoSavedData()) {
      setMessage({
        type: 'info',
        text: 'Previous unsaved work has been restored automatically'
      });
    }
  }, []);

  // Auto-validate tasks and clear validation issues when tasks change
  useEffect(() => {
    if (validationIssues.length > 0) {
      const currentIssues = validateTasks();
      if (currentIssues.length === 0) {
        setValidationIssues([]);
        // Also clear error message if it was related to validation
        if (message.type === 'error' && message.text.includes('validation')) {
          setMessage({ type: '', text: '' });
        }
      }
    }
  }, [tasks, validationIssues, validateTasks]);

  // Clear messages after 5 seconds
  useEffect(() => {
    if (message.text) {
      const timeout = setTimeout(() => {
        setMessage({ type: '', text: '' });
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [message]);

  const getCategoryStyle = (categoryValue) => {
    const category = categories.find(c => c.value === categoryValue);
    return category ? category.color : 'bg-gray-100 text-gray-800';
  };

  const getPriorityStyle = (priorityValue) => {
    const priority = priorities.find(p => p.value === priorityValue);
    return priority ? priority.color : 'bg-gray-50 text-gray-700 border-gray-200';
  };

  if (loading && dailyTasks.length === 0) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={handleRefresh} />;
  }

  return (
    <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
      {/* Page Header - Following standard tab pattern */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl lg:text-2xl font-bold text-black">Daily Tasks</h2>
          {hasUnsavedChanges && (
            <div className="flex items-center space-x-2 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm text-amber-700 font-medium">Auto-saving...</span>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <DailyTasksStats stats={stats} />

      {/* Date Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="space-y-4">
          {/* Header with toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-900">Date Selection</h3>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={toggleDateRangeMode}
                className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  !dateRangeMode
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-150'
                }`}
              >
                Single Day
              </button>
              <button
                onClick={toggleDateRangeMode}
                className={`inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  dateRangeMode
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-150'
                }`}
              >
                Date Range
              </button>
            </div>
          </div>

          {/* Date inputs */}
          {!dateRangeMode ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Selected Date</label>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => changeDate(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => navigateDate('prev')}
                  disabled={isNavigating}
                  className={`p-2 rounded-md transition-colors ${
                    isNavigating
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigateDate('next')}
                  disabled={isNavigating}
                  className={`p-2 rounded-md transition-colors ${
                    isNavigating
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'
                  }`}
                  title="Next Day"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {!isToday && (
                  <button
                    onClick={goToToday}
                    disabled={isNavigating}
                    className={`px-3 py-2 text-xs font-medium rounded-md transition-colors border border-blue-200 ${
                      isNavigating
                        ? 'bg-gray-50 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                    }`}
                    title="Go to Today"
                  >
                    Today
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                </div>
              </div>

              {startDate && endDate && (
                <div className="flex justify-end">
                  <button
                    onClick={() => applyDateRange(startDate, endDate)}
                    disabled={rangeLoading}
                    className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                      rangeLoading
                        ? 'bg-gray-400 cursor-not-allowed text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    {rangeLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Loading...
                      </>
                    ) : (
                      'Apply Date Range'
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <MessageAlert message={message} onClose={() => setMessage({ type: '', text: '' })} />
      )}

      {/* Validation Issues */}
      {validationIssues.length > 0 && (
        <ValidationIssues issues={validationIssues} />
      )}

      {/* Task Entry Form */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Log Today's Tasks</h3>
            <Button
              onClick={() => setShowTemplates(!showTemplates)}
              variant="outline"
              size="sm"
              className="flex items-center space-x-2"
            >
              <FileText className="w-4 h-4" />
              <span>Templates</span>
              {showTemplates ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>

        {/* Templates */}
        {showTemplates && (
          <TaskTemplates templates={taskTemplates} onSelect={addFromTemplate} />
        )}

        {/* Task List */}
        <div className="space-y-4">
          {tasks.map((task, index) => (
            <TaskEntryForm
              key={task.id}
              task={task}
              index={index}
              categories={categories}
              priorities={priorities}
              onUpdate={updateTask}
              onRemove={removeTask}
              formatTime={formatTime}
              minutesToHours={minutesToHours}
            />
          ))}
        </div>

        <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-200">
          <Button
            onClick={addTask}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </Button>

          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-600">
              Total Time: {formatTime(tasks.reduce((sum, task) => sum + (parseFloat(task.timeSpent) || 0), 0))}
            </div>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-2 bg-black hover:bg-gray-800"
            >
              {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Save Tasks</span>
            </Button>
          </div>
        </div>

        {/* Notes Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setHasUnsavedChanges(true);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            rows={3}
            placeholder="Add any additional notes about your day..."
          />
        </div>
        </div>

      {/* Previous Tasks List */}
      <SavedTasksList
        tasks={isRangeActive ? rangeData : (dailyTasks || [])}
        categories={categories}
        priorities={priorities}
        isRangeMode={isRangeActive}
        dateRange={isRangeActive ? { start: startDate, end: endDate } : null}
      />
    </div>
  );
};

// Helper Components
const DailyTasksStats = ({ stats }) => {
  const statCards = [
    { label: 'Total Tasks', value: stats.totalTasks, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Time', value: `${stats.totalTime?.toFixed(1) || 0}h`, icon: Clock, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Completed', value: stats.completedTasks, icon: CheckCircle, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Pending', value: stats.pendingTasks, icon: Timer, color: 'text-orange-600', bg: 'bg-orange-50' }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className={`${stat.bg} border border-gray-200 rounded-lg p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
              <Icon className={`w-5 h-5 ${stat.color}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

const TaskTemplates = ({ templates, onSelect }) => (
  <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
    <h4 className="text-sm font-medium text-gray-700 mb-3">Quick Templates</h4>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {templates.map((template, index) => (
        <button
          key={index}
          onClick={() => onSelect(template)}
          className="text-left p-2 bg-white border border-gray-200 rounded hover:bg-gray-50 transition-colors"
        >
          <div className="text-sm font-medium text-gray-900">{template.description}</div>
          <div className="text-xs text-gray-500">{template.category} • {template.estimatedTime}h</div>
        </button>
      ))}
    </div>
  </div>
);

const TaskEntryForm = ({ task, index, categories, priorities, onUpdate, onRemove, formatTime, minutesToHours }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-700">Task {index + 1}</span>
        {index > 0 && (
          <Button
            onClick={() => onRemove(task.id)}
            variant="ghost"
            size="sm"
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea
            value={task.description}
            onChange={(e) => onUpdate(task.id, 'description', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            rows={2}
            placeholder="What did you work on?"
          />
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Time Spent (minutes)</label>
            <input
              type="number"
              value={Math.round(task.timeSpent * 60)}
              onChange={(e) => onUpdate(task.id, 'timeSpent', minutesToHours(parseInt(e.target.value) || 0))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder="0"
              min="0"
              max="720"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={task.category}
                onChange={(e) => onUpdate(task.id, 'category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={task.priority}
                onChange={(e) => onUpdate(task.id, 'priority', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                {priorities.map(priority => (
                  <option key={priority.value} value={priority.value}>{priority.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {task.timeSpent > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Formatted time: {formatTime(task.timeSpent)}
        </div>
      )}
    </div>
  );
};

const SavedTasksList = ({ tasks, categories, priorities, isRangeMode = false, dateRange = null }) => {
  // Extract individual tasks from daily task entries
  const allTasks = React.useMemo(() => {
    if (!tasks || tasks.length === 0) return [];

    const flatTasks = [];
    tasks.forEach(dailyEntry => {
      if (dailyEntry.tasks && Array.isArray(dailyEntry.tasks)) {
        // Each daily entry has a tasks array - flatten it
        dailyEntry.tasks.forEach(task => {
          flatTasks.push({
            ...task,
            date: dailyEntry.date,
            entryId: dailyEntry.id,
            entryNotes: dailyEntry.notes
          });
        });
      } else if (dailyEntry.description || dailyEntry.task) {
        // Treat the entry itself as a task (backward compatibility)
        flatTasks.push(dailyEntry);
      }
    });

    return flatTasks;
  }, [tasks]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">
            {isRangeMode ? 'Tasks in Date Range' : 'Previously Saved Tasks'}
          </h3>
          {isRangeMode && dateRange && (
            <p className="text-sm text-gray-600 mt-1">
              From {dateRange.start} to {dateRange.end}
            </p>
          )}
        </div>
        {isRangeMode && allTasks.length > 0 && (
          <div className="text-sm text-gray-500">
            {allTasks.length} tasks found
          </div>
        )}
      </div>
      {!allTasks || allTasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-sm">
            {isRangeMode
              ? 'No tasks found in the selected date range'
              : 'No previously saved tasks found'
            }
          </p>
          <p className="text-xs mt-1">
            {isRangeMode
              ? 'Try selecting a different date range'
              : 'Tasks will appear here after you save them'
            }
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {allTasks.map((task, index) => (
            <div key={index} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{task.description || task.task || 'Untitled Task'}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      categories.find(c => c.value === task.category)?.color || 'bg-gray-100 text-gray-800'
                    }`}>
                      {categories.find(c => c.value === task.category)?.label || task.category}
                    </span>
                    <span className="text-xs text-gray-500">
                      {typeof task.timeSpent === 'number' ? `${task.timeSpent.toFixed(1)}h` : task.timeSpent}
                    </span>
                    {task.date && (
                      <span className="text-xs text-gray-400">
                        {task.date}
                      </span>
                    )}
                  </div>
                </div>
                {task.status === 'completed' && (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MessageAlert = ({ message, onClose }) => (
  <div className={`p-4 rounded-lg border flex items-center justify-between ${
    message.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
    message.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
    'bg-blue-50 border-blue-200 text-blue-800'
  }`}>
    <div className="flex items-center space-x-2">
      {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> :
       message.type === 'error' ? <AlertCircle className="w-5 h-5" /> :
       <AlertCircle className="w-5 h-5" />}
      <span className="text-sm font-medium">{message.text}</span>
    </div>
    <Button
      onClick={onClose}
      variant="ghost"
      size="sm"
      className="text-current hover:bg-white/20"
    >
      <X className="w-4 h-4" />
    </Button>
  </div>
);

const ValidationIssues = ({ issues }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
    <div className="flex items-center space-x-2 mb-2">
      <AlertTriangle className="w-5 h-5 text-red-600" />
      <h4 className="text-sm font-semibold text-red-800">Validation Issues</h4>
    </div>
    <ul className="text-sm text-red-700 space-y-1">
      {issues.map((issue, index) => (
        <li key={index} className="flex items-center space-x-2">
          <span className="w-1 h-1 bg-red-600 rounded-full"></span>
          <span>{issue}</span>
        </li>
      ))}
    </ul>
  </div>
);

const LoadingSkeleton = () => (
  <div className="space-y-6 px-3 sm:px-4 lg:px-6 py-3">
    <div className="flex justify-between items-center">
      <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
      <div className="h-9 bg-gray-200 rounded w-20 animate-pulse"></div>
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gray-50 p-4 rounded-lg border">
          <div className="h-4 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
          <div className="h-6 bg-gray-200 rounded w-8 animate-pulse"></div>
        </div>
      ))}
    </div>

    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
    </div>
  </div>
);

const ErrorDisplay = ({ error, onRetry }) => (
  <div className="bg-red-50 border border-red-200 rounded-lg p-6 mx-3 sm:mx-4 lg:mx-6 my-3">
    <div className="flex items-center space-x-3 mb-4">
      <AlertTriangle className="w-6 h-6 text-red-600" />
      <div>
        <h3 className="font-semibold text-red-800">Failed to load daily tasks</h3>
        <p className="text-red-700 mt-1">{error}</p>
      </div>
    </div>
    <Button
      onClick={onRetry}
      variant="outline"
      size="sm"
      className="text-red-600 border-red-300 hover:bg-red-100"
    >
      <RefreshCw className="w-4 h-4 mr-2" />
      Try Again
    </Button>
  </div>
);


export default DailyTasksDashboard;