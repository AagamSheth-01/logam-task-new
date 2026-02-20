import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Button from '../components/ui/Button';
import Calendar from '../components/calendar/Calendar';
import TaskTable from '../components/TaskTable';
import { getIndiaDate } from '../lib/timezoneClient';
import { AttendanceAPIService } from '../lib/attendanceServices';
// New Modern Dashboard Components
import MyTasksDashboard from '../components/dashboard/MyTasksDashboard';
// import UserAttendanceDashboard from '../components/dashboard/UserAttendanceDashboard'; // Replaced with old AttendanceManagement
import DailyTasksDashboard from '../components/dashboard/DailyTasksDashboard';
import TaskAssignmentDashboard from '../components/dashboard/TaskAssignmentDashboard';
import TaskCompletionDashboard from '../components/dashboard/TaskCompletionDashboard';
import UserTasksDashboard from '../components/dashboard/UserTasksDashboard';
import CalendarDashboard from '../components/dashboard/CalendarDashboard';
import ReportsDashboard from '../components/dashboard/ReportsDashboard';
import ComprehensiveDashboard from '../components/dashboard/ComprehensiveDashboard';
// import RecentFiles from '../components/dashboard/RecentFiles';


import {
  BarChart3,
  CheckCircle,
  Clock,
  AlertTriangle,
  Home,
  List,
  Check,
  LogOut,
  Calendar as CalendarIcon,
  Building,
  Home as HomeIcon,
  MapPin,
  XCircle,
  RefreshCw,
  Flag,
  Bell,
  UserPlus,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  User,
  ClipboardList,
  X,
  Eye,
  Timer,
  Download,
  FileText,
  TrendingUp,
  Edit3,
  Trash2,
  Save,
  Plus,
  ToggleLeft,
  ToggleRight,
  Users,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  Menu,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Lock
} from 'lucide-react';
import AdvancedUserAttendanceDashboard from '@/components/dashboard/AdvancedUserAttendanceDashboard';
import DailyTaskLogger from '@/components/DailyTaskLogger';
import ReminderSettings from '@/components/ReminderSettings';
import NotificationSystem from '@/components/NotificationSystem';
import { useRealtimeTasks } from '@/hooks/useRealtimeTasks';
import dynamic from 'next/dynamic';

// Import UserProfile with no SSR to avoid browser API issues
const UserProfile = dynamic(() => import('@/components/UserProfile'), {
  ssr: false,
  loading: () => (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading profile...</span>
      </div>
    </div>
  ),
});
// import tutorialService from '../lib/tutorialService';
import reminderService from '../lib/reminderService';
// import ClientDashboardsTab from '@/components/ClientDashboardsTab';

