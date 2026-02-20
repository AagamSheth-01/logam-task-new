/**
 * Calendar Service
 * Integrates with external calendar APIs and manages calendar data
 */

class CalendarService {
  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_API_KEY;
    this.calendarId = process.env.NEXT_PUBLIC_GOOGLE_CALENDAR_ID || 'primary';

    // Use the exact Google Calendar ID for Indian holidays
    this.holidayCalendarId = 'en.indian#holiday@group.v.calendar.google.com';

  }

  /**
   * Fetch holidays from Google Calendar API
   */
  async fetchGoogleHolidays(startDate, endDate) {
    if (!this.apiKey) {
      console.warn('Google Calendar API key not configured');
      return [];
    }

    try {
      const timeMin = new Date(startDate).toISOString();
      const timeMax = new Date(endDate).toISOString();

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(this.holidayCalendarId)}/events`;
      const params = new URLSearchParams({
        key: this.apiKey,
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const response = await fetch(`${url}?${params}`);

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const data = await response.json();

      return data.items.map(event => ({
        id: event.id,
        title: event.summary,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        type: 'holiday',
        color: 'bg-red-500'
      }));
    } catch (error) {
      console.error('Failed to fetch Google holidays:', error);
      return [];
    }
  }

  /**
   * Fetch events from personal Google Calendar (requires OAuth)
   */
  async fetchPersonalCalendarEvents(startDate, endDate, accessToken) {
    if (!accessToken) {
      console.warn('Access token required for personal calendar');
      return [];
    }

    try {
      const timeMin = new Date(startDate).toISOString();
      const timeMax = new Date(endDate).toISOString();

      const url = `https://www.googleapis.com/calendar/v3/calendars/${this.calendarId}/events`;
      const params = new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: true,
        orderBy: 'startTime'
      });

      const response = await fetch(`${url}?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Google Calendar API error: ${response.status}`);
      }

      const data = await response.json();

      return data.items.map(event => ({
        id: event.id,
        title: event.summary,
        start: event.start.dateTime || event.start.date,
        end: event.end.dateTime || event.end.date,
        type: 'calendar',
        color: 'bg-blue-500'
      }));
    } catch (error) {
      console.error('Failed to fetch personal calendar events:', error);
      return [];
    }
  }

  /**
   * Fetch public holidays from a free API
   */
  async fetchPublicHolidays(year, country = 'IN') {
    try {
      const response = await fetch(
        `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`
      );

      if (!response.ok) {
        throw new Error(`Holidays API error: ${response.status}`);
      }

      const holidays = await response.json();

      return holidays.map(holiday => ({
        id: `holiday-${holiday.date}`,
        title: holiday.name,
        start: holiday.date,
        end: holiday.date,
        type: 'holiday',
        color: this.getHolidayColor(holiday.types)
      }));
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
      return this.getFallbackHolidays(year);
    }
  }

  /**
   * Get color based on holiday type
   */
  getHolidayColor(types) {
    if (types.includes('Public')) return 'bg-red-500';
    if (types.includes('Bank')) return 'bg-green-500';
    if (types.includes('School')) return 'bg-yellow-500';
    return 'bg-blue-500';
  }

  /**
   * Fallback holidays if API fails
   */
  getFallbackHolidays(year) {
    const currentYear = new Date().getFullYear();
    if (year !== currentYear) return [];

    return [
      {
        id: `holiday-${year}-01-01`,
        title: 'New Year\'s Day',
        start: `${year}-01-01`,
        end: `${year}-01-01`,
        type: 'holiday',
        color: 'bg-purple-500'
      },
      {
        id: `holiday-${year}-01-26`,
        title: 'Republic Day',
        start: `${year}-01-26`,
        end: `${year}-01-26`,
        type: 'holiday',
        color: 'bg-green-500'
      },
      {
        id: `holiday-${year}-08-15`,
        title: 'Independence Day',
        start: `${year}-08-15`,
        end: `${year}-08-15`,
        type: 'holiday',
        color: 'bg-orange-500'
      },
      {
        id: `holiday-${year}-10-02`,
        title: 'Gandhi Jayanti',
        start: `${year}-10-02`,
        end: `${year}-10-02`,
        type: 'holiday',
        color: 'bg-blue-500'
      }
    ];
  }

  /**
   * Combine tasks with calendar events
   */
  combineEventsAndTasks(calendarEvents, holidays, tasks) {
    const allEvents = [
      ...calendarEvents,
      ...holidays,
      ...tasks.map(task => ({
        id: task.id,
        title: task.task || task.title || 'Untitled Task',
        start: task.deadline,
        end: task.deadline,
        type: 'task',
        color: this.getTaskColor(task.status, task.priority),
        task: task // Include full task data
      }))
    ];

    return allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
  }

  /**
   * Get task color based on status and priority
   */
  getTaskColor(status, priority) {
    if (status === 'done') return 'bg-green-500';

    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  }

  /**
   * Get events for a specific date range
   */
  async getEventsForDateRange(startDate, endDate, tasks = []) {
    try {
      const year = new Date(startDate).getFullYear();

      // Only fetch Google holidays (disable failing public API for now)
      const googleHolidays = await this.fetchGoogleHolidays(startDate, endDate);


      // Use Google holidays only
      const allHolidays = googleHolidays;

      return this.combineEventsAndTasks([], allHolidays, tasks);
    } catch (error) {
      console.error('Failed to get events for date range:', error);

      // Return just tasks if external APIs fail
      return tasks.map(task => ({
        id: task.id,
        title: task.task || task.title || 'Untitled Task',
        start: task.deadline,
        end: task.deadline,
        type: 'task',
        color: this.getTaskColor(task.status, task.priority),
        task: task
      }));
    }
  }

  /**
   * Get events for a specific month (with extended range for more holidays)
   */
  async getEventsForMonth(year, month, tasks = []) {
    // Extend the range to get more context (previous and next month)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month + 2, 0);

    return this.getEventsForDateRange(startDate, endDate, tasks);
  }

  /**
   * Get events for today
   */
  async getTodaysEvents(tasks = []) {
    const today = new Date();
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    return this.getEventsForDateRange(startDate, endDate, tasks);
  }
}

export const calendarService = new CalendarService();
export default calendarService;