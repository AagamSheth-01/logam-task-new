// lib/googleSheets.js - Fixed to load environment variables properly
import { google } from 'googleapis';
import dotenv from 'dotenv';

// Always load environment variables first
if (!process.env.GOOGLE_SHEETS_SPREADSHEET_ID) {
  dotenv.config({ path: '.env.local' });
}

// Initialize Google Sheets API
const initializeGoogleSheets = () => {
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n');
  
  if (!privateKey || !process.env.GOOGLE_SHEETS_CLIENT_EMAIL) {
    throw new Error('Missing Google Sheets credentials. Check GOOGLE_SHEETS_PRIVATE_KEY and GOOGLE_SHEETS_CLIENT_EMAIL in .env.local');
  }
  
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
      private_key: privateKey,
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
};

const SPREADSHEET_ID = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

// Validate spreadsheet ID
if (!SPREADSHEET_ID) {
  console.error('❌ GOOGLE_SHEETS_SPREADSHEET_ID is missing from environment variables');
  console.error('   Add this to your .env.local: GOOGLE_SHEETS_SPREADSHEET_ID=1XUtnXvImQAHGzZBiJ1hE_Vvx-UKoG681QJRhq23EtiE');
}

// Get data from a specific sheet
export const getSheetData = async (sheetName, range = '') => {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID environment variable');
    }

    const sheets = initializeGoogleSheets();
    const fullRange = range ? `${sheetName}!${range}` : sheetName;
    
    console.log(`📊 Getting data from sheet: ${sheetName}, range: ${fullRange || 'all'}`);
    console.log(`📋 Spreadsheet ID: ${SPREADSHEET_ID}`);
    
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: fullRange,
    });

    const data = response.data.values || [];
    console.log(`✅ Retrieved ${data.length} rows from ${sheetName}`);
    return data;
  } catch (error) {
    console.error('Error getting sheet data:', error);
    throw new Error(`Failed to get data from ${sheetName}: ${error.message}`);
  }
};

