/**
 * Attendance Controller
 * Handles HTTP requests and responses for attendance management
 */

import { AttendanceService } from '../services/attendance.service.js';
import { ValidationError, NotFoundError, ConflictError } from '../utils/errors.js';

export class AttendanceController {
  constructor() {
    this.attendanceService = new AttendanceService();
  }

  /**
   * Get attendance records
   * GET /api/attendance
   */
  async getAttendanceRecords(req, res) {
    try {
      // Get tenantId from authenticated user or query parameter
      const tenantId = req.query.tenantId || req.user?.tenantId;
      const currentUser = req.user;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      // Build filters based on user role and query parameters
      const filters = { tenantId };

      // Add user-specific filtering if not admin requesting all users
      if (req.query.all !== 'true' || currentUser?.role !== 'admin') {
        filters.username = req.query.user || currentUser?.username;
      }

      // Add date filters if provided
      if (req.query.startDate) filters.startDate = req.query.startDate;
      if (req.query.endDate) filters.endDate = req.query.endDate;

      const records = await this.attendanceService.getAttendanceRecords(filters);

      res.json({
        success: true,
        data: records
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Get user attendance records
   * GET /api/attendance/user/:username
   */
  async getUserAttendance(req, res) {
    try {
      const { username } = req.params;
      const { tenantId, startDate, endDate, page, limit } = req.query;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const filters = {
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
        ...(page && { page: parseInt(page) }),
        ...(limit && { limit: parseInt(limit) })
      };

      const records = await this.attendanceService.getUserAttendance(username, tenantId, filters);

      res.json({
        success: true,
        data: records
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Get today's attendance for user
   * GET /api/attendance/today/:username
   */
  async getTodayAttendance(req, res) {
    try {
      const { username } = req.params;
      const { tenantId } = req.query;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const record = await this.attendanceService.getTodayAttendance(username, tenantId);

      res.json({
        success: true,
        data: record
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Mark attendance (clock in)
   * POST /api/attendance
   */
  async markAttendance(req, res) {
    try {
      // Get tenantId from authenticated user or query parameter
      const tenantId = req.query.tenantId || req.user?.tenantId;
      const currentUser = req.user;
      const attendanceData = req.body;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      // Add username from authenticated user if not provided
      if (!attendanceData.username && currentUser) {
        attendanceData.username = currentUser.username;
      }

      const record = await this.attendanceService.markAttendance(attendanceData, tenantId);

      res.status(201).json({
        success: true,
        message: 'Attendance marked successfully',
        data: record
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Clock out
   * PUT /api/attendance/clock-out/:username
   */
  async clockOut(req, res) {
    try {
      const { username } = req.params;
      const { tenantId } = req.query;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const record = await this.attendanceService.clockOut(username, tenantId);

      res.json({
        success: true,
        message: 'Clocked out successfully',
        data: record
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Get attendance statistics
   * GET /api/attendance/stats
   */
  async getAttendanceStats(req, res) {
    try {
      const { tenantId, username, startDate, endDate } = req.query;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const filters = {
        tenantId,
        ...(username && { username }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      };

      const stats = await this.attendanceService.getAttendanceStats(filters);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Get attendance summary
   * GET /api/attendance/summary/:username
   */
  async getAttendanceSummary(req, res) {
    try {
      const { username } = req.params;
      const { tenantId, startDate, endDate } = req.query;

      if (!tenantId || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID, start date, and end date are required'
        });
      }

      const summary = await this.attendanceService.getAttendanceSummary(username, tenantId, startDate, endDate);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Get monthly attendance
   * GET /api/attendance/monthly/:username
   */
  async getMonthlyAttendance(req, res) {
    try {
      const { username } = req.params;
      const { tenantId, year, month } = req.query;

      if (!tenantId || !year || !month) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID, year, and month are required'
        });
      }

      const monthlyData = await this.attendanceService.getMonthlyAttendance(
        username,
        tenantId,
        parseInt(year),
        parseInt(month)
      );

      res.json({
        success: true,
        data: monthlyData
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Update attendance record
   * PUT /api/attendance/:id
   */
  async updateAttendanceRecord(req, res) {
    try {
      const { id } = req.params;
      const { tenantId } = req.query;
      const updateData = req.body;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const updatedRecord = await this.attendanceService.updateAttendanceRecord(id, updateData, tenantId);

      res.json({
        success: true,
        message: 'Attendance record updated successfully',
        data: updatedRecord
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Delete attendance record
   * DELETE /api/attendance/:id
   */
  async deleteAttendanceRecord(req, res) {
    try {
      const { id } = req.params;
      const { tenantId } = req.query;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      await this.attendanceService.deleteAttendanceRecord(id, tenantId);

      res.json({
        success: true,
        message: 'Attendance record deleted successfully'
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Get paginated attendance records
   * GET /api/attendance/paginated
   */
  async getPaginatedAttendance(req, res) {
    try {
      const { tenantId, page = 1, pageSize = 30, ...filters } = req.query;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const result = await this.attendanceService.getPaginatedAttendance(
        tenantId,
        filters,
        parseInt(page),
        parseInt(pageSize)
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Export attendance data
   * GET /api/attendance/export
   */
  async exportAttendanceData(req, res) {
    try {
      const { tenantId, format = 'json', ...filters } = req.query;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const exportData = await this.attendanceService.exportAttendanceData(tenantId, {
        ...filters,
        format
      });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="attendance-export.csv"');
      }

      res.json({
        success: true,
        data: exportData
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Mark auto-absent for users
   * POST /api/attendance/auto-absent
   */
  async markAutoAbsent(req, res) {
    try {
      const { tenantId, date, usernames } = req.body;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      if (!usernames || !Array.isArray(usernames)) {
        return res.status(400).json({
          success: false,
          message: 'List of usernames is required'
        });
      }

      const absentRecords = await this.attendanceService.markAutoAbsent(tenantId, date, usernames);

      res.json({
        success: true,
        message: `Marked ${absentRecords.length} users as absent`,
        data: absentRecords
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Get attendance settings
   * GET /api/attendance/settings
   */
  async getAttendanceSettings(req, res) {
    try {
      const { tenantId } = req.query;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const settings = await this.attendanceService.getAttendanceSettings(tenantId);

      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Update attendance settings
   * PUT /api/attendance/settings
   */
  async updateAttendanceSettings(req, res) {
    try {
      const { tenantId } = req.query;
      const settings = req.body;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const updatedSettings = await this.attendanceService.updateAttendanceSettings(tenantId, settings);

      res.json({
        success: true,
        message: 'Attendance settings updated successfully',
        data: updatedSettings
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Bulk update attendance (Admin only)
   * POST /api/attendance/bulk-update
   */
  async bulkUpdateAttendance(req, res) {
    try {
      const { tenantId } = req.query;
      const attendanceData = req.body;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const result = await this.attendanceService.bulkUpdateAttendance(attendanceData, tenantId);

      res.json({
        success: true,
        message: 'Attendance updated successfully',
        data: result
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Mark holiday and auto-present all users
   * POST /api/attendance/mark-holiday
   */
  async markHoliday(req, res) {
    try {
      const holidayData = req.body;

      if (!holidayData.tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const result = await this.attendanceService.markHoliday(holidayData);

      res.json({
        success: true,
        message: `Holiday marked successfully. ${result.usersMarkedPresent} users marked present.`,
        data: result
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Fix past holiday attendance
   * POST /api/attendance/fix-past-holidays
   */
  async fixPastHolidayAttendance(req, res) {
    try {
      const { tenantId } = req.body;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const result = await this.attendanceService.fixPastHolidayAttendance(tenantId);

      res.json({
        success: true,
        message: `Fixed ${result.issuesFixed} attendance records across ${result.datesChecked} dates`,
        data: result
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Bulk date update for a user
   * POST /api/attendance/bulk-date-update
   */
  async bulkDateUpdate(req, res) {
    try {
      const { tenantId } = req.query;
      const options = req.body;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      const result = await this.attendanceService.bulkDateUpdate(tenantId, options);

      res.json({
        success: true,
        message: 'Bulk update completed successfully',
        data: result
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /**
   * Handle errors and send appropriate response
   */
  handleError(res, error) {
    console.error('Attendance Controller Error:', error);

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        message: error.message,
        errors: error.errors
      });
    }

    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error instanceof ConflictError) {
      return res.status(409).json({
        success: false,
        message: error.message
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

export default AttendanceController;