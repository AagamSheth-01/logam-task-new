/**
 * Attendance Repository
 * Wraps existing firebaseService attendance functions
 * Provides clean interface for attendance database operations
 */

import { BaseRepository } from './base.repository.js';
import {
  loadAttendanceRecords,
  markAttendance,
  getTodayAttendance,
  getAttendanceStats,
  updateAttendanceRecord,
  deleteAttendanceRecord,
  getAllUsersAttendanceSummary,
  exportAttendanceData
} from '../../lib/firebaseService.js';
import admin from 'firebase-admin';
import { adminDb } from '../../lib/firebase-admin.js';

export class AttendanceRepository extends BaseRepository {
  constructor() {
    super('attendance');
  }

  /**
   * Apply field mappings for frontend compatibility
   * Maps clockIn -> checkIn, workMode -> workType
   */
  applyFieldMappings(record) {
    if (!record) return record;

    // Add alternate field names for frontend compatibility
    if (record.clockIn && !record.checkIn) {
      record.checkIn = record.clockIn;
    }
    if (record.clockOut && !record.checkOut) {
      record.checkOut = record.clockOut;
    }
    if (record.workMode && !record.workType) {
      record.workType = record.workMode;
    }

    return record;
  }

  /**
   * Find attendance records by filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Array>} List of attendance records
   */
  async find(filters = {}) {
    try {
      const records = await loadAttendanceRecords(filters);
      // Apply field mappings to all records
      return (records || []).map(record => this.applyFieldMappings(record));
    } catch (error) {
      this.handleError(error, 'find attendance records');
    }
  }

  /**
   * Find attendance records for a user
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @param {Object} filters - Additional filters (dates, etc)
   * @returns {Promise<Array>} List of attendance records
   */
  async findByUser(username, tenantId, filters = {}) {
    try {
      const queryFilters = {
        username,
        tenantId,
        ...filters
      };
      return await this.find(queryFilters);
    } catch (error) {
      this.handleError(error, 'find attendance by user');
    }
  }

  /**
   * Get today's attendance for a user
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object|null>} Today's attendance record or null
   */
  async getTodayRecord(username, tenantId) {
    try {
      const record = await getTodayAttendance(username, tenantId);
      return record ? this.applyFieldMappings(record) : null;
    } catch (error) {
      this.handleError(error, 'get today attendance');
    }
  }

  /**
   * Mark attendance (clock in)
   * @param {Object} attendanceData - Attendance data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created attendance record
   */
  async create(attendanceData, tenantId) {
    try {
      const record = await markAttendance(attendanceData, tenantId);
      return record ? this.applyFieldMappings(record) : null;
    } catch (error) {
      this.handleError(error, 'mark attendance');
    }
  }

  /**
   * Clock out from attendance (update attendance record with clock out time)
   * @param {string} attendanceId - Attendance record ID
   * @param {string} clockOutTime - Clock out time
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated attendance record
   */
  async clockOut(attendanceId, clockOutTime, tenantId) {
    try {
      const updateData = {
        clockOut: clockOutTime,
        checkOut: clockOutTime  // For compatibility
      };
      const record = await updateAttendanceRecord(attendanceId, updateData, tenantId);
      return record ? this.applyFieldMappings(record) : null;
    } catch (error) {
      this.handleError(error, 'clock out');
    }
  }

  /**
   * Update attendance record
   * @param {string} attendanceId - Attendance record ID
   * @param {Object} updateData - Update data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated attendance record
   */
  async update(attendanceId, updateData, tenantId) {
    try {
      const record = await updateAttendanceRecord(attendanceId, updateData, tenantId);
      return record ? this.applyFieldMappings(record) : null;
    } catch (error) {
      this.handleError(error, 'update attendance record');
    }
  }

  /**
   * Get attendance statistics for a user
   * @param {Object} filters - Query filters (username, tenantId, dates)
   * @returns {Promise<Object>} Attendance statistics
   */
  async getStats(filters = {}) {
    try {
      const stats = await getAttendanceStats(filters);
      return stats || {};
    } catch (error) {
      this.handleError(error, 'get attendance stats');
    }
  }

  /**
   * Find attendance by date range
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} List of attendance records
   */
  async findByDateRange(username, tenantId, startDate, endDate) {
    try {
      const filters = {
        username,
        tenantId,
        startDate,
        endDate
      };
      return await this.find(filters);
    } catch (error) {
      this.handleError(error, 'find attendance by date range');
    }
  }

