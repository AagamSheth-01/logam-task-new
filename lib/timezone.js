// lib/timezone.js - Timezone utilities for India/Kolkata
import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { format, parseISO } from 'date-fns';

const TIMEZONE = 'Asia/Kolkata';

/**
 * Get current date/time in India timezone
 */
export const getIndiaDateTime = () => {
  return toZonedTime(new Date(), TIMEZONE);
};

/**
 * Get current date in YYYY-MM-DD format (India timezone)
 */
export const getIndiaDate = () => {
  return formatInTimeZone(new Date(), TIMEZONE, 'yyyy-MM-dd');
};

/**
 * Get current time in HH:mm:ss format (India timezone)
 */
export const getIndiaTime = () => {
  return formatInTimeZone(new Date(), TIMEZONE, 'HH:mm:ss');
};

/**
 * Get current datetime in ISO format with India timezone
 */
export const getIndiaISO = () => {
  return formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx");
};

/**
 * Convert any date to India timezone
 */
export const toIndiaTime = (date) => {
  if (!date) return null;

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return toZonedTime(dateObj, TIMEZONE);
  } catch (error) {
    console.error('Error converting to India time:', error);
    return null;
  }
};

/**
 * Format date in India timezone with custom format
 */
export const formatIndiaDate = (date, formatString = 'yyyy-MM-dd HH:mm:ss') => {
  if (!date) return '';

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return formatInTimeZone(dateObj, TIMEZONE, formatString);
  } catch (error) {
    console.error('Error formatting India date:', error);
    return '';
  }
};

/**
 * Get start of day in India timezone
 */
export const getIndiaStartOfDay = (date = new Date()) => {
  return formatInTimeZone(date, TIMEZONE, 'yyyy-MM-dd 00:00:00');
};

/**
 * Get end of day in India timezone
 */
export const getIndiaEndOfDay = (date = new Date()) => {
  return formatInTimeZone(date, TIMEZONE, 'yyyy-MM-dd 23:59:59');
};

/**
 * Check if a date is today in India timezone
 */
export const isToday = (date) => {
  if (!date) return false;

  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    const todayIndia = getIndiaDate();
    const dateIndia = formatInTimeZone(dateObj, TIMEZONE, 'yyyy-MM-dd');
    return todayIndia === dateIndia;
  } catch (error) {
    return false;
  }
};

/**
 * Get India timezone offset
 */
export const getIndiaOffset = () => {
  return '+05:30';
};

/**
 * Convert Firestore timestamp to India time
 */
export const firestoreToIndiaTime = (timestamp) => {
  if (!timestamp) return null;

  try {
    // If it's a Firestore Timestamp
    if (timestamp && typeof timestamp.toDate === 'function') {
      return toZonedTime(timestamp.toDate(), TIMEZONE);
    }

    // If it's already a Date or string
    return toIndiaTime(timestamp);
  } catch (error) {
    console.error('Error converting Firestore timestamp:', error);
    return null;
  }
};

/**
 * Get readable India date time string
 */
export const getReadableIndiaDateTime = (date = new Date()) => {
  return formatIndiaDate(date, 'dd MMM yyyy, hh:mm a');
};

export default {
  TIMEZONE,
  getIndiaDateTime,
  getIndiaDate,
  getIndiaTime,
  getIndiaISO,
  toIndiaTime,
  formatIndiaDate,
  getIndiaStartOfDay,
  getIndiaEndOfDay,
  isToday,
  getIndiaOffset,
  firestoreToIndiaTime,
  getReadableIndiaDateTime
};
