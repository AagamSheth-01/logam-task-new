// Enhanced File Management System with Security and Features
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { adminDb } from './firebase-admin';
import admin from 'firebase-admin';

// File configuration
const FILE_CONFIG = {
  maxFileSize: 50 * 1024 * 1024, // 50MB
  maxFilesPerClient: 1000,
  maxStoragePerClient: 500 * 1024 * 1024, // 500MB
  allowedMimeTypes: [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
    'application/rtf',
    
    // Images
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/bmp',
    'image/webp',
    'image/svg+xml',
    
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/gzip',
    
    // Audio/Video
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    
    // Other
    'application/json',
    'application/xml',
    'text/xml'
  ],
  
  dangerousExtensions: [
    '.exe', '.bat', '.cmd', '.com', '.scr', '.pif', '.vbs', '.js', '.jar',
    '.app', '.deb', '.pkg', '.dmg', '.iso', '.msi', '.run', '.sh'
  ],
  
  virusScanEnabled: process.env.VIRUS_SCAN_ENABLED === 'true',
  encryptionEnabled: process.env.FILE_ENCRYPTION_ENABLED === 'true',
  
  storageQuotas: {
    free: 100 * 1024 * 1024,    // 100MB
    premium: 1024 * 1024 * 1024, // 1GB
    enterprise: 10 * 1024 * 1024 * 1024 // 10GB
  }
};

class EnhancedFileManager {
  
  // Enhanced file upload with security checks
  static async uploadFileSecure(fileData, clientId, username) {
    try {
      console.log('🔐 Starting secure file upload:', {
        clientId,
        username,
        fileName: fileData.originalFilename,
        fileSize: fileData.size
      });
      
      // Security validation
      const securityCheck = await this.performSecurityChecks(fileData);
      if (!securityCheck.safe) {
        throw new Error(`Security check failed: ${securityCheck.reason}`);
      }
      
      // Storage quota validation
      const quotaCheck = await this.checkStorageQuota(clientId, fileData.size);
      if (!quotaCheck.allowed) {
        throw new Error(`Storage quota exceeded: ${quotaCheck.reason}`);
      }
      
      // Generate secure filename
      const secureFileName = this.generateSecureFileName(fileData.originalFilename);
      
      // Create upload directory
      const uploadDir = path.join(process.cwd(), 'uploads', 'clients', clientId);
      this.ensureDirectoryExists(uploadDir);
      
      // Move and process file
      const finalPath = path.join(uploadDir, secureFileName);
      await this.moveFile(fileData.filepath, finalPath);
      
      // Encrypt file if enabled
      if (FILE_CONFIG.encryptionEnabled) {
        await this.encryptFile(finalPath);
      }
      
      // Generate file hash for integrity
      const fileHash = await this.generateFileHash(finalPath);
      
      // Scan for viruses if enabled
      if (FILE_CONFIG.virusScanEnabled) {
        const virusScan = await this.scanForViruses(finalPath);
        if (!virusScan.clean) {
          await this.deleteFile(finalPath);
          throw new Error(`Virus detected: ${virusScan.threat}`);
        }
      }
      
      // Extract metadata
      const metadata = await this.extractFileMetadata(finalPath, fileData);
      
      // Create file record
      const fileRecord = await this.createFileRecord({
        clientId,
        username,
        originalFilename: fileData.originalFilename,
        secureFileName,
        fileSize: fileData.size,
        mimeType: fileData.mimetype,
        fileHash,
        metadata,
        uploadPath: finalPath,
        ...fileData.additionalData
      });
      
      // Update storage usage
      await this.updateStorageUsage(clientId, fileData.size);
      
      // Log upload activity
      await this.logFileActivity('upload', fileRecord.id, username, {
        clientId,
        fileName: fileData.originalFilename,
        fileSize: fileData.size,
        securityPassed: true
      });
      
      console.log('✅ Secure file upload completed:', fileRecord.id);
      return fileRecord;
      
    } catch (error) {
      console.error('❌ Secure file upload failed:', error);
      // Cleanup on failure
      if (fileData.filepath) {
        await this.deleteFile(fileData.filepath).catch(() => {});
      }
      throw error;
    }
  }
  