export default function UserDashboard() {
  const [user, setUser] = useState(null);
  const [summary, setSummary] = useState({ total: 0, completed: 0, pending: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Real-time Firebase listener for tasks - NO RELOAD NEEDED!
  const { tasks, loading: tasksLoading, error: tasksError } = useRealtimeTasks(user?.username, user?.role);

  // Auto-calculate summary when tasks change (real-time updates!)
  useEffect(() => {
    if (tasks && tasks.length >= 0) {
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'done').length;
      const pending = total - completed;
      const overdue = tasks.filter(t => {
        if (t.status === 'pending' && t.deadline) {
          return new Date(t.deadline) < new Date();
        }
        return false;
      }).length;

      setSummary({ total, completed, pending, overdue });

      // Extract unique clients
      const uniqueClients = [...new Set(tasks.map(t => t.client_name).filter(Boolean))];
      setClients(uniqueClients);
    }
  }, [tasks]);

  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const profileDropdownRef = useRef(null);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [users, setUsers] = useState([]);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Enhanced filtering and sorting states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [viewMode, setViewMode] = useState('table');
  const [taskView, setTaskView] = useState('all');
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Desktop sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Ref for search input
  const searchInputRef = useRef(null);
  
  // State for expandable tasks
  const [expandedTasks, setExpandedTasks] = useState({});

  // Edit/Delete states
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  
  // Toggle between user view and client view
  const [viewType, setViewType] = useState('user');
  const [clients, setClients] = useState([]);
  
  const [newTask, setNewTask] = useState({
    task: '',
    assigned_to: '',
    client_name: '',
    custom_client: '',
    deadline: '',
    priority: 'Medium',
    isCustomClient: false,
    assignerNotes: '',
    assignerPrivateNotes: ''
  });

  // Tutorial functionality
  // const startTutorial = useCallback(async () => {
  //   await tutorialService.startDashboardTutorial();
  // }, []);

//   // Enhanced client list - same as admin
//  const clientList = [
//   'Aatmee Developer',
//   'Aatmee Sahaj',
//   'Admit Scholar',
//   'Aggarawal College',
//   'Anand Honda',
//   'Bhabu Maa Ki Rasoi',
//   'Brahmras',
//   'Bush Infinity',
//   'Craftsbazaar',
//   'DSQR',
//   'Fitnessfox',
//   'Franklord',
//   'Gurukrupa',
//   'IDT',
//   'Learn Canyon',
//   'Logam Academy',
//   'Logam Digital',
//   'Mahi Spa',
//   'Moha By Geetanjali',
//   'Nk Autowings',
//   'Not Funny',
//   'Own It Pure',
//   'Patel Overseas',
//   'Radhe Krishna Jyotish',
//   'Raamah',
//   'Sagar Consultant',
//   'Saregama',
//   'Say Solar',
//   'Sensora',
//   'Silky Silver',
//   'Silvaroo',
//   'Social Taxi',
//   'Speing',
//   'Stock Bazaari',
//   'Teazy',
//   'True Gods',
//   'Veer Land Developers',
//   'Vs Developers'
// ];

  const router = useRouter();

  // Simple notification service
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  };

  const showNotification = (title, options = {}) => {
    if (Notification.permission !== 'granted') {
      return null;
    }

    const defaultOptions = {
      icon: '/icons/Logam Academy LOGO 512x512.png',
      badge: '/icons/Logam Academy LOGO 512x512.png',
      tag: 'task-manager',
      ...options
    };

    return new Notification(title, defaultOptions);
  };

  // Check authentication and load user data
  useEffect(() => {
    // Clear all attendance caches to prevent demo data from showing
    const clearAttendanceCaches = () => {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.includes('attendance_cache') || key.includes('attendance') || key.includes('demo')) {
          localStorage.removeItem(key);
        }
      });
    };
    clearAttendanceCaches();

    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/');
      return;
    }

    try {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      // Verify token validity on load
      fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(res => {
        if (!res.ok) {
          throw new Error('Token invalid');
        }
        // Token valid, proceed
        loadDashboardData(token, parsedUser);
        loadUsers(token);
        initializeNotifications();
        
        // Initialize reminder service for daily task reminders
        reminderService.init(parsedUser);
        
        // Add global function for reminder service to navigate to daily tasks
        window.switchToTab = (tabName) => {
          setActiveTab(tabName);
        };
      }).catch(err => {
        console.error('Session expired or invalid:', err);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
      });

    } catch (parseError) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
    }
  }, [router]);

  // Listen for profile updates from UserProfile component
  useEffect(() => {
    const handleProfileUpdate = (event) => {
      const updatedUser = event.detail.user;
      setUser(updatedUser);
    };

    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  // Listen for task updates from notifications (no reload needed - Firebase handles it!)
  useEffect(() => {
    const handleTaskUpdate = (event) => {
      // No need to reload - Firebase real-time listener automatically updates tasks!
    };

    window.addEventListener('taskUpdated', handleTaskUpdate);

    return () => {
      window.removeEventListener('taskUpdated', handleTaskUpdate);
    };
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  // Tutorial auto-start for new users
  // useEffect(() => {
  //   if (user && !loading) {
  //     // Auto-start tutorial for new users
  //     tutorialService.autoStartTutorial('dashboard', () => tutorialService.startDashboardTutorial());
  //   }
  // }, [user, loading]);

  // Debounce search term with useCallback to prevent re-renders
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId;
      return (value) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setDebouncedSearchTerm(value);
        }, 300);
      };
    })(),
    []
  );

  // Handle search input change
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  }, [debouncedSearch]);

  // Clear search function
  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
      searchInputRef.current.focus();
    }
  }, []);

  // Toggle task expansion
  const toggleTaskExpansion = useCallback((taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  }, []);

  // Utility function to truncate text
  const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Check if task needs expansion
  const needsExpansion = (text, maxLength = 50) => {
    return text && text.length > maxLength;
  };

  const initializeNotifications = async () => {
    const hasPermission = await requestNotificationPermission();
    setNotificationsEnabled(hasPermission);
  };

  // No longer needed - tasks are loaded via Firebase real-time listener!
  // This function is kept only for initial setup
  const loadDashboardData = async (token, currentUser = null) => {
    try {
      setLoading(true);
      setError('');
      // Tasks are now handled by useRealtimeTasks hook - no API fetch needed!
      setLoading(false);
    } catch (error) {
      setError(`Failed to load dashboard data: ${error.message}`);
      setLoading(false);
    }
  };

  const loadUsers = async (token) => {
    try {
      const response = await fetch('/api/users', {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
        return;
      }
      
      const data = await response.json();
      if (data.success) {
        setUsers(data.users || []);
      } else {
        setUsers([]);
      }
    } catch (error) {
      setUsers([]);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.task || !newTask.assigned_to || !newTask.deadline) {
      setError('Please fill in all required fields');
      setSuccessMessage('');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      
      const taskPayload = {
        task: newTask.task,
        assigned_to: newTask.assigned_to,
        client_name: newTask.isCustomClient ? newTask.custom_client : newTask.client_name,
        deadline: newTask.deadline,
        priority: newTask.priority,
        assignerNotes: newTask.assignerNotes,
        assignerPrivateNotes: newTask.assignerPrivateNotes
      };
      
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(taskPayload)
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setNewTask({
          task: '',
          assigned_to: '',
          client_name: '',
          custom_client: '',
          deadline: '',
          priority: 'Medium',
          isCustomClient: false,
          assignerNotes: '',
          assignerPrivateNotes: ''
        });

        // Firebase real-time listener will automatically add the task - no manual update needed!
        setError('');

        const clientInfo = taskPayload.client_name ? ` for client "${taskPayload.client_name}"` : '';
        setSuccessMessage(`✅ Task "${newTask.task}"${clientInfo} has been successfully assigned to ${newTask.assigned_to}!`);
        
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
        
        if (notificationsEnabled) {
          showNotification('🆕 New Task Assigned', {
            body: `Task: ${newTask.task}\nAssigned to: ${newTask.assigned_to}`,
            tag: `task-${newTask.task}`
          });
        }
      } else {
        setError(data.message || 'Failed to create task');
        setSuccessMessage('');
      }
    } catch (error) {
      setError('Failed to create task');
      setSuccessMessage('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  // Handle task update
  const handleTaskUpdate = async (taskId, updateData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update task');
      }

      // Firebase real-time listener will automatically update the task - no manual update needed!
    } catch (error) {
      setError('Failed to update task: ' + error.message);
    }
  };

  // Handle task delete
  const handleTaskDelete = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to delete task');
      }

      // Firebase real-time listener will automatically remove the task - no manual update needed!
    } catch (error) {
      setError('Failed to delete task: ' + error.message);
    }
  };

  const handleMarkComplete = async (taskName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${encodeURIComponent(taskName)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'done', username: user.username })
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
        return;
      }

      const data = await response.json();
      if (data.success) {
        // Firebase real-time listener will automatically update the task status!
        setSuccessMessage(`✅ Task "${taskName}" has been marked as complete!`);

        setTimeout(() => {
          setSuccessMessage('');
        }, 3000);
        
        if (notificationsEnabled) {
          showNotification('✅ Task Completed', {
            body: `You completed: ${taskName}`,
            tag: `completed-${taskName}`
          });
        }
      } else {
        setError(data.message || 'Failed to update task');
        setSuccessMessage('');
      }
    } catch (error) {
      setError('Failed to update task');
      setSuccessMessage('');
    }
  };

  // Edit task functionality
  const handleEditTask = (task) => {
    setEditingTaskId(task.id);
    setEditingTask({
      task: task.task,
      client_name: task.client_name || '',
      deadline: task.deadline,
      priority: task.priority
    });
  };

  const handleSaveEdit = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editingTask)
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setEditingTaskId(null);
        setEditingTask({});

        // Firebase real-time listener will automatically update the task!
        setSuccessMessage('✅ Task updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.message || 'Failed to update task');
      }
    } catch (error) {
      setError('Failed to update task');
    }
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditingTask({});
  };

  // Delete task functionality
  const handleDeleteTask = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setShowDeleteConfirm(null);

        // Firebase real-time listener will automatically remove the task!
        setSuccessMessage('✅ Task deleted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.message || 'Failed to delete task');
      }
    } catch (error) {
      setError('Failed to delete task');
    }
  };

  // Enhanced sorting functionality
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) {
      return <ArrowUpDown className="w-3 h-3 text-gray-400" />;
    }
    return sortConfig.direction === 'asc' 
      ? <ArrowUp className="w-3 h-3 text-blue-600" />
      : <ArrowDown className="w-3 h-3 text-blue-600" />;
  };

  const sortTasks = (tasks) => {
    if (!sortConfig.key) return tasks;

    return [...tasks].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle priority sorting
      if (sortConfig.key === 'priority') {
        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
        aValue = priorityOrder[aValue] || 0;
        bValue = priorityOrder[bValue] || 0;
      }
      
      // Handle date sorting
      if (sortConfig.key === 'deadline') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      // Handle string sorting
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // Enhanced filtering functionality with better search
  const filterTasks = (tasks) => {
    let filtered = [...tasks];

    // Apply task view filter (assigned to me vs assigned by me vs all)
    if (taskView === 'assignedToMe') {
      filtered = filtered.filter(task => task.assigned_to === user?.username);
    } else if (taskView === 'assignedByMe') {
      filtered = filtered.filter(task => task.given_by === user?.username);
    }
    // Note: 'all' shows all tasks without filtering

    // Apply status filter
    if (filterStatus !== 'all') {
      if (filterStatus === 'overdue') {
        filtered = filtered.filter(task => {
          if (task.status === 'pending' && task.deadline) {
            return new Date(task.deadline) < new Date();
          }
          return false;
        });
      } else {
        filtered = filtered.filter(task => task.status === filterStatus);
      }
    }

    // Apply priority filter
    if (filterPriority !== 'all') {
      filtered = filtered.filter(task => task.priority === filterPriority);
    }

    // Enhanced search filter with debounced search
    if (debouncedSearchTerm && debouncedSearchTerm.trim()) {
      const term = debouncedSearchTerm.toLowerCase().trim();
      filtered = filtered.filter(task => {
        const searchableFields = [
          task.task || '',
          task.client_name || '',
          task.given_by || '',
          task.assigned_to || '',
          task.priority || '',
          task.status || ''
        ];
        
        return searchableFields.some(field => 
          field.toLowerCase().includes(term)
        );
      });
    }

    return filtered;
  };

  const getFilteredAndSortedTasks = (tasks) => {
    const filtered = filterTasks(tasks);
    return sortTasks(filtered);
  };

  // Group tasks by client
  const groupTasksByClient = (tasks) => {
    const grouped = {};
    tasks.forEach(task => {
      const client = task.client_name || 'No Client';
      if (!grouped[client]) {
        grouped[client] = [];
      }
      grouped[client].push(task);
    });
    return grouped;
  };

  // Utility functions
  const getStatusColor = (status) => {
    return status === 'done' ? 'text-green-600 bg-green-50 border-green-200' : 'text-amber-600 bg-amber-50 border-amber-200';
  };

  const getPriorityColor = (priority) => {
    const colors = {
      High: 'text-red-600 bg-red-50 border-red-200',
      Medium: 'text-amber-600 bg-amber-50 border-amber-200',
      Low: 'text-green-600 bg-green-50 border-green-200'
    };
    return colors[priority] || 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getPriorityIcon = (priority) => {
    if (priority === 'High') return <Flag className="w-3 h-3 text-red-600" />;
    if (priority === 'Medium') return <Flag className="w-3 h-3 text-amber-600" />;
    return <Flag className="w-3 h-3 text-green-600" />;
  };

  const isOverdue = (task) => {
    if (task.status === 'pending' && task.deadline) {
      return new Date(task.deadline) < new Date();
    }
    return false;
  };

  const generateReport = async () => {
    try {
      const reportData = {
        generated_on: new Date().toLocaleDateString(),
        generated_time: new Date().toLocaleTimeString(),
        user: user.username,
        summary: summary,
        tasks: tasks
      };

      const reportHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Personal Task Report - ${reportData.generated_on}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f8fafc;
            color: #1f2937;
            line-height: 1.6;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        .content {
            padding: 30px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        .stat-card {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
        }
        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            margin-bottom: 5px;
        }
        .task-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
        }
        .task-table th,
        .task-table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
        }
        .task-table th {
            background: #f9fafb;
            font-weight: 600;
        }
        .status-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 500;
        }
        .status-done {
            background: #dcfce7;
            color: #166534;
        }
        .status-pending {
            background: #fef3c7;
            color: #92400e;
        }
        .status-overdue {
            background: #fee2e2;
            color: #dc2626;
        }
        .footer {
            text-align: center;
            padding: 20px;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Personal Task Report</h1>
            <p>Generated for ${reportData.user} on ${reportData.generated_on}</p>
        </div>
        
        <div class="content">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number" style="color: #1f2937;">${reportData.summary.total}</div>
                    <div>Total Tasks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: #059669;">${reportData.summary.completed}</div>
                    <div>Completed</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: #d97706;">${reportData.summary.pending}</div>
                    <div>Pending</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" style="color: #dc2626;">${reportData.summary.overdue}</div>
                    <div>Overdue</div>
                </div>
            </div>

            <table class="task-table">
                <thead>
                    <tr>
                        <th>Task</th>
                        <th>Client</th>
                        <th>Deadline</th>
                        <th>Status</th>
                        <th>Priority</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.tasks.map(task => `
                        <tr>
                            <td>${task.task}</td>
                            <td>${task.client_name || 'N/A'}</td>
                            <td>${task.deadline}</td>
                            <td>
                                <span class="status-badge ${task.status === 'done' ? 'status-done' : (isOverdue(task) ? 'status-overdue' : 'status-pending')}">
                                    ${task.status === 'done' ? 'Completed' : (isOverdue(task) ? 'Overdue' : 'Pending')}
                                </span>
                            </td>
                            <td>${task.priority}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>Report generated by Logam Academy Task Manager • ${reportData.generated_time}</p>
        </div>
    </div>
</body>
</html>`;

      const blob = new Blob([reportHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `personal-task-report-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      setError('Failed to generate report');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'my-tasks', label: 'My Tasks', icon: List },
    // { id: 'all-tasks', label: 'All Tasks', icon: Users },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'daily-tasks', label: 'Daily Tasks', icon: FileText },
    { id: 'assign-task', label: 'Assign Task', icon: UserPlus },
    { id: 'attendance', label: 'Attendance', icon: Clock },
    // { id: 'reminder-settings', label: 'Reminders', icon: Bell },
    // { id: 'client-dashboard', label: 'Client Dashboard', icon: Building },
    { id: 'mark-complete', label: 'Complete Tasks', icon: Check },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'reports', label: 'My Reports', icon: FileText }
  ];

  const statsCards = [
    { label: 'Total', value: summary.total, icon: BarChart3, color: 'text-black' },
    { label: 'Completed', value: summary.completed, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Pending', value: summary.pending, icon: Clock, color: 'text-amber-600' },
    { label: 'Overdue', value: summary.overdue, icon: AlertTriangle, color: 'text-red-600' }
  ];

  // Enhanced Task Table Component with edit/delete functionality
  const LocalTaskTable = ({ tasks, title = "Tasks", showFilters = true }) => {
    const filteredAndSortedTasks = getFilteredAndSortedTasks(tasks);

    return (
      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        {showFilters && (
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
                <h3 className="text-base lg:text-lg font-semibold text-black flex items-center space-x-2">
                  <List className="w-4 h-4 lg:w-5 lg:h-5 flex-shrink-0" />
                  <span>{title} ({filteredAndSortedTasks.length})</span>
                </h3>
                
                {/* Task View Toggle (All Tasks, Assigned To Me, Assigned By Me) */}
                <div className="flex items-center bg-white border border-gray-200 rounded p-0.5">
                  <button
                    type="button"
                    onClick={() => setTaskView('all')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      taskView === 'all' 
                        ? 'bg-purple-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <List className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline">All</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskView('assignedToMe')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      taskView === 'assignedToMe' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <UserCheck className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline">To Me</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskView('assignedByMe')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      taskView === 'assignedByMe' 
                        ? 'bg-green-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <UserX className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline">By Me</span>
                  </button>
                </div>
                
                {/* View Type Toggle (User vs Client) */}
                <div className="flex items-center bg-white border border-gray-200 rounded p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewType('user')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      viewType === 'user' 
                        ? 'bg-black text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <User className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline">User</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewType('client')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      viewType === 'client' 
                        ? 'bg-black text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Building className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline">Client</span>
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 w-full lg:w-auto">
                {/* Search Input */}
                <div className="relative" /* data-tour="search" */>
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search tasks, clients..."
                    defaultValue={searchTerm}
                    onChange={handleSearchChange}
                    className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black w-full sm:w-48 bg-white"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                    autoCapitalize="off"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={clearSearch}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 z-10"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                
                {/* Status Filter */}
                <div className="relative">
                  <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black appearance-none bg-white"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="done">Completed</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="relative">
                  <Flag className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    value={filterPriority}
                    onChange={(e) => setFilterPriority(e.target.value)}
                    className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black appearance-none bg-white"
                  >
                    <option value="all">All Priorities</option>
                    <option value="High">High Priority</option>
                    <option value="Medium">Medium Priority</option>
                    <option value="Low">Low Priority</option>
                  </select>
                </div>

                {/* Clear Filters */}
                {(searchTerm || filterStatus !== 'all' || filterPriority !== 'all') && (
                  <Button
                    onClick={() => {
                      clearSearch();
                      setFilterStatus('all');
                      setFilterPriority('all');
                      setSortConfig({ key: null, direction: 'asc' });
                    }}
                    variant="outline"
                    size="sm"
                    className="text-gray-600 border-gray-300"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Render based on view type */}
        {viewType === 'client' ? (
          <ClientGroupedView tasks={filteredAndSortedTasks} />
        ) : (
          <TaskTable
            tasks={filteredAndSortedTasks}
            currentUser={user?.username}
            userRole={user?.role}
            onTaskUpdate={handleTaskUpdate}
            onTaskDelete={handleTaskDelete}
            clientList={clientList}
            showFilters={false}
          />
        )}
      </div>
    );
  };

  // Client Grouped View Component
  const ClientGroupedView = ({ tasks }) => {
    const groupedTasks = groupTasksByClient(tasks);
    
    return (
      <div className="divide-y divide-gray-100">
        {Object.entries(groupedTasks).map(([clientName, clientTasks]) => {
          const completedCount = clientTasks.filter(t => t.status === 'done').length;
          const pendingCount = clientTasks.filter(t => t.status === 'pending').length;
          const overdueCount = clientTasks.filter(t => isOverdue(t)).length;
          
          return (
            <div key={clientName} className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <Building className="w-5 h-5 text-gray-600" />
                  <h4 className="text-lg font-semibold text-black">{clientName}</h4>
                  <span className="text-sm text-gray-500">({clientTasks.length} tasks)</span>
                </div>
                <div className="flex items-center space-x-4 text-xs">
                  <span className="text-green-600 bg-green-50 px-2 py-1 rounded">
                    ✓ {completedCount} completed
                  </span>
                  <span className="text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    ⏳ {pendingCount} pending
                  </span>
                  {overdueCount > 0 && (
                    <span className="text-red-600 bg-red-50 px-2 py-1 rounded">
                      ⚠️ {overdueCount} overdue
                    </span>
                  )}
                </div>
              </div>
              
              <div className="grid gap-2">
                {clientTasks.map((task, index) => (
                  <TaskCard key={task.id || index} task={task} />
                ))}
              </div>
            </div>
          );
        })}
        
        {Object.keys(groupedTasks).length === 0 && (
          <div className="p-12 text-center">
            <Building className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">No tasks found matching your criteria</p>
          </div>
        )}
      </div>
    );
  };

  // Task Card Component for client view
  const TaskCard = ({ task }) => {
    const overdue = isOverdue(task);
    const isEditing = editingTaskId === task.id;
    
    return (
      <div className={`border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors ${overdue ? 'border-red-200 bg-red-50' : ''}`}>
        {isEditing ? (
          <div className="space-y-3">
            <input
              type="text"
              value={editingTask.task || ''}
              onChange={(e) => setEditingTask({ ...editingTask, task: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
              placeholder="Task description"
            />
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={editingTask.client_name || ''}
                onChange={(e) => setEditingTask({ ...editingTask, client_name: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                placeholder="Client name"
              />
              <input
                type="date"
                value={editingTask.deadline || ''}
                onChange={(e) => setEditingTask({ ...editingTask, deadline: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
              />
              <select
                value={editingTask.priority || 'Medium'}
                onChange={(e) => setEditingTask({ ...editingTask, priority: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => handleSaveEdit(task.id)}
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-1"
              >
                <Save className="w-3 h-3" />
                <span>Save</span>
              </Button>
              <Button
                onClick={handleCancelEdit}
                variant="outline"
                size="sm"
                className="text-gray-600 border-gray-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 mb-1">
                <div className="flex-1">
                  {needsExpansion(task.task) ? (
                    <div className="flex items-center space-x-2">
                      <h5 className="text-sm font-medium text-black">
                        {expandedTasks[task.id] ? task.task : truncateText(task.task)}
                      </h5>
                      <button
                        onClick={() => toggleTaskExpansion(task.id)}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center space-x-1"
                      >
                        {expandedTasks[task.id] ? (
                          <>
                            <ChevronUp className="w-3 h-3" />
                            <span>Less</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" />
                            <span>More</span>
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <h5 className="text-sm font-medium text-black">{task.task}</h5>
                  )}
                </div>
                {overdue && (
                  <span className="text-xs text-red-600 bg-red-100 px-2 py-1 rounded flex items-center space-x-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Overdue</span>
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-4 text-xs text-gray-500">
                <span className={`flex items-center space-x-1 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                  <Timer className="w-3 h-3" />
                  <span>Due: {task.deadline}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <User className="w-3 h-3" />
                  <span>{taskView === 'assignedToMe' ? task.given_by : task.assigned_to}</span>
                </span>
                <span className={`px-2 py-1 border rounded flex items-center space-x-1 ${getPriorityColor(task.priority)}`}>
                  {getPriorityIcon(task.priority)}
                  <span>{task.priority}</span>
                </span>
                <span className={`px-2 py-1 border rounded ${
                  overdue ? 'text-red-600 bg-red-100 border-red-200' : getStatusColor(task.status)
                }`}>
                  {overdue ? 'Overdue' : task.status}
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-1 ml-4">
              {task.status === 'pending' && taskView === 'assignedToMe' && (
                <Button
                  onClick={() => handleMarkComplete(task.task)}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-1"
                >
                  <CheckCircle className="w-3 h-3" />
                  <span>Complete</span>
                </Button>
              )}
              
              {/* Only show edit/delete for tasks assigned by the current user */}
              {task.given_by === user?.username && taskView === 'assignedByMe' && (
                <>
                  <Button
                    onClick={() => handleEditTask(task)}
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(task.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Head>
        <title>Dashboard - Logam Task Manager</title>
      </Head>
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-black">Delete Task</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this task? This action cannot be undone.
            </p>
            <div className="flex space-x-3">
              <Button
                onClick={() => handleDeleteTask(showDeleteConfirm)}
                className="bg-red-600 hover:bg-red-700 text-white flex items-center space-x-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(null)}
                variant="outline"
                className="text-gray-600 border-gray-300"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
      
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="border-b border-gray-100 bg-white sticky top-0 z-40">
          <div className="px-4 sm:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Menu className="w-5 h-5 text-gray-600" />
                </button>
                
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-center">
                    <img src="/icons/Logam Academy LOGO 512x512.png" alt="Logam Academy Logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
                  </div>
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg sm:text-xl font-bold text-black">Logam Task Manager</h1>
                  <p className="text-xs sm:text-sm text-gray-600">Welcome, {user?.username}</p>
                </div>
                <div className="sm:hidden">
                  <h1 className="text-lg font-bold text-black">Task Manager</h1>
                  <p className="text-xs text-gray-600">{user?.username}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4" /* data-tour="profile" */>
                {/* Real-time Notification System */}
                <NotificationSystem currentUser={user} />

                {/* Profile Dropdown */}
                <div className="relative" ref={profileDropdownRef}>
                  <button
                    onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300 flex items-center justify-center">
                      {user?.profileImage ? (
                        <img
                          src={user.profileImage}
                          alt={user.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-gray-600" />
                      )}
                    </div>
                    <div className="hidden md:block text-left">
                      <p className="text-sm font-semibold text-black">{user?.username}</p>
                      <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-gray-600 hidden sm:block transition-transform ${showProfileDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {showProfileDropdown && (
                    <div className="absolute right-0 mt-2 w-56 bg-white border-2 border-gray-200 rounded-xl shadow-lg z-50">
                      <div className="p-3 border-b border-gray-100">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 border-2 border-gray-300 flex items-center justify-center flex-shrink-0">
                            {user?.profileImage ? (
                              <img
                                src={user.profileImage}
                                alt={user.username}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <User className="w-5 h-5 text-gray-600" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-black truncate">{user?.username}</p>
                            <p className="text-xs text-gray-500 truncate">{user?.email || 'No email set'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="py-1">
                        <button
                          onClick={() => {
                            setActiveTab('profile');
                            setShowProfileDropdown(false);
                            setIsMobileMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <User className="w-4 h-4" />
                          <span>My Profile</span>
                        </button>

                        <button
                          onClick={() => {
                            setActiveTab('profile');
                            setShowProfileDropdown(false);
                            setIsMobileMenuOpen(false);
                            // Trigger change password modal
                            setTimeout(() => {
                              const changePasswordBtn = document.querySelector('[data-change-password]');
                              if (changePasswordBtn) changePasswordBtn.click();
                            }, 300);
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                        >
                          <Lock className="w-4 h-4" />
                          <span>Change Password</span>
                        </button>

                        <div className="border-t border-gray-100 my-1"></div>

                        <button
                          onClick={() => {
                            setShowProfileDropdown(false);
                            handleLogout();
                          }}
                          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex relative">
          {/* Mobile Menu Overlay */}
          {isMobileMenuOpen && (
            <div 
              className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          {/* Sidebar */}
          <div className={`
            fixed lg:static inset-y-0 left-0 z-50 lg:z-auto
            ${sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'} w-64 bg-white border-r border-gray-100 
            transform transition-all duration-300 ease-in-out lg:transform-none
            ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            lg:min-h-screen overflow-y-auto
          `} /* data-tour="sidebar" */>
            {/* Mobile Close Button */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-black">Menu</h2>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Desktop Collapse Button */}
            <div className="hidden lg:flex items-center justify-between p-4 border-b border-gray-100">
              {!sidebarCollapsed && (
                <h2 className="text-lg font-semibold text-black">Menu</h2>
              )}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${
                  sidebarCollapsed ? 'mx-auto' : 'ml-auto'
                }`}
                title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                ) : (
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                )}
              </button>
            </div>

            <nav className="p-4">
              <div className="space-y-1">
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveTab(item.id);
                        setIsMobileMenuOpen(false); // Close mobile menu on selection
                      }}
                      className={`w-full flex items-center ${
                        sidebarCollapsed ? 'justify-center px-3 py-3' : 'space-x-3 px-3 py-2'
                      } rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                        activeTab === item.id
                          ? 'bg-black text-white'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                      title={sidebarCollapsed ? item.label : ''}
                    >
                      <Icon className="w-4 h-4 flex-shrink-0" />
                      {!sidebarCollapsed && (
                        <span className="truncate">{item.label}</span>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Quick Stats */}
              <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-black mb-3 flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 flex-shrink-0" />
                  <span>Quick Stats</span>
                </h3>
                <div className="space-y-2">
                  {statsCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <Icon className={`w-3 h-3 ${stat.color} flex-shrink-0`} />
                          <span className="text-gray-600 truncate">{stat.label}</span>
                        </div>
                        <span className={`font-semibold ${stat.color} flex-shrink-0`}>{stat.value}</span>
                      </div>
                    );
                  })}
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-3 h-3 text-blue-600 flex-shrink-0" />
                        <span className="text-gray-600 truncate">Completion</span>
                      </div>
                      <span className="font-semibold text-blue-600 flex-shrink-0">
                        {summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              {!sidebarCollapsed && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-sm font-semibold text-black mb-3">Quick Actions</h3>
                  <div className="space-y-2">
                  <Button
                    onClick={() => {
                      loadDashboardData(localStorage.getItem('token'), user);
                      setIsMobileMenuOpen(false);
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full text-blue-600 border-blue-200 hover:bg-blue-100 flex items-center space-x-2"
                  >
                    <RefreshCw className="w-3 h-3 flex-shrink-0" />
                    <span>Refresh</span>
                  </Button>
                  <Button
                    onClick={() => {
                      setActiveTab('mark-complete');
                      setIsMobileMenuOpen(false);
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full text-green-600 border-green-200 hover:bg-green-100 flex items-center space-x-2"
                  >
                    <Check className="w-3 h-3 flex-shrink-0" />
                    <span>Complete Tasks</span>
                  </Button>
                  </div>
                </div>
              )}
            </nav>
          </div>

          {/* Main Content */}
          <div className={`flex-1 min-w-0 lg:p-6 p-4 transition-all duration-300 ${
            sidebarCollapsed ? 'lg:ml-0' : 'lg:ml-0'
          }`}>
            {error && (
              <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
                <AlertTriangle className="w-4 h-4 lg:w-5 lg:h-5 text-red-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-red-600 text-sm break-words">{error}</p>
                </div>
                <button 
                  onClick={() => setError('')}
                  className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {successMessage && (
              <div className="mb-4 lg:mb-6 p-3 lg:p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
                <CheckCircle className="w-4 h-4 lg:w-5 lg:h-5 text-green-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-green-800 text-sm font-medium break-words">{successMessage}</p>
                </div>
                <button 
                  onClick={() => setSuccessMessage('')}
                  className="text-green-400 hover:text-green-600 transition-colors flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Dashboard Tab - Using Modern Comprehensive Dashboard Component */}
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                <ComprehensiveDashboard user={user} onTabChange={setActiveTab} />
              </div>
            )}

            {/* OLD DASHBOARD CODE - COMMENT OUT FOR REFERENCE */}
            {false && activeTab === 'dashboard-old' && (
              <div className="space-y-4 lg:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl lg:text-2xl font-bold text-black">Dashboard</h2>
                  <Button
                    onClick={() => loadDashboardData(localStorage.getItem('token'), user)}
                    variant="outline"
                    size="sm"
                    className="flex items-center space-x-2 w-fit"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh</span>
                  </Button>
                </div>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4" /* data-tour="task-stats" */>
                  {statsCards.map((stat) => {
                    const Icon = stat.icon;
                    return (
                      <div key={stat.label} className="bg-white border border-gray-100 rounded-lg p-4 lg:p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div className="min-w-0">
                            <p className="text-xs lg:text-sm text-gray-600 truncate">{stat.label}</p>
                            <p className="text-lg lg:text-2xl font-bold text-black mt-1">{stat.value}</p>
                          </div>
                          <Icon className={`w-5 h-5 lg:w-6 lg:h-6 ${stat.color} flex-shrink-0`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <PersonalAttendanceWidget user={user} setActiveTab={setActiveTab} />

                {/* Recent Files - COMMENTED OUT */}
                {/* <RecentFiles currentUser={user} /> */}


                {/* Overdue Tasks Alert */}
                {summary.overdue > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center space-x-3">
                      <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-red-800">
                          You have {summary.overdue} overdue task{summary.overdue > 1 ? 's' : ''}
                        </h3>
                        <p className="text-sm text-red-600 mt-1">
                          Please review and complete your overdue tasks to stay on track.
                        </p>
                      </div>
                      <Button
                        onClick={() => {
                          setFilterStatus('overdue');
                          setActiveTab('my-tasks');
                        }}
                        size="sm"
                        className="bg-red-600 hover:bg-red-700 text-white flex-shrink-0"
                      >
                        View Overdue
                      </Button>
                    </div>
                  </div>
                )}

                {/* Recent Tasks */}
                <div className="bg-white border border-gray-100 rounded-lg">
                  <div className="p-4 lg:p-6 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base lg:text-lg font-semibold text-black">Recent Tasks</h3>
                      <Button
                        onClick={() => setActiveTab('my-tasks')}
                        variant="outline"
                        size="sm"
                        className="text-gray-600 border-gray-300"
                      >
                        View All
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 lg:p-6">
                    {tasks.slice(0, 5).length > 0 ? (
                      <div className="space-y-3">
                        {tasks.slice(0, 5).map((task, index) => {
                          const overdue = isOverdue(task);
                          return (
                            <div key={index} className={`flex items-center justify-between p-3 lg:p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer ${overdue ? 'border-red-200 bg-red-50' : ''}`}>
                              <div className="flex-1 min-w-0">
                                {needsExpansion(task.task) ? (
                                  <div className="space-y-2">
                                    <div className="flex items-start space-x-2">
                                      <h4 className="font-medium text-black text-sm flex-1 break-words">
                                        {expandedTasks[task.id] ? task.task : truncateText(task.task)}
                                      </h4>
                                      <button
                                        onClick={() => toggleTaskExpansion(task.id)}
                                        className="text-blue-600 hover:text-blue-800 text-xs font-medium flex items-center space-x-1 flex-shrink-0"
                                      >
                                        {expandedTasks[task.id] ? (
                                          <>
                                            <ChevronUp className="w-3 h-3" />
                                            <span>Less</span>
                                          </>
                                        ) : (
                                          <>
                                            <ChevronDown className="w-3 h-3" />
                                            <span>More</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <h4 className="font-medium text-black text-sm break-words">{task.task}</h4>
                                )}
                                <div className="flex flex-wrap items-center gap-2 lg:gap-4 mt-1">
                                  <span className={`text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                                    Due: {task.deadline}
                                  </span>
                                  {task.client_name && (
                                    <span className="text-xs text-gray-500 flex items-center space-x-1">
                                      <Building className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{task.client_name}</span>
                                    </span>
                                  )}
                                  {overdue && (
                                    <span className="text-xs text-red-600 font-medium flex items-center space-x-1">
                                      <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                                      <span>Overdue</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                                <span className={`px-2 py-1 border rounded text-xs font-medium ${
                                  overdue ? 'text-red-600 bg-red-100 border-red-200' : getStatusColor(task.status)
                                }`}>
                                  {overdue ? 'Overdue' : task.status}
                                </span>
                                <span className={`px-2 py-1 border rounded text-xs font-medium flex items-center space-x-1 ${getPriorityColor(task.priority)}`}>
                                  {getPriorityIcon(task.priority)}
                                  <span className="hidden sm:inline">{task.priority}</span>
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <List className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">No tasks found</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* My Tasks Tab - Using Modern Dashboard Component */}
            {activeTab === 'my-tasks' && (
              <MyTasksDashboard user={user} />
            )}

            {/* All Tasks Tab - COMMENTED OUT */}
            {/* {activeTab === 'all-tasks' && (
              <div className="space-y-4 lg:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl lg:text-2xl font-bold text-black">All Tasks</h2>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => loadDashboardData(localStorage.getItem('token'), user)}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Refresh</span>
                    </Button>
                    <Button
                      onClick={generateReport}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2"
                    >
                      <Download className="w-4 h-4" />
                      <span>Export</span>
                    </Button>
                  </div>
                </div>
                
                <TaskTable
                  tasks={tasks}
                  title="All Tasks"
                  onTaskUpdate={handleTaskUpdate}
                  onTaskDelete={handleTaskDelete}
                  currentUser={user?.username}
                  userRole={user?.role}
                  clientList={clients}
                  showAllTasks={true}
                />
              </div>
            )} */}

            {/* Calendar Tab - Using Modern Dashboard Component */}
            {activeTab === 'calendar' && (
              <CalendarDashboard user={user} />
            )}

            {/* OLD CALENDAR CODE - COMMENT OUT */}
            {false && activeTab === 'calendar-old' && (
              <div className="space-y-4 lg:space-y-6">
                <h2 className="text-xl lg:text-2xl font-bold text-black">My Calendar</h2>
                <div /* data-tour="calendar" */>
                  <Calendar
                    tasks={tasks}
                    onTaskClick={(task) => {
                      // Task click handler
                    }}
                    onDateClick={(date) => {
                      // Date click handler
                    }}
                    userRole="user"
                  />
                </div>
              </div>
            )}
            {/* Daily Tasks Tab - Using Modern Dashboard Component */}
            {activeTab === 'daily-tasks' && (
              <div className="space-y-4 lg:space-y-6">
                <DailyTasksDashboard user={user} />
              </div>
            )}

            {/* Reminder Settings Tab - COMMENTED OUT */}
            {false && activeTab === 'reminder-settings' && (
              <div className="space-y-4 lg:space-y-6">
                <h2 className="text-xl lg:text-2xl font-bold text-black">Daily Task Reminders</h2>
                <ReminderSettings
                  user={user}
                  onSave={(settings) => {
                    // Reminder settings saved
                  }}
                />
              </div>
            )}

            {/* Assign Task Tab */}
            {/* Assign Task Tab - Using Modern Dashboard Component */}
            {activeTab === 'assign-task' && (
              <TaskAssignmentDashboard user={user} />
            )}
            {/* Attendance Tab - Using New MVC System */}
            {activeTab === 'attendance' && (
              <AdvancedUserAttendanceDashboard user={user} />
            )}


            {/* Mark Complete Tab */}
            {/* Mark Complete Tab - Using Modern Dashboard Component */}
            {activeTab === 'mark-complete' && (
              <TaskCompletionDashboard user={user} />
            )}

            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-4 lg:space-y-6">
                <UserProfile />
              </div>
            )}

            {/* Reports Tab - Using Modern Dashboard Component */}
            {activeTab === 'reports' && (
              <ReportsDashboard user={user} />
            )}

            {/* OLD REPORTS CODE - COMMENT OUT */}
            {false && activeTab === 'reports-old' && (
              <div className="space-y-4 lg:space-y-6">
                <h2 className="text-xl lg:text-2xl font-bold text-black">My Reports</h2>
                <div className="bg-white border border-gray-100 rounded-lg p-4 lg:p-6">
                  <div className="space-y-4 lg:space-y-6">
                    <div>
                      <h3 className="text-base lg:text-lg font-semibold text-black mb-4 flex items-center space-x-2">
                        <FileText className="w-5 h-5" />
                        <span>Personal Task Report</span>
                      </h3>
                      <p className="text-gray-600 mb-4 text-sm">
                        Generate a comprehensive report of your tasks including completion statistics and detailed task information.
                      </p>
                      <Button onClick={generateReport} className="bg-black hover:bg-gray-800 flex items-center space-x-2">
                        <Download className="w-4 h-4" />
                        <span>Generate Report</span>
                      </Button>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-4 lg:pt-6">
                      <h3 className="text-base lg:text-lg font-semibold text-black mb-4 flex items-center space-x-2">
                        <TrendingUp className="w-5 h-5" />
                        <span>Performance Summary</span>
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">
                        <div className="bg-gray-50 border border-gray-100 p-3 lg:p-4 rounded-lg text-center">
                          <div className="text-xl lg:text-2xl font-bold text-black">{summary.total}</div>
                          <div className="text-xs lg:text-sm text-gray-500">Total Tasks</div>
                        </div>
                        <div className="bg-green-50 border border-green-100 p-3 lg:p-4 rounded-lg text-center">
                          <div className="text-xl lg:text-2xl font-bold text-green-600">{summary.completed}</div>
                          <div className="text-xs lg:text-sm text-gray-500">Completed</div>
                        </div>
                        <div className="bg-amber-50 border border-amber-100 p-3 lg:p-4 rounded-lg text-center">
                          <div className="text-xl lg:text-2xl font-bold text-amber-600">{summary.pending}</div>
                          <div className="text-xs lg:text-sm text-gray-500">Pending</div>
                        </div>
                        <div className="bg-red-50 border border-red-100 p-3 lg:p-4 rounded-lg text-center">
                          <div className="text-xl lg:text-2xl font-bold text-red-600">{summary.overdue}</div>
                          <div className="text-xs lg:text-sm text-gray-500">Overdue</div>
                        </div>
                      </div>
                      
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-blue-800">Overall Completion Rate</h4>
                            <p className="text-sm text-blue-600">
                              {summary.total > 0 ? `${Math.round((summary.completed / summary.total) * 100)}% of your tasks are completed` : 'No tasks to analyze yet'}
                            </p>
                          </div>
                          <div className="text-2xl lg:text-3xl font-bold text-blue-600 flex-shrink-0 ml-4">
                            {summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0}%
                          </div>
                        </div>
                        {summary.total > 0 && (
                          <div className="mt-3">
                            <div className="w-full bg-blue-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${Math.round((summary.completed / summary.total) * 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Task Distribution by Priority */}
                      <div className="mt-6">
                        <h4 className="font-semibold text-black mb-3">Task Distribution by Priority</h4>
                        <div className="grid grid-cols-3 gap-3 lg:gap-4">
                          {['High', 'Medium', 'Low'].map(priority => {
                            const count = tasks.filter(t => t.priority === priority).length;
                            const percentage = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
                            return (
                              <div key={priority} className="text-center p-3 border border-gray-100 rounded-lg">
                                <div className={`text-base lg:text-lg font-bold ${getPriorityColor(priority).split(' ')[0]}`}>
                                  {count}
                                </div>
                                <div className="text-xs text-gray-500">{priority} Priority</div>
                                <div className="text-xs text-gray-400">({percentage}%)</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Recent Activity */}
                      <div className="mt-6">
                        <h4 className="font-semibold text-black mb-3">Recent Activity</h4>
                        <div className="space-y-2">
                          {tasks.filter(t => t.status === 'done').slice(0, 3).map((task, index) => (
                            <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                              <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-medium text-green-800 break-words">{task.task}</span>
                                {task.completed_date && (
                                  <span className="text-xs text-green-600 ml-2">
                                    Completed on {new Date(task.completed_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          {tasks.filter(t => t.status === 'done').length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">No completed tasks yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Client Dashboard Tab - COMMENTED OUT */}
            {/* {activeTab === 'client-dashboard' && (
              <div className="space-y-4 lg:space-y-6">
                <h2 className="text-xl lg:text-2xl font-bold text-black">Client Dashboard</h2>
                <ClientDashboardsTab currentUser={user} />
              </div>
            )} */}
          </div>
        </div>
      </div>
    </>
  );
}