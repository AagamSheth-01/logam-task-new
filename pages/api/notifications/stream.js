// Real-time notification stream using Server-Sent Events
import { verifyTokenFromRequest } from '../../../lib/auth';
import { adminDb } from '../../../lib/firebase-admin';

// Keep track of active connections
const connections = new Map();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get token from query params (EventSource doesn't support custom headers)
  const { token, user: targetUser } = req.query;

  // Verify authentication
  let authResult;
  if (token) {
    // Verify token from query param
    const jwt = require('jsonwebtoken');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      authResult = { valid: true, user: decoded, tenantId: decoded.tenantId };
    } catch (error) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  } else {
    // Fallback to header-based auth
    authResult = verifyTokenFromRequest(req);
    if (!authResult.valid) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  // Multi-tenancy: Extract tenantId from authenticated request
  const { user, tenantId } = authResult;

  // Check if user is requesting their own notifications or if they're admin
  if (user.username !== targetUser && user.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  // Set up Server-Sent Events
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  const clientId = `${targetUser}-${Date.now()}`;

  // Store connection
  connections.set(clientId, {
    res,
    username: targetUser,
    role: user.role,
    lastHeartbeat: Date.now()
  });

  // Send initial connection confirmation
  res.write(`data: ${JSON.stringify({
    type: 'connection',
    title: 'Connected',
    message: 'Real-time notifications enabled',
    timestamp: new Date().toISOString()
  })}\n\n`);

  // Set up heartbeat to keep connection alive
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      })}\n\n`);
      
      // Update last heartbeat
      const connection = connections.get(clientId);
      if (connection) {
        connection.lastHeartbeat = Date.now();
      }
    } catch (error) {
      cleanup();
    }
  }, 30000); // Send heartbeat every 30 seconds

  // Cleanup function
  const cleanup = () => {
    clearInterval(heartbeatInterval);
    connections.delete(clientId);
    
    try {
      res.end();
    } catch (error) {
      // Silent error handling
    }
  };

  // Handle client disconnect
  req.on('close', cleanup);
  req.on('error', cleanup);
  res.on('close', cleanup);

  // Set up Firebase real-time listeners for different notification types

  // Note: Task assignments, completions, and updates are handled via broadcastNotification()
  // in the API endpoints to avoid duplicates. We only use Firebase listeners for:
  // - Deadline reminders (scheduled via cron)
  // - Task comments (if implemented)
  // - System notifications

  // 1. Task comments (currently unused but ready for future implementation)
  const taskCommentsUnsubscribe = adminDb
    .collectionGroup('comments')
    .where('mentions', 'array-contains', targetUser)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const comment = { id: change.doc.id, ...change.doc.data() };

          // Only send notification for new comments (not on initial load)
          if (comment.timestamp &&
              (Date.now() - new Date(comment.timestamp).getTime()) < 60000) {
            sendNotification(clientId, {
              type: 'task_comment',
              title: 'New Comment',
              message: `${comment.author} mentioned you in a comment`,
              timestamp: new Date().toISOString(),
              data: {
                commentId: comment.id,
                taskId: comment.taskId,
                author: comment.author,
                content: comment.content.substring(0, 100) + '...'
              }
            });
          }
        }
      });
    });

  // 2. Deadline reminders
  const reminderUnsubscribe = adminDb
    .collection('reminders')
    .where('tenantId', '==', tenantId)
    .where('username', '==', targetUser)
    .where('sent', '==', false)
    .onSnapshot((snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const reminder = { id: change.doc.id, ...change.doc.data() };
          
          sendNotification(clientId, {
            type: 'deadline_reminder',
            title: 'Deadline Reminder',
            message: `Task "${reminder.taskName}" is due ${reminder.timeUntilDeadline}`,
            timestamp: new Date().toISOString(),
            data: {
              taskId: reminder.taskId,
              deadline: reminder.deadline,
              priority: reminder.priority
            }
          });

          // Mark reminder as sent
          adminDb.collection('reminders').doc(reminder.id).update({ sent: true });
        }
      });
    });

  // 3. System notifications (admin only)
  let systemNotificationUnsubscribe = null;
  if (user.role?.toLowerCase() === 'admin') {
    systemNotificationUnsubscribe = adminDb
      .collection('system_notifications')
      .where('active', '==', true)
      .onSnapshot((snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const notification = { id: change.doc.id, ...change.doc.data() };
            
            sendNotification(clientId, {
              type: 'system',
              title: notification.title,
              message: notification.message,
              timestamp: new Date().toISOString(),
              data: notification.data || {}
            });
          }
        });
      });
  }

  // Store cleanup functions
  const connection = connections.get(clientId);
  if (connection) {
    connection.cleanup = () => {
      taskCommentsUnsubscribe();
      reminderUnsubscribe();
      if (systemNotificationUnsubscribe) {
        systemNotificationUnsubscribe();
      }
    };
  }

  // Keep the connection alive
  const keepAlive = setInterval(() => {
    const connection = connections.get(clientId);
    if (!connection) {
      clearInterval(keepAlive);
      return;
    }

    // Check if connection is stale (no heartbeat for 2 minutes)
    if (Date.now() - connection.lastHeartbeat > 120000) {
      cleanup();
      clearInterval(keepAlive);
    }
  }, 60000); // Check every minute

  // Cleanup when request ends
  req.on('close', () => {
    const connection = connections.get(clientId);
    if (connection?.cleanup) {
      connection.cleanup();
    }
    clearInterval(keepAlive);
  });
}

// Function to send notification to a specific client
function sendNotification(clientId, notification) {
  const connection = connections.get(clientId);
  if (connection) {
    try {
      connection.res.write(`data: ${JSON.stringify(notification)}\n\n`);
    } catch (error) {
      connections.delete(clientId);
    }
  }
}

// Function to broadcast notification to all connected clients
export function broadcastNotification(notification, filter = {}) {
  const { username, role } = filter;
  
  connections.forEach((connection, clientId) => {
    // Apply filters
    if (username && connection.username !== username) return;
    if (role && connection.role !== role) return;
    
    sendNotification(clientId, notification);
  });
}

// Function to get active connections count
export function getActiveConnections() {
  return {
    total: connections.size,
    byUser: Array.from(connections.values()).reduce((acc, conn) => {
      acc[conn.username] = (acc[conn.username] || 0) + 1;
      return acc;
    }, {})
  };
}

// Cleanup stale connections periodically
setInterval(() => {
  const now = Date.now();
  connections.forEach((connection, clientId) => {
    if (now - connection.lastHeartbeat > 300000) { // 5 minutes
      if (connection.cleanup) {
        connection.cleanup();
      }
      connections.delete(clientId);
    }
  });
}, 300000); // Run every 5 minutes