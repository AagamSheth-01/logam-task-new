import { verifyTokenFromRequest } from '../../../../lib/auth';
import { getClientById, logActivity } from '../../../../lib/firebaseService';
import { adminDb } from '../../../../lib/firebase-admin';
import admin from 'firebase-admin';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// Helper function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Helper function to get file type from MIME type
const getFileTypeFromMime = (mimeType) => {
  if (!mimeType) return 'other';
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.includes('pdf')) return 'pdf';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('excel') || mimeType.includes('sheet')) return 'spreadsheet';
  if (mimeType.includes('powerpoint') || mimeType.includes('presentation')) return 'presentation';
  if (mimeType.includes('zip') || mimeType.includes('rar')) return 'archive';
  return 'other';
};

// Video compression function
const compressVideo = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    // Check if ffmpeg-static is available
    if (!ffmpegStatic) {
      console.error('ffmpeg-static not found, skipping compression');
      return reject(new Error('ffmpeg-static not available'));
    }

    ffmpeg(inputPath)
      .setFfmpegPath(ffmpegStatic)
      .outputOptions([
        '-c:v libx264',        // Use H.264 codec
        '-crf 28',             // Constant Rate Factor (23 is default, 28 is more compressed)
        '-preset medium',      // Encoding speed vs compression efficiency
        '-c:a aac',            // Audio codec
        '-b:a 128k',           // Audio bitrate
        '-movflags +faststart', // Web optimization
        '-vf scale=1280:720'   // Scale to 720p max
      ])
      .output(outputPath)
      .on('end', () => {
        console.log('Video compression completed successfully');
        resolve();
      })
      .on('error', (err) => {
        console.error('Video compression error:', err);
        reject(err);
      })
      .on('progress', (progress) => {
        console.log('Compression progress:', Math.round(progress.percent) + '%');
      })
      .run();
  });
};

