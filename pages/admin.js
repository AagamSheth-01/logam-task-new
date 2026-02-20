import React, { useState, useEffect, useRef, useCallback } from 'react';
import UserManagement from '../components/admin/UserManagement';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Button from '../components/ui/Button';
import Calendar from '../components/calendar/Calendar';
import RecurringTaskForm from '../components/tasks/RecurringTaskForm';
import UserPerformanceDetail from '../components/admin/UserPerformanceDetail';
import TaskTable from '../components/TaskTable';
// New Modern Admin Dashboard Components
import AdminStatsDashboard from '../components/dashboard/AdminStatsDashboard';
import AdminTasksDashboard from '../components/dashboard/AdminTasksDashboard';
import AdminUsersDashboard from '../components/dashboard/AdminUsersDashboard';
import CalendarDashboard from '../components/dashboard/CalendarDashboard';
import TaskAssignmentDashboard from '../components/dashboard/TaskAssignmentDashboard';
import TaskCompletionDashboard from '../components/dashboard/TaskCompletionDashboard';
import ReportsDashboard from '../components/dashboard/ReportsDashboard';
// import { GraphicsCounter, GraphicDesignerDashboard } from '../components/GraphicsTracking';

import { 
  BarChart3, 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  Home, 
  UserPlus, 
  List, 
  TrendingUp, 
  FileText, 
  LogOut,
  Calendar as CalendarIcon,
  Flag,
  Users,
  Download,
  Shield,
  Repeat,
  Bell,
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building,
  User,
  ClipboardList,
  X,
  RefreshCw,
  Eye,
  Timer,
  Edit3,
  Trash2,
  Save,
  Plus,
  UserCheck,
  
  Palette,

  UserX,
  Check,
  Menu,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import AdvancedAdminAttendanceDashboard from '@/components/dashboard/AdvancedAdminAttendanceDashboard';
import DailyTaskAdmin from '@/components/admin/DailyTaskAdmin';
// import tutorialService from '../lib/tutorialService';
// import ClientManagement from '@/components/ClientManagement';
// import ClientDashboardsTab from '@/components/ClientDashboardsTab';

export default function AdminDashboard() {
  const [user, setUser] = useState(null);
  const [allTasks, setAllTasks] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [summary, setSummary] = useState({ total: 0, completed: 0, pending: 0, overdue: 0 });
  const [performance, setPerformance] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [creatingTask, setCreatingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    task: '',
    assigned_to: '',
    client_name: '',
    custom_client: '',
    deadline: '',
    priority: 'Medium',
    isCustomClient: false,
    taskType: 'regular',
    comments: '',
    assignerNotes: '',
    assignerPrivateNotes: ''
  });
  const [users, setUsers] = useState([]);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [recurringSchedules, setRecurringSchedules] = useState([]);
  const [expandedUsers, setExpandedUsers] = useState({});
  
  // Enhanced filtering and sorting states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [viewMode, setViewMode] = useState('table');
  const [taskView, setTaskView] = useState('all');
  const [selectedUserForDetail, setSelectedUserForDetail] = useState(null);
  
  // Ref for search input
  const searchInputRef = useRef(null);
  
  // State for expandable tasks
  const [expandedTasks, setExpandedTasks] = useState({});
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Desktop sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Edit/Delete states
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTask, setEditingTask] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  
  // Toggle between user view and client view
  const [viewType, setViewType] = useState('user');
  const [clients, setClients] = useState([]);


  const [designAnalytics, setDesignAnalytics] = useState({});
  
//   const clientList = [
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

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    
    if (!token || !userData) {
      router.push('/');
      return;
    }

    const parsedUser = JSON.parse(userData);
    if (parsedUser.role?.toLowerCase() !== 'admin') {
      router.push('/dashboard');
      return;
    }

    setUser(parsedUser);
    loadDashboardData(token);
    loadUsers(token);
    initializeNotifications();
    
    // Auto-start tutorial for new admin users
    // tutorialService.autoStartTutorial('admin', () => tutorialService.startAdminTutorial());
  }, [router]);

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

