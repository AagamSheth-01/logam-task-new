import { verifyTokenFromRequest } from '../../../lib/auth';
import { getFileById, deleteFile } from '../../../lib/firebaseService';
import fs from 'fs';
import path from 'path';

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
    return res.status(400).json({ success: false, message: 'File ID is required' });
  }

  try {
    switch (req.method) {
      case 'GET':
        await handleGetFile(req, res, user, id, tenantId);
        break;
      case 'DELETE':
        await handleDeleteFile(req, res, user, id, tenantId);
        break;
      default:
        res.setHeader('Allow', ['GET', 'DELETE']);
        res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('File API error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
  }
}

async function handleGetFile(req, res, user, fileId, tenantId) {
  try {
    const file = await getFileById(fileId, tenantId);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    res.status(200).json({
      success: true,
      file: file
    });
  } catch (error) {
    console.error('Error getting file:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load file'
    });
  }
}

async function handleDeleteFile(req, res, user, fileId, tenantId) {
  try {
    // Get file info first
    const file = await getFileById(fileId, tenantId);

    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Check permissions - only admin or file uploader can delete
    if (user.role?.toLowerCase() !== 'admin' && user.username !== file.uploadedBy) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to delete this file' 
      });
    }

    // Delete file from filesystem
    const filePath = path.join('./public', file.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete file record from database
    await deleteFile(fileId, tenantId);

    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete file' 
    });
  }
}