/**
 * Repository Layer Entry Point
 * Exports all repositories for easy importing
 */

export { BaseRepository } from './base.repository.js';
export { UserRepository } from './user.repository.js';
export { AttendanceRepository } from './attendance.repository.js';
export { TaskRepository } from './task.repository.js';
export { OrganizationRepository } from './organization.repository.js';
export { ClientRepository } from './client.repository.js';
export { FileRepository } from './file.repository.js';
export { DailyTaskRepository } from './dailyTask.repository.js';
export { MeetingRepository } from './meeting.repository.js';
export { CalendarEventRepository } from './calendarEvent.repository.js';

// Export instances for convenience
import { UserRepository } from './user.repository.js';
import { AttendanceRepository } from './attendance.repository.js';
import { TaskRepository } from './task.repository.js';
import { OrganizationRepository } from './organization.repository.js';
import { ClientRepository } from './client.repository.js';
import { FileRepository } from './file.repository.js';
import { DailyTaskRepository } from './dailyTask.repository.js';
import { MeetingRepository } from './meeting.repository.js';
import { CalendarEventRepository } from './calendarEvent.repository.js';

export const userRepository = new UserRepository();
export const attendanceRepository = new AttendanceRepository();
export const taskRepository = new TaskRepository();
export const organizationRepository = new OrganizationRepository();
export const clientRepository = new ClientRepository();
export const fileRepository = new FileRepository();
export const dailyTaskRepository = new DailyTaskRepository();
export const meetingRepository = new MeetingRepository();
export const calendarEventRepository = new CalendarEventRepository();

export default {
  userRepository,
  attendanceRepository,
  taskRepository,
  organizationRepository,
  clientRepository,
  fileRepository,
  dailyTaskRepository,
  meetingRepository,
  calendarEventRepository
};
