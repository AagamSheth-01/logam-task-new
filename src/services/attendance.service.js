/**
 * Attendance Service
 * Contains business logic for attendance management
 * Uses AttendanceRepository for data access
 */

import { AttendanceRepository } from '../repositories/attendance.repository.js';
import { AttendanceModel } from '../models/attendance.model.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';

export class AttendanceService {
  constructor() {
    this.attendanceRepository = new AttendanceRepository();
  }

  /**
   * Get attendance records with filters
   * @param {Object} filters - Query filters
   * @returns {Promise<Array>} List of attendance records
   */
  async getAttendanceRecords(filters = {}) {
    const records = await this.attendanceRepository.find(filters);
    return records.map(record => new AttendanceModel(record).toResponseObject());
  }

  /**
   * Get attendance records for a user
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @param {Object} filters - Additional filters (dates, etc)
   * @returns {Promise<Array>} List of attendance records
   */
  async getUserAttendance(username, tenantId, filters = {}) {
    if (!username || !tenantId) {
      throw new ValidationError('Username and tenant ID are required');
    }

    const records = await this.attendanceRepository.findByUser(username, tenantId, filters);
    return records.map(record => new AttendanceModel(record).toResponseObject());
  }

  /**
   * Get today's attendance for a user
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object|null>} Today's attendance record or null
   */
  async getTodayAttendance(username, tenantId) {
    if (!username || !tenantId) {
      throw new ValidationError('Username and tenant ID are required');
    }

    const record = await this.attendanceRepository.getTodayRecord(username, tenantId);

    if (!record) return null;

    return new AttendanceModel(record).toResponseObject();
  }

  /**
   * Mark attendance (clock in)
   * @param {Object} attendanceData - Attendance data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Created attendance record
   */
  async markAttendance(attendanceData, tenantId) {
    // Check if organization requires biometric authentication - HIDDEN
    // try {
    //   const settings = await this.getAttendanceSettings(tenantId);
    //   const biometricRequired = settings?.biometricRequired || false;

    //   // If biometric is required but not provided, throw error
    //   if (biometricRequired && !attendanceData.biometricAuth) {
    //     throw new ValidationError('Biometric authentication is required for clock-in');
    //   }
    // } catch (error) {
    //   // Temporarily skip biometric check if settings can't be loaded
    //   console.warn('Failed to load attendance settings, skipping biometric check:', error.message);
    // }

    // Prepare data with required fields and normalize field names
    const normalizedData = {
      tenantId: tenantId,
      username: attendanceData.username,
      date: attendanceData.date,
      workMode: attendanceData.workType || attendanceData.workMode || 'office',
      workType: attendanceData.workType || attendanceData.workMode || 'office',
      status: attendanceData.status || 'present',
      clockIn: attendanceData.clockIn,
      notes: attendanceData.notes || '',
      location: attendanceData.location || '',
      // Add biometric data if provided - HIDDEN
      // biometricAuth: attendanceData.biometricAuth || false,
      // biometricType: attendanceData.biometricType || null,
      authTimestamp: attendanceData.authTimestamp || null
    };

    // Validate normalized data
    const validation = AttendanceModel.validate(normalizedData);
    if (!validation.isValid) {
      throw new ValidationError('Invalid attendance data', validation.errors);
    }

    // Check if already marked today
    const todayRecord = await this.attendanceRepository.getTodayRecord(
      attendanceData.username,
      tenantId
    );

    if (todayRecord) {
      throw new ConflictError('Attendance already marked for today');
    }

    // Create attendance model and save using original repository
    const attendanceModel = new AttendanceModel(normalizedData);
    const newRecord = await this.attendanceRepository.create(
      attendanceModel.toObject(),
      tenantId
    );

    // Send WhatsApp notification if WFH clock-in
    const workType = normalizedData.workType;
    if (workType === 'wfh') {
      try {
        const { sendWFHAttendanceNotification } = await import('../../lib/whatsappService.js');
        await sendWFHAttendanceNotification({
          username: normalizedData.username,
          workType: workType,
          clockIn: newRecord.clockIn || newRecord.checkIn,
          date: newRecord.date,
          status: newRecord.status
        });
        console.log(`WhatsApp notification sent for WFH clock in: ${normalizedData.username}`);
      } catch (whatsappError) {
        console.warn('WhatsApp notification failed:', whatsappError);
        // Don't fail the attendance marking if WhatsApp fails
      }
    }

    return new AttendanceModel(newRecord).toResponseObject();
  }

