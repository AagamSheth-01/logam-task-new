import { verifyTokenFromRequest } from '../../../lib/auth';
import { 
  getClientsWithData, 
  addClient, 
  searchClients,
  getClientAnalytics 
} from '../../../lib/firebaseService';

export default async function handler(req, res) {
  // Verify authentication
  const authResult = verifyTokenFromRequest(req);
  if (!authResult.valid) {
    return res.status(401).json({ success: false, message: authResult.message || 'Unauthorized' });
  }

  // Multi-tenancy: Extract tenantId from authenticated request
  const { user, tenantId } = authResult;

  try {
    switch (req.method) {
      case 'GET':
        await handleGetClients(req, res, user, tenantId);
        break;
      case 'POST':
        await handleCreateClient(req, res, user, tenantId);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Client API error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}

async function handleGetClients(req, res, user, tenantId) {
  try {
    const { search, status, priority, industry, analytics } = req.query;

    if (analytics === 'true') {
      const analyticsData = await getClientAnalytics(tenantId);
      return res.status(200).json({
        success: true,
        analytics: analyticsData
      });
    }

    let clients;

    if (search || status || priority || industry) {
      // Search with filters
      const filters = { tenantId };
      if (status && status !== 'all') filters.status = status;
      if (priority && priority !== 'all') filters.priority = priority;
      if (industry && industry !== 'all') filters.industry = industry;

      clients = await searchClients(search || '', filters);
    } else {
      // Get all clients with enhanced data
      clients = await getClientsWithData(tenantId);
    }

    // Show all clients for admin users, or only assigned clients for regular users
    let filteredClients = clients;
    
    if (user.role?.toLowerCase() !== 'admin') {
      const assignedClients = [];
      
      for (const client of clients) {
        try {
          // Check if user is assigned to this client
          const { adminDb } = require('../../../lib/firebase-admin');
          const userAssignmentQuery = await adminDb
            .collection('client_users')
            .where('clientId', '==', client.id)
            .where('username', '==', user.username)
            .where('isActive', '==', true)
            .get();

          if (!userAssignmentQuery.empty) {
            assignedClients.push(client);
          }
        } catch (error) {
          console.error(`Error checking assignment for client ${client.id}:`, error);
          // Continue with other clients
        }
      }
      
      filteredClients = assignedClients;
    }

    res.status(200).json({ 
      success: true, 
      clients: filteredClients,
      total: filteredClients.length
    });
  } catch (error) {
    console.error('Error getting clients:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load clients' 
    });
  }
}

async function handleCreateClient(req, res, user, tenantId) {
  try {
    // Validate required fields
    const { name, email } = req.body;
    
    if (!name || !email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Client name and email are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide a valid email address' 
      });
    }

    // Prepare client data
    const clientData = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: req.body.phone?.trim() || '',
      website: req.body.website?.trim() || '',
      address: req.body.address?.trim() || '',
      industry: req.body.industry?.trim() || '',
      status: req.body.status || 'Active',
      priority: req.body.priority || 'Medium',
      description: req.body.description?.trim() || '',
      contractValue: req.body.contractValue?.trim() || '',
      contractStart: req.body.contractStart || '',
      contractEnd: req.body.contractEnd || '',
      timezone: req.body.timezone?.trim() || '',
      preferredContact: req.body.preferredContact || 'email',
      tags: req.body.tags || [],
      notes: req.body.notes?.trim() || '',
      assignedUsers: req.body.assignedUsers || [],
      createdBy: user.username
    };

    // Add social media fields
    if (req.body.facebook) clientData.facebook = req.body.facebook.trim();
    if (req.body.instagram) clientData.instagram = req.body.instagram.trim();
    if (req.body.twitter) clientData.twitter = req.body.twitter.trim();
    if (req.body.linkedin) clientData.linkedin = req.body.linkedin.trim();
    if (req.body.youtube) clientData.youtube = req.body.youtube.trim();

    const newClient = await addClient(clientData, tenantId);

    res.status(201).json({
      success: true,
      client: newClient,
      message: 'Client created successfully'
    });
  } catch (error) {
    console.error('Error creating client:', error);
    
    if (error.message.includes('already exists')) {
      res.status(409).json({ 
        success: false, 
        message: error.message 
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to create client' 
      });
    }
  }
}