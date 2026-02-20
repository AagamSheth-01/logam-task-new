// pages/api/performance.js - Clean version without debug statements
import { requireAuth } from '../../../lib/auth.js';
import { getUserPerformanceSummary, loadTasks, loadUsers } from '../../../lib/firebaseService.js';


async function handler(req, res) {
  // Multi-tenancy: Extract tenantId from authenticated request
  const { tenantId } = req;

  if (req.method === 'GET') {
    try {
      const performance = await getUserPerformanceSummary({ tenantId });
      
      return res.status(200).json({ 
        success: true, 
        performance 
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to generate performance report',
        error: error.message 
      });
    }
  }

  if (req.method === 'POST') {
    try {
      // Generate comprehensive report
      const [tasks, users, performance] = await Promise.all([
        loadTasks({ tenantId }),
        loadUsers({ tenantId }),
        getUserPerformanceSummary({ tenantId })
      ]);
      
      // Calculate additional metrics
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.status === 'done').length;
      const pendingTasks = totalTasks - completedTasks;
      const overdueTasks = tasks.filter(t => {
        if (t.status === 'pending' && t.deadline) {
          try {
            return new Date(t.deadline) < new Date();
          } catch (dateError) {
            return false;
          }
        }
        return false;
      }).length;
      
      // User statistics
      const userStats = users.map(user => {
        const userTasks = tasks.filter(t => t.assigned_to === user.username);
        const userCompleted = userTasks.filter(t => t.status === 'done').length;
        
        return {
          username: user.username,
          role: user.role,
          email: user.email,
          totalTasks: userTasks.length,
          completedTasks: userCompleted,
          completionRate: userTasks.length > 0 ? Math.round((userCompleted / userTasks.length) * 100) : 0
        };
      });
      
      const reportData = {
        generated_on: new Date().toISOString(),
        generated_by: req.user.username,
        summary: {
          totalTasks,
          completedTasks,
          pendingTasks,
          overdueTasks,
          totalUsers: users.length,
          overallCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
        },
        userStatistics: userStats,
        performance,
        taskBreakdown: {
          byPriority: {
            high: tasks.filter(t => t.priority === 'High').length,
            medium: tasks.filter(t => t.priority === 'Medium').length,
            low: tasks.filter(t => t.priority === 'Low').length
          },
          byStatus: {
            done: completedTasks,
            pending: pendingTasks,
            overdue: overdueTasks
          }
        }
      };
      
      return res.status(200).json({ 
        success: true, 
        data: reportData,
        message: 'Performance report generated successfully'
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to generate performance report',
        error: error.message 
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

export default requireAuth(handler);