/**
 * File Service
 * Contains business logic for file management
 * Uses FileRepository for data access
 */

import { FileRepository } from '../repositories/file.repository.js';
import { FileModel, FILE_STATUS, FILE_TYPE } from '../models/file.model.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

export class FileService {
  constructor() {
    this.fileRepository = new FileRepository();
  }

  /**
   * Get all files for a tenant
   * @param {string} tenantId - Organization ID
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} List of files
   */
  async getFilesByTenant(tenantId, filters = {}) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const allFilters = { ...filters, tenantId };
    const files = await this.fileRepository.findAll(allFilters);

    return files.map(file => new FileModel(file).toObject());
  }

  /**
   * Get file by ID
   * @param {string} fileId - File ID
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<Object|null>} File object or null
   */
  async getFileById(fileId, tenantId = null) {
    if (!fileId) {
      throw new ValidationError('File ID is required');
    }

    const file = await this.fileRepository.findById(fileId, tenantId);

    if (!file) return null;

    return new FileModel(file).toObject();
  }

  /**
   * Create a new file record
   * @param {Object} fileData - File data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created file object
   */
  async createFile(fileData, tenantId) {
    // Validate input data
    const validation = FileModel.validate({ ...fileData, tenantId });
    if (!validation.isValid) {
      throw new ValidationError('Invalid file data', validation.errors);
    }

    // Auto-determine file type if not provided
    if (!fileData.type) {
      fileData.type = FileModel.determineFileType(fileData.mimeType, fileData.filename);
    }

    // Create file model
    const fileModel = new FileModel({
      ...fileData,
      tenantId,
      status: FILE_STATUS.ACTIVE
    });

    // Save to database
    const newFile = await this.fileRepository.create(fileModel.toObject(), tenantId);

    return new FileModel(newFile).toObject();
  }

  /**
   * Update file information
   * @param {string} fileId - File ID
   * @param {Object} updateData - Update data
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<Object>} Updated file object
   */
  async updateFile(fileId, updateData, tenantId = null) {
    // Validate update data
    const validation = FileModel.validate(updateData, true);
    if (!validation.isValid) {
      throw new ValidationError('Invalid update data', validation.errors);
    }

    // Check if file exists
    const existingFile = await this.fileRepository.findById(fileId, tenantId);
    if (!existingFile) {
      throw new NotFoundError('File not found');
    }

    // Update in database
    await this.fileRepository.update(fileId, updateData, tenantId);

    // Return updated file
    const updatedFile = await this.fileRepository.findById(fileId, tenantId);
    return new FileModel(updatedFile).toObject();
  }

  /**
   * Delete file (soft delete)
   * @param {string} fileId - File ID
   * @param {string} deletedBy - Username of person deleting
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<void>}
   */
  async deleteFile(fileId, deletedBy = 'system', tenantId = null) {
    if (!fileId) {
      throw new ValidationError('File ID is required');
    }

    // Check if file exists
    const existingFile = await this.fileRepository.findById(fileId, tenantId);
    if (!existingFile) {
      throw new NotFoundError('File not found');
    }

    await this.fileRepository.delete(fileId, deletedBy, tenantId);
  }

  /**
   * Get files by client
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<Array>} List of files for the client
   */
  async getFilesByClient(clientId, tenantId = null) {
    if (!clientId) {
      throw new ValidationError('Client ID is required');
    }

    const files = await this.fileRepository.findByClient(clientId, tenantId);
    return files.map(file => new FileModel(file).toObject());
  }

  /**
   * Get files by type
   * @param {string} type - File type
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of files with specified type
   */
  async getFilesByType(type, tenantId) {
    if (!type || !tenantId) {
      throw new ValidationError('Type and tenant ID are required');
    }

    if (!Object.values(FILE_TYPE).includes(type)) {
      throw new ValidationError('Invalid file type');
    }

    const files = await this.fileRepository.findByType(type, tenantId);
    return files.map(file => new FileModel(file).toObject());
  }

  /**
   * Get files uploaded by specific user
   * @param {string} uploadedBy - Username/user ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of files uploaded by the user
   */
  async getFilesByUploader(uploadedBy, tenantId) {
    if (!uploadedBy || !tenantId) {
      throw new ValidationError('Uploader and tenant ID are required');
    }

    const files = await this.fileRepository.findByUploader(uploadedBy, tenantId);
    return files.map(file => new FileModel(file).toObject());
  }

  /**
   * Search files
   * @param {string} searchTerm - Search term
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of matching files
   */
  async searchFiles(searchTerm, tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const files = await this.fileRepository.search(searchTerm, tenantId);
    return files.map(file => new FileModel(file).toObject());
  }

  /**
   * Get files by tags
   * @param {Array<string>} tags - Tags to search for
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of files with matching tags
   */
  async getFilesByTags(tags, tenantId) {
    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      throw new ValidationError('Tags array is required');
    }

    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const files = await this.fileRepository.findByTags(tags, tenantId);
    return files.map(file => new FileModel(file).toObject());
  }

  /**
   * Get file count for tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<number>} File count
   */
  async getFileCount(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    return await this.fileRepository.countByTenant(tenantId);
  }

  /**
   * Get file count for client
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<number>} File count
   */
  async getFileCountByClient(clientId, tenantId = null) {
    if (!clientId) {
      throw new ValidationError('Client ID is required');
    }

    return await this.fileRepository.countByClient(clientId, tenantId);
  }

  /**
   * Get total storage used by tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Storage statistics
   */
  async getStorageStats(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const totalBytes = await this.fileRepository.getTotalStorageByTenant(tenantId);

    // Convert to human-readable format
    const formatSize = (bytes) => {
      if (bytes === 0) return '0 Bytes';

      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));

      return {
        value: Math.round((bytes / Math.pow(k, i)) * 100) / 100,
        unit: sizes[i],
        formatted: Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
      };
    };

    return {
      totalBytes,
      ...formatSize(totalBytes)
    };
  }

  /**
   * Get file analytics for tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Analytics data
   */
  async getFileAnalytics(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const analytics = await this.fileRepository.getAnalytics(tenantId);
    return analytics;
  }

  /**
   * Get active files only
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of active files
   */
  async getActiveFiles(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const allFiles = await this.fileRepository.findByTenant(tenantId);

    const activeFiles = allFiles.filter(file => {
      const fileModel = new FileModel(file);
      return fileModel.isActive();
    });

    return activeFiles.map(file => new FileModel(file).toObject());
  }

  /**
   * Validate file before upload
   * @param {Object} fileData - File data to validate
   * @param {Object} options - Validation options (maxSize, allowedTypes, etc.)
   * @returns {Object} Validation result
   */
  validateFileBeforeUpload(fileData, options = {}) {
    const errors = [];

    // Check max file size
    if (options.maxSizeBytes && fileData.sizeBytes > options.maxSizeBytes) {
      errors.push({
        field: 'sizeBytes',
        message: `File size exceeds maximum allowed size of ${options.maxSizeBytes} bytes`
      });
    }

    // Check allowed file types
    if (options.allowedTypes && options.allowedTypes.length > 0) {
      const fileType = FileModel.determineFileType(fileData.mimeType, fileData.filename);
      if (!options.allowedTypes.includes(fileType)) {
        errors.push({
          field: 'type',
          message: `File type "${fileType}" is not allowed. Allowed types: ${options.allowedTypes.join(', ')}`
        });
      }
    }

    // Check allowed extensions
    if (options.allowedExtensions && options.allowedExtensions.length > 0) {
      const fileModel = new FileModel(fileData);
      const extension = fileModel.getExtension();

      if (!options.allowedExtensions.includes(extension)) {
        errors.push({
          field: 'filename',
          message: `File extension ".${extension}" is not allowed. Allowed extensions: ${options.allowedExtensions.map(e => '.' + e).join(', ')}`
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default FileService;
