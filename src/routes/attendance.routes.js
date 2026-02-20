/**
 * Attendance Routes
 * MVC route definitions for attendance management
 * Uses AttendanceController for request handling
 */

import { AttendanceController } from '../controllers/attendance.controller.js';

export class AttendanceRoutes {
  constructor() {
    this.controller = new AttendanceController();

    // Bind methods to maintain context
    this.bindMethods();
  }

  bindMethods() {
    const methods = [
      'getAttendanceRecords',
      'getUserAttendance',
      'getTodayAttendance',
      'markAttendance',
      'clockOut',
      'getAttendanceStats',
      'getAttendanceSummary',
      'getMonthlyAttendance',
      'updateAttendanceRecord',
      'deleteAttendanceRecord',
      'getPaginatedAttendance',
      'exportAttendanceData',
      'markAutoAbsent',
      'getAttendanceSettings',
      'updateAttendanceSettings',
      'bulkUpdateAttendance',
      'markHoliday',
      'fixPastHolidayAttendance',
      'bulkDateUpdate'
    ];

    methods.forEach(method => {
      this.controller[method] = this.controller[method].bind(this.controller);
    });
  }

  /**
   * Configure routes for Next.js API
   */
  configureRoutes() {
    return {
      // Base attendance routes
      '/api/attendance': {
        GET: this.controller.getAttendanceRecords,
        POST: this.controller.markAttendance
      },

      // User-specific routes
      '/api/attendance/user/[username]': {
        GET: this.controller.getUserAttendance
      },

      '/api/attendance/today/[username]': {
        GET: this.controller.getTodayAttendance
      },

      // Clock out
      '/api/attendance/clock-out/[username]': {
        PUT: this.controller.clockOut
      },

      // Statistics and summaries
      '/api/attendance/stats': {
        GET: this.controller.getAttendanceStats
      },

      '/api/attendance/summary/[username]': {
        GET: this.controller.getAttendanceSummary
      },

      '/api/attendance/monthly/[username]': {
        GET: this.controller.getMonthlyAttendance
      },

      // Individual record operations
      '/api/attendance/[id]': {
        PUT: this.controller.updateAttendanceRecord,
        DELETE: this.controller.deleteAttendanceRecord
      },

      // Pagination and export
      '/api/attendance/paginated': {
        GET: this.controller.getPaginatedAttendance
      },

      '/api/attendance/export': {
        GET: this.controller.exportAttendanceData
      },

      // Admin operations
      '/api/attendance/auto-absent': {
        POST: this.controller.markAutoAbsent
      },

      '/api/attendance/bulk-update': {
        POST: this.controller.bulkUpdateAttendance
      },

      '/api/attendance/bulk-date-update': {
        POST: this.controller.bulkDateUpdate
      },

      '/api/attendance/mark-holiday': {
        POST: this.controller.markHoliday
      },

      '/api/attendance/fix-past-holidays': {
        POST: this.controller.fixPastHolidayAttendance
      },

      // Settings
      '/api/attendance/settings': {
        GET: this.controller.getAttendanceSettings,
        PUT: this.controller.updateAttendanceSettings
      }
    };
  }

  /**
   * Get route handler for specific endpoint
   */
  getHandler(path, method) {
    const routes = this.configureRoutes();
    const route = routes[path];

    if (!route) {
      return null;
    }

    return route[method.toUpperCase()];
  }

  /**
   * Create Express.js route setup
   */
  setupExpressRoutes(router) {
    // Base routes
    router.get('/attendance', this.controller.getAttendanceRecords);
    router.post('/attendance', this.controller.markAttendance);

    // User-specific routes
    router.get('/attendance/user/:username', this.controller.getUserAttendance);
    router.get('/attendance/today/:username', this.controller.getTodayAttendance);
    router.put('/attendance/clock-out/:username', this.controller.clockOut);

    // Statistics and summaries
    router.get('/attendance/stats', this.controller.getAttendanceStats);
    router.get('/attendance/summary/:username', this.controller.getAttendanceSummary);
    router.get('/attendance/monthly/:username', this.controller.getMonthlyAttendance);

    // Individual record operations
    router.put('/attendance/:id', this.controller.updateAttendanceRecord);
    router.delete('/attendance/:id', this.controller.deleteAttendanceRecord);

    // Pagination and export
    router.get('/attendance/paginated', this.controller.getPaginatedAttendance);
    router.get('/attendance/export', this.controller.exportAttendanceData);

    // Admin operations
    router.post('/attendance/auto-absent', this.controller.markAutoAbsent);
    router.post('/attendance/bulk-update', this.controller.bulkUpdateAttendance);
    router.post('/attendance/bulk-date-update', this.controller.bulkDateUpdate);
    router.post('/attendance/mark-holiday', this.controller.markHoliday);
    router.post('/attendance/fix-past-holidays', this.controller.fixPastHolidayAttendance);

    // Settings
    router.get('/attendance/settings', this.controller.getAttendanceSettings);
    router.put('/attendance/settings', this.controller.updateAttendanceSettings);

    return router;
  }

  /**
   * Create middleware for authentication and tenant validation
   */
  createAuthMiddleware() {
    return (req, res, next) => {
      // Add authentication logic here
      // For now, just pass through
      next();
    };
  }

  /**
   * Create middleware for tenant validation
   */
  createTenantMiddleware() {
    return (req, res, next) => {
      const tenantId = req.query.tenantId || req.body.tenantId;

      if (!tenantId && req.method !== 'GET') {
        return res.status(400).json({
          success: false,
          message: 'Tenant ID is required'
        });
      }

      req.tenantId = tenantId;
      next();
    };
  }

  /**
   * Create middleware for admin-only routes
   */
  createAdminMiddleware() {
    return (req, res, next) => {
      // Add admin role validation here
      // For now, just pass through
      next();
    };
  }

  /**
   * Get all middlewares in order
   */
  getMiddlewares() {
    return [
      this.createAuthMiddleware(),
      this.createTenantMiddleware()
    ];
  }

  /**
   * Get admin middlewares
   */
  getAdminMiddlewares() {
    return [
      ...this.getMiddlewares(),
      this.createAdminMiddleware()
    ];
  }
}

// Export singleton instance
export const attendanceRoutes = new AttendanceRoutes();
export default attendanceRoutes;