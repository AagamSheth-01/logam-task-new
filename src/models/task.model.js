/**
 * Task Model
 * Defines task data structure and validation rules
 */

import { TASK_STATUS, TASK_PRIORITY } from '../utils/constants.js';

export class TaskModel {
  constructor(data) {
    this.id = data.id || null;
    this.tenantId = data.tenantId;
    this.task = data.task || data.title; // Task description/title
    this.client_name = data.client_name || null;
    this.custom_client = data.custom_client || null;
    this.assigned_by = data.assigned_by;
    this.assigned_to = data.assigned_to;
    this.deadline = data.deadline;
    this.priority = data.priority || TASK_PRIORITY.MEDIUM;
    this.status = data.status || TASK_STATUS.PENDING;
    this.assignerNotes = data.assignerNotes || null;
    this.assignerPrivateNotes = data.assignerPrivateNotes || null;
    this.completedAt = data.completedAt || null;
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
      task: this.task,
      client_name: this.client_name,
      custom_client: this.custom_client,
      assigned_by: this.assigned_by,
      assigned_to: this.assigned_to,
      deadline: this.deadline,
      priority: this.priority,
      status: this.status,
      assignerNotes: this.assignerNotes,
      assignerPrivateNotes: this.assignerPrivateNotes,
      completedAt: this.completedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }

  /**
   * Check if task is overdue
   */
  isOverdue() {
    if (this.status === TASK_STATUS.DONE) return false;
    if (!this.deadline) return false;

    const today = new Date().toISOString().split('T')[0];
    return this.deadline < today;
  }

  /**
   * Check if task is completed
   */
  isCompleted() {
    return this.status === TASK_STATUS.DONE;
  }

  /**
   * Mark task as completed
   */
  markAsCompleted() {
    this.status = TASK_STATUS.DONE;
    this.completedAt = new Date().toISOString();
    this.updatedAt = new Date().toISOString();
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
      if (!data.task || !data.task.trim()) {
        errors.push({ field: 'task', message: 'Task description is required' });
      }
      if (!data.assigned_by || !data.assigned_by.trim()) {
        errors.push({ field: 'assigned_by', message: 'Assigner is required' });
      }
      if (!data.assigned_to || !data.assigned_to.trim()) {
        errors.push({ field: 'assigned_to', message: 'Assignee is required' });
      }
      if (!data.deadline) {
        errors.push({ field: 'deadline', message: 'Deadline is required' });
      }
    }

    // Priority validation
    if (data.priority && !Object.values(TASK_PRIORITY).includes(data.priority)) {
      errors.push({ field: 'priority', message: 'Invalid priority level' });
    }

    // Status validation
    if (data.status && !Object.values(TASK_STATUS).includes(data.status)) {
      errors.push({ field: 'status', message: 'Invalid task status' });
    }

    // Deadline format validation (YYYY-MM-DD)
    if (data.deadline && !/^\d{4}-\d{2}-\d{2}$/.test(data.deadline)) {
      errors.push({ field: 'deadline', message: 'Invalid deadline format (YYYY-MM-DD)' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

export default TaskModel;
