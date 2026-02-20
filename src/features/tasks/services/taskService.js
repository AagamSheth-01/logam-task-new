/**
 * Task Service - Model Layer
 * Handles all task data operations and business logic
 */

class TaskService {
  constructor() {
    this.baseUrl = '/api/tasks';
  }

  /**
   * Get user's tasks via API
   */
  async getUserTasks(username) {
    try {
      const response = await fetch(`${this.baseUrl}?user=${username}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch tasks');
      }

      return data.tasks || [];
    } catch (error) {
      console.error('TaskService.getUserTasks error:', error);
      throw error;
    }
  }

  /**
   * Update a task
   */
  async updateTask(taskId, updates) {
    try {
      const response = await fetch(`${this.baseUrl}/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update task');
      }

      return data.task;
    } catch (error) {
      console.error('TaskService.updateTask error:', error);
      throw error;
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(taskId) {
    try {
      const response = await fetch(`${this.baseUrl}/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to delete task');
      }

      return true;
    } catch (error) {
      console.error('TaskService.deleteTask error:', error);
      throw error;
    }
  }

  /**
   * Create a new task
   */
  async createTask(taskData) {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(taskData)
      });

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create task');
      }

      return data.task;
    } catch (error) {
      console.error('TaskService.createTask error:', error);
      throw error;
    }
  }

  /**
   * Generate CSV export data
   */
  generateCSV(tasks) {
    const headers = ['Task', 'Status', 'Priority', 'Deadline', 'Assigned To', 'Client', 'Created Date'];
    const csvContent = [
      headers.join(','),
      ...tasks.map(task => [
        `"${(task.task || '').replace(/"/g, '""')}"`,
        task.status || '',
        task.priority || '',
        task.deadline || '',
        task.assigned_to || '',
        task.client_name || '',
        task.created_date || ''
      ].join(','))
    ].join('\n');

    return csvContent;
  }

  /**
   * Download CSV file
   */
  downloadCSV(csvContent, filename) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Calculate task statistics
   */
  calculateStats(tasks, username) {
    const userTasks = tasks.filter(task =>
      task.assigned_to === username || task.created_by === username
    );

    return {
      total: userTasks.length,
      completed: userTasks.filter(t => t.status === 'done').length,
      pending: userTasks.filter(t => t.status === 'pending').length,
      overdue: userTasks.filter(t => {
        if (t.status === 'pending' && t.deadline) {
          return new Date(t.deadline) < new Date();
        }
        return false;
      }).length
    };
  }

  /**
   * Extract unique clients from tasks
   */
  extractClients(tasks) {
    return [...new Set(tasks.map(t => t.client_name).filter(Boolean))];
  }
}

export const taskService = new TaskService();
export default taskService;