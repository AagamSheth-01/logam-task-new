// pages/api/dashboard.js - Clean version without debug statements
import { requireAuth } from '../../../lib/auth.js';
import { getDashboardSummary, getUserPerformanceSummary } from '../../../lib/firebaseService.js';


async function handler(req, res) {
  // Multi-tenancy: Extract tenantId from authenticated request
  const { tenantId } = req;

  if (req.method === 'GET') {
    try {
      // Get basic dashboard summary
      const summary = await getDashboardSummary(null, tenantId);

      // Get user performance data if admin
      let performance = {};
      if (req.user.role?.toLowerCase() === 'admin') {
        performance = await getUserPerformanceSummary(tenantId);
      }
      
      return res.status(200).json({ 
        success: true, 
        summary,
        performance
      });
    } catch (error) {
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to load dashboard summary',
        error: error.message 
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

export default requireAuth(handler);