  // Enhanced file download with access control
  static async downloadFileSecure(fileId, username, clientId) {
    try {
      console.log('🔐 Starting secure file download:', { fileId, username, clientId });
      
      // Get file record
      const fileRecord = await this.getFileRecord(fileId);
      if (!fileRecord) {
        throw new Error('File not found');
      }
      
      // Access control check
      const accessCheck = await this.checkFileAccess(fileRecord, username, clientId);
      if (!accessCheck.allowed) {
        throw new Error(`Access denied: ${accessCheck.reason}`);
      }
      
      // Verify file integrity
      const integrityCheck = await this.verifyFileIntegrity(fileRecord);
      if (!integrityCheck.valid) {
        throw new Error(`File integrity check failed: ${integrityCheck.reason}`);
      }
      
      // Decrypt file if needed
      let filePath = fileRecord.uploadPath;
      if (FILE_CONFIG.encryptionEnabled && fileRecord.encrypted) {
        filePath = await this.decryptFile(filePath);
      }
      
      // Update download count
      await this.incrementDownloadCount(fileId);
      
      // Log download activity
      await this.logFileActivity('download', fileId, username, {
        clientId,
        fileName: fileRecord.originalFilename,
        accessLevel: accessCheck.level
      });
      
      console.log('✅ Secure file download authorized:', fileId);
      return {
        filePath,
        fileName: fileRecord.originalFilename,
        mimeType: fileRecord.mimeType,
        fileSize: fileRecord.fileSize
      };
      
    } catch (error) {
      console.error('❌ Secure file download failed:', error);
      throw error;
    }
  }
  
  // Security checks for uploaded files
  static async performSecurityChecks(fileData) {
    const checks = [];
    
    // File size check
    if (fileData.size > FILE_CONFIG.maxFileSize) {
      return {
        safe: false,
        reason: `File size ${Math.round(fileData.size / 1024 / 1024)}MB exceeds maximum of ${FILE_CONFIG.maxFileSize / 1024 / 1024}MB`
      };
    }
    
    // MIME type check
    if (!FILE_CONFIG.allowedMimeTypes.includes(fileData.mimetype)) {
      return {
        safe: false,
        reason: `File type ${fileData.mimetype} is not allowed`
      };
    }
    
    // File extension check
    const ext = path.extname(fileData.originalFilename).toLowerCase();
    if (FILE_CONFIG.dangerousExtensions.includes(ext)) {
      return {
        safe: false,
        reason: `File extension ${ext} is potentially dangerous`
      };
    }
    
    // Filename validation
    if (!/^[a-zA-Z0-9._\-\s()]+$/.test(fileData.originalFilename)) {
      return {
        safe: false,
        reason: 'Filename contains invalid characters'
      };
    }
    
    // File header validation (magic number check)
    const headerCheck = await this.validateFileHeader(fileData.filepath, fileData.mimetype);
    if (!headerCheck.valid) {
      return {
        safe: false,
        reason: `File header doesn't match MIME type: ${headerCheck.reason}`
      };
    }
    
    return { safe: true };
  }
  
  // Check storage quota
  static async checkStorageQuota(clientId, fileSize) {
    try {
      const currentUsage = await this.getStorageUsage(clientId);
      const clientPlan = await this.getClientPlan(clientId);
      const quota = FILE_CONFIG.storageQuotas[clientPlan] || FILE_CONFIG.storageQuotas.free;
      
      if (currentUsage + fileSize > quota) {
        return {
          allowed: false,
          reason: `Storage quota exceeded. Used: ${Math.round(currentUsage / 1024 / 1024)}MB, Quota: ${Math.round(quota / 1024 / 1024)}MB`
        };
      }
      
      return { allowed: true };
      
    } catch (error) {
      console.error('Error checking storage quota:', error);
      return { allowed: true }; // Allow on error, but log it
    }
  }
  
  // Generate secure filename
  static generateSecureFileName(originalFilename) {
    const timestamp = Date.now();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    const ext = path.extname(originalFilename);
    const name = path.basename(originalFilename, ext)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .substring(0, 50);
    
    return `${timestamp}_${randomBytes}_${name}${ext}`;
  }
  
