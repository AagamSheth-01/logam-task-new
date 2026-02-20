import { requireAuth } from '../../../../lib/auth.js';
import { getGraphicDesignerAnalytics } from '../../../../lib/firebaseService.js';

async function handler(req, res) {
  const { username } = req.query;

  // Multi-tenancy: Extract tenantId from authenticated request
  const { tenantId } = req;

  if (req.method === 'GET') {
    try {
      // Check if user can access this data (own data or admin)
      if (req.user.username !== username && req.user.role?.toLowerCase() !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'You can only access your own analytics'
        });
      }

      const analytics = await getGraphicDesignerAnalytics(username, tenantId);

      return res.status(200).json({
        success: true,
        analytics
      });
    } catch (error) {
      console.error('Error getting graphics analytics:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to load analytics'
      });
    }
  }

  return res.status(405).json({ success: false, message: 'Method not allowed' });
}

export default requireAuth(handler);