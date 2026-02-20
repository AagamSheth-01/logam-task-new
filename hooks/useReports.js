/**
 * Reports Controller Hook
 * MVC Pattern implementation for reports and analytics
 */

import { useState, useCallback, useEffect, useMemo } from 'react';

const useReports = (user) => {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);

  // Fetch user's tasks for report generation
  const fetchUserTasks = useCallback(async () => {
    if (!user?.username) return;

    setLoading(true);
    setError(null);

    try {
      // Use direct fetch to get user tasks
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

  // Calculate task summary statistics
  const summary = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const pending = tasks.filter(t => t.status === 'pending').length;

    // Calculate overdue tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = tasks.filter(task => {
      if (task.status === 'done' || !task.deadline) return false;
      try {
        const deadline = new Date(task.deadline);
        deadline.setHours(0, 0, 0, 0);
        return deadline < today;
      } catch (e) {
        return false;
      }
    }).length;

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      pending,
      overdue,
      completionRate
    };
  }, [tasks]);

  // Calculate priority distribution
  const priorityDistribution = useMemo(() => {
    const priorities = ['High', 'Medium', 'Low'];

    return priorities.map(priority => {
      const count = tasks.filter(t => t.priority === priority).length;
      const percentage = summary.total > 0 ? Math.round((count / summary.total) * 100) : 0;

      return {
        priority,
        count,
        percentage
      };
    });
  }, [tasks, summary.total]);

  // Get recent completed tasks
  const recentActivity = useMemo(() => {
    return tasks
      .filter(t => t.status === 'done')
      .sort((a, b) => new Date(b.completed_at || b.updated_at) - new Date(a.completed_at || a.updated_at))
      .slice(0, 5)
      .map(task => ({
        ...task,
        completedDate: task.completed_at || task.updated_at
      }));
  }, [tasks]);

  // Calculate time-based analytics
  const timeAnalytics = useMemo(() => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const thisWeek = new Date(now.setDate(now.getDate() - now.getDay()));

    const thisMonthTasks = tasks.filter(t => {
      const createdAt = new Date(t.created_at);
      return createdAt >= thisMonth;
    });

    const thisWeekTasks = tasks.filter(t => {
      const createdAt = new Date(t.created_at);
      return createdAt >= thisWeek;
    });

    const lastMonthTasks = tasks.filter(t => {
      const createdAt = new Date(t.created_at);
      return createdAt >= lastMonth && createdAt < thisMonth;
    });

    return {
      thisMonth: {
        total: thisMonthTasks.length,
        completed: thisMonthTasks.filter(t => t.status === 'done').length
      },
      thisWeek: {
        total: thisWeekTasks.length,
        completed: thisWeekTasks.filter(t => t.status === 'done').length
      },
      lastMonth: {
        total: lastMonthTasks.length,
        completed: lastMonthTasks.filter(t => t.status === 'done').length
      }
    };
  }, [tasks]);

  // Generate detailed report
  const generateReport = useCallback(async () => {
    setGenerating(true);
    setError(null);

    try {
      // Prepare comprehensive report data
      const reportData = {
        user: {
          username: user.username,
          displayName: user.displayName || user.username
        },
        generatedAt: new Date().toISOString(),
        summary,
        priorityDistribution,
        timeAnalytics,
        recentActivity,
        tasks: tasks.map(task => ({
          id: task.id,
          title: task.task,
          status: task.status,
          priority: task.priority,
          deadline: task.deadline,
          created_at: task.created_at,
          completed_at: task.completed_at,
          client_name: task.client_name
        }))
      };

      // Create downloadable report
      const reportContent = `
# Personal Task Report
**Generated for:** ${reportData.user.displayName}
**Date:** ${new Date(reportData.generatedAt).toLocaleDateString()}

## Summary Statistics
- **Total Tasks:** ${reportData.summary.total}
- **Completed:** ${reportData.summary.completed}
- **Pending:** ${reportData.summary.pending}
- **Overdue:** ${reportData.summary.overdue}
- **Completion Rate:** ${reportData.summary.completionRate}%

## Priority Distribution
${reportData.priorityDistribution.map(p => `- **${p.priority}:** ${p.count} tasks (${p.percentage}%)`).join('\n')}

## Time-Based Analytics
### This Month
- Total: ${reportData.timeAnalytics.thisMonth.total}
- Completed: ${reportData.timeAnalytics.thisMonth.completed}

### This Week
- Total: ${reportData.timeAnalytics.thisWeek.total}
- Completed: ${reportData.timeAnalytics.thisWeek.completed}

## Recent Completed Tasks
${reportData.recentActivity.map(task => `- ${task.task} (${new Date(task.completedDate).toLocaleDateString()})`).join('\n')}

## Detailed Task List
${reportData.tasks.map(task =>
  `- **${task.title}** | Status: ${task.status} | Priority: ${task.priority || 'Normal'} | Deadline: ${task.deadline || 'No deadline'}`
).join('\n')}
      `;

      // Download the report
      const blob = new Blob([reportContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `task-report-${user.username}-${new Date().toISOString().split('T')[0]}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return reportData;
    } catch (err) {
      console.error('Failed to generate report:', err);
      setError(err.message || 'Failed to generate report');
      throw err;
    } finally {
      setGenerating(false);
    }
  }, [user, summary, priorityDistribution, timeAnalytics, recentActivity, tasks]);

  // Refresh data
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
    summary,
    priorityDistribution,
    recentActivity,
    timeAnalytics,
    tasks,

    // State
    loading,
    generating,
    error,

    // Actions
    generateReport,
    refresh
  };
};

export default useReports;