  /**
   * Check if attendance is marked for today
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<boolean>} True if marked
   */
  async isMarkedToday(username, tenantId) {
    try {
      const record = await this.getTodayRecord(username, tenantId);
      return !!record;
    } catch (error) {
      this.handleError(error, 'check if attendance marked today');
    }
  }

  /**
   * Delete attendance record
   * @param {string} attendanceId - Attendance record ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<void>}
   */
  async delete(attendanceId, tenantId) {
    try {
      await deleteAttendanceRecord(attendanceId, tenantId);
    } catch (error) {
      this.handleError(error, 'delete attendance record');
    }
  }

  /**
   * Get attendance summary for all users
   * @param {Object} filters - Query filters (tenantId, dates)
   * @returns {Promise<Array>} List of user attendance summaries
   */
  async getAllUsersSummary(filters = {}) {
    try {
      const summaries = await getAllUsersAttendanceSummary(filters);
      return summaries || [];
    } catch (error) {
      this.handleError(error, 'get all users attendance summary');
    }
  }

  /**
   * Export attendance data
   * @param {Object} filters - Query filters (tenantId, dates, format)
   * @returns {Promise<Object>} Export data
   */
  async exportData(filters = {}) {
    try {
      const exportData = await exportAttendanceData(filters);
      return exportData || { records: [], summary: {} };
    } catch (error) {
      this.handleError(error, 'export attendance data');
    }
  }

  /**
   * Mark auto-absent for users who didn't mark attendance
   * @param {string} tenantId - Organization ID
   * @param {string} date - Date to mark absent (YYYY-MM-DD)
   * @param {Array} excludeUsernames - Usernames to exclude from auto-absent
   * @returns {Promise<Array>} List of users marked absent
   */
  async markAutoAbsent(tenantId, date, excludeUsernames = []) {
    try {
      // This is a custom function that doesn't exist in firebaseService
      // We'll implement it here using existing functions

      // Get all users who marked attendance for the date
      const attendanceRecords = await this.find({ tenantId, date });
      const presentUsernames = attendanceRecords.map(record => record.username);

      // Filter out users who are excluded or already marked
      const usersToMarkAbsent = excludeUsernames.filter(
        username => !presentUsernames.includes(username)
      );

      // Mark each user as absent
      const absentRecords = [];
      for (const username of usersToMarkAbsent) {
        const absentData = {
          username,
          date,
          status: 'absent',
          markedAutomatically: true,
          clockIn: null,
          clockOut: null,
          workMode: null
        };

        const record = await this.create(absentData, tenantId);
        absentRecords.push(record);
      }

      return absentRecords;
    } catch (error) {
      this.handleError(error, 'mark auto absent');
    }
  }

  /**
   * Find attendance records with pagination
   * @param {Object} filters - Query filters
   * @param {number} page - Page number (1-based)
   * @param {number} pageSize - Number of records per page
   * @returns {Promise<Object>} Paginated results
   */
  async findPaginated(filters = {}, page = 1, pageSize = 30) {
    try {
      // Get all records matching filters
      const allRecords = await this.find(filters);

      // Calculate pagination
      const totalRecords = allRecords.length;
      const totalPages = Math.ceil(totalRecords / pageSize);
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;

      // Get page records
      const records = allRecords.slice(startIndex, endIndex);

      return {
        records,
        pagination: {
          currentPage: page,
          pageSize,
          totalRecords,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        }
      };
    } catch (error) {
      this.handleError(error, 'find paginated attendance');
    }
  }

  /**
   * Get monthly attendance summary for user
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @returns {Promise<Object>} Monthly summary
   */
  async getMonthlyAttendance(username, tenantId, year, month) {
    try {
      // Create start and end dates for the month
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

      // Calculate last day of month
      const lastDay = new Date(year, month, 0).getDate();
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

      const records = await this.findByDateRange(username, tenantId, startDate, endDate);

      // Calculate summary
      const summary = {
        totalDays: records.length,
        present: 0,
        absent: 0,
        halfDay: 0,
        leave: 0,
        workFromHome: 0,
        office: 0,
        records
      };

      records.forEach(record => {
        // Count by status
        if (record.status === 'present') summary.present++;
        else if (record.status === 'absent') summary.absent++;
        else if (record.status === 'half-day') summary.halfDay++;
        else if (record.status === 'leave') summary.leave++;

        // Count by work mode
        if (record.workMode === 'wfh' || record.workType === 'wfh') summary.workFromHome++;
        else if (record.workMode === 'office' || record.workType === 'office') summary.office++;
      });

      return summary;
    } catch (error) {
      this.handleError(error, 'get monthly attendance');
    }
  }

