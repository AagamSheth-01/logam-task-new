import { verifyTokenFromRequest } from '../../../lib/auth';
import { 
  getClientById, 
  updateClient, 
  deleteClient, 
  getClientTasks,
  getClientActivities 
} from '../../../lib/firebaseService';

export default async function handler(req, res) {
  // Verify authentication
  const authResult = verifyTokenFromRequest(req);
  if (!authResult.valid) {
    return res.status(401).json({ success: false, message: authResult.message || 'Unauthorized' });
  }

  // Multi-tenancy: Extract tenantId from authenticated request
  const { user, tenantId } = authResult;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, message: 'Client ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGetClient(req, res, user, id, tenantId);
        break;
      case 'PUT':
        await handleUpdateClient(req, res, user, id, tenantId);
        break;
      case 'DELETE':
        await handleDeleteClient(req, res, user, id, tenantId);
        break;
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
        res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Client ID API error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}

async function handleGetClient(req, res, user, clientId, tenantId) {
  try {
    const { include } = req.query;

    const client = await getClientById(clientId, tenantId);

    if (!client) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    const result = { client };

    // Include additional data if requested
    if (include) {
      const includeFields = include.split(',');

      if (includeFields.includes('tasks')) {
        result.tasks = await getClientTasks(client.name, tenantId);
      }

      if (includeFields.includes('activities')) {
        result.activities = await getClientActivities(clientId, tenantId);
      }
    }

    res.status(200).json({ 
      success: true, 
      ...result
    });
  } catch (error) {
    console.error('Error getting client:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load client' 
    });
  }
}

async function handleUpdateClient(req, res, user, clientId, tenantId) {
  try {
    // Validate that client exists
    const existingClient = await getClientById(clientId, tenantId);
    if (!existingClient) {
      return res.status(404).json({
        success: false,
        message: 'Client not found'
      });
    }

    // Prepare update data
    const updateData = { ...req.body };
    
    // Add metadata
    updateData.updatedBy = user.username;
    
    // Clean up data
    if (updateData.name) updateData.name = updateData.name.trim();
    if (updateData.email) updateData.email = updateData.email.trim().toLowerCase();
    if (updateData.phone) updateData.phone = updateData.phone.trim();
    if (updateData.website) updateData.website = updateData.website.trim();
    
    // Validate email format if provided
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Please provide a valid email address' 
        });
      }
    }

    await updateClient(clientId, updateData, tenantId);

    res.status(200).json({
      success: true,
      message: 'Client updated successfully'
    });
  } catch (error) {
    console.error('Error updating client:', error);
    
    if (error.message.includes('already exists')) {
      res.status(409).json({ 
        success: false, 
        message: error.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to update client' 
      });
    }
  }
}

async function handleDeleteClient(req, res, user, clientId, tenantId) {
  try {
    // Check if user has permission to delete clients
    if (user.role?.toLowerCase() !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only administrators can delete clients'
      });
    }

    await deleteClient(clientId, tenantId);

    res.status(200).json({
      success: true,
      message: 'Client deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    
    if (error.message.includes('active tasks')) {
      res.status(409).json({ 
        success: false, 
        message: error.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to delete client' 
      });
    }
  }
}