// Disable body parsing to handle file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

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
        await handleGetClientFiles(req, res, clientId, user, tenantId);
        break;
      case 'POST':
        await handleUploadClientFile(req, res, clientId, user, tenantId);
        break;
      case 'DELETE':
        await handleDeleteClientFile(req, res, clientId, user, tenantId);
        break;
      default:
        res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
        res.status(405).json({ success: false, message: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Client files API error:', error);
    console.error('Error stack:', error.stack);
    console.error('Request method:', req.method);
    console.error('Request query:', req.query);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// Get all files for a client
async function handleGetClientFiles(req, res, clientId, user, tenantId) {
  try {
    console.log(`📁 Getting files for client: ${clientId}`);

    // Verify client exists
    const client = await getClientById(clientId, tenantId);
    if (!client) {
      console.log(`❌ Client not found: ${clientId}`);
      return res.status(404).json({ success: false, message: 'Client not found' });
    }
    
    console.log(`✅ Client found: ${client.name}`);

    const { category, status = 'active' } = req.query;

    let filesQuery = adminDb
      .collection('client_files')
      .where('tenantId', '==', tenantId)
      .where('clientId', '==', clientId)
      .where('status', '==', status);

    if (category && category !== 'all') {
      filesQuery = filesQuery.where('category', '==', category);
    }

    // Don't add ordering in the query to avoid index issues
    // We'll sort in memory after fetching the data

    console.log(`🔍 Executing query for client files...`);
    const filesSnapshot = await filesQuery.get();
    
    console.log(`📁 Found ${filesSnapshot.docs.length} files for client ${clientId}`);
    
    const files = [];
    filesSnapshot.forEach(doc => {
      const fileData = doc.data();
      // Handle both old and new data structures
      files.push({
        id: doc.id,
        // Support both fileName and name fields
        fileName: fileData.fileName || fileData.filename || fileData.name,
        originalFileName: fileData.originalFileName || fileData.name,
        name: fileData.name || fileData.originalFileName || fileData.fileName,
        filename: fileData.filename || fileData.fileName,
        // Support both fileSize and sizeBytes
        fileSize: fileData.fileSize || fileData.sizeBytes || 0,
        sizeBytes: fileData.sizeBytes || fileData.fileSize || 0,
        size: fileData.size || (fileData.sizeBytes ? formatFileSize(fileData.sizeBytes) : '') || (fileData.fileSize ? formatFileSize(fileData.fileSize) : ''),
        mimeType: fileData.mimeType,
        type: fileData.type || getFileTypeFromMime(fileData.mimeType),
        category: fileData.category || 'misc',
        tags: fileData.tags || [],
        description: fileData.description || '',
        uploadedBy: fileData.uploadedBy,
        uploadedAt: fileData.uploadedAt,
        version: fileData.version || 1,
        downloadCount: fileData.metadata?.downloadCount || 0,
        lastAccessedAt: fileData.metadata?.lastAccessedAt,
        isPublic: fileData.isPublic || false,
        status: fileData.status || 'active',
        // Add URLs for download
        url: fileData.url || fileData.fileUrl || fileData.downloadUrl || `/uploads/clients/${clientId}/${fileData.fileName || fileData.filename}`,
        downloadUrl: fileData.downloadUrl || fileData.url || fileData.fileUrl || `/uploads/clients/${clientId}/${fileData.fileName || fileData.filename}`,
        path: fileData.path || fileData.fileUrl || `/uploads/clients/${clientId}/${fileData.fileName || fileData.filename}`
      });
    });

    // Sort files by uploadedAt in memory if Firestore ordering failed
    files.sort((a, b) => {
      const aTime = a.uploadedAt?.toDate?.() || new Date(0);
      const bTime = b.uploadedAt?.toDate?.() || new Date(0);
      return bTime - aTime;
    });

    // Calculate storage usage
    const totalSize = files.reduce((sum, file) => sum + (file.fileSize || 0), 0);
    const categoryBreakdown = files.reduce((acc, file) => {
      const cat = file.category || 'misc';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    res.status(200).json({ 
      success: true, 
      files,
      clientName: client.name,
      summary: {
        totalFiles: files.length,
        totalSize: totalSize,
        categories: categoryBreakdown
      }
    });
  } catch (error) {
    console.error('❌ Error getting client files:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to load client files',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
}

// Upload a file for a client
async function handleUploadClientFile(req, res, clientId, user, tenantId) {
  try {
    // Verify client exists
    const client = await getClientById(clientId, tenantId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Create upload directory if it doesn't exist
    const uploadDir = path.join(process.cwd(), 'uploads', 'clients', clientId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Parse the form data
    const form = formidable({
      uploadDir: uploadDir,
      keepExtensions: true,
      maxFileSize: 200 * 1024 * 1024, // 200MB limit for videos
      multiples: false
    });

    console.log('Parsing form data...');
    const [fields, files] = await form.parse(req);
    console.log('Form fields:', fields);
    console.log('Form files:', files);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Extract metadata from form fields
    const category = Array.isArray(fields.category) ? fields.category[0] : fields.category || 'misc';
    const description = Array.isArray(fields.description) ? fields.description[0] : fields.description || '';
    const tagsField = Array.isArray(fields.tags) ? fields.tags[0] : fields.tags;
    const tags = tagsField ? tagsField.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
    const isPublic = (Array.isArray(fields.isPublic) ? fields.isPublic[0] : fields.isPublic) === 'true';

    // Generate unique filename
    const timestamp = Date.now();
    const extension = path.extname(file.originalFilename || '');
    const safeFileName = `${timestamp}_${file.originalFilename?.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const newFilePath = path.join(uploadDir, safeFileName);

    // Check if it's a video file and compress it
    let processedFile = file;
    let finalPath = newFilePath;
    let finalSafeFileName = safeFileName;
    
    if (file.mimetype && file.mimetype.startsWith('video/')) {
      try {
        console.log('Compressing video file:', file.originalFilename);
        const compressedFileName = `${timestamp}_${file.originalFilename?.replace(/[^a-zA-Z0-9.-]/g, '_')}_compressed.mp4`;
        const compressedPath = path.join(uploadDir, compressedFileName);
        
        // Compress the video
        await compressVideo(file.filepath, compressedPath);
        
        // Get compressed file stats
        const compressedStats = fs.statSync(compressedPath);
        
        // Clean up original file
        fs.unlinkSync(file.filepath);
        
        // Update file info
        processedFile = {
          ...file,
          size: compressedStats.size,
          mimetype: 'video/mp4'
        };
        
        finalPath = compressedPath;
        finalSafeFileName = compressedFileName;
        
        console.log(`Video compressed: ${file.originalFilename} -> ${compressedFileName}`);
        console.log(`Size reduced from ${file.size} to ${compressedStats.size} bytes`);
        
      } catch (compressionError) {
        console.error('Video compression failed:', compressionError);
        console.log('Continuing with original video file without compression');
        // If compression fails, continue with original file
        try {
          fs.renameSync(file.filepath, newFilePath);
        } catch (moveError) {
          console.error('Error moving original file:', moveError);
          // If we can't move the file, try copying it
          fs.copyFileSync(file.filepath, newFilePath);
          fs.unlinkSync(file.filepath);
        }
      }
    } else {
      // Move file to final location (non-video files)
      fs.renameSync(file.filepath, newFilePath);
    }

    // Create file metadata
    const fileMetadata = {
      tenantId: tenantId,
      clientId: clientId,
      fileName: finalSafeFileName,
      originalFileName: file.originalFilename,
      fileSize: processedFile.size,
      mimeType: processedFile.mimetype,
      fileUrl: `/uploads/clients/${clientId}/${finalSafeFileName}`,
      uploadPath: finalPath,
      uploadedBy: user.username,
      uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
      category: category,
      tags: tags,
      description: description,
      isPublic: isPublic,
      version: 1,
      status: 'active',
      metadata: {
        lastAccessedAt: null,
        downloadCount: 0
      },
      // Add compression info for video files
      ...(processedFile.mimetype.startsWith('video/') && processedFile.size !== file.size && {
        compressed: true,
        originalSize: file.size,
        compressionRatio: Math.round((1 - processedFile.size / file.size) * 100)
      })
    };

    // Save to database
    const fileDoc = await adminDb.collection('client_files').add(fileMetadata);

    // Log activity
    await logActivity({
      action: 'file_uploaded',
      clientId: clientId,
      userId: user.username,
      details: {
        fileId: fileDoc.id,
        fileName: file.originalFilename,
        fileSize: file.size,
        category: category,
        clientName: client.name
      }
    }, tenantId);

    res.status(201).json({ 
      success: true, 
      message: processedFile.mimetype.startsWith('video/') && processedFile.size !== file.size 
        ? 'Video compressed and uploaded successfully' 
        : 'File uploaded successfully',
      file: {
        id: fileDoc.id,
        fileName: finalSafeFileName,
        originalFileName: file.originalFilename,
        fileSize: processedFile.size,
        mimeType: processedFile.mimetype,
        category: category,
        description: description,
        uploadedBy: user.username,
        isPublic: isPublic,
        ...(processedFile.mimetype.startsWith('video/') && processedFile.size !== file.size && {
          compressed: true,
          originalSize: file.size,
          compressionRatio: Math.round((1 - processedFile.size / file.size) * 100)
        })
      }
    });

  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload file',
      error: error.message
    });
  }
}

// Delete a client file
async function handleDeleteClientFile(req, res, clientId, user, tenantId) {
  try {
    const { fileId } = req.query;

    if (!fileId) {
      return res.status(400).json({
        success: false,
        message: 'File ID is required for deletion'
      });
    }

    // Verify client exists
    const client = await getClientById(clientId, tenantId);
    if (!client) {
      return res.status(404).json({ success: false, message: 'Client not found' });
    }

    // Get file metadata
    const fileDoc = await adminDb.collection('client_files').doc(fileId).get();
    if (!fileDoc.exists) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }

    const fileData = fileDoc.data();

    // Verify file belongs to this client and tenant
    if (fileData.clientId !== clientId || fileData.tenantId !== tenantId) {
      return res.status(403).json({ success: false, message: 'File does not belong to this client' });
    }

    // Delete physical file
    try {
      if (fileData.uploadPath && fs.existsSync(fileData.uploadPath)) {
        fs.unlinkSync(fileData.uploadPath);
      }
    } catch (fsError) {
      console.warn('Failed to delete physical file:', fsError);
    }

    // Mark file as deleted in database (soft delete)
    await fileDoc.ref.update({
      status: 'deleted',
      deletedAt: admin.firestore.FieldValue.serverTimestamp(),
      deletedBy: user.username
    });

    // Log activity
    await logActivity({
      action: 'file_deleted',
      clientId: clientId,
      userId: user.username,
      details: {
        fileId: fileId,
        fileName: fileData.originalFileName,
        clientName: client.name
      }
    }, tenantId);

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