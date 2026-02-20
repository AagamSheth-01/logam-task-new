/**
 * Service Layer Entry Point
 * Exports all services for easy importing
 */

export { UserService } from './user.service.js';
export { AttendanceService } from './attendance.service.js';
export { TaskService } from './task.service.js';
export { OrganizationService } from './organization.service.js';
export { ClientService } from './client.service.js';
export { FileService } from './file.service.js';
export { DailyTaskService } from './dailyTask.service.js';
export { AnalyticsService } from './analytics.service.js';
export { ReportService } from './report.service.js';
export { DashboardService } from './dashboard.service.js';
export { ActivityService } from './activity.service.js';

// Export instances for convenience
import { UserService } from './user.service.js';
import { AttendanceService } from './attendance.service.js';
import { TaskService } from './task.service.js';
import { OrganizationService } from './organization.service.js';
import { ClientService } from './client.service.js';
import { FileService } from './file.service.js';
import { DailyTaskService } from './dailyTask.service.js';
import { AnalyticsService } from './analytics.service.js';
import { ReportService } from './report.service.js';
import { DashboardService } from './dashboard.service.js';
import { ActivityService } from './activity.service.js';

export const userService = new UserService();
export const attendanceService = new AttendanceService();
export const taskService = new TaskService();
export const organizationService = new OrganizationService();
export const clientService = new ClientService();
export const fileService = new FileService();
export const dailyTaskService = new DailyTaskService();
export const analyticsService = new AnalyticsService();
export const reportService = new ReportService();
export const dashboardService = new DashboardService();
export const activityService = new ActivityService();

export default {
  userService,
  attendanceService,
  taskService,
  organizationService,
  clientService,
  fileService,
  dailyTaskService,
  analyticsService,
  reportService,
  dashboardService,
  activityService
};
