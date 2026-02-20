/**
 * Models Layer Entry Point
 * Exports all models for easy importing
 */

export { UserModel } from './user.model.js';
export { AttendanceModel } from './attendance.model.js';
export { TaskModel } from './task.model.js';
export { OrganizationModel } from './organization.model.js';
export { ClientModel, CLIENT_STATUS, CLIENT_PRIORITY, CONTACT_METHOD } from './client.model.js';
export { FileModel, FILE_TYPE, FILE_STATUS } from './file.model.js';
export { DailyTaskModel } from './dailyTask.model.js';

// Default export with all models
import { UserModel } from './user.model.js';
import { AttendanceModel } from './attendance.model.js';
import { TaskModel } from './task.model.js';
import { OrganizationModel } from './organization.model.js';
import { ClientModel } from './client.model.js';
import { FileModel } from './file.model.js';
import { DailyTaskModel } from './dailyTask.model.js';

export default {
  UserModel,
  AttendanceModel,
  TaskModel,
  OrganizationModel,
  ClientModel,
  FileModel,
  DailyTaskModel
};