  /**
   * Get attendance count by tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<number>} Attendance record count
   */
  async countByTenant(tenantId) {
    try {
      const records = await this.find({ tenantId });
      return records.length;
    } catch (error) {
      this.handleError(error, 'count attendance by tenant');
    }
  }

  /**
   * Get attendance settings for tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object|null>} Attendance settings or null
   */
  async getSettings(tenantId) {
    try {
      const settingsDoc = await adminDb
        .collection('attendance_settings')
        .doc(tenantId)
        .get();

      if (!settingsDoc.exists) {
        return null;
      }

      return {
        id: settingsDoc.id,
        ...settingsDoc.data()
      };
    } catch (error) {
      this.handleError(error, 'get attendance settings');
    }
  }

  /**
   * Update attendance settings for tenant
   * @param {string} tenantId - Organization ID
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  async updateSettings(tenantId, settings) {
    try {
      const settingsRef = adminDb
        .collection('attendance_settings')
        .doc(tenantId);

      const settingsDoc = await settingsRef.get();

      const updatedSettings = {
        ...settings,
        tenantId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      };

      if (settingsDoc.exists) {
        // Update existing settings
        await settingsRef.update(updatedSettings);
      } else {
        // Create new settings with defaults
        updatedSettings.createdAt = admin.firestore.FieldValue.serverTimestamp();
        updatedSettings.deadlineHour = updatedSettings.deadlineHour ?? 12;
        updatedSettings.deadlineMinute = updatedSettings.deadlineMinute ?? 0;
        updatedSettings.autoMarkAbsent = updatedSettings.autoMarkAbsent ?? true;
        updatedSettings.autoMarkAbsentTime = updatedSettings.autoMarkAbsentTime ?? '23:59';
        updatedSettings.halfDayEnabled = updatedSettings.halfDayEnabled ?? false;

        await settingsRef.set(updatedSettings);
      }

      // Get and return the updated settings
      const updated = await settingsRef.get();
      return {
        id: updated.id,
        ...updated.data()
      };
    } catch (error) {
      this.handleError(error, 'update attendance settings');
    }
  }

  /**
   * Upsert attendance record
   * @param {Object} attendanceData - Attendance data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created/updated attendance record
   */
  async upsertAttendance(attendanceData, tenantId) {
    try {
      const docId = `${attendanceData.username}_${attendanceData.date}`;
      const attendanceRef = adminDb
        .collection('attendance')
        .doc(docId);

      const attendanceDoc = await attendanceRef.get();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      const data = {
        ...attendanceData,
        tenantId,
        updatedAt: timestamp
      };

      if (attendanceDoc.exists) {
        // Update existing record
        await attendanceRef.update(data);
      } else {
        // Create new record
        data.createdAt = timestamp;
        await attendanceRef.set(data);
      }

      // Return the updated document
      const updated = await attendanceRef.get();
      return {
        id: updated.id,
        ...updated.data()
      };
    } catch (error) {
      this.handleError(error, 'upsert attendance');
    }
  }

  /**
   * Upsert attendance record with full details
   * @param {Object} attendanceData - Complete attendance data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created/updated attendance record
   */
  async upsertAttendanceWithDetails(attendanceData, tenantId) {
    try {
      const docId = `${attendanceData.username}_${attendanceData.date}`;
      const attendanceRef = adminDb
        .collection('attendance')
        .doc(docId);

      const attendanceDoc = await attendanceRef.get();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      const data = {
        username: attendanceData.username,
        date: attendanceData.date,
        status: attendanceData.status,
        clockIn: attendanceData.clockIn || null,
        clockOut: attendanceData.clockOut || null,
        location: attendanceData.location || null,
        leaveType: attendanceData.leaveType || null,
        notes: attendanceData.notes || '',
        isHoliday: attendanceData.isHoliday || false,
        holidayName: attendanceData.holidayName || null,
        updatedBy: attendanceData.updatedBy || attendanceData.markedBy || null,
        tenantId,
        updatedAt: timestamp
      };

      if (attendanceDoc.exists) {
        // Update existing record
        await attendanceRef.update(data);
      } else {
        // Create new record
        data.createdAt = timestamp;
        await attendanceRef.set(data);
      }

      // Return the updated document
      const updated = await attendanceRef.get();
      return {
        id: updated.id,
        ...updated.data()
      };
    } catch (error) {
      this.handleError(error, 'upsert attendance with details');
    }
  }

  /**
   * Check if user exists for tenant
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<boolean>} Whether user exists
   */
  async userExists(username, tenantId) {
    try {
      const userSnapshot = await adminDb
        .collection('users')
        .where('username', '==', username)
        .where('tenantId', '==', tenantId)
        .get();

      return !userSnapshot.empty;
    } catch (error) {
      this.handleError(error, 'check user exists');
    }
  }

