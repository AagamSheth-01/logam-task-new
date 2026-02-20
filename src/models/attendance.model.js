/**
 * Attendance Model
 * Defines attendance data structure and validation rules
 */

import { ATTENDANCE_STATUS, WORK_TYPE } from '../utils/constants.js';

export class AttendanceModel {
  constructor(data) {
    this.id = data.id || null;
    this.tenantId = data.tenantId;
    this.username = data.username;
    this.date = data.date;
    this.clockIn = data.clockIn || null;
    this.clockOut = data.clockOut || null;
    this.checkIn = data.checkIn || data.clockIn || null; // Support both field names
    this.checkOut = data.checkOut || data.clockOut || null; // Support both field names
    this.workMode = data.workMode || data.workType || WORK_TYPE.OFFICE;
    this.workType = data.workType || data.workMode || WORK_TYPE.OFFICE; // Support both field names
    this.status = data.status || ATTENDANCE_STATUS.PRESENT;
    this.totalHours = data.totalHours || null;
    this.location = data.location || null;
    this.notes = data.notes || null;
    // Biometric authentication fields - HIDDEN
    // this.biometricAuth = data.biometricAuth || false;
    // this.biometricType = data.biometricType || null;
    // this.authTimestamp = data.authTimestamp || null;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  /**
   * Convert to plain object for database storage
   */
  toObject() {
    return {
      ...(this.id && { id: this.id }),
      tenantId: this.tenantId,
      username: this.username,
      date: this.date,
      clockIn: this.clockIn,
      clockOut: this.clockOut,
      workMode: this.workMode,
      status: this.status,
      totalHours: this.totalHours,
      location: this.location,
      notes: this.notes,
      // biometricAuth: this.biometricAuth, // HIDDEN
      // biometricType: this.biometricType, // HIDDEN
      // authTimestamp: this.authTimestamp, // HIDDEN
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Convert to API response format (with both field name formats)
   */
  toResponseObject() {
    const obj = this.toObject();
    // Add alternate field names for frontend compatibility
    obj.checkIn = obj.clockIn;
    obj.checkOut = obj.clockOut;
    obj.workType = obj.workMode;
    return obj;
  }

  /**
   * Calculate total hours between clock in and clock out
   */
  calculateTotalHours() {
    if (!this.clockIn || !this.clockOut) {
      return null;
    }

    const [inHour, inMin] = this.clockIn.split(':').map(Number);
    const [outHour, outMin] = this.clockOut.split(':').map(Number);

    const totalMinutes = (outHour * 60 + outMin) - (inHour * 60 + inMin);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}:${minutes.toString().padStart(2, '0')}`;
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
      if (!data.username || !data.username.trim()) {
        errors.push({ field: 'username', message: 'Username is required' });
      }
      if (!data.date) {
        errors.push({ field: 'date', message: 'Date is required' });
      }
    }

    // Date format validation (YYYY-MM-DD)
    if (data.date) {
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(data.date)) {
        errors.push({ field: 'date', message: 'Date must be in YYYY-MM-DD format' });
      }
    }

    // Work type validation (be more lenient)
    const workType = data.workMode || data.workType;
    if (workType) {
      const validTypes = Object.values(WORK_TYPE);
      if (!validTypes.includes(workType)) {
        errors.push({
          field: 'workType',
          message: `Invalid work type. Must be one of: ${validTypes.join(', ')}. Received: ${workType}`
        });
      }
    }

    // Status validation (be more lenient)
    if (data.status) {
      const validStatuses = Object.values(ATTENDANCE_STATUS);
      if (!validStatuses.includes(data.status)) {
        errors.push({
          field: 'status',
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}. Received: ${data.status}`
        });
      }
    }

    // Time format validation (support both HH:MM and HH:MM:SS)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
    if (data.clockIn && !timeRegex.test(data.clockIn)) {
      errors.push({ field: 'clockIn', message: `Invalid clock in time format. Expected HH:MM or HH:MM:SS. Received: ${data.clockIn}` });
    }
    if (data.clockOut && !timeRegex.test(data.clockOut)) {
      errors.push({ field: 'clockOut', message: `Invalid clock out time format. Expected HH:MM or HH:MM:SS. Received: ${data.clockOut}` });
    }

    // Log validation details for debugging
    if (errors.length > 0) {
      console.error('Attendance validation failed:', {
        data: JSON.stringify(data, null, 2),
        errors: errors
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default AttendanceModel;
