import React, { useState, useEffect, useCallback } from 'react';
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
  Copy,
  Zap,
  Timer,
  Target,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  RotateCcw,
  Edit2
} from 'lucide-react';

// Button component
const Button = ({ children, onClick, variant = 'default', size = 'default', className = '', disabled = false, title = '', ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    default: "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500",
    outline: "border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 focus:ring-blue-500",
    ghost: "hover:bg-gray-100 text-gray-700 focus:ring-blue-500",
    success: "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500"
  };
  
  const sizes = {
    sm: "px-3 py-2 text-sm",
    default: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base"
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

const DailyTaskLogger = ({ currentUser = { username: 'demo' } }) => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [tasks, setTasks] = useState([{ 
    id: `task_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
    description: '', 
    timeSpent: 0, 
    category: 'general', 
    startTime: null, 
    isRunning: false,
    priority: 'medium'
  }]);
  const [savedTasks, setSavedTasks] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [existingEntry, setExistingEntry] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [runningTasks, setRunningTasks] = useState(new Set());
  const [taskTimers, setTaskTimers] = useState({});
  const [showTemplates, setShowTemplates] = useState(false);
  const [validationIssues, setValidationIssues] = useState([]);
  const [expandedTasks, setExpandedTasks] = useState(new Set());

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

  const formatTimeDetailed = (hours) => {
    if (hours === 0) return '0 minutes';
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) {
      return `${h} hour${h !== 1 ? 's' : ''}`;
    }
    return `${h} hour${h !== 1 ? 's' : ''} ${m} minute${m !== 1 ? 's' : ''}`;
  };

  const minutesToHours = (minutes) => minutes / 60;
  const formatTimeInput = (hours) => Math.round(hours * 60);

  const timePresets = [
    { label: '15m', minutes: 15 },
    { label: '30m', minutes: 30 },
    { label: '45m', minutes: 45 },
    { label: '1h', minutes: 60 },
    { label: '1h 30m', minutes: 90 },
    { label: '2h', minutes: 120 },
    { label: '3h', minutes: 180 },
    { label: '4h', minutes: 240 }
  ];

  const calculateTotalHours = () => {
    let total = tasks.reduce((sum, task) => sum + (parseFloat(task.timeSpent) || 0), 0);
    
    runningTasks.forEach(taskId => {
      if (taskTimers[taskId]) {
        total += taskTimers[taskId];
      }
    });
    
    total += savedTasks.reduce((sum, task) => sum + (parseFloat(task.timeSpent) || 0), 0);
    
    return total;
  };

  const validateTasks = () => {
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
      if (task.description.length > 500) {
        issues.push(`Task ${index + 1}: Description too long (maximum 500 characters)`);
      }
      if (task.timeSpent < 0) {
        issues.push(`Task ${index + 1}: Time spent cannot be negative`);
      }
    });

    const totalHours = calculateTotalHours();
    if (totalHours > 12) {
      issues.push(`Total ${totalHours.toFixed(1)}h exceeds recommended daily limit (12h)`);
    }
    if (totalHours > 16) {
      issues.push(`Total ${totalHours.toFixed(1)}h exceeds absolute maximum (16h)`);
    }

    return issues;
  };

  // useEffect hooks
  useEffect(() => {
    loadDailyTasks();
  }, [selectedDate]);

  // Timer for running tasks
  useEffect(() => {
    let interval;
    if (runningTasks.size > 0) {
      interval = setInterval(() => {
        const now = Date.now();
        setTaskTimers(prevTimers => {
          const updatedTimers = { ...prevTimers };
          runningTasks.forEach(taskId => {
            const task = tasks.find(t => t.id === taskId);
            if (task && task.isRunning && task.startTime) {
              const elapsed = (now - task.startTime) / (1000 * 60 * 60);
              updatedTimers[taskId] = elapsed;
            }
          });
          return updatedTimers;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [runningTasks, tasks]);

  // Real-time validation
  useEffect(() => {
    const issues = validateTasks();
    setValidationIssues(issues);
  }, [tasks]);

  // API calls
  const loadDailyTasks = async () => {
    try {
      setLoading(true);
      setMessage({ type: '', text: '' });
      
      const token = localStorage.getItem('token');
      if (!token) {
        return;
      }
      
      const response = await fetch(`/api/daily-tasks?date=${selectedDate}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.dailyTasks && data.dailyTasks.length > 0) {
          const entry = data.dailyTasks[0];
          setExistingEntry(entry);
          setSavedTasks(entry.tasks || []);
          setNotes(entry.notes || '');

          // Load pending tasks from completed work tasks
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const storageKey = `pending_daily_tasks_${user.username}_${selectedDate}`;
          const pendingTasks = JSON.parse(localStorage.getItem(storageKey) || '[]');

          if (pendingTasks.length > 0) {
            // Add pending tasks to unsaved tasks
            setTasks(pendingTasks);
            // DON'T clear localStorage yet - keep until saved!
            setMessage({
              type: 'info',
              text: `✅ ${pendingTasks.length} completed task(s) added - please set time and save`
            });
          } else {
            // Reset current tasks to empty form
            setTasks([{
              id: generateTaskId(),
              description: '',
              timeSpent: 0,
              category: 'general',
              startTime: null,
              isRunning: false,
              priority: 'medium'
            }]);
          }

        } else {
          // No existing entry
          setExistingEntry(null);

          // Load pending tasks from completed work tasks
          const user = JSON.parse(localStorage.getItem('user') || '{}');
          const storageKey = `pending_daily_tasks_${user.username}_${selectedDate}`;
          const pendingTasks = JSON.parse(localStorage.getItem(storageKey) || '[]');

          if (pendingTasks.length > 0) {
            // Add pending tasks to unsaved tasks
            setTasks(pendingTasks);
            // DON'T clear localStorage yet - keep until saved!
            setMessage({
              type: 'info',
              text: `✅ ${pendingTasks.length} completed task(s) added - please set time and save`
            });
          } else {
            // Only create empty task if we don't already have unsaved tasks
            setTasks(prevTasks => {
              if (prevTasks.length > 0 && prevTasks.some(t => t.description)) {
                return prevTasks; // Keep existing tasks
              }
              return [{
                id: generateTaskId(),
                description: '',
                timeSpent: 0,
                category: 'general',
                startTime: null,
                isRunning: false,
                priority: 'medium'
              }];
            });
          }
          setSavedTasks([]);
          setNotes('');
        }
        setIsDirty(false);
      } else {
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `Failed to load tasks: ${error.message}` 
      });
    } finally {
      setLoading(false);
    }
  };

  const addTask = () => {
    const newTask = { 
      id: generateTaskId(),
      description: '', 
      timeSpent: 0, 
      category: 'general', 
      startTime: null, 
      isRunning: false,
      priority: 'medium'
    };
    
    setTasks(prevTasks => [...prevTasks, newTask]);
    setIsDirty(true);
  };

  const addFromTemplate = (template) => {
    const newTask = { 
      id: generateTaskId(),
      description: template.description, 
      timeSpent: template.estimatedTime, 
      category: template.category,
      startTime: null,
      isRunning: false,
      priority: template.priority
    };
    
    setTasks(prevTasks => [...prevTasks, newTask]);
    setIsDirty(true);
    setShowTemplates(false);
  };

  const removeTask = (taskId) => {
    if (tasks.length > 1) {
      if (runningTasks.has(taskId)) {
        stopTimer(taskId);
      }
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      setIsDirty(true);
    }
  };

  const updateTask = (taskId, field, value) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId ? { ...task, [field]: value } : task
      )
    );
    setIsDirty(true);
  };

  const startTimer = (taskId) => {
    setTasks(prevTasks => 
      prevTasks.map(task => 
        task.id === taskId 
          ? { ...task, isRunning: true, startTime: Date.now() }
          : task
      )
    );
    setRunningTasks(prev => new Set([...prev, taskId]));
    setTaskTimers(prev => ({ ...prev, [taskId]: 0 }));
    setIsDirty(true);
  };

  const stopTimer = (taskId) => {
    setTasks(prevTasks => 
      prevTasks.map(task => {
        if (task.id === taskId && task.isRunning && task.startTime) {
          const elapsed = (Date.now() - task.startTime) / (1000 * 60 * 60);
          return {
            ...task,
            isRunning: false,
            timeSpent: Math.round((task.timeSpent + elapsed) * 100) / 100,
            startTime: null
          };
        }
        return task;
      })
    );
    
    setRunningTasks(prev => {
      const newSet = new Set(prev);
      newSet.delete(taskId);
      return newSet;
    });
    
    setTaskTimers(prev => {
      const updated = { ...prev };
      delete updated[taskId];
      return updated;
    });
    
    setIsDirty(true);
  };

  const stopAllTimers = () => {
    const runningTaskIds = Array.from(runningTasks);
    runningTaskIds.forEach(taskId => {
      stopTimer(taskId);
    });
  };

  const saveIndividualTask = (taskId) => {
    const taskToSave = tasks.find(t => t.id === taskId);
    if (!taskToSave || !taskToSave.description.trim()) {
      setMessage({ type: 'error', text: 'Please add a task description before saving' });
      return;
    }

    if (!taskToSave.timeSpent || taskToSave.timeSpent <= 0) {
      setMessage({ type: 'error', text: 'Please select time spent on this task (use quick presets or enter manually)' });
      return;
    }

    if (taskToSave.isRunning) {
      stopTimer(taskId);
    }

    const savedTask = {
      ...taskToSave,
      savedAt: new Date().toISOString(),
      isDone: true
    };

    setSavedTasks(prev => [...prev, savedTask]);
    
    if (tasks.length === 1) {
      setTasks([{ 
        id: generateTaskId(), 
        description: '', 
        timeSpent: 0, 
        category: 'general', 
        startTime: null, 
        isRunning: false, 
        priority: 'medium' 
      }]);
    } else {
      removeTask(taskId);
    }

    setMessage({ type: 'success', text: 'Task saved successfully!' });
    setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    setIsDirty(true);
  };

  const saveDailyTasks = async () => {
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });

      // Auto-save any valid unsaved tasks before submitting
      // Must have description >= 3 chars (backend requirement) and timeSpent > 0
      const validUnsavedTasks = tasks.filter(task =>
        task.description &&
        task.description.trim().length >= 3 &&
        task.timeSpent > 0
      );

      // Stop all running timers
      stopAllTimers();

      // Combine saved tasks with valid unsaved tasks
      const allTasksToSave = [
        ...savedTasks,
        ...validUnsavedTasks.map(task => ({
          ...task,
          savedAt: new Date().toISOString(),
          isDone: true
        }))
      ];

      if (allTasksToSave.length === 0) {
        setMessage({ type: 'error', text: '⚠️ No tasks to save! Please add a task description AND select time spent (use quick presets like 15m, 30m, 1h, or 2h)' });
        return;
      }

      // Validate all tasks
      const issues = [];
      allTasksToSave.forEach((task, index) => {
        if (!task.timeSpent || task.timeSpent <= 0) {
          issues.push(`Task ${index + 1}: Time must be greater than 0`);
        }
        if (task.timeSpent > 12) {
          issues.push(`Task ${index + 1}: ${task.timeSpent}h exceeds maximum (12h per task)`);
        }
        if (task.description.length < 3) {
          issues.push(`Task ${index + 1}: Description too brief (minimum 3 characters)`);
        }
        if (task.description.length > 500) {
          issues.push(`Task ${index + 1}: Description too long (maximum 500 characters)`);
        }
        if (!task.category) {
          issues.push(`Task ${index + 1}: Category is required`);
        }
      });

      if (issues.length > 0) {
        setMessage({
          type: 'error',
          text: `Please fix validation issues: ${issues.slice(0, 2).join(', ')}${issues.length > 2 ? '...' : ''}`
        });
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        setMessage({ type: 'error', text: 'Authentication required. Please log in.' });
        return;
      }

      const totalHours = allTasksToSave.reduce((sum, task) => sum + (parseFloat(task.timeSpent) || 0), 0);

      if (totalHours === 0) {
        setMessage({ type: 'error', text: '⚠️ Total time is 0! Please select time for your tasks using the quick presets (15m, 30m, 1h, 2h) or enter minutes manually.' });
        return;
      }

      if (totalHours > 16) {
        setMessage({ type: 'error', text: 'Total time exceeds 16 hours limit. Please review your entries.' });
        return;
      }

      const requestData = {
        date: selectedDate,
        tasks: allTasksToSave,
        totalHours: totalHours,
        notes: notes.trim()
      };

      const response = await fetch('/api/daily-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Daily tasks saved successfully!' });
        setExistingEntry(data.dailyTask);
        setIsDirty(false);
        setValidationIssues([]);

        // Clear pending tasks from localStorage now that they're saved
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const storageKey = `pending_daily_tasks_${user.username}_${selectedDate}`;
        localStorage.removeItem(storageKey);

        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        setMessage({ 
          type: 'error', 
          text: data.message || data.errors?.join(', ') || 'Failed to save tasks' 
        });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Network error. Please check your connection and try again.' });
    } finally {
      setSaving(false);
    }
  };

  const getCategoryInfo = (categoryValue) => {
    return categories.find(cat => cat.value === categoryValue) || categories[0];
  };

  const getPriorityInfo = (priorityValue) => {
    return priorities.find(p => p.value === priorityValue) || priorities[1];
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const isFutureDate = new Date(selectedDate) > new Date();
  const totalHours = calculateTotalHours();

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-4 lg:px-6">
      {/* Header Section */}
      <div className="bg-white border border-gray-100 rounded-xl shadow-sm">
        <div className="p-3 sm:p-4 md:p-6 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg flex-shrink-0">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate">Daily Task Logger</h3>
                <p className="text-xs sm:text-sm text-gray-500 hidden sm:block">Track your daily activities and productivity</p>
              </div>
            </div>
            
            {existingEntry && (
              <div className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-green-50 rounded-lg border border-green-200 flex-shrink-0">
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600" />
                <span className="text-xs sm:text-sm font-medium text-green-800 whitespace-nowrap">Entry saved</span>
              </div>
            )}

            {isDirty && !saving && (
              <div className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 bg-yellow-50 rounded-lg border border-yellow-200 flex-shrink-0">
                <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-600" />
                <span className="text-xs sm:text-sm font-medium text-yellow-800 whitespace-nowrap">Unsaved changes</span>
              </div>
            )}
          </div>
        </div>

        {/* Date and Controls */}
        <div className="p-3 sm:p-4 md:p-6 bg-gray-50 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1">
              <div className="flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                />
                {isToday && (
                  <span className="px-2 py-0.5 sm:py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded-md whitespace-nowrap">Today</span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={() => setShowTemplates(!showTemplates)}
                variant="outline"
                size="sm"
                className="flex items-center space-x-1.5 text-xs sm:text-sm"
              >
                <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>Templates</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Analytics Bar - Mobile Optimized */}
        <div className="p-3 sm:p-4 bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Tasks:</span>
                <span className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
                  {tasks.filter(t => t.description.trim()).length + savedTasks.length}
                </span>
              </div>
              <div className="h-5 sm:h-6 w-px bg-gray-300"></div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Time:</span>
                <span className="text-base sm:text-lg md:text-xl font-semibold text-blue-600" title={formatTimeDetailed(totalHours)}>
                  {formatTime(totalHours)}
                </span>
              </div>
              {runningTasks.size > 0 && (
                <>
                  <div className="h-5 sm:h-6 w-px bg-gray-300"></div>
                  <div className="flex items-center gap-1 sm:gap-1.5">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-xs sm:text-sm font-medium text-red-600">
                      {runningTasks.size}
                    </span>
                  </div>
                </>
              )}
            </div>

            {totalHours > 0 && (
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="flex-1 sm:flex-none w-full sm:w-24 md:w-32 lg:w-40 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (totalHours / 8) * 100)}%` }}
                  ></div>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {Math.min(100, Math.round((totalHours / 8) * 100))}%
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Templates - Simplified */}
      {showTemplates && (
        <div className="mt-3 sm:mt-4 bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-gray-200 flex items-center justify-between">
            <h4 className="text-sm sm:text-base font-medium text-gray-900">Quick Templates</h4>
            <button
              onClick={() => setShowTemplates(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
            {taskTemplates.map((template, index) => (
              <button
                key={index}
                onClick={() => addFromTemplate(template)}
                className="px-2.5 sm:px-3 py-2 text-left border border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors text-xs sm:text-sm"
              >
                <div className="font-medium text-gray-900 truncate">{template.description}</div>
                <div className="text-xs text-gray-500 mt-0.5">{formatTime(template.estimatedTime)}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Validation Issues - Minimal */}
      {validationIssues.length > 0 && validationIssues.some(issue => issue.includes('exceeds absolute maximum')) && (
        <div className="mt-3 sm:mt-4 bg-red-50 border border-red-200 rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <p className="text-xs sm:text-sm text-red-700">{validationIssues.find(issue => issue.includes('exceeds absolute maximum'))}</p>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="mt-3 sm:mt-4 bg-white border border-gray-100 rounded-xl shadow-sm">
          <div className="flex items-center justify-center py-10 sm:py-12">
            <div className="text-center">
              <Loader className="w-6 h-6 sm:w-8 sm:h-8 animate-spin text-blue-600 mx-auto mb-2 sm:mb-3" />
              <p className="text-sm sm:text-base text-gray-500">Loading your tasks...</p>
            </div>
          </div>
        </div>
      ) : !isFutureDate ? (
        /* Tasks Section */
        <div className="mt-3 sm:mt-4 space-y-3 sm:space-y-4">
          {/* Current Tasks - Add/Edit Section */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="p-3 sm:p-4 md:p-6 border-b border-gray-100">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900">Add New Tasks</h4>
                <Button
                  onClick={addTask}
                  size="sm"
                  className="flex items-center space-x-1 text-xs sm:text-sm px-2.5 sm:px-3 py-1.5 sm:py-2"
                >
                  <Plus className="w-3 h-3" />
                  <span className="hidden xs:inline">Add Task</span>
                  <span className="xs:hidden">Add</span>
                </Button>
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {tasks.map((task) => {
                const categoryInfo = getCategoryInfo(task.category);
                const priorityInfo = getPriorityInfo(task.priority);
                const isRunning = task.isRunning && runningTasks.has(task.id);
                const currentElapsed = taskTimers[task.id] || 0;
                const displayTime = isRunning ? task.timeSpent + currentElapsed : task.timeSpent;

                return (
                  <div key={task.id} className="p-3 sm:p-4 hover:bg-gray-50 transition-colors">
                    <div className="space-y-2.5 sm:space-y-3">
                      {/* Task Description */}
                      <textarea
                        value={task.description}
                        onChange={(e) => updateTask(task.id, 'description', e.target.value)}
                        placeholder="What did you work on?"
                        rows={2}
                        className="w-full px-2.5 sm:px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm resize-none"
                      />

                      {/* Task Controls - Compact Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        {/* Category */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                          <select
                            value={task.category}
                            onChange={(e) => updateTask(task.id, 'category', e.target.value)}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                          >
                            {categories.map(category => (
                              <option key={category.value} value={category.value}>
                                {category.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Priority */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                          <select
                            value={task.priority}
                            onChange={(e) => updateTask(task.id, 'priority', e.target.value)}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm"
                          >
                            {priorities.map(priority => (
                              <option key={priority.value} value={priority.value}>
                                {priority.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Time Input - Simplified */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Time <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              value={formatTimeInput(task.timeSpent)}
                              onChange={(e) => updateTask(task.id, 'timeSpent', minutesToHours(parseInt(e.target.value) || 0))}
                              placeholder="0"
                              step="15"
                              min="0"
                              max="1440"
                              className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 pr-9 sm:pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm ${
                                (!task.timeSpent || task.timeSpent <= 0)
                                  ? 'border-red-300 bg-red-50'
                                  : 'border-gray-300 focus:border-blue-500'
                              }`}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-2 sm:pr-3">
                              <span className="text-xs text-gray-500">min</span>
                            </div>
                          </div>
                          {/* Warning for 0 time */}
                          {(!task.timeSpent || task.timeSpent <= 0) && (
                            <p className="mt-1 text-xs text-red-600">
                              ⚠️ Please select time (use quick presets below)
                            </p>
                          )}
                          {/* Quick Presets */}
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {[15, 30, 60, 120].map((minutes) => (
                              <button
                                key={minutes}
                                type="button"
                                onClick={() => updateTask(task.id, 'timeSpent', minutesToHours(minutes))}
                                className="px-1.5 sm:px-2 py-0.5 text-xs bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 rounded"
                              >
                                {minutes < 60 ? `${minutes}m` : `${minutes / 60}h`}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Timer Controls - Simplified */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Timer</label>
                          <button
                            onClick={() => isRunning ? stopTimer(task.id) : startTimer(task.id)}
                            className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                              isRunning
                                ? 'bg-red-50 text-red-700 border border-red-300 hover:bg-red-100'
                                : 'bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                              {isRunning ? <Pause className="w-3 h-3 sm:w-4 sm:h-4" /> : <Play className="w-3 h-3 sm:w-4 sm:h-4" />}
                              <span>{isRunning ? formatTime(currentElapsed) : 'Start'}</span>
                            </div>
                          </button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                          {displayTime > 0 && (
                            <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium" title={formatTimeDetailed(displayTime)}>
                              {formatTime(displayTime)}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => saveIndividualTask(task.id)}
                            disabled={!task.description.trim() || !task.timeSpent || task.timeSpent <= 0}
                            className="px-2 sm:px-3 py-1 sm:py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
                            title={!task.description.trim() ? "Add description first" : (!task.timeSpent || task.timeSpent <= 0) ? "Select time spent first" : "Save this task"}
                          >
                            <Save className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            <span className="hidden xs:inline">Save</span>
                            <span className="xs:hidden">✓</span>
                          </button>

                          {tasks.length > 1 && (
                            <button
                              onClick={() => removeTask(task.id)}
                              className="p-1 sm:p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete task"
                            >
                              <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Saved Tasks List - Simplified */}
          {savedTasks.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h4 className="font-semibold text-gray-900">Completed Today</h4>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">{savedTasks.length} tasks</span>
                  <span className="text-sm font-medium text-blue-600">
                    {formatTime(savedTasks.reduce((sum, task) => sum + task.timeSpent, 0))}
                  </span>
                </div>
              </div>

              <div className="divide-y divide-gray-100">
                {savedTasks.map((task) => {
                  const categoryInfo = getCategoryInfo(task.category);

                  return (
                    <div key={task.id} className="px-4 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 mb-1">{task.description}</p>
                          <div className="flex items-center gap-2 text-xs">
                            <span className={`px-2 py-0.5 rounded ${categoryInfo.color}`}>
                              {categoryInfo.label}
                            </span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-600" title={formatTimeDetailed(task.timeSpent)}>
                              {formatTime(task.timeSpent)}
                            </span>
                            {task.savedAt && (
                              <>
                                <span className="text-gray-500">•</span>
                                <span className="text-gray-500">
                                  {new Date(task.savedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => {
                              setSavedTasks(prev => prev.filter(t => t.id !== task.id));
                              setTasks(prev => [...prev, { ...task, savedAt: undefined, isDone: false }]);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Edit task"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSavedTasks(prev => prev.filter(t => t.id !== task.id))}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Delete task"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes Section - Simplified */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="px-4 py-3 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900">Notes</h4>
            </div>
            <div className="p-4">
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  setIsDirty(true);
                }}
                placeholder="Any additional notes, challenges, or achievements..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
              />
            </div>
          </div>

          {/* Messages */}
          {message.text && (
            <div className={`rounded-xl p-4 flex items-start space-x-3 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200' 
                : message.type === 'info'
                ? 'bg-blue-50 border border-blue-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              ) : message.type === 'info' ? (
                <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm font-medium ${
                  message.type === 'success' 
                    ? 'text-green-800' 
                    : message.type === 'info'
                    ? 'text-blue-800'
                    : 'text-red-800'
                }`}>
                  {message.text}
                </p>
              </div>
              <Button
                onClick={() => setMessage({ type: '', text: '' })}
                variant="ghost"
                size="sm"
                className="p-1 flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Save Section */}
          <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 md:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex flex-col">
                  <div className="text-lg font-semibold text-gray-900" title={formatTimeDetailed(totalHours)}>
                    Total: {formatTime(totalHours)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {tasks.filter(t => t.description.trim()).length} current + {savedTasks.length} saved tasks
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {isDirty && (
                    <Button
                      onClick={() => {
                        setTasks([{ id: generateTaskId(), description: '', timeSpent: 0, category: 'general', startTime: null, isRunning: false, priority: 'medium' }]);
                        setNotes('');
                        setIsDirty(false);
                        setRunningTasks(new Set());
                        setTaskTimers({});
                      }}
                      variant="outline"
                      title="Reset all tasks and start over"
                      className="text-gray-600"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Reset
                    </Button>
                  )}

                  <Button
                    onClick={saveDailyTasks}
                    disabled={saving || (savedTasks.length === 0 && tasks.filter(t => t.description && t.description.trim().length >= 3 && t.timeSpent > 0).length === 0)}
                    title={saving ? "Saving your tasks..." : "Save all data to database"}
                    className="bg-blue-600 hover:bg-blue-700 text-white flex items-center space-x-2 min-w-[120px] justify-center"
                  >
                    {saving ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    <span>{saving ? 'Saving...' : 'Save All'}</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Future Date Warning */
        <div className="mt-4 bg-white border border-gray-100 rounded-xl shadow-sm">
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Future Date Selected</h3>
            <p className="text-gray-500 max-w-md">
              You can only log tasks for today or past dates. Please select a current or previous date to continue.
            </p>
            <Button
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="mt-4"
              title="Navigate to today's date"
            >
              Go to Today
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyTaskLogger;