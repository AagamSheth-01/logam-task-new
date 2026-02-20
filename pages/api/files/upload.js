import { verifyTokenFromRequest } from '../../../lib/auth';
import { addFile } from '../../../lib/firebaseService';
import formidable from 'formidable';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';

// Disable default body parser
export const config = {
  api: {
    bodyParser: false,
  },
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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Verify authentication
  const authResult = verifyTokenFromRequest(req);
  if (!authResult.valid) {
    return res.status(401).json({ success: false, message: authResult.message || 'Unauthorized' });
  }

  // Multi-tenancy: Extract tenantId from authenticated request
  const { user, tenantId } = authResult;

  try {
    // Parse the form data
    const form = formidable({
      uploadDir: './public/uploads', // Make sure this directory exists
      keepExtensions: true,
      maxFileSize: 200 * 1024 * 1024, // 200MB limit for videos
    });

    // Create uploads directory if it doesn't exist
    const uploadsDir = './public/uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const [fields, files] = await form.parse(req);
    
    const file = Array.isArray(files.file) ? files.file[0] : files.file;
    
    if (!file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No file uploaded' 
      });
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/zip',
      'application/x-rar-compressed',
      'video/mp4',
      'video/avi',
      'video/mov',
      'video/wmv',
      'video/flv',
      'video/webm',
      'video/mkv',
      'audio/mp3',
      'audio/wav',
      'audio/aac',
      'audio/ogg'
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      // Clean up uploaded file
      fs.unlinkSync(file.filepath);
      return res.status(400).json({ 
        success: false, 
        message: 'File type not allowed. Please upload PDF, DOC, XLS, PPT, images, videos, audio, or ZIP files.' 
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalName = file.originalFilename;
    const extension = path.extname(originalName);
    const baseName = path.basename(originalName, extension);
    let uniqueFilename = `${baseName}_${timestamp}${extension}`;
    
    let finalPath = path.join(uploadsDir, uniqueFilename);
    let processedFile = file;
    
    // Check if it's a video file and compress it
    if (file.mimetype && file.mimetype.startsWith('video/')) {
      try {
        console.log('Compressing video file:', originalName);
        const compressedFilename = `${baseName}_${timestamp}_compressed.mp4`;
        const compressedPath = path.join(uploadsDir, compressedFilename);
        
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
          filepath: compressedPath,
          mimetype: 'video/mp4'
        };
        
        finalPath = compressedPath;
        uniqueFilename = compressedFilename;
        
        console.log(`Video compressed: ${originalName} -> ${compressedFilename}`);
        console.log(`Size reduced from ${file.size} to ${compressedStats.size} bytes`);
        
      } catch (compressionError) {
        console.error('Video compression failed:', compressionError);
        console.log('Continuing with original video file without compression');
        // If compression fails, continue with original file
        try {
          fs.renameSync(file.filepath, finalPath);
        } catch (moveError) {
          console.error('Error moving original file:', moveError);
          // If we can't move the file, try copying it
          fs.copyFileSync(file.filepath, finalPath);
          fs.unlinkSync(file.filepath);
        }
      }
    } else {
      // Move file to final location (non-video files)
      fs.renameSync(file.filepath, finalPath);
    }

    // Determine file type category
    const getFileType = (mimetype) => {
      if (mimetype.startsWith('image/')) return 'image';
      if (mimetype.startsWith('video/')) return 'video';
      if (mimetype.startsWith('audio/')) return 'audio';
      if (mimetype.includes('pdf')) return 'pdf';
      if (mimetype.includes('word') || mimetype.includes('document')) return 'document';
      if (mimetype.includes('excel') || mimetype.includes('sheet')) return 'spreadsheet';
      if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'presentation';
      if (mimetype.includes('zip') || mimetype.includes('rar')) return 'archive';
      return 'other';
    };

    // Format file size
    const formatFileSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    // Prepare file data for database
    const fileData = {
      name: originalName,
      filename: uniqueFilename,
      path: `/uploads/${uniqueFilename}`,
      url: `/uploads/${uniqueFilename}`,
      downloadUrl: `/uploads/${uniqueFilename}`,
      size: formatFileSize(processedFile.size),
      sizeBytes: processedFile.size,
      type: getFileType(processedFile.mimetype),
      mimeType: processedFile.mimetype,
      clientId: Array.isArray(fields.clientId) ? fields.clientId[0] : fields.clientId || '',
      clientName: Array.isArray(fields.clientName) ? fields.clientName[0] : fields.clientName || '',
      description: Array.isArray(fields.description) ? fields.description[0] : fields.description || '',
      tags: [],
      uploadedBy: user.username,
      // Add compression info for video files
      ...(processedFile.mimetype.startsWith('video/') && processedFile.size !== file.size && {
        compressed: true,
        originalSize: file.size,
        compressionRatio: Math.round((1 - processedFile.size / file.size) * 100)
      })
    };

    // Save file info to database
    const savedFile = await addFile(fileData, tenantId);

    res.status(201).json({
      success: true,
      file: savedFile,
      message: 'File uploaded successfully'
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload file',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Upload failed'
    });
  }
}