const loadDashboardData = async (token) => {
  try {
    setLoading(true);

    // Load all tasks
    const tasksResponse = await fetch('/api/tasks?all=true', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    // Check for 401 unauthorized error
    if (tasksResponse.status === 401) {
      console.log('Token expired, redirecting to login...');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      router.push('/');
      return;
    }

    const tasksData = await tasksResponse.json();
    
    if (tasksData.success) {
      setAllTasks(tasksData.tasks);
      
      // Load user data to get the current user's username
      const currentUser = JSON.parse(localStorage.getItem('user'));
      
      // Filter my tasks (tasks assigned to the admin)
      const adminTasks = tasksData.tasks.filter(task => task.assigned_to === currentUser?.username);
      setMyTasks(adminTasks);
      
      // Calculate summary
      const total = tasksData.tasks.length;
      const completed = tasksData.tasks.filter(t => t.status === 'done').length;
      const pending = total - completed;
      const overdue = tasksData.tasks.filter(t => {
        if (t.status === 'pending' && t.deadline) {
          return new Date(t.deadline) < new Date();
        }
        return false;
      }).length;
      
      setSummary({ total, completed, pending, overdue });
      
      // Calculate performance data
      const perfData = {};
      tasksData.tasks.forEach(task => {
        const user = task.assigned_to;
        if (!user) return;
        
        if (!perfData[user]) {
          perfData[user] = { total: 0, completed: 0, pending: 0 };
        }
        
        perfData[user].total++;
        if (task.status === 'done') {
          perfData[user].completed++;
        } else {
          perfData[user].pending++;
        }
      });
      
      setPerformance(perfData);
    }

    // Load clients from the new API
    try {
      const clientsResponse = await fetch('/api/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Check for 401 unauthorized error
      if (clientsResponse.status === 401) {
        console.log('Token expired, redirecting to login...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
        return;
      }

      const clientsData = await clientsResponse.json();
      
      if (clientsData.success) {
        // Set clients with enhanced data (includes task counts, etc.)
        setClients(clientsData.clients);
        
        // Also extract unique client names from tasks for backward compatibility
        if (tasksData.success) {
          const taskClientNames = [...new Set(tasksData.tasks.map(t => t.client_name).filter(Boolean))];
          
          // Merge with existing clients to ensure all are captured
          const allClientNames = [...new Set([
            ...clientsData.clients.map(c => c.name),
            ...taskClientNames
          ])];
          
          // Update the client list for task assignment dropdown
          // (You can use this for the existing client dropdown in task creation)
        }
      } else {
        // Fallback: Extract unique clients from tasks if client API fails
        if (tasksData.success) {
          const uniqueClients = [...new Set(tasksData.tasks.map(t => t.client_name).filter(Boolean))];
          // Convert to client objects for compatibility
          const clientObjects = uniqueClients.map(name => ({
            id: name.toLowerCase().replace(/\s+/g, '-'),
            name: name,
            email: '',
            status: 'Active',
            totalTasks: tasksData.tasks.filter(t => t.client_name === name).length,
            completedTasks: tasksData.tasks.filter(t => t.client_name === name && t.status === 'done').length,
            pendingTasks: tasksData.tasks.filter(t => t.client_name === name && t.status === 'pending').length,
            overdueTasks: tasksData.tasks.filter(t => {
              if (t.client_name === name && t.status === 'pending' && t.deadline) {
                return new Date(t.deadline) < new Date();
              }
              return false;
            }).length
          }));
          setClients(clientObjects);
        }
      }
    } catch (clientError) {
      // Fallback: Extract unique clients from tasks
      if (tasksData.success) {
        const uniqueClients = [...new Set(tasksData.tasks.map(t => t.client_name).filter(Boolean))];
        const clientObjects = uniqueClients.map(name => ({
          id: name.toLowerCase().replace(/\s+/g, '-'),
          name: name,
          email: '',
          status: 'Active',
          totalTasks: tasksData.tasks.filter(t => t.client_name === name).length,
          completedTasks: tasksData.tasks.filter(t => t.client_name === name && t.status === 'done').length,
          pendingTasks: tasksData.tasks.filter(t => t.client_name === name && t.status === 'pending').length,
          overdueTasks: tasksData.tasks.filter(t => {
            if (t.client_name === name && t.status === 'pending' && t.deadline) {
              return new Date(t.deadline) < new Date();
            }
            return false;
          }).length
        }));
        setClients(clientObjects);
      }
    }
    
    // 🎯 ADD THIS LINE HERE - RIGHT BEFORE THE CATCH BLOCK
    await loadDesignAnalytics(token);
    
  } catch (error) {
    setError('Failed to load dashboard data');
  } finally {
    setLoading(false);
  }
};
  const loadUsers = async (token) => {
    try {
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Check for 401 unauthorized error
      if (response.status === 401) {
        console.log('Token expired, redirecting to login...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
        setNewTask(prev => ({ ...prev, assigned_to: '' }));
      }
    } catch (error) {
      // Silent error handling
  }
};

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };
const handleCreateTask = async () => {
  if (creatingTask) return; // Prevent double submission
  
  // Enhanced validation
  const errors = [];
  
  if (!newTask.task || !newTask.task.trim()) {
    errors.push('Task description is required');
  } else if (newTask.task.trim().length < 10) {
    errors.push('Task description must be at least 10 characters long');
  } else if (newTask.task.trim().length > 1000) {
    errors.push('Task description cannot exceed 1000 characters');
  }
  
  if (!newTask.assigned_to) {
    errors.push('Please select a user to assign the task to');
  }
  
  if (!newTask.deadline) {
    errors.push('Deadline is required');
  } else {
    const deadlineDate = new Date(newTask.deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (deadlineDate < today) {
      errors.push('Deadline cannot be in the past');
    }
  }
  
  if (newTask.isCustomClient && (!newTask.custom_client || !newTask.custom_client.trim())) {
    errors.push('Custom client name is required');
  }
  
  if (newTask.assignerNotes && newTask.assignerNotes.length > 2000) {
    errors.push('Assignment notes cannot exceed 2000 characters');
  }
  
  if (newTask.assignerPrivateNotes && newTask.assignerPrivateNotes.length > 2000) {
    errors.push('Private notes cannot exceed 2000 characters');
  }
  
  if (errors.length > 0) {
    setError(errors.join('. '));
    setSuccessMessage('');
    return;
  }

  try {
    setCreatingTask(true);
    setError('');
    setSuccessMessage('');
    
    const token = localStorage.getItem('token');
    
    // Choose the right API endpoint based on task type
    const endpoint = newTask.taskType === 'design' ? '/api/tasks/create-design' : '/api/tasks';
    
    const taskPayload = {
      task: newTask.task.trim(),
      assigned_to: newTask.assigned_to,
      client_name: newTask.isCustomClient ? newTask.custom_client.trim() : newTask.client_name,
      deadline: newTask.deadline,
      priority: newTask.priority,
      assignerNotes: newTask.assignerNotes?.trim() || '',
      assignerPrivateNotes: newTask.assignerPrivateNotes?.trim() || '',
      // Add comments for regular tasks
      ...(newTask.taskType === 'regular' && newTask.comments && {
        comments: newTask.comments
      }),
      // Add design-specific fields if it's a design task
      ...(newTask.taskType === 'design' && {
        graphics_target: newTask.graphics_target || 1,
        design_complexity: newTask.design_complexity || 'medium',
        estimated_hours: newTask.estimated_hours || 0
      })
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(taskPayload)
    });

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
        taskType: 'regular',
        comments: '',
        assignerNotes: '',
        assignerPrivateNotes: ''
      });
      
      // Update task lists
      const newTaskData = data.task;
      setAllTasks(prev => [...prev, newTaskData]);
      
      if (newTaskData.assigned_to === user?.username) {
        setMyTasks(prev => [...prev, newTaskData]);
      }
      
      setSummary(prev => ({
        ...prev,
        total: prev.total + 1,
        pending: prev.pending + 1
      }));
      
      setPerformance(prev => {
        const updated = { ...prev };
        const assignee = newTaskData.assigned_to;
        if (updated[assignee]) {
          updated[assignee].total += 1;
          updated[assignee].pending += 1;
        } else {
          updated[assignee] = { total: 1, completed: 0, pending: 1 };
        }
        return updated;
      });
      
      setError('');
      
      const taskTypeText = newTask.taskType === 'design' ? 'Design task' : 'Task';
      const clientInfo = taskPayload.client_name ? ` for client "${taskPayload.client_name}"` : '';
      setSuccessMessage(`${taskTypeText} "${newTask.task}"${clientInfo} has been successfully assigned to ${newTask.assigned_to}!`);
      
      setTimeout(() => setSuccessMessage(''), 5000);
      
      if (notificationsEnabled) {
        showNotification(`New ${taskTypeText} Assigned`, {
          body: `${taskTypeText}: ${newTask.task}\nAssigned to: ${newTask.assigned_to}`,
          tag: `task-${newTask.task}`
        });
      }
    } else {
      const errorMessage = data.errors ? data.errors.join('. ') : (data.message || 'Failed to create task');
      setError(errorMessage);
      setSuccessMessage('');
    }
  } catch (error) {
    setError('Failed to create task');
    setSuccessMessage('');
  } finally {
    setCreatingTask(false);
  }
};

