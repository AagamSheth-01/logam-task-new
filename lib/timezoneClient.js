// lib/timezoneClient.js - Client-side timezone utilities for India/Kolkata
// This is a simpler version without date-fns for client-side usage

const TIMEZONE = 'Asia/Kolkata';
const IST_OFFSET = 5.5 * 60; // IST is UTC+5:30 in minutes

/**
 * Get current date/time in India timezone
 */
export const getIndiaDateTime = () => {
  const now = new Date();
  const istTime = new Date(now.toLocaleString('en-US', { timeZone: TIMEZONE }));
  return istTime;
};

/**
 * Get current date in YYYY-MM-DD format (India timezone)
 */
export const getIndiaDate = () => {
  const istTime = getIndiaDateTime();
  const year = istTime.getFullYear();
  const month = String(istTime.getMonth() + 1).padStart(2, '0');
  const day = String(istTime.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Get current time in HH:mm:ss format (India timezone)
 */
export const getIndiaTime = () => {
  const istTime = getIndiaDateTime();
  const hours = String(istTime.getHours()).padStart(2, '0');
  const minutes = String(istTime.getMinutes()).padStart(2, '0');
  const seconds = String(istTime.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

/**
 * Get current datetime in ISO format with India timezone
 */
export const getIndiaISO = () => {
  const istTime = getIndiaDateTime();
  return istTime.toISOString();
};

/**
 * Format date in India timezone
 */
export const formatIndiaDate = (date, formatType = 'full') => {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;

    const options = {
      timeZone: TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };

    if (formatType === 'full') {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.second = '2-digit';
    }

    return dateObj.toLocaleString('en-IN', options);
  } catch (error) {
    console.error('Error formatting India date:', error);
    return '';
  }
};

/**
 * Get locale date string in India timezone
 */
export const getIndiaLocaleDateString = (date = new Date()) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('en-IN', { timeZone: TIMEZONE });
};

/**
 * Get locale time string in India timezone
 */
export const getIndiaLocaleTimeString = (date = new Date()) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleTimeString('en-IN', { timeZone: TIMEZONE });
};

/**
 * Get readable India date time string
 */
export const getReadableIndiaDateTime = (date = new Date()) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleString('en-IN', {
    timeZone: TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

/**
 * Check if a date is today in India timezone
 */
export const isToday = (date) => {
  if (!date) return false;

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const todayIST = getIndiaDate();
    const dateIST = dateObj.toLocaleDateString('en-CA', { timeZone: TIMEZONE }); // en-CA gives YYYY-MM-DD
    return todayIST === dateIST;
  } catch (error) {
    return false;
  }
};

/**
 * Get start of day in India timezone (YYYY-MM-DD 00:00:00)
 */
export const getIndiaStartOfDay = (date = new Date()) => {
  const dateString = getIndiaDate();
  return `${dateString} 00:00:00`;
};

/**
 * Get end of day in India timezone (YYYY-MM-DD 23:59:59)
 */
export const getIndiaEndOfDay = (date = new Date()) => {
  const dateString = getIndiaDate();
  return `${dateString} 23:59:59`;
};

/**
 * Get timezone offset string for India
 */
export const getIndiaOffset = () => {
  return '+05:30';
};

export default {
  TIMEZONE,
  getIndiaDateTime,
  getIndiaDate,
  getIndiaTime,
  getIndiaISO,
  formatIndiaDate,
  getIndiaLocaleDateString,
  getIndiaLocaleTimeString,
  getReadableIndiaDateTime,
  isToday,
  getIndiaStartOfDay,
  getIndiaEndOfDay,
  getIndiaOffset
};
