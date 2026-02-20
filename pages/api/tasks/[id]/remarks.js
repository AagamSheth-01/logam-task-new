// Task Remarks API - For assignees to add remarks to tasks
import { verifyTokenFromRequest } from '../../../../lib/auth';
import { adminDb } from '../../../../lib/firebase-admin';
import admin from 'firebase-admin';

export default async function handler(req, res) {
  // Verify authentication
  const authResult = verifyTokenFromRequest(req);
  if (!authResult.valid) {
    return res.status(401).json({ success: false, message: authResult.message || 'Unauthorized' });
  }

  // Multi-tenancy: Extract tenantId from authenticated request
  const { user, tenantId } = authResult;
  const { id: taskId } = req.query;

  if (!taskId) {
    return res.status(400).json({ success: false, message: 'Task ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGetTaskRemarks(req, res, taskId, user, tenantId);
        break;
      case 'POST':
        await handleAddTaskRemark(req, res, taskId, user, tenantId);
        break;
      case 'PUT':
        await handleUpdateTaskRemark(req, res, taskId, user, tenantId);
        break;
      case 'DELETE':
        await handleDeleteTaskRemark(req, res, taskId, user, tenantId);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
        res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Task remarks API error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}

// Get all remarks for a task
async function handleGetTaskRemarks(req, res, taskId, user, tenantId) {
  try {
    // Get the task first to check permissions
    const taskDoc = await adminDb.collection('tasks').doc(taskId).get();
    if (!taskDoc.exists) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const taskData = taskDoc.data();

    // Multi-tenancy: Verify task belongs to tenant
    if (tenantId && taskData.tenantId !== tenantId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Check if user has permission to view remarks
    const isAssignee = taskData.assigned_to === user.username;
    const isAssigner = taskData.given_by === user.username;
    const isAdmin = user.role?.toLowerCase() === 'admin';
    
    if (!isAssignee && !isAssigner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to view task remarks' });
    }

    // Get remarks for this task
    let remarksQuery = adminDb
      .collection('task_remarks')
      .where('taskId', '==', taskId);

    // Multi-tenancy: Filter by tenantId if provided
    if (tenantId) {
      remarksQuery = remarksQuery.where('tenantId', '==', tenantId);
    }

    const remarksSnapshot = await remarksQuery.orderBy('createdAt', 'desc').get();

    const remarks = [];
    remarksSnapshot.forEach(doc => {
      const remarkData = doc.data();
      remarks.push({
        id: doc.id,
        content: remarkData.content,
        author: remarkData.author,
        authorRole: remarkData.authorRole,
        createdAt: remarkData.createdAt,
        updatedAt: remarkData.updatedAt,
        isEdited: remarkData.isEdited || false
      });
    });

    res.status(200).json({
      success: true,
      remarks: remarks,
      taskInfo: {
        id: taskId,
        title: taskData.task,
        assignedTo: taskData.assigned_to,
        assignedBy: taskData.given_by,
        status: taskData.status
      }
    });
  } catch (error) {
    console.error('Error getting task remarks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load task remarks' 
    });
  }
}

// Add a new remark to a task
async function handleAddTaskRemark(req, res, taskId, user, tenantId) {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Remark content is required' });
    }

    if (content.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'Remark cannot exceed 2000 characters' });
    }

    // Get the task first to check permissions
    const taskDoc = await adminDb.collection('tasks').doc(taskId).get();
    if (!taskDoc.exists) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const taskData = taskDoc.data();

    // Multi-tenancy: Verify task belongs to tenant
    if (tenantId && taskData.tenantId !== tenantId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    
    // Check if user has permission to add remarks
    const isAssignee = taskData.assigned_to === user.username;
    const isAssigner = taskData.given_by === user.username;
    const isAdmin = user.role?.toLowerCase() === 'admin';
    
    if (!isAssignee && !isAssigner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to add remarks to this task' });
    }

    // Create the remark
    const remarkData = {
      taskId: taskId,
      tenantId: tenantId, // Multi-tenancy: Add tenantId to remark
      content: content.trim(),
      author: user.username,
      authorRole: user.role || 'user',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isEdited: false
    };

    const remarkDoc = await adminDb.collection('task_remarks').add(remarkData);

    // Update task with last remark info
    await adminDb.collection('tasks').doc(taskId).update({
      lastRemarkAt: admin.firestore.FieldValue.serverTimestamp(),
      lastRemarkBy: user.username,
      remarkCount: admin.firestore.FieldValue.increment(1)
    });

    res.status(201).json({
      success: true,
      message: 'Remark added successfully',
      remark: {
        id: remarkDoc.id,
        ...remarkData,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error adding task remark:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add task remark' 
    });
  }
}

// Update a remark
async function handleUpdateTaskRemark(req, res, taskId, user, tenantId) {
  try {
    const { remarkId, content } = req.body;

    if (!remarkId) {
      return res.status(400).json({ success: false, message: 'Remark ID is required' });
    }

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'Remark content is required' });
    }

    if (content.trim().length > 2000) {
      return res.status(400).json({ success: false, message: 'Remark cannot exceed 2000 characters' });
    }

    // Get the remark
    const remarkDoc = await adminDb.collection('task_remarks').doc(remarkId);
    const remarkSnapshot = await remarkDoc.get();

    if (!remarkSnapshot.exists) {
      return res.status(404).json({ success: false, message: 'Remark not found' });
    }

    const remarkData = remarkSnapshot.data();

    // Check if user owns this remark or is admin
    if (remarkData.author !== user.username && user.role?.toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to edit this remark' });
    }

    // Update the remark
    await remarkDoc.update({
      content: content.trim(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      isEdited: true
    });

    res.status(200).json({
      success: true,
      message: 'Remark updated successfully'
    });

  } catch (error) {
    console.error('Error updating task remark:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to update task remark' 
    });
  }
}

// Delete a remark
async function handleDeleteTaskRemark(req, res, taskId, user, tenantId) {
  try {
    const { remarkId } = req.query;

    if (!remarkId) {
      return res.status(400).json({ success: false, message: 'Remark ID is required' });
    }

    // Get the remark
    const remarkDoc = await adminDb.collection('task_remarks').doc(remarkId);
    const remarkSnapshot = await remarkDoc.get();

    if (!remarkSnapshot.exists) {
      return res.status(404).json({ success: false, message: 'Remark not found' });
    }

    const remarkData = remarkSnapshot.data();

    // Check if user owns this remark or is admin
    if (remarkData.author !== user.username && user.role?.toLowerCase() !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this remark' });
    }

    // Delete the remark
    await remarkDoc.delete();

    // Update task remark count
    await adminDb.collection('tasks').doc(taskId).update({
      remarkCount: admin.firestore.FieldValue.increment(-1)
    });

    res.status(200).json({
      success: true,
      message: 'Remark deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting task remark:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete task remark' 
    });
  }
}