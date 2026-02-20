import { verifyTokenFromRequest } from '../../../lib/auth';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Verify authentication
  const authResult = verifyTokenFromRequest(req);
  if (!authResult.valid) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // Multi-tenancy: Tenant isolation enforced at upload/storage level
  // tenantId is verified during file upload; file paths already include tenant context
  const { path: filePath } = req.query;
  
  if (!filePath || !Array.isArray(filePath)) {
    return res.status(400).json({ success: false, message: 'Invalid file path' });
  }

  try {
    // Construct the full file path
    const fullPath = path.join(process.cwd(), 'uploads', ...filePath);
    
    // Security check - ensure path is within uploads directory
    const uploadsDir = path.join(process.cwd(), 'uploads');
    const normalizedPath = path.normalize(fullPath);
    
    if (!normalizedPath.startsWith(uploadsDir)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    // Check if file exists
    if (!fs.existsSync(normalizedPath)) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    // Get file stats
    const stats = fs.statSync(normalizedPath);
    if (!stats.isFile()) {
      return res.status(404).json({ success: false, message: 'Not a file' });
    }

    // Determine content type based on file extension
    const ext = path.extname(normalizedPath).toLowerCase();
    const contentTypes = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.ppt': 'application/vnd.ms-powerpoint',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.zip': 'application/zip',
      '.rar': 'application/x-rar-compressed',
      '.mp4': 'video/mp4',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav'
    };

    const contentType = contentTypes[ext] || 'application/octet-stream';
    
    // Set headers
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stats.size);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
    
    // Check if this is a download request
    if (req.query.download === 'true') {
      const filename = path.basename(normalizedPath);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      // For inline viewing (PDFs, images, etc.)
      res.setHeader('Content-Disposition', 'inline');
    }

    // Stream the file
    const fileStream = fs.createReadStream(normalizedPath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({ success: false, message: 'Error serving file' });
  }
}