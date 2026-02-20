/**
 * Client Model
 * Defines client data structure and validation rules
 */

export const CLIENT_STATUS = {
  ACTIVE: 'Active',
  INACTIVE: 'Inactive',
  PROSPECT: 'Prospect',
  ON_HOLD: 'On Hold'
};

export const CLIENT_PRIORITY = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};

export const CONTACT_METHOD = {
  EMAIL: 'email',
  PHONE: 'phone',
  VIDEO: 'video',
  IN_PERSON: 'in-person'
};

export class ClientModel {
  constructor(data) {
    this.id = data.id || null;
    this.tenantId = data.tenantId;
    this.name = data.name;
    this.email = data.email || null;
    this.phone = data.phone || null;
    this.website = data.website || null;
    this.address = data.address || null;
    this.industry = data.industry || 'Other';
    this.status = data.status || CLIENT_STATUS.ACTIVE;
    this.priority = data.priority || CLIENT_PRIORITY.MEDIUM;
    this.description = data.description || '';

    // Contract details
    this.contractValue = data.contractValue || null;
    this.contractStart = data.contractStart || null;
    this.contractEnd = data.contractEnd || null;

    // Social media
    this.facebook = data.facebook || null;
    this.instagram = data.instagram || null;
    this.twitter = data.twitter || null;
    this.linkedin = data.linkedin || null;
    this.youtube = data.youtube || null;

    // Communication preferences
    this.timezone = data.timezone || 'America/New_York';
    this.preferredContact = data.preferredContact || CONTACT_METHOD.EMAIL;

    // Tags and notes
    this.tags = data.tags || [];
    this.notes = data.notes || '';

    // Assigned users
    this.assignedUsers = data.assignedUsers || [];

    // Metadata
    this.createdBy = data.createdBy || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();

    // Soft delete
    this.deletedAt = data.deletedAt || null;
    this.deletedBy = data.deletedBy || null;
  }

  /**
   * Convert to plain object for database storage
   */
  toObject() {
    return {
      ...(this.id && { id: this.id }),
      tenantId: this.tenantId,
      name: this.name,
      email: this.email,
      phone: this.phone,
      website: this.website,
      address: this.address,
      industry: this.industry,
      status: this.status,
      priority: this.priority,
      description: this.description,
      contractValue: this.contractValue,
      contractStart: this.contractStart,
      contractEnd: this.contractEnd,
      facebook: this.facebook,
      instagram: this.instagram,
      twitter: this.twitter,
      linkedin: this.linkedin,
      youtube: this.youtube,
      timezone: this.timezone,
      preferredContact: this.preferredContact,
      tags: this.tags,
      notes: this.notes,
      assignedUsers: this.assignedUsers,
      createdBy: this.createdBy,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      deletedAt: this.deletedAt,
      deletedBy: this.deletedBy
    };
  }

  /**
   * Check if client is active
   */
  isActive() {
    return this.status === CLIENT_STATUS.ACTIVE && !this.deletedAt;
  }

  /**
   * Check if contract is active
   */
  isContractActive() {
    if (!this.contractStart || !this.contractEnd) return false;

    const now = new Date();
    const start = new Date(this.contractStart);
    const end = new Date(this.contractEnd);

    return now >= start && now <= end;
  }

  /**
   * Validation rules
   */
  static validate(data, isUpdate = false) {
    const errors = [];

    if (!isUpdate) {
      // Required fields for creation
      if (!data.tenantId) {
        errors.push({ field: 'tenantId', message: 'Tenant ID is required' });
      }
      if (!data.name || !data.name.trim()) {
        errors.push({ field: 'name', message: 'Client name is required' });
      }
    }

    // Email validation (if provided)
    if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    // Phone validation (if provided)
    if (data.phone && data.phone.length > 0 && !/^[\d\s\-\+\(\)]+$/.test(data.phone)) {
      errors.push({ field: 'phone', message: 'Invalid phone format' });
    }

    // Website validation (if provided)
    if (data.website && data.website.length > 0) {
      try {
        new URL(data.website);
      } catch {
        errors.push({ field: 'website', message: 'Invalid website URL' });
      }
    }

    // Status validation
    if (data.status && !Object.values(CLIENT_STATUS).includes(data.status)) {
      errors.push({ field: 'status', message: 'Invalid client status' });
    }

    // Priority validation
    if (data.priority && !Object.values(CLIENT_PRIORITY).includes(data.priority)) {
      errors.push({ field: 'priority', message: 'Invalid priority level' });
    }

    // Contact method validation
    if (data.preferredContact && !Object.values(CONTACT_METHOD).includes(data.preferredContact)) {
      errors.push({ field: 'preferredContact', message: 'Invalid contact method' });
    }

    // Date validation
    if (data.contractStart && !/^\d{4}-\d{2}-\d{2}$/.test(data.contractStart)) {
      errors.push({ field: 'contractStart', message: 'Invalid contract start date format (YYYY-MM-DD)' });
    }

    if (data.contractEnd && !/^\d{4}-\d{2}-\d{2}$/.test(data.contractEnd)) {
      errors.push({ field: 'contractEnd', message: 'Invalid contract end date format (YYYY-MM-DD)' });
    }

    // Contract dates logic
    if (data.contractStart && data.contractEnd) {
      const start = new Date(data.contractStart);
      const end = new Date(data.contractEnd);
      if (end < start) {
        errors.push({ field: 'contractEnd', message: 'Contract end date must be after start date' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default ClientModel;