// Append data to a sheet
export const appendToSheet = async (sheetName, values) => {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID environment variable');
    }

    const sheets = initializeGoogleSheets();
    
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!A:Z`,
      valueInputOption: 'RAW',
      resource: {
        values: [values],
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error appending to sheet:', error);
    throw new Error(`Failed to append data to ${sheetName}: ${error.message}`);
  }
};

// Update specific cells in a sheet
export const updateSheet = async (sheetName, range, values) => {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID environment variable');
    }

    const sheets = initializeGoogleSheets();
    
    const response = await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `${sheetName}!${range}`,
      valueInputOption: 'RAW',
      resource: {
        values: values,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Error updating sheet:', error);
    throw new Error(`Failed to update ${sheetName}: ${error.message}`);
  }
};

// Clear data from a sheet
export const clearSheet = async (sheetName, range = '') => {
  try {
    if (!SPREADSHEET_ID) {
      throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID environment variable');
    }

    const sheets = initializeGoogleSheets();
    const fullRange = range ? `${sheetName}!${range}` : sheetName;
    
    const response = await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: fullRange,
    });

    return response.data;
  } catch (error) {
    console.error('Error clearing sheet:', error);
    throw new Error(`Failed to clear ${sheetName}: ${error.message}`);
  }
};

// Convert array data to objects with headers
export const arrayToObjects = (data) => {
  if (!data || data.length === 0) return [];
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
};

// Convert objects back to array format
export const objectsToArray = (objects, headers) => {
  if (!objects || objects.length === 0) return [];
  
  return objects.map(obj => 
    headers.map(header => obj[header] || '')
  );
};

// Load users from Google Sheets with proper column handling
export const loadUsers = async () => {
  try {
    console.log('📥 Loading users from Google Sheets...');
    
    if (!SPREADSHEET_ID) {
      throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID environment variable');
    }
    
    const data = await getSheetData('Users');
    
    if (!data || data.length === 0) {
      console.log('⚠️ No user data found in Google Sheets');
      return [];
    }
    
    // Handle both possible header formats
    const headers = data[0];
    const users = [];
    
    console.log('📋 Headers found:', headers);
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row && row.length > 0) {
        const user = {};
        
        // Map headers to standardized field names
        headers.forEach((header, index) => {
          const normalizedHeader = header.toLowerCase().trim();
          const value = (row[index] || '').toString().trim();
          
          // Map common variations to standard field names
          if (normalizedHeader === 'username' || normalizedHeader === 'user' || normalizedHeader === 'name') {
            user.username = value;
          } else if (normalizedHeader === 'password' || normalizedHeader === 'pass') {
            user.password = value;
          } else if (normalizedHeader === 'role' || normalizedHeader === 'type') {
            user.role = value;
          } else if (normalizedHeader === 'email' || normalizedHeader === 'mail') {
            user.email = value;
          } else {
            // Keep original header name as fallback
            user[header] = value;
          }
        });
        
        // Only add users with valid username
        if (user.username && user.username !== '') {
          users.push(user);
        }
      }
    }
    
    console.log(`✅ Loaded ${users.length} users from Google Sheets`);
    return users;
  } catch (error) {
    console.error('Error loading users:', error);
    throw error;
  }
};

// Load tasks from Google Sheets
export const loadTasks = async () => {
  try {
    console.log('📥 Loading tasks from Google Sheets...');
    
    if (!SPREADSHEET_ID) {
      throw new Error('Missing GOOGLE_SHEETS_SPREADSHEET_ID environment variable');
    }
    
    const data = await getSheetData('Tasks');
    const tasks = arrayToObjects(data);
    
    console.log(`✅ Loaded ${tasks.length} tasks from Google Sheets`);
    return tasks;
  } catch (error) {
    console.error('Error loading tasks:', error);
    throw error;
  }
};

// Save tasks to Google Sheets - UPDATED with client_name
export const saveTasks = async (tasks) => {
  try {
    const headers = [
      'task', 'assigned_to', 'client_name', 'deadline', 'status',
      'assigned_date', 'completed_date', 'time_spent',
      'priority', 'acknowledged', 'given_by'
    ];
    
    // Clear existing data first
    await clearSheet('Tasks');
    
    // Add headers
    await appendToSheet('Tasks', headers);
    
    // Add task data
    for (const task of tasks) {
      const taskRow = headers.map(header => task[header] || '');
      await appendToSheet('Tasks', taskRow);
    }
    
    // Log activity
    await logActivity(tasks);
    
    return true;
  } catch (error) {
    console.error('Error saving tasks:', error);
    throw error;
  }
};

// Add a single task - UPDATED with client_name
export const addTask = async (taskData) => {
  try {
    const headers = [
      'task', 'assigned_to', 'client_name', 'deadline', 'status',
      'assigned_date', 'completed_date', 'time_spent',
      'priority', 'acknowledged', 'given_by'
    ];
    
    const taskRow = headers.map(header => taskData[header] || '');
    await appendToSheet('Tasks', taskRow);
    
    // Add to personal sheet if user exists - UPDATED with client_name
    try {
      const personalSheetName = taskData.assigned_to;
      const personalRow = [
        taskData.assigned_date?.split(' ')[0] || '',
        taskData.given_by || 'Admin',
        taskData.task || '',
        taskData.client_name || '', // NEW: Add client name to personal sheet
        taskData.deadline || '',
        '', // Comments
        ''  // Completed
      ];
      await appendToSheet(personalSheetName, personalRow);
    } catch (personalSheetError) {
      console.warn(`Could not add to personal sheet for ${taskData.assigned_to}:`, personalSheetError.message);
    }
    
    return true;
  } catch (error) {
    console.error('Error adding task:', error);
    throw error;
  }
};

// Update task status
export const updateTaskStatus = async (username, taskName) => {
  try {
    const tasks = await loadTasks();
    const taskIndex = tasks.findIndex(task => 
      task.task?.toLowerCase().trim() === taskName.toLowerCase().trim() && 
      task.assigned_to === username
    );
    
    if (taskIndex === -1) {
      throw new Error('Task not found');
    }
    
    const task = tasks[taskIndex];
    if (task.status !== 'done') {
      task.status = 'done';
      task.completed_date = new Date().toISOString().split('T')[0] + ' ' + new Date().toTimeString().split(' ')[0];
      
      // Calculate time spent
      if (task.assigned_date) {
        const startDate = new Date(task.assigned_date);
        const endDate = new Date();
        const timeDiff = endDate - startDate;
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        
        if (days > 0) {
          task.time_spent = `${days} days, ${hours}:${minutes.toString().padStart(2, '0')}:00`;
        } else {
          task.time_spent = `${hours}:${minutes.toString().padStart(2, '0')}:00`;
        }
      }
    }
    
    await saveTasks(tasks);
    
    // Update personal sheet - UPDATED to handle new column structure
    try {
      const personalData = await getSheetData(username);
      const personalTasks = arrayToObjects(personalData);
      const personalTaskIndex = personalTasks.findIndex(row => 
        row.Work?.toLowerCase().trim() === taskName.toLowerCase().trim()
      );
      
      if (personalTaskIndex !== -1) {
        const rowNumber = personalTaskIndex + 2; // +1 for header, +1 for 0-based index
        await updateSheet(username, `G${rowNumber}:H${rowNumber}`, [['TRUE', task.completed_date]]);
      }
    } catch (personalSheetError) {
      console.warn(`Could not update personal sheet for ${username}:`, personalSheetError.message);
    }
    
    return true;
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
};

// Log activity to Log sheet
export const logActivity = async (data) => {
  try {
    const timestamp = new Date().toISOString();
    const snapshot = JSON.stringify(data);
    await appendToSheet('Log', [timestamp, snapshot]);
  } catch (error) {
    console.warn('Could not log activity:', error.message);
  }
};

// Get dashboard summary
export const getDashboardSummary = async () => {
  try {
    const tasks = await loadTasks();
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'done').length;
    const pending = total - completed;
    
    // Calculate overdue tasks
    const today = new Date();
    const overdue = tasks.filter(task => {
      if (task.status === 'pending' && task.deadline) {
        const deadline = new Date(task.deadline);
        return deadline < today;
      }
      return false;
    }).length;
    
    return {
      total,
      completed,
      pending,
      overdue
    };
  } catch (error) {
    console.error('Error getting dashboard summary:', error);
    throw error;
  }
};

// Get user tasks with proper error handling
export async function getUserTasks(username) {
  const tasks = await loadTasks();
  return tasks.filter(task =>
    (task.assigned_to || '').trim().toLowerCase() === username.trim().toLowerCase()
  );
}

// Get overdue tasks
export const getOverdueTasks = async (forUser = null) => {
  try {
    const tasks = await loadTasks();
    const today = new Date();
    
    return tasks.filter(task => {
      if (task.status === 'pending' && task.deadline) {
        const deadline = new Date(task.deadline);
        const isOverdue = deadline < today;
        const isForUser = forUser ? task.assigned_to === forUser : true;
        return isOverdue && isForUser;
      }
      return false;
    });
  } catch (error) {
    console.error('Error getting overdue tasks:', error);
    throw error;
  }
};

// Get user performance summary
export const getUserPerformanceSummary = async () => {
  try {
    const tasks = await loadTasks();
    const summary = {};
    
    tasks.forEach(task => {
      const user = task.assigned_to;
      if (!user) return;
      
      if (!summary[user]) {
        summary[user] = {
          total: 0,
          completed: 0,
          pending: 0,
          time_spent: 0
        };
      }
      
      summary[user].total++;
      
      if (task.status === 'done') {
        summary[user].completed++;
        
        // Parse time spent
        if (task.time_spent) {
          try {
            let totalHours = 0;
            if (task.time_spent.includes('days')) {
              const [days, hms] = task.time_spent.split(' days, ');
              const [h, m] = hms.split(':');
              totalHours = parseInt(days) * 24 + parseInt(h) + parseInt(m) / 60;
            } else {
              const [h, m] = task.time_spent.split(':');
              totalHours = parseInt(h) + parseInt(m) / 60;
            }
            summary[user].time_spent += Math.round(totalHours * 100) / 100;
          } catch (timeError) {
            console.warn('Error parsing time spent:', timeError);
          }
        }
      } else {
        summary[user].pending++;
      }
    });
    
    return summary;
  } catch (error) {
    console.error('Error getting user performance summary:', error);
    throw error;
  }
};

export { initializeGoogleSheets };