  /**
   * Clock out from attendance
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated attendance record
   */
  async clockOut(username, tenantId) {
    if (!username || !tenantId) {
      throw new ValidationError('Username and tenant ID are required');
    }

    // Check if attendance is marked today
    const todayRecord = await this.attendanceRepository.getTodayRecord(username, tenantId);

    if (!todayRecord) {
      throw new NotFoundError('No attendance record found for today');
    }

    if (todayRecord.clockOut || todayRecord.checkOut) {
      throw new ConflictError('Already clocked out for today');
    }

    // Get current time in India timezone for clock out
    const nowInIndia = new Date();
    const indiaOffset = 5.5 * 60; // 5 hours 30 minutes in minutes
    const utc = nowInIndia.getTime() + (nowInIndia.getTimezoneOffset() * 60000);
    const indiaTime = new Date(utc + (indiaOffset * 60000));
    const clockOutTime = `${indiaTime.getHours().toString().padStart(2, '0')}:${indiaTime.getMinutes().toString().padStart(2, '0')}`;

    // Update the record with clock out time and calculate total hours
    const updatedRecord = await this.attendanceRepository.clockOut(todayRecord.id, clockOutTime, tenantId);

    // Send WhatsApp notification if WFH
    const workType = updatedRecord.workType || updatedRecord.workMode;
    if (workType === 'wfh') {
      try {
        const { sendWFHAttendanceNotification } = await import('../../lib/whatsappService.js');
        await sendWFHAttendanceNotification({
          username: updatedRecord.username,
          workType: workType,
          clockOut: updatedRecord.clockOut || updatedRecord.checkOut,
          clockIn: updatedRecord.clockIn || updatedRecord.checkIn,
          date: updatedRecord.date,
          status: updatedRecord.status
        });
        console.log(`WhatsApp notification sent for WFH clock out: ${username}`);
      } catch (whatsappError) {
        console.warn('WhatsApp notification failed:', whatsappError);
        // Don't fail the clock out if WhatsApp fails
      }
    }

    return new AttendanceModel(updatedRecord).toResponseObject();
  }

  /**
   * Get attendance statistics
   * @param {Object} filters - Query filters (username, tenantId, dates)
   * @returns {Promise<Object>} Attendance statistics
   */
  async getAttendanceStats(filters = {}) {
    const stats = await this.attendanceRepository.getStats(filters);
    return stats;
  }

  /**
   * Get attendance by date range
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Array>} List of attendance records
   */
  async getAttendanceByDateRange(username, tenantId, startDate, endDate) {
    if (!username || !tenantId || !startDate || !endDate) {
      throw new ValidationError('Username, tenant ID, start date, and end date are required');
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate) || !dateRegex.test(endDate)) {
      throw new ValidationError('Invalid date format. Use YYYY-MM-DD');
    }

    const records = await this.attendanceRepository.findByDateRange(
      username,
      tenantId,
      startDate,
      endDate
    );

