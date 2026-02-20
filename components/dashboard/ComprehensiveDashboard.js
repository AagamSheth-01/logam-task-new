/**
 * Comprehensive Dashboard Component
 * Modern UI with all dashboard features: tasks, attendance, stats
 */

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  CheckCircle,
  Clock,
  AlertTriangle,
  ClipboardList,
  TrendingUp,
  RefreshCw,
  Building,
  ChevronUp,
  ChevronDown,
  Calendar as CalendarIcon,
  MapPin,
  User,
  Timer,
  Target,
  Activity,
  LogOut,
  XCircle,
  Home as HomeIcon
} from 'lucide-react';
import Button from '../ui/Button';
import { getIndiaDate } from '../../lib/timezoneClient';
import { AttendanceAPIService } from '../../lib/attendanceServices';

// Personal Attendance Widget Component
const PersonalAttendanceWidget = ({ user, setActiveTab }) => {
  console.log('PersonalAttendanceWidget rendering with user:', user?.username);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clockOutLoading, setClockOutLoading] = useState(false);
  const [error, setError] = useState('');
  const [attendanceStats, setAttendanceStats] = useState({
    thisMonth: { present: 0, total: 0, rate: 0 }
  });
  const cacheKey = `attendance_cache_${user?.username}`;
  const cacheDuration = 30 * 1000; // 30 seconds

  // Format time for display
  const formatTime = (time) => {
    if (!time) return '';
    try {
      const timeOnly = time.includes(' ') ? time.split(' ')[1] : time;
      const [hours, minutes] = timeOnly.split(':');
      const hour = parseInt(hours);
      const minute = minutes || '00';
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      return `${displayHour}:${minute} ${period}`;
    } catch (error) {
      console.error('Error formatting time:', error, 'input:', time);
      return time;
    }
  };

  useEffect(() => {
    if (user?.username) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > 5 * 60 * 1000) {
          localStorage.removeItem(cacheKey);
        }
      }
      loadPersonalAttendance();
    }

    const handleAttendanceUpdate = () => {
      localStorage.removeItem(cacheKey);
      loadPersonalAttendance();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          const { timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp >= cacheDuration) {
            loadPersonalAttendance();
          }
        }
      }
    };

    window.addEventListener('attendanceUpdated', handleAttendanceUpdate);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('attendanceUpdated', handleAttendanceUpdate);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user?.username]);

  const loadPersonalAttendance = async () => {
    console.log('PersonalAttendanceWidget: Loading attendance for user:', user?.username);
    try {
      localStorage.removeItem(cacheKey);

      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const today = getIndiaDate();
      const [year, month] = today.split('-');
      const startOfMonth = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endOfMonth = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

      const [todayData, monthData] = await Promise.all([
        AttendanceAPIService.loadAttendanceData({ user: user.username }).catch(err => {
          console.log('PersonalAttendanceWidget: Today API failed:', err.message);
          return { success: false };
        }),
        AttendanceAPIService.loadAttendanceData({
          user: user.username,
          startDate: startOfMonth,
          endDate: endOfMonth
        }).catch(err => {
          console.log('PersonalAttendanceWidget: Month API failed:', err.message);
          return { success: false };
        })
      ]);

      let newTodayRecord = null;
      let newStats = { thisMonth: { present: 0, total: 0, rate: 0 } };

      console.log('PersonalAttendanceWidget: Today response:', todayData);
      if (todayData.success) {
        newTodayRecord = todayData.todayRecord;
        setTodayRecord(newTodayRecord);
      }

      console.log('PersonalAttendanceWidget: Month response:', monthData);
      if (monthData.success && monthData.stats) {
        newStats = {
          thisMonth: {
            present: monthData.stats.presentDays || 0,
            total: monthData.stats.totalDays || 0,
            rate: Math.round(monthData.stats.attendanceRate || 0)
          }
        };
        setAttendanceStats(newStats);
      }
    } catch (error) {
      console.error('PersonalAttendanceWidget: Error loading attendance:', error);
      setTodayRecord(null);
      setAttendanceStats(null);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!todayRecord || todayRecord.checkOut) return;

    setClockOutLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Clock out response:', data);

        if (data.success && data.record) {
          setTodayRecord(data.record);
          console.log('Updated today record:', data.record);
          localStorage.removeItem(cacheKey);
          setTimeout(() => {
            loadPersonalAttendance();
          }, 100);
        } else {
          throw new Error(data.message || 'Failed to clock out');
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clock out');
      }
    } catch (error) {
      console.error('Clock out error:', error);
      setError('Failed to clock out');
    } finally {
      setClockOutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div className="h-5 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const handleRefresh = () => {
    localStorage.removeItem(cacheKey);
    setLoading(true);
    setError('');
    loadPersonalAttendance();
  };

  if (error) {
    return (
      <div className="bg-white border border-red-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-red-600 flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Today's Attendance</span>
          </h3>
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Refresh attendance data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        <div className="text-red-600 text-center py-4">
          <p className="mb-2">{error}</p>
          <button
            onClick={handleRefresh}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const todayDate = todayRecord?.date || getIndiaDate();
  const today = new Date(todayDate + 'T00:00:00').toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Today's Attendance</span>
          </h3>
          <p className="text-sm text-gray-600">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Refresh attendance data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Button
            onClick={() => setActiveTab('attendance')}
            variant="outline"
            size="sm"
            className="text-blue-600 border-blue-200 hover:bg-blue-50"
          >
            View All
          </Button>
        </div>
      </div>

      {/* Attendance Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {[
          {
            icon: todayRecord?.status === 'present' ? CheckCircle : XCircle,
            label: 'Status',
            value: todayRecord?.status === 'present' ? 'Present' : 'Not marked',
            bgColor: todayRecord?.status === 'present' ? 'bg-green-50' : 'bg-gray-50',
            color: todayRecord?.status === 'present' ? 'text-green-600' : 'text-gray-400'
          },
          {
            icon: Clock,
            label: 'Check In',
            value: todayRecord?.checkIn ? formatTime(todayRecord.checkIn) : 'Not checked in',
            bgColor: 'bg-blue-50',
            color: 'text-blue-600'
          },
          {
            icon: LogOut,
            label: 'Check Out',
            value: todayRecord?.checkOut ? formatTime(todayRecord.checkOut) : 'Not checked out',
            bgColor: 'bg-purple-50',
            color: 'text-purple-600'
          }
        ].map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className={`${stat.bgColor} rounded-lg p-3`}>
              <div className="flex items-center space-x-2 mb-1">
                <IconComponent className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs font-medium text-gray-700">{stat.label}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Additional Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Clock className="w-4 h-4 text-green-600" />
            <span className="text-xs font-medium text-gray-700">Total Hours</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">{todayRecord?.totalHours || 'In progress'}</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            {todayRecord?.workType === 'office' ? (
              <Building className="w-4 h-4 text-blue-600" />
            ) : todayRecord?.workType === 'wfh' ? (
              <HomeIcon className="w-4 h-4 text-green-600" />
            ) : (
              <MapPin className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-xs font-medium text-gray-700">Work Type</span>
          </div>
          <p className="text-sm font-semibold text-gray-900">
            {todayRecord?.workType === 'office' ? 'Office' :
             todayRecord?.workType === 'wfh' ? 'Work from Home' :
             'Not marked yet'}
          </p>
        </div>
      </div>

      {/* Action Buttons - 50/50 Layout */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Action Button Section */}
        <div className="flex">
          {todayRecord?.status === 'present' && !todayRecord.checkOut ? (
            <Button
              onClick={handleClockOut}
              disabled={clockOutLoading}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center justify-center space-x-2 w-full py-3"
            >
              <LogOut className="w-4 h-4" />
              <span>{clockOutLoading ? 'Clocking Out...' : 'Clock Out'}</span>
            </Button>
          ) : todayRecord?.checkOut ? (
            <div className="flex items-center justify-center space-x-2 text-green-600 bg-green-50 px-4 py-3 rounded-lg w-full">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Clocked out at {formatTime(todayRecord.checkOut)}</span>
            </div>
          ) : (
            <Button
              onClick={() => setActiveTab('attendance')}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center space-x-2 w-full py-3"
            >
              <Clock className="w-4 h-4" />
              <span>Mark Attendance</span>
            </Button>
          )}
        </div>

        {/* Monthly Stats Section */}
        <div className="flex items-center justify-center space-x-6 text-sm text-gray-600 bg-blue-50 px-4 py-3 rounded-lg">
          <div className="text-center">
            <div className="font-bold text-blue-900 text-lg">{attendanceStats.thisMonth.present}/{attendanceStats.thisMonth.total}</div>
            <div className="text-xs">This Month</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-blue-900 text-lg">{attendanceStats.thisMonth.rate}%</div>
            <div className="text-xs">Attendance</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const ComprehensiveDashboard = ({ user, onTabChange }) => {
  // State
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({ total: 0, completed: 0, pending: 0, overdue: 0 });
  // Removed attendance states - now handled by PersonalAttendanceWidget
  const [expandedTasks, setExpandedTasks] = useState({});

  // Load dashboard data
  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      // Load tasks only (attendance handled by PersonalAttendanceWidget)
      const tasksResponse = await fetch(`/api/tasks?user=${user.username}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Process tasks
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        if (tasksData.success) {
          setTasks(tasksData.tasks || []);

          const taskSummary = {
            total: tasksData.tasks?.length || 0,
            completed: tasksData.tasks?.filter(t => t.status === 'done').length || 0,
            pending: tasksData.tasks?.filter(t => t.status === 'pending').length || 0,
            overdue: tasksData.tasks?.filter(t => isOverdue(t)).length || 0
          };
          setSummary(taskSummary);
        }
      }

      // Attendance processing removed - handled by PersonalAttendanceWidget

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.username) {
      loadDashboardData();
    }
  }, [user?.username]);

  // Helper functions
  const isOverdue = (task) => {
    if (!task.deadline) return false;
    const today = new Date();
    const deadline = new Date(task.deadline);
    return deadline < today && task.status !== 'done';
  };

  const needsExpansion = (text) => text && text.length > 100;

  const truncateText = (text, length = 100) => {
    return text.length > length ? text.substring(0, length) + '...' : text;
  };

  const toggleTaskExpansion = (taskId) => {
    setExpandedTasks(prev => ({
      ...prev,
      [taskId]: !prev[taskId]
    }));
  };

  const formatTime = (time) => {
    if (!time) return '';
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Stats cards configuration
  const statsCards = [
    {
      label: 'Total Tasks',
      value: summary.total,
      icon: ClipboardList,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    {
      label: 'Completed',
      value: summary.completed,
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    {
      label: 'Pending',
      value: summary.pending,
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-50'
    },
    {
      label: 'Overdue',
      value: summary.overdue,
      icon: AlertTriangle,
      color: 'text-red-600',
      bg: 'bg-red-50'
    }
  ];

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-4 lg:space-y-6 px-3 sm:px-4 lg:px-6 py-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h2 className="text-xl lg:text-2xl font-bold text-black">Dashboard</h2>
        <Button
          onClick={loadDashboardData}
          variant="outline"
          size="sm"
          className="flex items-center space-x-2 w-fit"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={`${stat.bg} border border-gray-100 rounded-lg p-4 lg:p-6 hover:shadow-md transition-shadow`}>
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

      {/* Personal Attendance Widget */}
      <PersonalAttendanceWidget user={user} setActiveTab={onTabChange} />

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
          </div>
        </div>
      )}

      {/* Recent Tasks */}
      <div className="bg-white border border-gray-100 rounded-lg">
        <div className="p-4 lg:p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h3 className="text-base lg:text-lg font-semibold text-black">Recent Tasks</h3>
          </div>
        </div>
        <div className="p-4 lg:p-6">
          {tasks.slice(0, 5).length > 0 ? (
            <div className="space-y-3">
              {tasks.slice(0, 5).map((task, index) => {
                const overdue = isOverdue(task);
                return (
                  <div key={index} className={`flex items-center justify-between p-3 lg:p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors ${overdue ? 'border-red-200 bg-red-50' : ''}`}>
                    <div className="flex-1 min-w-0">
                      {needsExpansion(task.task) ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <h4 className="font-medium text-black text-sm flex-1 break-words">
                              {expandedTasks[task.id] ? task.task : truncateText(task.task)}
                            </h4>
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
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize
                        ${task.priority === 'high' ? 'bg-red-100 text-red-800' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize
                        ${task.status === 'pending' ? 'bg-orange-100 text-orange-800' :
                          task.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                          task.status === 'done' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'}`}>
                        {task.status === 'in-progress' ? 'In Progress' : task.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No tasks available</p>
          )}
        </div>
      </div>
    </div>
  );
};

// Attendance Widget Component - REMOVED
// This simple attendance widget was removed to avoid duplication with PersonalAttendanceWidget

// Loading Skeleton
const LoadingSkeleton = () => (
  <div className="space-y-6 px-3 sm:px-4 lg:px-6 py-3">
    <div className="flex justify-between items-center">
      <div className="h-8 bg-gray-200 rounded w-48 animate-pulse"></div>
      <div className="h-9 bg-gray-200 rounded w-20 animate-pulse"></div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-gray-50 p-4 rounded-lg border">
          <div className="h-4 bg-gray-200 rounded w-16 mb-2 animate-pulse"></div>
          <div className="h-6 bg-gray-200 rounded w-8 animate-pulse"></div>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-gray-50 p-4 rounded-lg border h-32 animate-pulse"></div>
      <div className="bg-gray-50 p-4 rounded-lg border h-32 animate-pulse"></div>
    </div>

    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="h-96 bg-gray-100 rounded animate-pulse"></div>
    </div>
  </div>
);

export default ComprehensiveDashboard;