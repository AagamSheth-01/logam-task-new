// Enhanced TaskTable component with FIXED search functionality
import React, { useState, useCallback } from 'react';
import Button from './ui/Button';
import EditTaskModal from './modals/EditTaskModal';
import ConfirmationModal from './modals/ConfirmationModal';
import TaskDetailModal from './modals/TaskDetailModal';
import {
  Search,
  Filter,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Building,
  User,
  Timer,
  Flag,
  CheckCircle,
  AlertTriangle,
  Edit3,
  Trash2,
  X,
  List,
  Eye,
  UserCheck,
  UserX,
  Users,
  RotateCcw
} from 'lucide-react';

const TaskTable = ({ 
  tasks, 
  showFilters = true, 
  title = "Tasks",
  onTaskUpdate,
  onTaskDelete,
  currentUser,
  userRole,
  clientList = []
}) => {
  // State for filtering and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [taskView, setTaskView] = useState('all'); // 'all', 'toMe', 'byMe', 'byClient', 'byUser'
  
  // State for modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [completingTasks, setCompletingTasks] = useState(new Set());
  
  // Permission check
  const hasEditPermission = userRole === 'admin' || userRole === 'Admin';

  // FIXED: Memoized search handler to prevent re-renders
  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);
  }, []);

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

  // Enhanced filtering functionality
  const filterTasks = (tasks) => {
    let filtered = [...tasks];

    // Apply task view filter (skip filtering if 'all')
    if (taskView === 'toMe') {
      filtered = filtered.filter(task => task.assigned_to === currentUser);
    } else if (taskView === 'byMe') {
      filtered = filtered.filter(task => task.given_by === currentUser);
    } else if (taskView === 'byClient') {
      filtered = filtered.filter(task => task.client_name && task.client_name.trim() !== '');
    } else if (taskView === 'byUser') {
      filtered = filtered.filter(task => !task.client_name || task.client_name.trim() === '');
    }
    // If taskView === 'all', no filtering is applied

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

    // Apply search filter - ENHANCED
    if (searchTerm && searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(task => 
        (task.task && task.task.toLowerCase().includes(term)) ||
        (task.client_name && task.client_name.toLowerCase().includes(term)) ||
        (task.given_by && task.given_by.toLowerCase().includes(term)) ||
        (task.assigned_to && task.assigned_to.toLowerCase().includes(term)) ||
        (task.priority && task.priority.toLowerCase().includes(term)) ||
        (task.status && task.status.toLowerCase().includes(term))
      );
    }

    return filtered;
  };

  const getFilteredAndSortedTasks = (tasks) => {
    const filtered = filterTasks(tasks);
    return sortTasks(filtered);
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

  // Check if user can edit/delete task
  const canEditTask = (task) => {
    return userRole?.toLowerCase() === 'admin' || task.given_by === currentUser;
  };

  const canDeleteTask = (task) => {
    // Only admins and task creators (who assigned the task) can delete
    return userRole?.toLowerCase() === 'admin' || task.given_by === currentUser;
  };

  // Handle edit task
  const handleEditClick = (task) => {
    setSelectedTask(task);
    setEditModalOpen(true);
  };

  const handleEditSave = async (updateData) => {
    if (!selectedTask) return;
    
    setLoading(true);
    try {
      await onTaskUpdate(selectedTask.id, updateData);
      setEditModalOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to update task:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle delete task
  const handleDeleteClick = (task) => {
    setSelectedTask(task);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedTask) return;
    
    setLoading(true);
    try {
      await onTaskDelete(selectedTask.id);
      setDeleteModalOpen(false);
      setSelectedTask(null);
    } catch (error) {
      console.error('Failed to delete task:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle undo task (mark as pending)
  const handleUndoTask = async (taskId) => {
    setCompletingTasks(prev => new Set(prev).add(taskId));

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'pending' })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to undo task');
      }

      // Update task status locally without full page reload
      if (onTaskUpdate) {
        // Just call it without await to prevent blocking
        onTaskUpdate(taskId, { status: 'pending' }).catch(err =>
          console.error('Background task update failed:', err)
        );
      }
    } catch (error) {
      console.error('Failed to undo task:', error);
    } finally {
      setCompletingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  // Handle complete task
  const handleCompleteTask = async (taskId) => {
    setCompletingTasks(prev => new Set(prev).add(taskId));

    // Find the task BEFORE the API call (important!)
    const taskToComplete = tasks.find(t => t.id === taskId);
    console.log('🔍 DEBUG: Task to complete:', taskToComplete);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'done' })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to complete task');
      }

      // Add completed task to daily task logger queue
      if (taskToComplete) {
        console.log('💾 Adding task to daily logger...');
        const today = new Date().toISOString().split('T')[0];
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        const storageKey = `pending_daily_tasks_${user.username}_${today}`;

        // Get existing pending tasks
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');

        // Check if already added (avoid duplicates)
        const alreadyExists = existing.some(t => t.sourceTaskId === taskId);

        if (!alreadyExists) {
          // Add new task
          const dailyTask = {
            id: `completed_${taskId}_${Date.now()}`,
            description: taskToComplete.task,
            timeSpent: 0, // User will set this
            category: 'general',
            startTime: null,
            isRunning: false,
            priority: taskToComplete.priority?.toLowerCase() || 'medium',
            sourceTaskId: taskId,
            autoAdded: true,
            addedAt: new Date().toISOString()
          };

          existing.push(dailyTask);
          localStorage.setItem(storageKey, JSON.stringify(existing));

          console.log('✅ Task added to daily logger queue:', dailyTask.description);
          console.log('📦 Storage key:', storageKey);
          console.log('📋 Total pending tasks:', existing.length);

          // Verify it was saved
          const saved = localStorage.getItem(storageKey);
          console.log('🔍 Verification - Saved data:', saved);

          // Show success message (optional)
          if (typeof window !== 'undefined' && window.alert) {
            // You can replace this with a toast notification
            console.log('🎉 Task added to Daily Logger! Open "Daily Tasks" tab to see it.');
          }
        } else {
          console.log('⏭️  Task already in daily logger queue');
        }
      } else {
        console.error('❌ ERROR: Could not find task to add to daily logger');
        console.error('   Task ID:', taskId);
        console.error('   Available tasks:', tasks.length);
      }

      // Update task status locally without full page reload
      if (onTaskUpdate) {
        // Just call it without await to prevent blocking
        onTaskUpdate(taskId, { status: 'done' }).catch(err =>
          console.error('Background task update failed:', err)
        );
      }
    } catch (error) {
      console.error('Failed to complete task:', error);
      // You might want to show an error message to the user here
    } finally {
      setCompletingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterPriority('all');
    setSortConfig({ key: null, direction: 'asc' });
  }, []);

  // Get filtered and sorted tasks
  const sortedTasks = getFilteredAndSortedTasks(tasks);

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
        {showFilters && (
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full lg:w-auto">
                <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
                  <List className="w-5 h-5" />
                  <span>{title} ({sortedTasks.length})</span>
                </h3>
                
                {/* Task View Toggles */}
                <div className="flex items-center bg-white border border-gray-200 rounded p-0.5">
                  <button
                    type="button"
                    onClick={() => setTaskView('toMe')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      taskView === 'toMe' 
                        ? 'bg-blue-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <UserCheck className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline">To Me</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskView('byMe')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      taskView === 'byMe' 
                        ? 'bg-green-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <UserX className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline">By Me</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskView('byClient')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      taskView === 'byClient' 
                        ? 'bg-purple-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Building className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline">Client</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskView('byUser')}
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                      taskView === 'byUser' 
                        ? 'bg-orange-600 text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Users className="w-3 h-3 flex-shrink-0" />
                    <span className="hidden sm:inline">User</span>
                  </button>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                {/* COMPLETELY FIXED Search Input */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none z-10" />
                  <input
                    type="text"
                    placeholder="Search tasks, clients, users..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    className="pl-10 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black focus:border-black w-full sm:w-64 bg-white relative z-0"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                  {/* Clear search button */}
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleSearchChange('');
                      }}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10 p-1 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                
                {/* Status Filter */}
                <div className="relative">
                  <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
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
                  <Flag className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none" />
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
                    onClick={clearAllFilters}
                    variant="outline"
                    size="sm"
                    className="text-gray-600 border-gray-300 hover:bg-gray-50"
                  >
                    <X className="w-3 h-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Mobile Card View */}
        <div className="md:hidden">
          <div className="space-y-3">
            {sortedTasks.map((task) => {
              const canEdit = canEditTask(task);
              const canDelete = canDeleteTask(task);

              return (
                <div key={task.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">{task.task}</h3>
                      <p className="text-sm text-gray-500 flex items-center mt-1">
                        <Building className="w-3 h-3 mr-1" />
                        {task.client_name}
                      </p>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      task.status === 'done' ? 'bg-green-100 text-green-800' :
                      task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {task.status === 'done' ? 'completed' : task.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div className="flex items-center text-gray-500">
                      <User className="w-3 h-3 mr-1" />
                      <span className="truncate">{task.assigned_to}</span>
                    </div>
                    <div className="flex items-center text-gray-500">
                      <Timer className="w-3 h-3 mr-1" />
                      <span>{new Date(task.deadline).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      task.priority === 'High' ? 'bg-red-100 text-red-800' :
                      task.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {task.priority}
                    </span>

                    {/* Action buttons for mobile */}
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setDetailModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-gray-100 rounded"
                      >
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      {task.status === 'pending' ? (
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          disabled={completingTasks.has(task.id)}
                          className="p-1.5 hover:bg-green-100 rounded disabled:opacity-50"
                        >
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUndoTask(task.id)}
                          disabled={completingTasks.has(task.id)}
                          className="p-1.5 hover:bg-amber-100 rounded disabled:opacity-50"
                        >
                          <RotateCcw className="w-4 h-4 text-amber-600" />
                        </button>
                      )}
                      {canEdit && (
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setEditModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-blue-100 rounded"
                        >
                          <Edit3 className="w-4 h-4 text-blue-600" />
                        </button>
                      )}
                      {canDelete && (
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-red-100 rounded"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
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
                  onClick={() => handleSort('assigned_to')}
                >
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>Assigned To</span>
                    {getSortIcon('assigned_to')}
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
                  onClick={() => handleSort('given_by')}
                >
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>Assigned By</span>
                    {getSortIcon('given_by')}
                  </div>
                </th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedTasks.map((task, index) => {
                const overdue = isOverdue(task);
                const canEdit = canEditTask(task);
                const canDelete = canDeleteTask(task);

                return (
                  <tr key={task.id || index} className={`hover:bg-gray-50 transition-colors ${overdue ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4 text-sm font-medium text-black max-w-xs">
                      <div className="truncate" title={task.task}>
                        {task.task}
                        {overdue && (
                          <div className="flex items-center space-x-1 mt-1">
                            <AlertTriangle className="w-3 h-3 text-red-500" />
                            <span className="text-xs text-red-600 font-medium">Overdue</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center flex-shrink-0">
                          {task.assigned_to_profile_image ? (
                            <img
                              src={task.assigned_to_profile_image}
                              alt={task.assigned_to}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-3 h-3 text-gray-600" />
                          )}
                        </div>
                        <span>{task.assigned_to}</span>
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
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center flex-shrink-0">
                          {task.given_by_profile_image ? (
                            <img
                              src={task.given_by_profile_image}
                              alt={task.given_by}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <User className="w-3 h-3 text-gray-600" />
                          )}
                        </div>
                        <span>{task.given_by}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-2">
                        {/* View */}
                        <button
                          onClick={() => {
                            setSelectedTask(task);
                            setDetailModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4 text-gray-600" />
                        </button>

                        {/* Complete / Undo */}
                        {task.status === 'pending' ? (
                          <button
                            onClick={() => handleCompleteTask(task.id)}
                            disabled={completingTasks.has(task.id)}
                            className="p-1.5 hover:bg-green-100 rounded transition-colors disabled:opacity-50"
                            title="Complete"
                          >
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleUndoTask(task.id)}
                            disabled={completingTasks.has(task.id)}
                            className="p-1.5 hover:bg-amber-100 rounded transition-colors disabled:opacity-50"
                            title="Undo"
                          >
                            <RotateCcw className="w-4 h-4 text-amber-600" />
                          </button>
                        )}

                        {/* Edit */}
                        {canEdit && (
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setEditModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-blue-100 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit3 className="w-4 h-4 text-blue-600" />
                          </button>
                        )}

                        {/* Delete */}
                        {canDelete && (
                          <button
                            onClick={() => {
                              setSelectedTask(task);
                              setDeleteModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-red-100 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {sortedTasks.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center space-y-2">
                      <List className="w-12 h-12 text-gray-300" />
                      <p className="text-gray-500">No tasks found matching your criteria</p>
                      {(searchTerm || filterStatus !== 'all' || filterPriority !== 'all') && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={clearAllFilters}
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
      </div>

      {/* Edit Task Modal */}
      <EditTaskModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedTask(null);
        }}
        onSave={handleEditSave}
        task={selectedTask}
        clientList={clientList}
        loading={loading}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setSelectedTask(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
        type="danger"
        confirmText="Delete Task"
        cancelText="Cancel"
        loading={loading}
        details={selectedTask ? {
          'Task': selectedTask.task,
          'Assigned to': selectedTask.assigned_to,
          'Client': selectedTask.client_name || 'N/A',
          'Deadline': selectedTask.deadline,
          'Status': selectedTask.status
        } : null}
      />
      
      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        currentUser={currentUser}
        onTaskUpdate={onTaskUpdate}
      />

    </>
  );
};

export default TaskTable;