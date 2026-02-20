// pages/api/tasks/[id]/comments.js - Task comments API
import { requireAuth } from '../../../../lib/auth.js';
import { addTaskComment, getTaskComments, editTaskComment, deleteTaskComment } from '../../../../lib/firebaseService.js';

async function handler(req, res) {
  // Multi-tenancy: Extract tenantId from authenticated request
  const { tenantId } = req;
  const { id: taskId } = req.query;

  if (!taskId) {
    return res.status(400).json({ success: false, message: 'Task ID is required' });
  }

  try {
    if (req.method === 'GET') {
      // Get task comments
      const result = await getTaskComments(taskId, tenantId);
      return res.status(200).json(result);
    }

    if (req.method === 'POST') {
      // Add new comment
      const { content } = req.body;

      if (!content || !content.trim()) {
        return res.status(400).json({ success: false, message: 'Comment content is required' });
      }

      const commentData = {
        author: req.user.username,
        authorRole: req.user.role,
        content: content.trim()
      };

      const result = await addTaskComment(taskId, commentData, tenantId);
      return res.status(201).json(result);
    }

    if (req.method === 'PUT') {
      // Edit comment
      const { commentId, content } = req.body;

      if (!commentId || !content || !content.trim()) {
        return res.status(400).json({ success: false, message: 'Comment ID and content are required' });
      }

      const result = await editTaskComment(taskId, commentId, content.trim(), req.user.username, tenantId);
      return res.status(200).json(result);
    }

    if (req.method === 'DELETE') {
      // Delete comment
      const { commentId } = req.body;

      if (!commentId) {
        return res.status(400).json({ success: false, message: 'Comment ID is required' });
      }

      const result = await deleteTaskComment(taskId, commentId, req.user.username, tenantId);
      return res.status(200).json(result);
    }

    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Task comments API error:', error);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Internal server error' 
    });
  }
}

export default requireAuth(handler);