const handleCreateRecurringTask = async (recurringTaskData) => {
  try {
    setError('');
    setSuccessMessage('');

    const token = localStorage.getItem('token');

    // For now, create a single task instance - can be extended to create recurring API endpoint
    const taskPayload = {
      task: recurringTaskData.task.trim(),
      assigned_to: recurringTaskData.assigned_to,
      client_name: '', // Recurring tasks might not have clients initially
      deadline: recurringTaskData.deadline,
      priority: recurringTaskData.priority,
      assignerNotes: `Recurring Task - ${recurringTaskData.recurring.type} schedule`,
      assignerPrivateNotes: `Created from recurring task template. Start: ${recurringTaskData.recurring.startDate}, End: ${recurringTaskData.recurring.endDate || 'No end date'}`
    };

    const response = await fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(taskPayload)
    });

    const data = await response.json();
    if (data.success) {
      // Update task lists
      const newTaskData = data.task;
      setAllTasks(prev => [...prev, newTaskData]);

      if (newTaskData.assigned_to === user?.username) {
        setMyTasks(prev => [...prev, newTaskData]);
      }

      setSummary(prev => ({
        ...prev,
        total: prev.total + 1,
        pending: prev.pending + 1
      }));

      setPerformance(prev => {
        const updated = { ...prev };
        const assignee = newTaskData.assigned_to;
        if (updated[assignee]) {
          updated[assignee].total += 1;
          updated[assignee].pending += 1;
        } else {
          updated[assignee] = { total: 1, completed: 0, pending: 1 };
        }
        return updated;
      });

      setSuccessMessage(`Recurring task "${recurringTaskData.task}" has been successfully created and assigned to ${recurringTaskData.assigned_to}!`);
      setTimeout(() => setSuccessMessage(''), 5000);

      if (notificationsEnabled) {
        showNotification('New Recurring Task Created', {
          body: `Task: ${recurringTaskData.task}\nAssigned to: ${recurringTaskData.assigned_to}`,
          tag: `recurring-task-${recurringTaskData.task}`
        });
      }
    } else {
      const errorMessage = data.errors ? data.errors.join('. ') : (data.message || 'Failed to create recurring task');
      setError(errorMessage);
    }
  } catch (error) {
    console.error('Error creating recurring task:', error);
    setError('Failed to create recurring task');
  }
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

    // Refresh the task lists
    await loadDashboardData(token);
    
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

    // Refresh the task lists
    await loadDashboardData(token);
  } catch (error) {
    setError('Failed to delete task: ' + error.message);
  }
};

  const loadDesignAnalytics = async (token) => {
  try {
    const designUsers = users.filter(u => 
      u.role?.toLowerCase() === 'graphic designer' || 
      u.role?.toLowerCase() === 'designer'
    );
    
    if (designUsers.length === 0) return;
    
    const analyticsPromises = designUsers.map(async (user) => {
      try {
        const response = await fetch(`/api/analytics/graphics/${user.username}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // Check for 401 unauthorized error
        if (response.status === 401) {
          console.log('Token expired, redirecting to login...');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/');
          return null;
        }

        const data = await response.json();
        return { username: user.username, ...data.analytics };
      } catch (error) {
        return { username: user.username, total_graphics_created: 0, productivity_score: 0 };
      }
    });
    
    const results = await Promise.all(analyticsPromises);
    const analyticsMap = {};
    results.forEach(result => {
      analyticsMap[result.username] = result;
    });
    
    setDesignAnalytics(analyticsMap);
  } catch (error) {
    // Silent error handling
  }
};

  // Mark task as complete function for admin
  const handleMarkAsComplete = async (task) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${encodeURIComponent(task.task)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: 'done', 
          username: task.assigned_to 
        })
      });

      const data = await response.json();
      if (data.success) {
        setAllTasks(prev => prev.map(t => 
          t.task === task.task && t.assigned_to === task.assigned_to 
            ? { ...t, status: 'done', completed_date: new Date().toISOString() }
            : t
        ));
        
        if (task.assigned_to === user?.username) {
          setMyTasks(prev => prev.map(t => 
            t.task === task.task 
              ? { ...t, status: 'done', completed_date: new Date().toISOString() }
              : t
          ));
        }
        
        setSummary(prev => ({
          ...prev,
          completed: prev.completed + 1,
          pending: prev.pending - 1,
          overdue: task.deadline && new Date(task.deadline) < new Date() ? prev.overdue - 1 : prev.overdue
        }));
        
        setPerformance(prev => {
          const updated = { ...prev };
          if (updated[task.assigned_to]) {
            updated[task.assigned_to].completed += 1;
            updated[task.assigned_to].pending -= 1;
          }
          return updated;
        });
        
        const clientInfo = task.client_name ? ` for client "${task.client_name}"` : '';
        setSuccessMessage(`✅ Task "${task.task}"${clientInfo} has been marked as complete!`);
        
        setTimeout(() => {
          setSuccessMessage('');
        }, 5000);
        
      } else {
        setError(data.message || 'Failed to mark task as complete');
        setSuccessMessage('');
      }
    } catch (error) {
      setError('Failed to mark task as complete');
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

  // Save edit
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
        console.log('Token expired, redirecting to login...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setEditingTaskId(null);
        setEditingTask({});
        loadDashboardData(token);
        setSuccessMessage('✅ Task updated successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.message || 'Failed to update task');
      }
    } catch (error) {
      setError('Failed to update task');
    }
  };

  // Cancel edit
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
        console.log('Token expired, redirecting to login...');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
        return;
      }

      const data = await response.json();
      if (data.success) {
        setShowDeleteConfirm(null);
        loadDashboardData(token);
        setSuccessMessage('✅ Task deleted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.message || 'Failed to delete task');
      }
    } catch (error) {
      setError('Failed to delete task');
    }
  };
  // Add this component definition right after your imports and before the main AdminDashboard function
// Place this BEFORE the line: export default function AdminDashboard() {

const AttendanceBadge = () => {
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  

  useEffect(() => {
    const loadTodayAttendance = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/attendance?all=true', {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // Check for 401 unauthorized error
        if (response.status === 401) {
          console.log('Token expired, redirecting to login...');
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          router.push('/');
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.usersSummary) {
            const presentToday = data.usersSummary.filter(user => user.todayStatus === 'present').length;
            setTodayAttendance(presentToday);
          }
        }
      } catch (error) {
        setTodayAttendance(0);
      } finally {
        setLoading(false);
      }
    };

    loadTodayAttendance();
  }, []);

  if (loading) return <span className="text-xs">...</span>;
  return <span>{todayAttendance || 0}</span>;
};

  const toggleUserExpansion = (username) => {
    setExpandedUsers(prev => ({
      ...prev,
      [username]: !prev[username]
    }));
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

      if (sortConfig.key === 'priority') {
        const priorityOrder = { 'High': 3, 'Medium': 2, 'Low': 1 };
        aValue = priorityOrder[aValue] || 0;
        bValue = priorityOrder[bValue] || 0;
      }
      
      if (sortConfig.key === 'deadline') {
        aValue = new Date(aValue);
        bValue = new Date(bValue);
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  // ENHANCED filtering functionality with debounced search
  const filterTasks = (tasks) => {
    let filtered = [...tasks];

    // Apply task view filter (assigned to me vs assigned by me vs all)
    if (taskView === 'assignedToMe') {
      filtered = filtered.filter(task => task.assigned_to === user?.username);
    } else if (taskView === 'assignedByMe') {
      filtered = filtered.filter(task => task.given_by === user?.username);
    }
    // Note: 'all' shows all tasks without filtering

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

    // Apply debounced search filter
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

  // Check if task is overdue
  const isOverdue = (task) => {
    if (task.status === 'pending' && task.deadline) {
      return new Date(task.deadline) < new Date();
    }
    return false;
  };

  // Generate report
  const generateReport = async () => {
    try {
      const reportData = {
        generated_on: new Date().toLocaleDateString(),
        generated_time: new Date().toLocaleTimeString(),
        summary: summary,
        performance: performance,
        all_tasks: allTasks,
        total_users: users.length
      };

   
   

      const reportHTML = `


<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Management Report - ${reportData.generated_on}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 50%, #f8fafc 100%);
            color: #1f2937;
            line-height: 1.6;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #1f2937 0%, #374151 50%, #4b5563 100%);
            color: white;
            padding: 40px 30px;
            text-align: center;
        }
        .content {
            padding: 40px 30px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 25px;
            margin-bottom: 40px;
        }
        .stat-card {
            background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
            border: 2px solid #e5e7eb;
            border-radius: 16px;
            padding: 30px 24px;
            text-align: center;
        }
        .stat-number {
            font-size: 3rem;
            font-weight: 900;
            margin-bottom: 10px;
            color: var(--accent-color);
        }
        .footer {
            text-align: center;
            padding: 40px 30px;
            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
            border-top: 2px solid #e2e8f0;
        }
        .total-card { --accent-color: #1f2937; }
        .completed-card { --accent-color: #059669; }
        .pending-card { --accent-color: #d97706; }
        .overdue-card { --accent-color: #dc2626; }
        .users-card { --accent-color: #7c3aed; }
        .completion-card { --accent-color: #059669; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Logam Task Management Report</h1>
            <p>Generated on ${reportData.generated_on} at ${reportData.generated_time}</p>
        </div>
        
        <div class="content">
            <div class="section">
                <h2>Executive Summary</h2>
                <div class="stats-grid">
                    <div class="stat-card total-card">
                        <div class="stat-number">${reportData.summary.total}</div>
                        <div>Total Tasks</div>
                    </div>
                    <div class="stat-card completed-card">
                        <div class="stat-number">${reportData.summary.completed}</div>
                        <div>Completed Tasks</div>
                    </div>
                    <div class="stat-card pending-card">
                        <div class="stat-number">${reportData.summary.pending}</div>
                        <div>Pending Tasks</div>
                    </div>
                    <div class="stat-card overdue-card">
                        <div class="stat-number">${reportData.summary.overdue}</div>
                        <div>Overdue Tasks</div>
                    </div>
                    <div class="stat-card users-card">
                        <div class="stat-number">${reportData.total_users}</div>
                        <div>Active Users</div>
                    </div>
                    <div class="stat-card completion-card">
                        <div class="stat-number">${reportData.summary.total > 0 ? Math.round((reportData.summary.completed / reportData.summary.total) * 100) : 0}%</div>
                        <div>Overall Completion</div>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="footer">
            <p>Report generated by Logam Academy Task Manager Admin Console</p>
        </div>
    </div>
</body>
</html>`;

      const blob = new Blob([reportHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `admin-task-report-${new Date().toISOString().split('T')[0]}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      setError('Failed to generate report');
    }
  };

  // Only show loading for tabs that require dashboard data
  const tabsRequiringDashboardData = ['dashboard', 'calendar', 'assign-task', 'mark-complete', 'recurring', 'all-tasks', 'daily-tasks-analytics', 'tasks-by-user', 'performance', 'reports'];

  if (loading && tabsRequiringDashboardData.includes(activeTab)) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
    { id: 'assign-task', label: 'Assign Task', icon: UserPlus },
    { id: 'mark-complete', label: 'Complete Tasks', icon: Check },
    { id: 'recurring', label: 'Recurring Tasks', icon: Repeat },
    { id: 'all-tasks', label: 'All Tasks', icon: List },
    { id: 'daily-tasks-analytics', label: 'Daily Tasks Management', icon: BarChart3 },
    { id: 'attendance', label: 'Attendance Management', icon: Clock },
    { id: 'user-management', label: 'User Management', icon: Shield },
    { id: 'tasks-by-user', label: 'Tasks by User', icon: Users },
    { id: 'performance', label: 'Performance', icon: TrendingUp },
    { id: 'reports', label: 'Reports', icon: FileText }
  ];


  // ENHANCED TaskTable component with ALL missing features (Local version)
  const LocalTaskTable = ({ tasks, showFilters = true, title = "Tasks" }) => {
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
                <div className="relative">
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
          <UserTableView tasks={filteredAndSortedTasks} />
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
                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 text-xs font-medium flex items-center justify-center space-x-1 min-w-[60px] px-2 py-1 rounded transition-colors"
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
                  onClick={() => handleMarkAsComplete(task)}
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

  // ENHANCED User Table View Component with edit/delete functionality
  const UserTableView = ({ tasks }) => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th 
              className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleSort('task')}
            >
              <div className="flex items-center space-x-1">
                <span>Task</span>
                {getSortIcon('task')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleSort('client_name')}
            >
              <div className="flex items-center space-x-1">
                <Building className="w-3 h-3" />
                <span>Client</span>
                {getSortIcon('client_name')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleSort('deadline')}
            >
              <div className="flex items-center space-x-1">
                <Timer className="w-3 h-3" />
                <span>Deadline</span>
                {getSortIcon('deadline')}
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
            <th 
              className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleSort('priority')}
            >
              <div className="flex items-center space-x-1">
                <Flag className="w-3 h-3" />
                <span>Priority</span>
                {getSortIcon('priority')}
              </div>
            </th>
            <th 
              className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => handleSort(taskView === 'assignedToMe' ? 'given_by' : 'assigned_to')}
            >
              <div className="flex items-center space-x-1">
                <User className="w-3 h-3" />
                <span>{taskView === 'assignedToMe' ? 'Assigned By' : 'Assigned To'}</span>
                {getSortIcon(taskView === 'assignedToMe' ? 'given_by' : 'assigned_to')}
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {tasks.map((task, index) => {
            const overdue = isOverdue(task);
            const isEditing = editingTaskId === task.id;
            
            return (
              <tr key={task.id || index} className={`hover:bg-gray-50 transition-colors ${overdue ? 'bg-red-50' : ''}`}>
                {isEditing ? (
                  <>
                    <td className="px-6 py-4" colSpan="7">
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editingTask.task || ''}
                          onChange={(e) => setEditingTask({ ...editingTask, task: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
                          placeholder="Task description"
                        />
                        <div className="grid grid-cols-3 gap-3">
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
                            <option value="High">High Priority</option>
                            <option value="Medium">Medium Priority</option>
                            <option value="Low">Low Priority</option>
                          </select>
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            onClick={() => handleSaveEdit(task.id)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-1"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save Changes</span>
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
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-6 py-4 text-sm font-medium text-black max-w-xs">
                      {needsExpansion(task.task) ? (
                        <div className="space-y-2">
                          <div className="flex items-start space-x-2">
                            <div className="flex-1">
                              <div className="break-words" title={task.task}>
                                {expandedTasks[task.id] ? task.task : truncateText(task.task)}
                              </div>
                            </div>
                            <button
                              onClick={() => toggleTaskExpansion(task.id)}
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 text-xs font-medium flex items-center justify-center space-x-1 flex-shrink-0 min-w-[60px] px-2 py-1 rounded transition-colors"
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
                          {overdue && (
                            <div className="flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                              <span className="text-xs text-red-600 font-medium">Overdue</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="break-words" title={task.task}>
                            {task.task}
                          </div>
                          {overdue && (
                            <div className="flex items-center space-x-1 mt-1">
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                              <span className="text-xs text-red-600 font-medium">Overdue</span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Building className="w-3 h-3 text-gray-400" />
                        <span>{task.client_name || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <Timer className="w-3 h-3 text-gray-400" />
                        <span className={overdue ? 'text-red-600 font-medium' : ''}>{task.deadline}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 border rounded text-xs font-medium ${
                        overdue ? 'text-red-600 bg-red-50 border-red-200' : getStatusColor(task.status)
                      }`}>
                        {overdue ? 'Overdue' : task.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 border rounded text-xs font-medium flex items-center space-x-1 w-fit ${getPriorityColor(task.priority)}`}>
                        {getPriorityIcon(task.priority)}
                        <span>{task.priority}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {taskView === 'assignedToMe' ? task.given_by : task.assigned_to}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-1">
                        {task.status === 'pending' && taskView === 'assignedToMe' && (
                          <Button
                            onClick={() => handleMarkAsComplete(task)}
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
                              title="Edit task"
                            >
                              <Edit3 className="w-3 h-3" />
                            </Button>
                            <Button
                              onClick={() => setShowDeleteConfirm(task.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                              title="Delete task"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
                        )}
                        
                        {task.status === 'done' && (
                          <span className="text-xs text-green-600 font-medium flex items-center space-x-1">
                            <CheckCircle className="w-3 h-3" />
                            <span>Completed</span>
                          </span>
                        )}
                      </div>
                    </td>
                  </>
                )}
              </tr>
            );
          })}
          {tasks.length === 0 && (
            <tr>
              <td colSpan="7" className="px-6 py-12 text-center">
                <div className="flex flex-col items-center space-y-2">
                  {taskView === 'assignedToMe' ? (
                    <>
                      <UserCheck className="w-12 h-12 text-gray-300" />
                      <p className="text-gray-500">No tasks assigned to you matching your criteria</p>
                    </>
                  ) : (
                    <>
                      <UserX className="w-12 h-12 text-gray-300" />
                      <p className="text-gray-500">No tasks assigned by you matching your criteria</p>
                    </>
                  )}
                  {(searchTerm || filterStatus !== 'all' || filterPriority !== 'all') && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        clearSearch();
                        setFilterStatus('all');
                        setFilterPriority('all');
                        setSortConfig({ key: null, direction: 'asc' });
                      }}
                      className="text-gray-600 border-gray-300"
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <Head>
        <title>Admin Console - Logam Task Manager</title>
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
                  <h1 className="text-lg sm:text-xl font-bold text-black">Admin Console</h1>
                  <p className="text-xs sm:text-sm text-gray-600">Welcome, {user?.username} • System Administrator</p>
                </div>
                <div className="sm:hidden">
                  <h1 className="text-lg font-bold text-black">Admin</h1>
                  <p className="text-xs text-gray-600">{user?.username}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-4">
                <div className="hidden sm:flex items-center space-x-2" /* data-tour="system-settings" */>
                  <Bell className={`w-5 h-5 ${notificationsEnabled ? 'text-green-600' : 'text-gray-400'}`} />
                  <span className="text-xs text-gray-500">
                    {notificationsEnabled ? 'On' : 'Off'}
                  </span>
                </div>
                <span className="hidden sm:inline text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">Administrator</span>
                {/* <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => tutorialService.startAdminTutorial()}
                  className="flex items-center space-x-1 sm:space-x-2"
                  title="Start Tutorial"
                >
                  <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Tutorial</span>
                </Button> */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLogout}
                  className="flex items-center space-x-1 sm:space-x-2"
                >
                  <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
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
          `} /* data-tour="admin-sidebar" */>
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
                <h2 className="text-lg font-semibold text-black">Admin Menu</h2>
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
              
              {/* Enhanced Quick Stats with Attendance */}
<div className="mt-8 p-4 bg-gray-50 rounded-lg">
  <h3 className="text-sm font-semibold text-black mb-3 flex items-center space-x-2">
    <BarChart3 className="w-4 h-4 flex-shrink-0" />
    <span>System Overview</span>
  </h3>
  <div className="space-y-2">
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center space-x-2">
        <List className="w-3 h-3 text-gray-600 flex-shrink-0" />
        <span className="text-gray-600">Tasks</span>
      </div>
      <span className="font-semibold text-black">{summary.total}</span>
    </div>
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center space-x-2">
        <Users className="w-3 h-3 text-gray-600 flex-shrink-0" />
        <span className="text-gray-600">Users</span>
      </div>
      <span className="font-semibold text-black">{users.length}</span>
    </div>
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center space-x-2">
        <Clock className="w-3 h-3 text-blue-600 flex-shrink-0" />
        <span className="text-gray-600">Present Today</span>
      </div>
      <span className="font-semibold text-blue-600">
        {/* This will be populated from attendance data */}
        <AttendanceBadge />
      </span>
    </div>
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center space-x-2">
        <ClipboardList className="w-3 h-3 text-blue-600 flex-shrink-0" />
        <span className="text-gray-600">My Tasks</span>
      </div>
      <span className="font-semibold text-blue-600">{myTasks?.length || 0}</span>
    </div>
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center space-x-2">
        <TrendingUp className="w-3 h-3 text-green-600 flex-shrink-0" />
        <span className="text-gray-600">Completion</span>
      </div>
      <span className="font-semibold text-green-600">
        {summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0}%
      </span>
    </div>
  </div>
</div>




              {/* Quick Actions */}
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
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 lg:p-6 p-4">
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

            {/* Dashboard Tab - Using Modern Admin Dashboard Component */}
            {activeTab === 'dashboard' && (
              <AdminStatsDashboard user={user} />
            )}

            {/* My Tasks Tab - REMOVED (Not relevant for admin dashboard) */}
            {/* Admins should use "All Tasks" instead of personal "My Tasks" */}

            {/* OLD MY TASKS CODE KEPT FOR REFERENCE */}
            {false && activeTab === 'my-tasks-OLD' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-black flex items-center space-x-2">
                    <ClipboardList className="w-6 h-6" />
                    <span>My Tasks</span>
                  </h2>
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
                  tasks={myTasks} 
                  title="My Admin Tasks"
                  onTaskUpdate={handleTaskUpdate}
                  onTaskDelete={handleTaskDelete}
                  currentUser={user}
                  userRole={user?.role}
                  clientList={clients}
                />
              </div>
            )}

            {/* Calendar Tab - Using Modern Calendar Dashboard Component */}
            {activeTab === 'calendar' && (
              <CalendarDashboard user={user} />
            )}
            {/* User Management Tab */}
            {activeTab === 'user-management' && (
              <UserManagement />
            )}

            

{/* Assign Task Tab - REPLACE your existing assign-task section with this */}
{activeTab === 'assign-task' && (
              <TaskAssignmentDashboard user={user} />
            )}

            {/* OLD ASSIGN TASK CODE KEPT FOR REFERENCE */}
            {false && activeTab === 'assign-task-OLD' && (
  <div className="space-y-6">
    <h2 className="text-2xl font-bold text-black">Assign Task</h2>
    <div className="bg-white border border-gray-100 rounded-lg p-6">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-black mb-2">Task Description</label>
          <textarea
            value={newTask.task}
            onChange={(e) => setNewTask({...newTask, task: e.target.value})}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black placeholder-gray-500"
            rows={3}
            placeholder="Enter task description..."
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          <div>
                        <label className="block text-sm font-medium text-black mb-2">Assign To</label>
            <select
              value={newTask.assigned_to}
              onChange={(e) => setNewTask({...newTask, assigned_to: e.target.value})}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black"
            >
                          <option value="" className="text-gray-500">Select user...</option>
              {user && (
                <option key={user.username} value={user.username} className="text-black">
                  {user.username} ({user.role}) - Myself
                </option>
              )}
                          {users.filter(u => u.username !== user?.username).map((u) => (
                            <option key={u.username} value={u.username} className="text-black">{u.username} ({u.role})</option>
                          ))}
            </select>
          </div>
          
          <div>
            <label className="flex items-center space-x-2 text-sm font-medium text-black mb-2">
              <Building className="w-4 h-4" />
              <span>Client Name</span>
              <span className="text-xs text-gray-500">(Optional)</span>
            </label>
            <select
              value={newTask.isCustomClient ? 'custom' : newTask.client_name}
              onChange={(e) => {
                if (e.target.value === 'custom') {
                  setNewTask({
                    ...newTask, 
                    isCustomClient: true, 
                    client_name: '', 
                    custom_client: ''
                  });
                              // Auto-focus the custom input
                  setTimeout(() => {
                    const customInput = document.getElementById('custom-client-input');
                                if (customInput) {
                                  customInput.focus();
                                }
                  }, 50);
                } else {
                  setNewTask({
                    ...newTask, 
                    isCustomClient: false,
                    client_name: e.target.value, 
                    custom_client: ''
                  });
                }
              }}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black"
            >
              <option value="">Select client...</option>
              {clientList.map((client) => (
                <option key={client} value={client} className="text-black">
                  {client}
                </option>
              ))}
              <option value="custom">+ Custom Client</option>
            </select>
            {newTask.isCustomClient && (
              <input
                id="custom-client-input"
                type="text"
                value={newTask.custom_client}
                            onChange={(e) => {
                              setNewTask({
                                ...newTask, 
                                custom_client: e.target.value
                              });
                            }}
                className="w-full mt-2 px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black placeholder-gray-500"
                placeholder="Enter custom client name..."
                autoComplete="off"
                spellCheck="false"
              />
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-black mb-2">Priority</label>
            <select
              value={newTask.priority}
              onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black"
            >
              <option value="High" className="text-black">High Priority</option>
              <option value="Medium" className="text-black">Medium Priority</option>
              <option value="Low" className="text-black">Low Priority</option>
            </select>
          </div>
          
          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium text-black mb-2">Deadline</label>
            <input
              type="date"
              value={newTask.deadline}
              onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
              className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black"
            />
          </div>
        </div>


        {/* Assignment Notes */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">Assignment Notes</label>
          <textarea
            value={newTask.assignerNotes}
            onChange={(e) => setNewTask({...newTask, assignerNotes: e.target.value})}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black placeholder-gray-500"
            rows={3}
            placeholder="Add notes visible to both you and the assignee..."
          />
          <p className="text-xs text-gray-500 mt-1">These notes will be visible to both you and the person you're assigning the task to.</p>
        </div>

        {/* Private Notes */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">Private Notes</label>
          <textarea
            value={newTask.assignerPrivateNotes}
            onChange={(e) => setNewTask({...newTask, assignerPrivateNotes: e.target.value})}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm text-black placeholder-gray-500"
            rows={2}
            placeholder="Add private notes only visible to you..."
          />
          <p className="text-xs text-gray-500 mt-1">These notes will only be visible to you and other administrators.</p>
        </div>

        <div className="flex justify-end">
                      <Button 
                        onClick={handleCreateTask} 
                        className="bg-black hover:bg-gray-800 flex items-center space-x-2 cursor-pointer"
                        disabled={creatingTask}
                      >
                        {creatingTask ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Creating Task...</span>
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4" />
                            <span>Create Task</span>
                          </>
                        )}
                      </Button>
        </div>
      </div>
    </div>
  </div>
)}

            {/* Mark Complete Tab */}
            {activeTab === 'mark-complete' && (
              <TaskCompletionDashboard user={user} />
            )}


            {/* Recurring Tasks Tab */}
            {/* Recurring Tasks Tab - Modern UI Pattern */}
            {activeTab === 'recurring' && (
              <div className="space-y-4 lg:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl lg:text-2xl font-bold text-black">Recurring Tasks</h2>
                  <div className="flex space-x-2">
                    <Button
                      onClick={() => loadDashboardData(localStorage.getItem('token'), user)}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-2 w-fit"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Refresh</span>
                    </Button>
                    <Button
                      onClick={() => setShowRecurringModal(true)}
                      className="bg-black hover:bg-gray-800 flex items-center space-x-2"
                    >
                      <Repeat className="w-4 h-4" />
                      <span>New Recurring Task</span>
                    </Button>
                  </div>
                </div>
                
                <div className="bg-white border border-gray-100 rounded-lg">
                  <div className="p-6">
                    <div className="space-y-4">
                      {recurringSchedules.map((schedule) => (
                        <div key={schedule.id} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg">
                          <div className="flex-1">
                            <h4 className="font-medium text-black">{schedule.taskTemplate.task}</h4>
                            <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                              <span>Assigned to: {schedule.taskTemplate.assigned_to}</span>
                              {schedule.taskTemplate.client_name && (
                                <span className="flex items-center space-x-1">
                                  <Building className="w-3 h-3" />
                                  <span>Client: {schedule.taskTemplate.client_name}</span>
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500">
                              {schedule.schedule.type} every {schedule.schedule.interval} 
                              {schedule.schedule.type === 'daily' ? 'day(s)' : 
                               schedule.schedule.type === 'weekly' ? 'week(s)' : 'month(s)'}
                            </p>
                            <p className="text-xs text-gray-400">
                              Next: {schedule.nextExecution.toLocaleDateString()}
                            </p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRecurringSchedules(prev => prev.filter(s => s.id !== schedule.id));
                            }}
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                      {recurringSchedules.length === 0 && (
                        <div className="text-center py-8">
                          <Repeat className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                          <p className="text-gray-500">No recurring tasks configured</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* All Tasks Tab */}
            {/* All Tasks Tab - Using Modern Admin Tasks Dashboard Component */}
            {activeTab === 'all-tasks' && (
              <AdminTasksDashboard user={user} />
            )}
            {/* Daily Tasks Management Tab - Modern Dashboard Pattern */}
            {activeTab === 'daily-tasks-analytics' && (
              <div className="space-y-4 lg:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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

                <DailyTaskAdmin currentUser={user} />
              </div>
            )}
           {/* {activeTab === 'clients' && (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-black">Client Management</h2>
      <div className="text-sm text-gray-500">
        
      </div>
    </div>
    <ClientManagement />
  </div>
)} */}
{/* Attendance Tab - Using New MVC Admin System */}
            {activeTab === 'attendance' && (
              <AdvancedAdminAttendanceDashboard currentUser={user} />
            )}


{/* Client Dashboards Tab - Full dashboard experience - COMMENTED OUT */}
{/* {activeTab === 'client-dashboards' && (
  <div className="space-y-6">
    <ClientDashboardsTab currentUser={user} />
  </div>
)} */}

            {/* Tasks by User Tab */}
            {/* Complete Tasks by User Tab - Replace your existing one with this */}
{activeTab === 'tasks-by-user' && (
              <AdminUsersDashboard user={user} />
            )}

            {/* OLD CODE KEPT FOR REFERENCE */}
            {false && activeTab === 'tasks-by-user-OLD' && (
  <div className="space-y-6">
    <div className="flex items-center justify-between">
      <h2 className="text-2xl font-bold text-black">Tasks by User</h2>
      <div className="flex space-x-2">
        <Button 
          onClick={() => setExpandedUsers({})}
          variant="outline"
          size="sm"
          className="text-gray-600 border-gray-300"
        >
          Collapse All
        </Button>
        <Button 
          onClick={() => {
            const allExpanded = {};
            users.forEach(user => {
              allExpanded[user.username] = true;
            });
            setExpandedUsers(allExpanded);
          }}
          variant="outline"
          size="sm"
          className="text-gray-600 border-gray-300"
        >
          Expand All
        </Button>
      </div>
    </div>
    
    <div className="space-y-4">
      {users.map((selectedUser) => {
        const userTasks = allTasks.filter(task => task.assigned_to === selectedUser.username);
        const userPerf = performance[selectedUser.username] || { total: 0, completed: 0, pending: 0 };
        const completionRate = userPerf.total > 0 ? Math.round((userPerf.completed / userPerf.total) * 100) : 0;
        const isExpanded = expandedUsers[selectedUser.username];
        
        const userOverdueTasks = userTasks.filter(task => {
          if (task.status === 'pending' && task.deadline) {
            return new Date(task.deadline) < new Date();
          }
          return false;
        });
        
        return (
          <div key={selectedUser.username} className="bg-white border border-gray-100 rounded-lg transition-all duration-200">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-semibold text-gray-600">
                      {selectedUser.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-black">{selectedUser.username}</h3>
                    <p className="text-sm text-gray-500">{selectedUser.role}</p>
                    {userOverdueTasks.length > 0 && (
                      <div className="flex items-center space-x-1 mt-1">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        <span className="text-xs text-red-600 font-medium">
                          {userOverdueTasks.length} overdue task{userOverdueTasks.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <div className={`text-xl font-bold ${completionRate >= 80 ? 'text-green-600' : completionRate >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                      {completionRate}%
                    </div>
                    <div className="text-xs text-gray-500">completion</div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {/* 🔥 THIS IS THE IMPORTANT VIEW DETAILS BUTTON */}
                    <Button
                      onClick={() => setSelectedUserForDetail(selectedUser)}
                      variant="outline"
                      size="sm"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 flex items-center space-x-2"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View Details</span>
                    </Button>
                    
                    {/* Expand/Collapse Button */}
                    <button
                      onClick={() => toggleUserExpansion(selectedUser.username)}
                      className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-700"
                    >
                      <span>{userPerf.total} tasks</span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-3 mt-4">
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-lg font-bold text-black">{userPerf.total}</div>
                  <div className="text-xs text-gray-500">Total</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-lg font-bold text-green-600">{userPerf.completed}</div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
                <div className="text-center p-3 bg-amber-50 rounded-lg">
                  <div className="text-lg font-bold text-amber-600">{userPerf.pending}</div>
                  <div className="text-xs text-gray-500">Pending</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg">
                  <div className="text-lg font-bold text-red-600">{userOverdueTasks.length}</div>
                  <div className="text-xs text-gray-500">Overdue</div>
                </div>
              </div>
            </div>
            
            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-gray-100 p-6 bg-gray-50">
                {userOverdueTasks.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-red-600 mb-4 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Overdue Tasks ({userOverdueTasks.length})</span>
                    </h4>
                    <div className="bg-red-50 border border-red-200 rounded-lg overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-red-100 border-b border-red-200">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-red-800 uppercase tracking-wider">Task</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-red-800 uppercase tracking-wider">Client</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-red-800 uppercase tracking-wider">Deadline</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-red-800 uppercase tracking-wider">Priority</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-red-800 uppercase tracking-wider">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-red-200">
                            {userOverdueTasks.map((task, index) => (
                              <tr key={index} className="hover:bg-red-100 transition-colors">
                                <td className="px-4 py-3 text-sm font-medium text-red-800 max-w-xs">
                                  <div className="truncate" title={task.task}>{task.task}</div>
                                </td>
                                <td className="px-4 py-3 text-sm text-red-700">
                                  <div className="flex items-center space-x-1">
                                    <Building className="w-3 h-3 text-red-500" />
                                    <span>{task.client_name || 'N/A'}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-red-700 font-medium">{task.deadline}</td>
                                <td className="px-4 py-3">
                                  <span className={`px-2 py-1 border rounded text-xs font-medium flex items-center space-x-1 w-fit ${getPriorityColor(task.priority)}`}>
                                    {getPriorityIcon(task.priority)}
                                    <span>{task.priority}</span>
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <Button
                                    onClick={() => handleMarkAsComplete(task)}
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white flex items-center space-x-1"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Complete</span>
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                
                <TaskTable 
                  tasks={userTasks} 
                  showFilters={false} 
                  title={`${selectedUser.username}'s All Tasks`}
                  onTaskUpdate={handleTaskUpdate}
                  onTaskDelete={handleTaskDelete}
                  currentUser={user}
                  userRole={user?.role}
                  clientList={clients}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
)}

            {/* Performance Tab */}
            {/* Performance Tab - Modern UI Pattern */}
            {activeTab === 'performance' && (
              <div className="space-y-4 lg:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl lg:text-2xl font-bold text-black">Performance Analytics</h2>
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
                {Object.keys(performance).length > 0 ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                    {Object.entries(performance).map(([username, data]) => {
                      const completionRate = data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;
                      return (
                        <div key={username} className="bg-white border border-gray-100 rounded-lg p-4 lg:p-6 hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
                              <Users className="w-5 h-5" />
                              <span>{username}</span>
                            </h3>
                            <div className={`text-sm font-medium px-2 py-1 rounded ${
                              completionRate >= 80 ? 'text-green-600 bg-green-50' :
                              completionRate >= 60 ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50'
                            }`}>
                              {completionRate}%
                            </div>
                          </div>
                        
                        <div className="grid grid-cols-3 gap-4 mb-4">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-black">{data.total}</div>
                            <div className="text-sm text-gray-500">Total</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{data.completed}</div>
                            <div className="text-sm text-gray-500">Completed</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-amber-600">{data.pending}</div>
                            <div className="text-sm text-gray-500">Pending</div>
                          </div>
                        </div>
                        
                        <div className="mb-2">
                          <div className="flex justify-between text-sm text-gray-600 mb-1">
                            <span>Completion Rate</span>
                            <span>{completionRate}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${completionRate >= 80 ? 'bg-green-500' : completionRate >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${completionRate}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                ) : (
                  <div className="bg-white border border-gray-100 rounded-lg p-8 lg:p-12 text-center">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 mb-2">No Performance Data</h3>
                    <p className="text-gray-500 text-sm">Performance analytics will appear here once users start completing tasks.</p>
                  </div>
                )}
              </div>
            )}

            {/* Reports Tab */}
            {/* Reports Tab - Using Modern Reports Dashboard Component */}
            {activeTab === 'reports' && (
              <ReportsDashboard user={user} />
            )}

            {/* OLD REPORTS CODE KEPT FOR REFERENCE */}
            {false && activeTab === 'reports-OLD' && (
              <div className="space-y-4 lg:space-y-6" /* data-tour="task-analytics" */>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h2 className="text-xl lg:text-2xl font-bold text-black">Reports & Analytics</h2>
                </div>
                <div className="bg-white border border-gray-100 rounded-lg p-6">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
                        <FileText className="w-5 h-5" />
                        <span>System Performance Report</span>
                      </h3>
                      <p className="text-gray-600 mb-4 text-sm">
                        Generate a comprehensive report including all tasks, user statistics, performance metrics, and system analytics.
                      </p>
                      <Button onClick={generateReport} className="bg-black hover:bg-gray-800 flex items-center space-x-2 cursor-pointer">
                        <Download className="w-4 h-4" />
                        <span>Generate Full Report</span>
                      </Button>
                    </div>
                    
                    <div className="border-t border-gray-100 pt-6">
                      <h3 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
                        <BarChart3 className="w-5 h-5" />
                        <span>System Statistics</span>
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-black">{users.length}</div>
                          <div className="text-sm text-gray-500">Total Users</div>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-black">{summary.total}</div>
                          <div className="text-sm text-gray-500">Total Tasks</div>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0}%
                          </div>
                          <div className="text-sm text-gray-500">System Completion</div>
                        </div>
                        <div className="bg-gray-50 border border-gray-100 p-4 rounded-lg text-center">
                          <div className="text-2xl font-bold text-red-600">{summary.overdue}</div>
                          <div className="text-sm text-gray-500">Overdue Tasks</div>
                        </div>
                      </div>
                      
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-blue-800">Overall System Health</h4>
                            <p className="text-sm text-blue-600">
                              {summary.total > 0 ? `${Math.round((summary.completed / summary.total) * 100)}% of system tasks are completed` : 'No tasks in system yet'}
                            </p>
                            <p className="text-xs text-blue-500 mt-1">
                              Active users: {users.length} | Average completion rate: {
                                Object.keys(performance).length > 0 
                                  ? Math.round(
                                      Object.values(performance).reduce((acc, p) => 
                                        acc + (p.total > 0 ? (p.completed / p.total) * 100 : 0), 0
                                      ) / Object.keys(performance).length
                                    ) 
                                  : 0
                              }%
                            </p>
                          </div>
                          <div className="text-3xl font-bold text-blue-600">
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
                        <div className="grid grid-cols-3 gap-4">
                          {['High', 'Medium', 'Low'].map(priority => {
                            const count = allTasks.filter(t => t.priority === priority).length;
                            const percentage = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;
                            return (
                              <div key={priority} className="text-center p-3 border border-gray-100 rounded-lg">
                                <div className={`text-lg font-bold ${getPriorityColor(priority).split(' ')[0]}`}>
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
                        <h4 className="font-semibold text-black mb-3">Recent System Activity</h4>
                        <div className="space-y-2">
                          {allTasks.filter(t => t.status === 'done').slice(0, 5).map((task, index) => (
                            <div key={index} className="flex items-center space-x-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <div className="flex-1">
                                <span className="text-sm font-medium text-green-800">{task.task}</span>
                                <span className="text-xs text-green-600 ml-2">
                                  Completed by {task.assigned_to}
                                </span>
                                {task.completed_date && (
                                  <span className="text-xs text-green-600 ml-2">
                                    on {new Date(task.completed_date).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                          {allTasks.filter(t => t.status === 'done').length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">No completed tasks yet</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Recurring Task Modal */}
        {showRecurringModal && (
          <RecurringTaskForm
            isOpen={showRecurringModal}
            onClose={() => setShowRecurringModal(false)}
            onSubmit={handleCreateRecurringTask}
            users={users}
          />
        )}
        {/* User Performance Detail Modal */}
{selectedUserForDetail && (
  <UserPerformanceDetail
    user={selectedUserForDetail}
    tasks={allTasks}
    onClose={() => setSelectedUserForDetail(null)}
    onMarkComplete={handleMarkAsComplete}
  />
)}
        
      </div>
    </>
  );
}