  /**
   * Get all active users for tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Array>} List of active users
   */
  async getAllActiveUsers(tenantId) {
    try {
      const usersSnapshot = await adminDb
        .collection('users')
        .where('tenantId', '==', tenantId)
        .where('isActive', '==', true)
        .get();

      return usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting active users:', error);
      // Return empty array if users collection doesn't exist or has no isActive field
      try {
        const usersSnapshot = await adminDb
          .collection('users')
          .where('tenantId', '==', tenantId)
          .get();

        return usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      } catch (fallbackError) {
        console.error('Fallback query also failed:', fallbackError);
        return [];
      }
    }
  }

  /**
   * Create holiday record
   * @param {Object} holidayData - Holiday data
   * @returns {Promise<Object>} Created holiday record
   */
  async createHoliday(holidayData) {
    try {
      const holidayRef = adminDb
        .collection('holidays')
        .doc(`${holidayData.tenantId}_${holidayData.date}`);

      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      const data = {
        ...holidayData,
        createdAt: timestamp
      };

      await holidayRef.set(data);

      // Return the created document
      const created = await holidayRef.get();
      return {
        id: created.id,
        ...created.data()
      };
    } catch (error) {
      this.handleError(error, 'create holiday');
    }
  }

  /**
   * Get attendance summary for a specific date
   * @param {string} tenantId - Organization ID
   * @param {string} date - Date to get summary for
   * @returns {Promise<Object>} Attendance summary
   */
  async getAttendanceSummaryForDate(tenantId, date) {
    try {
      const attendanceSnapshot = await adminDb
        .collection('attendance')
        .where('tenantId', '==', tenantId)
        .where('date', '==', date)
        .get();

      const summary = {
        date,
        total: 0,
        present: 0,
        absent: 0,
        leave: 0,
        halfDay: 0,
        late: 0,
        earlyOut: 0,
        holiday: false,
        holidayName: null
      };

      attendanceSnapshot.docs.forEach(doc => {
        const record = doc.data();
        summary.total++;

        switch (record.status) {
          case 'present':
            summary.present++;
            break;
          case 'absent':
            summary.absent++;
            break;
          case 'leave':
            summary.leave++;
            break;
          case 'half_day':
            summary.halfDay++;
            break;
          case 'late':
            summary.late++;
            break;
          case 'early_out':
            summary.earlyOut++;
            break;
        }

        if (record.isHoliday) {
          summary.holiday = true;
          summary.holidayName = record.holidayName;
        }
      });

      return summary;
    } catch (error) {
      this.handleError(error, 'get attendance summary for date');
    }
  }

  /**
   * Bulk update attendance for date range
   * @param {string} tenantId - Organization ID
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Update results
   */
  async bulkDateUpdate(tenantId, options) {
    try {
      const { username, startDate, endDate, status, location, updatedBy } = options;

      // Generate all dates in the range
      const dates = [];
      const start = new Date(startDate);
      const end = new Date(endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(new Date(d).toISOString().split('T')[0]);
      }

      let recordsCreated = 0;
      let recordsUpdated = 0;
      const skippedDays = [];

      // Process each date
      for (const date of dates) {
        try {
          // Check if record exists for this specific date
          const existingRecords = await loadAttendanceRecords({
            username,
            tenantId,
            startDate: date,
            endDate: date
          });
          const existingRecord = existingRecords && existingRecords.length > 0 ? existingRecords[0] : null;

          const attendanceData = {
            username,
            date,
            status,
            location: location || 'office',
            updatedBy: updatedBy || 'admin',
            updatedAt: new Date().toISOString(),
            tenantId
          };

          // Set default times based on status
          if (status === 'present') {
            attendanceData.clockIn = '09:00';
            attendanceData.clockOut = null; // Will be set when they clock out
          } else {
            attendanceData.clockIn = null;
            attendanceData.clockOut = null;
          }

          if (existingRecord) {
            // Update existing record
            await updateAttendanceRecord(existingRecord.id, attendanceData);
            recordsUpdated++;
          } else {
            // Create new record
            await markAttendance(attendanceData);
            recordsCreated++;
          }
        } catch (error) {
          console.error(`Failed to process date ${date}:`, error);
          skippedDays.push({ date, error: error.message });
        }
      }

      return {
        daysProcessed: dates.length,
        recordsCreated,
        recordsUpdated,
        skippedDays
      };
    } catch (error) {
      this.handleError(error, 'bulk date update');
    }
  }
}

export default AttendanceRepository;
