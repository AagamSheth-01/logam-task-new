import { verifyTokenFromRequest } from '../../../../lib/auth';
import { getClientById, getClientTasks } from '../../../../lib/firebaseService';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Verify authentication
  const authResult = verifyTokenFromRequest(req);
  if (!authResult.valid) {
    return res.status(401).json({ success: false, message: authResult.message || 'Unauthorized' });
  }

  // Multi-tenancy: Extract tenantId from authenticated request
  const { tenantId } = authResult;
  const { id } = req.query;

  if (!id) {
    return res.status(400).json({ success: false, message: 'Client ID is required' });
  }

  try {
    // Verify client exists
    const client = await getClientById(id, tenantId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Get client tasks
    const tasks = await getClientTasks(client.name, tenantId);

    res.status(200).json({
      success: true,
      tasks: tasks,
      total: tasks.length
    });

  } catch (error) {
    console.error('Error getting client tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load client tasks'
    });
  }
}