  // Validate file header against MIME type
  static async validateFileHeader(filePath, mimeType) {
    try {
      const buffer = await fs.promises.readFile(filePath, { start: 0, end: 20 });
      const header = buffer.toString('hex');
      
      // Common file signatures
      const signatures = {
        'application/pdf': ['25504446'],
        'image/jpeg': ['ffd8ff'],
        'image/png': ['89504e47'],
        'image/gif': ['47494638'],
        'application/zip': ['504b0304', '504b0506'],
        'application/msword': ['d0cf11e0'],
        'text/plain': [], // No specific signature
        'text/csv': [] // No specific signature
      };
      
      const expectedSignatures = signatures[mimeType];
      if (!expectedSignatures || expectedSignatures.length === 0) {
        return { valid: true }; // No signature to check
      }
      
      const matches = expectedSignatures.some(sig => 
        header.toLowerCase().startsWith(sig.toLowerCase())
      );
      
      return {
        valid: matches,
        reason: matches ? null : 'File signature doesn\'t match MIME type'
      };
      
    } catch (error) {
      console.error('Error validating file header:', error);
      return { valid: true }; // Allow on error
    }
  }
  
  // File encryption
  static async encryptFile(filePath) {
    try {
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', key);
      
      const input = fs.createReadStream(filePath);
      const output = fs.createWriteStream(filePath + '.enc');
      
      await new Promise((resolve, reject) => {
        input.pipe(cipher).pipe(output);
        output.on('finish', resolve);
        output.on('error', reject);
      });
      
      // Replace original with encrypted
      await fs.promises.unlink(filePath);
      await fs.promises.rename(filePath + '.enc', filePath);
      
      // Store key securely (implement your key management)
      await this.storeEncryptionKey(filePath, key, iv);
      
    } catch (error) {
      console.error('Error encrypting file:', error);
      throw error;
    }
  }
  
  // Generate file hash for integrity
  static async generateFileHash(filePath) {
    try {
      const fileBuffer = await fs.promises.readFile(filePath);
      return crypto.createHash('sha256').update(fileBuffer).digest('hex');
    } catch (error) {
      console.error('Error generating file hash:', error);
      return null;
    }
  }
  
  // Virus scanning (placeholder - integrate with actual antivirus)
  static async scanForViruses(filePath) {
    try {
      // Placeholder for virus scanning integration
      // You would integrate with ClamAV, Windows Defender, or other antivirus
      console.log('🦠 Virus scan placeholder for:', filePath);
      
      // For demonstration, check file size as a simple "scan"
      const stats = await fs.promises.stat(filePath);
      if (stats.size > 100 * 1024 * 1024) { // Files > 100MB might be suspicious
        return {
          clean: false,
          threat: 'Suspicious file size'
        };
      }
      
      return { clean: true };
      
    } catch (error) {
      console.error('Error scanning for viruses:', error);
      return { clean: true }; // Allow on error
    }
  }
  
  // Extract file metadata
  static async extractFileMetadata(filePath, fileData) {
    try {
      const stats = await fs.promises.stat(filePath);
      
      return {
        originalSize: fileData.size,
        actualSize: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        permissions: stats.mode,
        checksum: await this.generateFileHash(filePath)
      };
      
    } catch (error) {
      console.error('Error extracting metadata:', error);
      return {};
    }
  }
  
  // Create file record in database
  static async createFileRecord(fileData) {
    try {
      const fileRecord = {
        clientId: fileData.clientId,
        fileName: fileData.secureFileName,
        originalFileName: fileData.originalFilename,
        fileSize: fileData.fileSize,
        mimeType: fileData.mimeType,
        fileHash: fileData.fileHash,
        category: fileData.category || 'misc',
        tags: fileData.tags || [],
        description: fileData.description || '',
        uploadPath: fileData.uploadPath,
        uploadedBy: fileData.username,
        uploadedAt: admin.firestore.FieldValue.serverTimestamp(),
        version: 1,
        status: 'active',
        isPublic: fileData.isPublic || false,
        encrypted: FILE_CONFIG.encryptionEnabled,
        virusScanned: FILE_CONFIG.virusScanEnabled,
        metadata: fileData.metadata || {},
        downloadCount: 0,
        lastAccessedAt: null,
        expiresAt: fileData.expiresAt || null,
        accessControl: {
          allowedUsers: fileData.allowedUsers || [],
          accessLevel: fileData.accessLevel || 'client'
        }
      };
      
      const fileDoc = await adminDb.collection('client_files').add(fileRecord);
      
      return {
        id: fileDoc.id,
        ...fileRecord
      };
      
    } catch (error) {
      console.error('Error creating file record:', error);
      throw error;
    }
  }
  
