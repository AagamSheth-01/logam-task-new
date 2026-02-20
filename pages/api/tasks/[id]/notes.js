// pages/api/tasks/[id]/notes.js - Task notes API
import { requireAuth } from '../../../../lib/auth.js';
import { updateTaskNotes, getTaskById } from '../../../../lib/firebaseService.js';

async function handler(req, res) {
  // Multi-tenancy: Extract tenantId from authenticated request
  const { tenantId } = req;
  const { id: taskId } = req.query;

  if (!taskId) {
    return res.status(400).json({ success: false, message: 'Task ID is required' });
  }

  try {
    if (req.method === 'GET') {
      // Get task notes
      const task = await getTaskById(taskId, tenantId);

      if (!task) {
        return res.status(404).json({ success: false, message: 'Task not found' });
      }

      // Return notes based on user permissions
      const notes = {
        assignerNotes: task.assignerNotes || '',
        personalNotes: req.user.username === task.assigned_to ? (task.personalNotes || '') : null,
        assignerPrivateNotes: req.user.username === task.given_by ? (task.assignerPrivateNotes || '') : null
      };

      return res.status(200).json({ success: true, notes });
    }

    if (req.method === 'PUT') {
      // Update task notes
      const notesData = req.body;

      if (!notesData || Object.keys(notesData).length === 0) {
        return res.status(400).json({ success: false, message: 'Notes data is required' });
      }

      const result = await updateTaskNotes(taskId, notesData, req.user.username, tenantId);
      return res.status(200).json(result);
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Task notes API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
}

export default requireAuth(handler);