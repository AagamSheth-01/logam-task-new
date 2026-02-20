/**
 * File Model
 * Represents a file/document in the system
 */

export const FILE_TYPE = {
  DOCUMENT: 'document',
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  SPREADSHEET: 'spreadsheet',
  PDF: 'pdf',
  OTHER: 'other'
};

export const FILE_STATUS = {
  ACTIVE: 'active',
  DELETED: 'deleted'
};

export class FileModel {
  constructor(data) {
    this.id = data.id || null;
    this.tenantId = data.tenantId;
    this.name = data.name || '';
    this.filename = data.filename || '';
    this.path = data.path || '';
    this.url = data.url || '';
    this.downloadUrl = data.downloadUrl || '';
    this.size = data.size || '';
    this.sizeBytes = data.sizeBytes || 0;
    this.type = data.type || FILE_TYPE.OTHER;
    this.mimeType = data.mimeType || '';
    this.clientId = data.clientId || '';
    this.clientName = data.clientName || '';
    this.description = data.description || '';
    this.tags = data.tags || [];
    this.uploadedBy = data.uploadedBy || 'unknown';
    this.uploadedAt = data.uploadedAt || new Date().toISOString();
    this.status = data.status || FILE_STATUS.ACTIVE;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
    this.deletedAt = data.deletedAt || null;
    this.deletedBy = data.deletedBy || null;
  }

  /**
   * Convert model to plain object
   * @returns {Object} Plain object representation
   */
  toObject() {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      filename: this.filename,
      path: this.path,
      url: this.url,
      downloadUrl: this.downloadUrl,
      size: this.size,
      sizeBytes: this.sizeBytes,
      type: this.type,
      mimeType: this.mimeType,
      clientId: this.clientId,
      clientName: this.clientName,
      description: this.description,
      tags: this.tags,
      uploadedBy: this.uploadedBy,
      uploadedAt: this.uploadedAt,
      status: this.status,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      deletedBy: this.deletedBy
    };
  }

  /**
   * Check if file is active (not deleted)
   * @returns {boolean} True if active
   */
  isActive() {
    return this.status === FILE_STATUS.ACTIVE && !this.deletedAt;
  }

  /**
   * Check if file is deleted
   * @returns {boolean} True if deleted
   */
  isDeleted() {
    return this.status === FILE_STATUS.DELETED || this.deletedAt !== null;
  }

  /**
   * Get file extension from filename
   * @returns {string} File extension
   */
  getExtension() {
    if (!this.filename) return '';
    const parts = this.filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Get human-readable file size
   * @returns {string} Formatted file size
   */
  getFormattedSize() {
    const bytes = this.sizeBytes;
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Validate file data
   * @param {Object} data - File data to validate
   * @param {boolean} isUpdate - True if validating an update
   * @returns {Object} Validation result {isValid: boolean, errors: Array}
   */
  static validate(data, isUpdate = false) {
    const errors = [];

    // Required fields for new files
    if (!isUpdate) {
      if (!data.tenantId) {
        errors.push({ field: 'tenantId', message: 'Tenant ID is required' });
      }
      if (!data.name || !data.name.trim()) {
        errors.push({ field: 'name', message: 'File name is required' });
      }
      if (!data.filename || !data.filename.trim()) {
        errors.push({ field: 'filename', message: 'Filename is required' });
      }
    }

    // Validate file type
    if (data.type && !Object.values(FILE_TYPE).includes(data.type)) {
      errors.push({
        field: 'type',
        message: `Invalid file type. Must be one of: ${Object.values(FILE_TYPE).join(', ')}`
      });
    }

    // Validate status
    if (data.status && !Object.values(FILE_STATUS).includes(data.status)) {
      errors.push({
        field: 'status',
        message: `Invalid status. Must be one of: ${Object.values(FILE_STATUS).join(', ')}`
      });
    }

    // Validate sizeBytes
    if (data.sizeBytes !== undefined && (typeof data.sizeBytes !== 'number' || data.sizeBytes < 0)) {
      errors.push({ field: 'sizeBytes', message: 'Size in bytes must be a non-negative number' });
    }

    // Validate tags (must be array)
    if (data.tags && !Array.isArray(data.tags)) {
      errors.push({ field: 'tags', message: 'Tags must be an array' });
    }

    // Validate URLs if provided
    if (data.url && data.url.trim() && !this.isValidUrl(data.url)) {
      errors.push({ field: 'url', message: 'Invalid URL format' });
    }

    if (data.downloadUrl && data.downloadUrl.trim() && !this.isValidUrl(data.downloadUrl)) {
      errors.push({ field: 'downloadUrl', message: 'Invalid download URL format' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if string is valid URL
   * @param {string} string - String to validate
   * @returns {boolean} True if valid URL
   */
  static isValidUrl(string) {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
  }

  /**
   * Determine file type from MIME type or filename
   * @param {string} mimeType - MIME type
   * @param {string} filename - Filename
   * @returns {string} File type constant
   */
  static determineFileType(mimeType, filename) {
    if (mimeType) {
      if (mimeType.startsWith('image/')) return FILE_TYPE.IMAGE;
      if (mimeType.startsWith('video/')) return FILE_TYPE.VIDEO;
      if (mimeType.startsWith('audio/')) return FILE_TYPE.AUDIO;
      if (mimeType === 'application/pdf') return FILE_TYPE.PDF;
      if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FILE_TYPE.SPREADSHEET;
      if (mimeType.includes('document') || mimeType.includes('word')) return FILE_TYPE.DOCUMENT;
    }

    if (filename) {
      const ext = filename.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return FILE_TYPE.IMAGE;
      if (['mp4', 'avi', 'mov', 'wmv', 'flv'].includes(ext)) return FILE_TYPE.VIDEO;
      if (['mp3', 'wav', 'ogg', 'flac'].includes(ext)) return FILE_TYPE.AUDIO;
      if (ext === 'pdf') return FILE_TYPE.PDF;
      if (['xls', 'xlsx', 'csv'].includes(ext)) return FILE_TYPE.SPREADSHEET;
      if (['doc', 'docx', 'txt', 'rtf'].includes(ext)) return FILE_TYPE.DOCUMENT;
    }

    return FILE_TYPE.OTHER;
  }
}

export default FileModel;