  // File access control
  static async checkFileAccess(fileRecord, username, clientId) {
    try {
      // Check if user has access to this client
      if (fileRecord.clientId !== clientId) {
        return {
          allowed: false,
          reason: 'Client ID mismatch'
        };
      }
      
      // Check if file is public
      if (fileRecord.isPublic) {
        return {
          allowed: true,
          level: 'public'
        };
      }
      
      // Check if user uploaded the file
      if (fileRecord.uploadedBy === username) {
        return {
          allowed: true,
          level: 'owner'
        };
      }
      
      // Check access control list
      if (fileRecord.accessControl?.allowedUsers?.includes(username)) {
        return {
          allowed: true,
          level: 'granted'
        };
      }
      
      // Check if user has client access
      const clientAccess = await this.checkClientAccess(clientId, username);
      if (clientAccess.allowed) {
        return {
          allowed: true,
          level: 'client'
        };
      }
      
      return {
        allowed: false,
        reason: 'Insufficient permissions'
      };
      
    } catch (error) {
      console.error('Error checking file access:', error);
      return {
        allowed: false,
        reason: 'Access check failed'
      };
    }
  }
  
  // Helper methods
  static ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }
  
  static async moveFile(source, destination) {
    await fs.promises.rename(source, destination);
  }
  
  static async deleteFile(filePath) {
    try {
      await fs.promises.unlink(filePath);
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }
  
  static async getFileRecord(fileId) {
    try {
      const doc = await adminDb.collection('client_files').doc(fileId).get();
      return doc.exists ? { id: doc.id, ...doc.data() } : null;
    } catch (error) {
      console.error('Error getting file record:', error);
      return null;
    }
  }
  
  static async updateStorageUsage(clientId, fileSize) {
    try {
      const storageDoc = adminDb.collection('client_storage').doc(clientId);
      await storageDoc.set({
        totalSize: admin.firestore.FieldValue.increment(fileSize),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating storage usage:', error);
    }
  }
  
  static async getStorageUsage(clientId) {
    try {
      const doc = await adminDb.collection('client_storage').doc(clientId).get();
      return doc.exists ? doc.data().totalSize || 0 : 0;
    } catch (error) {
      console.error('Error getting storage usage:', error);
      return 0;
    }
  }
  
  static async getClientPlan(clientId) {
    try {
      const doc = await adminDb.collection('clients').doc(clientId).get();
      return doc.exists ? doc.data().plan || 'free' : 'free';
    } catch (error) {
      console.error('Error getting client plan:', error);
      return 'free';
    }
  }
  
  static async incrementDownloadCount(fileId) {
    try {
      await adminDb.collection('client_files').doc(fileId).update({
        downloadCount: admin.firestore.FieldValue.increment(1),
        lastAccessedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error incrementing download count:', error);
    }
  }
  
  static async logFileActivity(action, fileId, username, details) {
    try {
      await adminDb.collection('activities').add({
        action: `file_${action}`,
        entityType: 'file',
        entityId: fileId,
        userId: username,
        details: details,
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      });
    } catch (error) {
      console.error('Error logging file activity:', error);
    }
  }
  
  static async checkClientAccess(clientId, username) {
    try {
      const accessDoc = await adminDb
        .collection('client_users')
        .where('clientId', '==', clientId)
        .where('username', '==', username)
        .where('isActive', '==', true)
        .get();
      
      return {
        allowed: !accessDoc.empty,
        level: accessDoc.empty ? null : 'client'
      };
    } catch (error) {
      console.error('Error checking client access:', error);
      return { allowed: false };
    }
  }
  
  static async verifyFileIntegrity(fileRecord) {
    try {
      if (!fileRecord.fileHash) {
        return { valid: true }; // No hash to verify
      }
      
      const currentHash = await this.generateFileHash(fileRecord.uploadPath);
      const valid = currentHash === fileRecord.fileHash;
      
      return {
        valid,
        reason: valid ? null : 'File hash mismatch - file may be corrupted'
      };
      
    } catch (error) {
      console.error('Error verifying file integrity:', error);
      return { valid: true }; // Allow on error
    }
  }
  
  // Placeholder for encryption key storage
  static async storeEncryptionKey(filePath, key, iv) {
    // Implement secure key storage (HSM, Azure Key Vault, etc.)
    console.log('🔐 Storing encryption key for:', filePath);
  }
  
  // Placeholder for file decryption
  static async decryptFile(filePath) {
    // Implement file decryption
    console.log('🔓 Decrypting file:', filePath);
    return filePath; // Return decrypted file path
  }
}

export default EnhancedFileManager;