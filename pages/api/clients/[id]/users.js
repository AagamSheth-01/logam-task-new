import { verifyTokenFromRequest } from '../../../../lib/auth';
import { 
  getClientById, 
  getUserByUsername,
  logActivity 
} from '../../../../lib/firebaseService';
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
  const { id: clientId } = req.query;

  if (!clientId) {
    return res.status(400).json({ success: false, message: 'Client ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGetClientUsers(req, res, clientId, user, tenantId);
        break;
      case 'POST':
        await handleAssignUsersToClient(req, res, clientId, user, tenantId);
        break;
      case 'DELETE':
        await handleRemoveUserFromClient(req, res, clientId, user, tenantId);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Client users API error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}

// Get all users assigned to a client
async function handleGetClientUsers(req, res, clientId, user, tenantId) {
  try {
    // Verify client exists
    const client = await getClientById(clientId, tenantId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Get assigned users from client_users collection
    const clientUsersSnapshot = await adminDb
      .collection('client_users')
      .where('tenantId', '==', tenantId)
      .where('clientId', '==', clientId)
      .where('isActive', '==', true)
      .get();

    const assignedUsers = [];
    for (const doc of clientUsersSnapshot.docs) {
      const clientUserData = doc.data();
      
      // Get full user details
      const userData = await getUserByUsername(clientUserData.username, tenantId);
      if (userData) {
        assignedUsers.push({
          id: doc.id,
          username: clientUserData.username,
          role: clientUserData.role,
          permissions: clientUserData.permissions,
          assignedAt: clientUserData.assignedAt,
          assignedBy: clientUserData.assignedBy,
          userDetails: {
            email: userData.email,
            role: userData.role
          }
        });
      }
    }

    res.status(200).json({ 
      success: true, 
      assignedUsers,
      clientName: client.name,
      total: assignedUsers.length
    });
  } catch (error) {
    console.error('Error getting client users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load assigned users' 
    });
  }
}

// Assign users to a client
async function handleAssignUsersToClient(req, res, clientId, user, tenantId) {
  try {
    const { usernames, role = 'secondary', permissions = ['view'] } = req.body;

    if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one username is required'
      });
    }

    // Verify client exists
    const client = await getClientById(clientId, tenantId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Validate role
    const validRoles = ['primary', 'secondary', 'viewer'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid role. Must be: primary, secondary, or viewer' 
      });
    }

    // Validate permissions
    const validPermissions = ['view', 'edit', 'files', 'calendar', 'meetings'];
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Invalid permissions: ${invalidPermissions.join(', ')}` 
      });
    }

    const assignmentResults = [];
    const errors = [];

    for (const username of usernames) {
      try {
        // Verify user exists
        const userData = await getUserByUsername(username.trim(), tenantId);
        if (!userData) {
          errors.push(`User '${username}' not found`);
          continue;
        }

        // Check if user is already assigned to this client
        const existingAssignment = await adminDb
          .collection('client_users')
          .where('tenantId', '==', tenantId)
          .where('clientId', '==', clientId)
          .where('username', '==', username.trim())
          .where('isActive', '==', true)
          .limit(1)
          .get();

        if (!existingAssignment.empty) {
          errors.push(`User '${username}' is already assigned to this client`);
          continue;
        }

        // Create assignment
        const assignmentData = {
          tenantId: tenantId,
          clientId: clientId,
          username: username.trim(),
          role: role,
          permissions: permissions,
          assignedAt: admin.firestore.FieldValue.serverTimestamp(),
          assignedBy: user.username,
          isActive: true
        };

        const assignmentDoc = await adminDb.collection('client_users').add(assignmentData);

        assignmentResults.push({
          id: assignmentDoc.id,
          username: username.trim(),
          role: role,
          permissions: permissions,
          userEmail: userData.email
        });

        // Log activity
        await logActivity({
          action: 'user_assigned_to_client',
          clientId: clientId,
          userId: user.username,
          details: {
            assignedUser: username.trim(),
            clientName: client.name,
            role: role,
            permissions: permissions
          }
        }, tenantId);

      } catch (userError) {
        console.error(`Error assigning user ${username}:`, userError);
        errors.push(`Failed to assign user '${username}': ${userError.message}`);
      }
    }

    // Update client's assignedUsers array for backward compatibility
    try {
      const currentAssignedUsers = client.assignedUsers || [];
      const newUsernames = assignmentResults.map(r => r.username);
      const updatedAssignedUsers = [...new Set([...currentAssignedUsers, ...newUsernames])];

      await adminDb.collection('clients').doc(clientId).update({
        assignedUsers: updatedAssignedUsers,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (updateError) {
      console.warn('Failed to update client assignedUsers array:', updateError);
    }

    const response = {
      success: true,
      message: `Successfully assigned ${assignmentResults.length} user(s) to client`,
      assignedUsers: assignmentResults
    };

    if (errors.length > 0) {
      response.warnings = errors;
    }

    res.status(201).json(response);

  } catch (error) {
    console.error('Error assigning users to client:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to assign users to client' 
    });
  }
}

// Remove a user from a client
async function handleRemoveUserFromClient(req, res, clientId, user, tenantId) {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required for removal'
      });
    }

    // Verify client exists
    const client = await getClientById(clientId, tenantId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Find the assignment
    const assignmentQuery = await adminDb
      .collection('client_users')
      .where('tenantId', '==', tenantId)
      .where('clientId', '==', clientId)
      .where('username', '==', username)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (assignmentQuery.empty) {
      return res.status(404).json({ 
        success: false, 
        message: 'User assignment not found' 
      });
    }

    const assignmentDoc = assignmentQuery.docs[0];
    const assignmentData = assignmentDoc.data();

    // Deactivate the assignment (soft delete)
    await assignmentDoc.ref.update({
      isActive: false,
      removedAt: admin.firestore.FieldValue.serverTimestamp(),
      removedBy: user.username
    });

    // Update client's assignedUsers array for backward compatibility
    try {
      const currentAssignedUsers = client.assignedUsers || [];
      const updatedAssignedUsers = currentAssignedUsers.filter(u => u !== username);

      await adminDb.collection('clients').doc(clientId).update({
        assignedUsers: updatedAssignedUsers,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (updateError) {
      console.warn('Failed to update client assignedUsers array:', updateError);
    }

    // Log activity
    await logActivity({
      action: 'user_removed_from_client',
      clientId: clientId,
      userId: user.username,
      details: {
        removedUser: username,
        clientName: client.name,
        previousRole: assignmentData.role
      }
    }, tenantId);

    res.status(200).json({ 
      success: true, 
      message: `User '${username}' removed from client successfully` 
    });

  } catch (error) {
    console.error('Error removing user from client:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove user from client' 
    });
  }
}