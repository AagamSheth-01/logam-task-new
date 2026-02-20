/**
 * Attendance MVC - Complete Module Export
 * Provides all MVC components for attendance management
 */

// Models
export { AttendanceModel } from '../../../models/attendance.model.js';

// Controllers
export { AttendanceController } from '../../../controllers/attendance.controller.js';

// Services (Business Logic)
export { AttendanceService } from '../../../services/attendance.service.js';

// Repositories (Data Layer)
export { AttendanceRepository } from '../../../repositories/attendance.repository.js';

// Routes
export { AttendanceRoutes, attendanceRoutes } from '../../../routes/attendance.routes.js';

// Views/Components
export { AttendanceView } from '../../../components/attendance/AttendanceView.js';

// Re-export from existing feature structure for compatibility
export {
  attendanceApi,
  useAttendanceStore,
  useAttendance
} from '../index.js';

/**
 * Complete MVC Factory - Creates all components together
 */
export class AttendanceMVCFactory {
  constructor() {
    this.model = null;
    this.view = null;
    this.controller = null;
    this.service = null;
    this.repository = null;
    this.routes = null;
  }

  /**
   * Create complete MVC stack
   */
  create() {
    // Create instances
    this.repository = new (require('../../../repositories/attendance.repository.js').AttendanceRepository)();
    this.service = new (require('../../../services/attendance.service.js').AttendanceService)();
    this.controller = new (require('../../../controllers/attendance.controller.js').AttendanceController)();
    this.routes = new (require('../../../routes/attendance.routes.js').AttendanceRoutes)();

    return {
      model: require('../../../models/attendance.model.js').AttendanceModel,
      repository: this.repository,
      service: this.service,
      controller: this.controller,
      routes: this.routes,
      view: require('../../../components/attendance/AttendanceView.js').AttendanceView
    };
  }

  /**
   * Get singleton instances
   */
  static getInstance() {
    if (!this.instance) {
      this.instance = new AttendanceMVCFactory();
    }
    return this.instance.create();
  }
}

// Export default MVC instance
export const attendanceMVC = AttendanceMVCFactory.getInstance();

export default {
  AttendanceModel,
  AttendanceController,
  AttendanceService,
  AttendanceRepository,
  AttendanceRoutes,
  AttendanceView,
  attendanceRoutes,
  attendanceMVC
};