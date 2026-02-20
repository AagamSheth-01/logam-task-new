// pages/api/files/recent.js - API endpoint for getting recent files
import { requireAuth } from '../../../lib/auth.js';
import { getFiles } from '../../../lib/firebaseService.js';

async function handler(req, res) {
  console.log('🔐 Incoming request to /api/files/recent');
  console.log('🔐 Authenticated user:', req.user);

  // Multi-tenancy: Extract tenantId from authenticated request
  const { tenantId } = req;

  if (req.method === 'GET') {
    try {
      const { limit = 20, type } = req.query;

      // Build filters
      const filters = { tenantId };

      // Filter by type if specified
      if (type && type !== 'all') {
        filters.type = type;
      }

      // For non-admin users, only show files they uploaded
      if (req.user.role?.toLowerCase() !== 'admin') {
        filters.uploadedBy = req.user.username;
      }

      // Get files from Firebase
      const allFiles = await getFiles(filters);
      
      // Sort by upload date (most recent first) and limit
      const recentFiles = allFiles
        .sort((a, b) => {
          const aDate = a.uploadedAt?.toDate?.() || new Date(a.uploadedAt || 0);
          const bDate = b.uploadedAt?.toDate?.() || new Date(b.uploadedAt || 0);
          return bDate - aDate;
        })
        .slice(0, parseInt(limit));
      
      return res.status(200).json({ 
        success: true, 
        files: recentFiles,
        count: recentFiles.length,
        total: allFiles.length
      });
      
    } catch (error) {
      console.error('❌ Error loading recent files:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to load recent files',
        error: error.message 
      });
    }
  }

  return res.status(405).json({ 
    success: false, 
    message: 'Method not allowed' 
  });
}

export default requireAuth(handler);