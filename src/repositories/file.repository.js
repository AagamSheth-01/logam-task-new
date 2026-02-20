/**
 * File Repository
 * Handles data access for file operations
 * Wraps firebaseService functions for files
 */

import { BaseRepository } from './base.repository.js';
import {
  addFile,
  getFiles,
  getFileById,
  updateFile,
  deleteFile,
  getClientFiles
} from '../../lib/firebaseService.js';

export class FileRepository extends BaseRepository {
  constructor() {
    super('client_files');
  }

  /**
   * Create a new file record
   * @param {Object} fileData - File data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created file object
   */
  async create(fileData, tenantId) {
    const newFile = await addFile(fileData, tenantId);
    return newFile;
  }

  /**
   * Get files with optional filters
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} List of files
   */
  async findAll(filters = {}) {
    const files = await getFiles(filters);
    return files || [];
  }

  /**
   * Get files by tenant ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of files
   */
  async findByTenant(tenantId) {
    const files = await getFiles({ tenantId });
    return files || [];
  }

  /**
   * Get file by ID
   * @param {string} fileId - File ID
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<Object|null>} File object or null
   */
  async findById(fileId, tenantId = null) {
    const file = await getFileById(fileId, tenantId);
    return file;
  }

  /**
   * Update file information
   * @param {string} fileId - File ID
   * @param {Object} updateData - Update data
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<Object>} Update result
   */
  async update(fileId, updateData, tenantId = null) {
    const result = await updateFile(fileId, updateData, tenantId);
    return result;
  }

  /**
   * Delete file (soft delete)
   * @param {string} fileId - File ID
   * @param {string} deletedBy - Username of person deleting
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<Object>} Delete result
   */
  async delete(fileId, deletedBy = 'system', tenantId = null) {
    const result = await deleteFile(fileId, deletedBy, tenantId);
    return result;
  }

  /**
   * Get files by client ID
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<Array>} List of files for the client
   */
  async findByClient(clientId, tenantId = null) {
    const files = await getClientFiles(clientId, tenantId);
    return files || [];
  }

  /**
   * Get files by type
   * @param {string} type - File type
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of files with specified type
   */
  async findByType(type, tenantId) {
    const files = await getFiles({ type, tenantId });
    return files || [];
  }

  /**
   * Get files uploaded by specific user
   * @param {string} uploadedBy - Username/user ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of files uploaded by the user
   */
  async findByUploader(uploadedBy, tenantId) {
    const files = await getFiles({ uploadedBy, tenantId });
    return files || [];
  }

  /**
   * Search files by name or description
   * @param {string} searchTerm - Search term
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of matching files
   */
  async search(searchTerm, tenantId) {
    // Get all files for tenant
    const allFiles = await this.findByTenant(tenantId);

    if (!searchTerm || !searchTerm.trim()) {
      return allFiles;
    }

    const term = searchTerm.toLowerCase().trim();

    // Filter files by name, filename, or description
    return allFiles.filter(file => {
      const nameMatch = file.name && file.name.toLowerCase().includes(term);
      const filenameMatch = file.filename && file.filename.toLowerCase().includes(term);
      const descriptionMatch = file.description && file.description.toLowerCase().includes(term);
      const clientMatch = file.clientName && file.clientName.toLowerCase().includes(term);

      return nameMatch || filenameMatch || descriptionMatch || clientMatch;
    });
  }

  /**
   * Get files by tags
   * @param {Array<string>} tags - Tags to search for
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of files with matching tags
   */
  async findByTags(tags, tenantId) {
    if (!tags || tags.length === 0) {
      return [];
    }

    const allFiles = await this.findByTenant(tenantId);

    // Filter files that have any of the specified tags
    return allFiles.filter(file => {
      if (!file.tags || file.tags.length === 0) return false;

      return tags.some(tag =>
        file.tags.some(fileTag =>
          fileTag.toLowerCase() === tag.toLowerCase()
        )
      );
    });
  }

  /**
   * Count files by tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<number>} File count
   */
  async countByTenant(tenantId) {
    const files = await this.findByTenant(tenantId);
    return files.length;
  }

  /**
   * Count files by client
   * @param {string} clientId - Client ID
   * @param {string} tenantId - Organization ID (optional)
   * @returns {Promise<number>} File count
   */
  async countByClient(clientId, tenantId = null) {
    const files = await this.findByClient(clientId, tenantId);
    return files.length;
  }

  /**
   * Get total storage used by tenant (in bytes)
   * @param {string} tenantId - Organization ID
   * @returns {Promise<number>} Total size in bytes
   */
  async getTotalStorageByTenant(tenantId) {
    const files = await this.findByTenant(tenantId);

    return files.reduce((total, file) => {
      return total + (file.sizeBytes || 0);
    }, 0);
  }

  /**
   * Get file analytics for tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(tenantId) {
    const files = await this.findByTenant(tenantId);

    const analytics = {
      totalFiles: files.length,
      totalStorageBytes: 0,
      byType: {},
      byClient: {},
      recentUploads: []
    };

    // Calculate analytics
    files.forEach(file => {
      // Total storage
      analytics.totalStorageBytes += file.sizeBytes || 0;

      // By type
      const type = file.type || 'other';
      if (!analytics.byType[type]) {
        analytics.byType[type] = { count: 0, size: 0 };
      }
      analytics.byType[type].count++;
      analytics.byType[type].size += file.sizeBytes || 0;

      // By client
      if (file.clientId && file.clientName) {
        if (!analytics.byClient[file.clientId]) {
          analytics.byClient[file.clientId] = {
            clientName: file.clientName,
            count: 0,
            size: 0
          };
        }
        analytics.byClient[file.clientId].count++;
        analytics.byClient[file.clientId].size += file.sizeBytes || 0;
      }
    });

    // Get recent uploads (last 10)
    analytics.recentUploads = files
      .sort((a, b) => {
        const dateA = new Date(a.uploadedAt || a.createdAt);
        const dateB = new Date(b.uploadedAt || b.createdAt);
        return dateB - dateA;
      })
      .slice(0, 10)
      .map(file => ({
        id: file.id,
        name: file.name,
        filename: file.filename,
        type: file.type,
        size: file.size,
        uploadedBy: file.uploadedBy,
        uploadedAt: file.uploadedAt,
        clientName: file.clientName
      }));

    return analytics;
  }
}

export default FileRepository;