    return records.map(record => new AttendanceModel(record).toResponseObject());
  }

  /**
   * Check if attendance is marked for today
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @returns {Promise<boolean>} True if marked
   */
  async isMarkedToday(username, tenantId) {
    if (!username || !tenantId) {
      throw new ValidationError('Username and tenant ID are required');
    }

    return await this.attendanceRepository.isMarkedToday(username, tenantId);
  }

  /**
   * Calculate attendance summary for a user
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Attendance summary
   */
  async getAttendanceSummary(username, tenantId, startDate, endDate) {
    const records = await this.getAttendanceByDateRange(username, tenantId, startDate, endDate);

    const summary = {
      totalDays: records.length,
      present: 0,
      absent: 0,
      halfDay: 0,
      wfh: 0,
      office: 0,
      totalHours: 0,
      averageHours: 0
    };

    records.forEach(record => {
      // Count by status
      if (record.status === 'present') summary.present++;
      if (record.status === 'absent') summary.absent++;
      if (record.status === 'half-day') summary.halfDay++;

      // Count by work type
      if (record.workType === 'wfh') summary.wfh++;
      if (record.workType === 'office') summary.office++;

      // Calculate total hours
      if (record.totalHours) {
        const [hours, minutes] = record.totalHours.split(':').map(Number);
        summary.totalHours += hours + (minutes / 60);
      }
    });

    // Calculate average hours
    if (summary.totalDays > 0) {
      summary.averageHours = (summary.totalHours / summary.totalDays).toFixed(2);
    }

    // Format total hours
    summary.totalHours = summary.totalHours.toFixed(2);

    return summary;
  }

  /**
   * Get monthly attendance for a user
   * @param {string} username - Username
   * @param {string} tenantId - Organization ID
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @returns {Promise<Object>} Monthly attendance data
   */
  async getMonthlyAttendance(username, tenantId, year, month) {
    if (!username || !tenantId || !year || !month) {
      throw new ValidationError('Username, tenant ID, year, and month are required');
    }

    // Use repository method for consistency
    const monthlyData = await this.attendanceRepository.getMonthlyAttendance(
      username,
      tenantId,
      year,
      month
    );

    // Map records to response format
    monthlyData.records = monthlyData.records.map(
      record => new AttendanceModel(record).toResponseObject()
    );

    return {
      year,
      month,
      ...monthlyData
    };
  }

  /**
   * Delete attendance record
   * @param {string} attendanceId - Attendance record ID
   * @param {string} tenantId - Organization ID
   * @returns {Promise<void>}
   */
  async deleteAttendanceRecord(attendanceId, tenantId) {
    if (!attendanceId || !tenantId) {
      throw new ValidationError('Attendance ID and tenant ID are required');
    }

    // You could add additional validation here (e.g., check if record exists)
    await this.attendanceRepository.delete(attendanceId, tenantId);
  }

  /**
   * Get attendance summary for all users
   * @param {string} tenantId - Organization ID
   * @param {Object} filters - Additional filters (dates)
   * @returns {Promise<Array>} List of user attendance summaries
   */
  async getAllUsersSummary(tenantId, filters = {}) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const summaries = await this.attendanceRepository.getAllUsersSummary({
      ...filters,
      tenantId
    });

    return summaries;
  }

  /**
   * Export attendance data
   * @param {string} tenantId - Organization ID
   * @param {Object} filters - Filter options (dates, format)
   * @returns {Promise<Object>} Export data
   */
  async exportAttendanceData(tenantId, filters = {}) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const exportData = await this.attendanceRepository.exportData({
      ...filters,
      tenantId
    });

    // Map records to response format
    if (exportData.records) {
      exportData.records = exportData.records.map(
        record => new AttendanceModel(record).toResponseObject()
      );
    }

    return exportData;
  }

  /**
   * Mark auto-absent for users who didn't mark attendance
   * @param {string} tenantId - Organization ID
   * @param {string} date - Date to mark absent (YYYY-MM-DD, defaults to today)
   * @param {Array} allUsernames - List of all active usernames in the organization
   * @returns {Promise<Array>} List of users marked absent
   */
  async markAutoAbsent(tenantId, date = null, allUsernames = []) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    if (!allUsernames || allUsernames.length === 0) {
      throw new ValidationError('List of active usernames is required');
    }

    // Use today if date not provided
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(targetDate)) {
      throw new ValidationError('Invalid date format. Use YYYY-MM-DD');
    }

    const absentRecords = await this.attendanceRepository.markAutoAbsent(
      tenantId,
      targetDate,
      allUsernames
    );

    return absentRecords.map(record => new AttendanceModel(record).toResponseObject());
  }

  /**
   * Get paginated attendance records
   * @param {string} tenantId - Organization ID
   * @param {Object} filters - Additional filters
   * @param {number} page - Page number (1-based)
   * @param {number} pageSize - Number of records per page
   * @returns {Promise<Object>} Paginated results
   */
  async getPaginatedAttendance(tenantId, filters = {}, page = 1, pageSize = 30) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    if (page < 1) {
      throw new ValidationError('Page number must be at least 1');
    }

    if (pageSize < 1 || pageSize > 100) {
      throw new ValidationError('Page size must be between 1 and 100');
    }

    const result = await this.attendanceRepository.findPaginated(
      { ...filters, tenantId },
      page,
      pageSize
    );

    // Map records to response format
    result.records = result.records.map(
      record => new AttendanceModel(record).toResponseObject()
    );

    return result;
  }

  /**
   * Update attendance record
   * @param {string} attendanceId - Attendance record ID
   * @param {Object} updateData - Update data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated attendance record
   */
  async updateAttendanceRecord(attendanceId, updateData, tenantId) {
    if (!attendanceId || !tenantId) {
      throw new ValidationError('Attendance ID and tenant ID are required');
    }

    // Validate update data
    const validation = AttendanceModel.validate(updateData, true);
    if (!validation.isValid) {
      throw new ValidationError('Invalid update data', validation.errors);
    }

    const updatedRecord = await this.attendanceRepository.update(
      attendanceId,
      updateData,
      tenantId
    );

    if (!updatedRecord) {
      throw new NotFoundError('Attendance record not found');
    }

    return new AttendanceModel(updatedRecord).toResponseObject();
  }

  /**
   * Get attendance count for tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<number>} Attendance record count
   */
  async getAttendanceCount(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    return await this.attendanceRepository.countByTenant(tenantId);
  }

  /**
   * Get attendance settings for tenant
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Attendance settings
   */
  async getAttendanceSettings(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    const settings = await this.attendanceRepository.getSettings(tenantId);

    // Return default settings if not found
    if (!settings) {
      return {
        tenantId,
        deadlineHour: 12, // 12 PM noon
        deadlineMinute: 0,
        autoMarkAbsent: true,
        autoMarkAbsentTime: '23:59',
        halfDayEnabled: false
      };
    }

    return settings;
  }

  /**
   * Update attendance settings for tenant
   * @param {string} tenantId - Organization ID
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  async updateAttendanceSettings(tenantId, settings) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    // Validate settings
    if (settings.deadlineHour !== undefined) {
      if (settings.deadlineHour < 0 || settings.deadlineHour > 23) {
        throw new ValidationError('Deadline hour must be between 0 and 23');
      }
    }

    if (settings.deadlineMinute !== undefined) {
      if (settings.deadlineMinute < 0 || settings.deadlineMinute > 59) {
        throw new ValidationError('Deadline minute must be between 0 and 59');
      }
    }

    const updatedSettings = await this.attendanceRepository.updateSettings(tenantId, settings);
    return updatedSettings;
  }

  /**
   * Bulk update attendance records (Admin only)
   * @param {Object} attendanceData - Attendance data to update
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated attendance record
   */
  async bulkUpdateAttendance(attendanceData, tenantId) {
    if (!attendanceData.username || !attendanceData.date || !tenantId) {
      throw new ValidationError('Username, date, and tenant ID are required');
    }

    // Validate attendance data
    const validation = AttendanceModel.validate({...attendanceData, tenantId});
    if (!validation.isValid) {
      throw new ValidationError('Invalid attendance data', validation.errors);
    }

    // Update or create attendance record
    const result = await this.attendanceRepository.upsertAttendance(attendanceData, tenantId);
    return new AttendanceModel(result).toResponseObject();
  }

  /**
   * Update individual attendance record (Admin only)
   * @param {Object} attendanceData - Complete attendance data
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Updated attendance record
   */
  async updateAttendanceRecord(attendanceData, tenantId) {
    if (!attendanceData.username || !attendanceData.date || !tenantId) {
      throw new ValidationError('Username, date, and tenant ID are required');
    }

    // Validate attendance data
    const validation = AttendanceModel.validate({...attendanceData, tenantId});
    if (!validation.isValid) {
      throw new ValidationError('Invalid attendance data', validation.errors);
    }

    // Check if user exists for the tenant
    const userExists = await this.attendanceRepository.userExists(attendanceData.username, tenantId);
    if (!userExists) {
      throw new NotFoundError(`User ${attendanceData.username} not found in organization`);
    }

    // Update attendance record with all details
    const result = await this.attendanceRepository.upsertAttendanceWithDetails(attendanceData, tenantId);
    return new AttendanceModel(result).toResponseObject();
  }

  /**
   * Mark holiday and auto-present all users
   * @param {Object} holidayData - Holiday data
   * @returns {Promise<Object>} Holiday creation result
   */
  async markHoliday(holidayData) {
    const { date, holidayName, markAllPresent, markedBy, tenantId } = holidayData;

    if (!date || !holidayName || !tenantId) {
      throw new ValidationError('Date, holiday name, and tenant ID are required');
    }

    try {
      // First, mark the holiday
      const holiday = await this.attendanceRepository.createHoliday({
        date,
        name: holidayName,
        tenantId,
        createdBy: markedBy,
        createdAt: new Date().toISOString()
      });

      let usersMarkedPresent = 0;

      if (markAllPresent) {
        // Get all active users for the tenant
        const users = await this.attendanceRepository.getAllActiveUsers(tenantId);

        // Mark all users as present for the holiday
        const attendancePromises = users.map(async (user) => {
          const attendanceData = {
            username: user.username,
            date,
            status: 'present',
            clockIn: '09:00',
            clockOut: '18:00',
            location: 'office',
            notes: `Holiday: ${holidayName}`,
            isHoliday: true,
            holidayName,
            markedBy,
            tenantId,
            createdAt: new Date().toISOString()
          };

          try {
            await this.attendanceRepository.upsertAttendanceWithDetails(attendanceData, tenantId);
            return true;
          } catch (error) {
            console.error(`Failed to mark ${user.username} present for holiday:`, error);
            return false;
          }
        });

        const results = await Promise.all(attendancePromises);
        usersMarkedPresent = results.filter(Boolean).length;
      }

      return {
        holiday,
        usersMarkedPresent
      };
    } catch (error) {
      console.error('Mark holiday error:', error);
      throw new Error(`Failed to mark holiday: ${error.message}`);
    }
  }

  /**
   * Get attendance summary for admin dashboard
   * @param {string} tenantId - Organization ID
   * @param {string} date - Date to get summary for
   * @returns {Promise<Object>} Attendance summary
   */
  async getAttendanceSummary(tenantId, date) {
    if (!tenantId || !date) {
      throw new ValidationError('Tenant ID and date are required');
    }

    try {
      const summary = await this.attendanceRepository.getAttendanceSummaryForDate(tenantId, date);
      return summary;
    } catch (error) {
      console.error('Get attendance summary error:', error);
      throw new Error(`Failed to get attendance summary: ${error.message}`);
    }
  }

  /**
   * Fix past holiday attendance records to ensure all users are marked present
   * @param {string} tenantId - Organization ID
   * @returns {Promise<Object>} Fix results
   */
  async fixPastHolidayAttendance(tenantId) {
    if (!tenantId) {
      throw new ValidationError('Tenant ID is required');
    }

    try {
      console.log(`Starting past holiday attendance fix for tenant: ${tenantId}`);

      // Get date range for checking (last 6 months to present)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const today = new Date();

      // Get all Sundays in the date range
      const sundays = this.getSundaysInDateRange(sixMonthsAgo, today);

      // Known holidays (add more as needed)
      const knownHolidays = [
        { date: '2024-08-15', name: 'Independence Day' },
        { date: '2024-10-02', name: 'Gandhi Jayanti' },
        { date: '2024-12-25', name: 'Christmas' },
        { date: '2025-01-26', name: 'Republic Day' },
      ];

      // Combine holidays and Sundays
      const allHolidayDates = [
        ...knownHolidays.map(h => ({ date: new Date(h.date), name: h.name, type: 'holiday' })),
        ...sundays.map(s => ({ date: s, name: 'Sunday', type: 'sunday' }))
      ].filter(h => h.date >= sixMonthsAgo && h.date <= today);

      console.log(`Checking ${allHolidayDates.length} holiday/Sunday dates`);

      // Get all active users for the tenant
      const users = await this.attendanceRepository.getAllActiveUsers(tenantId);
      console.log(`Found ${users.length} active users`);

      let totalIssuesFound = 0;
      let totalIssuesFixed = 0;
      const holidayDates = [];

      // Check each holiday date
      for (const holidayInfo of allHolidayDates) {
        const { date: holidayDate, name: holidayName, type } = holidayInfo;
        const dateStr = holidayDate.toISOString().split('T')[0];

        holidayDates.push({
          date: dateStr,
          name: holidayName,
          type
        });

        // Get existing attendance records for this date
        const existingRecords = await this.attendanceRepository.getAttendanceByDate(tenantId, dateStr);

        // Create a map of existing records
        const recordsMap = new Map();
        existingRecords.forEach(record => {
          recordsMap.set(record.username, record);
        });

        let dateIssuesFound = 0;
        let dateIssuesFixed = 0;

        // Check each user for this holiday
        for (const user of users) {
          const existingRecord = recordsMap.get(user.username);

          if (!existingRecord) {
            // No record exists - create present record for holiday
            const attendanceData = {
              username: user.username,
              date: dateStr,
              status: 'present',
              clockIn: '09:00',
              clockOut: '17:00',
              location: 'office',
              notes: `${type === 'sunday' ? 'Sunday' : 'Holiday'} - Auto marked present`,
              tenantId
            };

            await this.attendanceRepository.upsertAttendanceWithDetails(attendanceData, tenantId);
            dateIssuesFound++;
            dateIssuesFixed++;

          } else if (existingRecord.status === 'absent') {
            // Record exists but marked as absent - fix it
            const updatedData = {
              ...existingRecord,
              status: 'present',
              clockIn: existingRecord.clockIn || '09:00',
              clockOut: existingRecord.clockOut || '17:00',
              location: existingRecord.location || 'office',
              notes: existingRecord.notes || `${type === 'sunday' ? 'Sunday' : 'Holiday'} - Fixed from absent to present`
            };

            await this.attendanceRepository.upsertAttendanceWithDetails(updatedData, tenantId);
            dateIssuesFound++;
            dateIssuesFixed++;
          }
          // If already present or other status, no action needed
        }

        totalIssuesFound += dateIssuesFound;
        totalIssuesFixed += dateIssuesFixed;

        console.log(`${holidayName} (${dateStr}): ${dateIssuesFound} issues found, ${dateIssuesFixed} fixed`);
      }

      const result = {
        datesChecked: allHolidayDates.length,
        issuesFound: totalIssuesFound,
        issuesFixed: totalIssuesFixed,
        holidayDates,
        summary: {
          tenantId,
          usersChecked: users.length,
          dateRange: {
            from: sixMonthsAgo.toISOString().split('T')[0],
            to: today.toISOString().split('T')[0]
          },
          sundays: sundays.length,
          holidays: knownHolidays.length
        }
      };

      console.log(`Past holiday fix completed: ${totalIssuesFixed} records fixed across ${allHolidayDates.length} dates`);
      return result;

    } catch (error) {
      console.error('Fix past holiday attendance error:', error);
      throw new Error(`Failed to fix past holiday attendance: ${error.message}`);
    }
  }

  /**
   * Helper function to get all Sundays in date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Array} Array of Sunday dates
   */
  getSundaysInDateRange(startDate, endDate) {
    const sundays = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      if (current.getDay() === 0) { // 0 = Sunday
        sundays.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }

    return sundays;
  }

  /**
   * Bulk update attendance for multiple dates for a single user
   * @param {string} tenantId - Organization ID
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Update results
   */
  async bulkDateUpdate(tenantId, options) {
    const { username, startDate, endDate, status, location, updatedBy } = options;

    if (!tenantId || !username || !startDate || !endDate || !status) {
      throw new ValidationError('Tenant ID, username, start date, end date, and status are required');
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start > end) {
      throw new ValidationError('Start date cannot be after end date');
    }

    const result = await this.attendanceRepository.bulkDateUpdate(tenantId, {
      username,
      startDate,
      endDate,
      status,
      location: location || 'office',
      updatedBy: updatedBy || 'admin'
    });

    return result;
  }
}

export default AttendanceService;
