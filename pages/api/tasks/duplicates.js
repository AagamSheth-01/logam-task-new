// pages/api/tasks/duplicates.js - API endpoint for handling duplicate tasks
import { requireAuth } from '../../../lib/auth.js';
import { 
  findAndCleanupDuplicates, 
  getDuplicateTaskStats, 
  checkForDuplicateTasks 
} from '../../../lib/firebaseService.js';

async function handler(req, res) {
  // Multi-tenancy: Extract tenantId from authenticated request
  const { tenantId } = req;

  console.log('🔐 Incoming request to /api/tasks/duplicates:', req.method);
  console.log('🔐 Authenticated user:', req.user);

  // Only allow admins to access this endpoint
  if (req.user.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }

  if (req.method === 'GET') {
    const { action } = req.query;

    try {
      if (action === 'stats') {
        // Get duplicate statistics
        const stats = await getDuplicateTaskStats(tenantId);
        return res.status(200).json({
          success: true,
          stats: stats
        });
      } else if (action === 'check') {
        // Check for duplicates of a specific task
        const { task, assigned_to, client_name, deadline, given_by } = req.query;

        if (!task || !assigned_to || !given_by) {
          return res.status(400).json({
            success: false,
            message: 'Missing required parameters: task, assigned_to, given_by'
          });
        }

        const duplicates = await checkForDuplicateTasks({
          task,
          assigned_to,
          client_name: client_name || '',
          deadline: deadline || '',
          given_by
        }, tenantId);

        return res.status(200).json({
          success: true,
          duplicates: duplicates,
          count: duplicates.length
        });
      } else {
        // Default: return stats
        const stats = await getDuplicateTaskStats(tenantId);
        return res.status(200).json({
          success: true,
          stats: stats
        });
      }
    } catch (error) {
      console.error('❌ Error handling duplicates GET request:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to process request',
        error: error.message 
      });
    }
  }

  if (req.method === 'POST') {
    const { action } = req.body;
    
    try {
      if (action === 'cleanup') {
        // Clean up duplicate tasks
        console.log('🧹 Starting duplicate cleanup...');

        const result = await findAndCleanupDuplicates(tenantId);

        return res.status(200).json({
          success: true,
          message: `Duplicate cleanup completed: ${result.duplicatesRemoved} duplicates removed`,
          result: result
        });
      } else {
        return res.status(400).json({
          success: false,
          message: 'Invalid action. Use "cleanup" to remove duplicates.'
        });
      }
    } catch (error) {
      console.error('❌ Error handling duplicates POST request:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to process request',
        error: error.message 
      });
    }
  }

  return res.status(405).json({ 
    success: false, 
    message: 'Method not allowed' 
  });
}

export default requireAuth(handler);