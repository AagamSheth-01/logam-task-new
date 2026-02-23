/**
 * useCalendarTasks Hook (MVC)
 * Combines task data with locally-generated calendar events (holidays) for CalendarDashboard.
 * Replaces the legacy `hooks/useCalendarTasks.js`.
 *
 * NOTE: There is no /api/calendar general route in the backend — the calendar repository
 * is client-specific. This hook uses:
 *  - tasksApi  (src/features/tasks/api/tasksApi.js)  → live server data
 *  - Indian holiday data generated locally (same source as CalendarEventRepository)
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import tasksApi from '../../tasks/api/tasksApi.js';

// ─── Static Indian holidays (mirrors CalendarEventRepository.INDIAN_HOLIDAYS_2025) ──
const INDIAN_HOLIDAYS = {
  REPUBLIC_DAY:       { date: '01-26', name: 'Republic Day',         type: 'national' },
  INDEPENDENCE_DAY:   { date: '08-15', name: 'Independence Day',      type: 'national' },
  GANDHI_JAYANTI:     { date: '10-02', name: 'Gandhi Jayanti',        type: 'national' },
  HOLI:               { date: '03-14', name: 'Holi',                  type: 'festival' },
  MAHAVIR_JAYANTI:    { date: '04-10', name: 'Mahavir Jayanti',       type: 'festival' },
  GOOD_FRIDAY:        { date: '04-18', name: 'Good Friday',           type: 'festival' },
  EID_UL_FITR:        { date: '04-01', name: 'Eid ul-Fitr',           type: 'festival' },
  BUDDHA_PURNIMA:     { date: '05-12', name: 'Buddha Purnima',        type: 'festival' },
  EID_UL_ADHA:        { date: '06-07', name: 'Eid ul-Adha (Bakrid)',  type: 'festival' },
  MUHARRAM:           { date: '07-06', name: 'Muharram',              type: 'festival' },
  RAKSHA_BANDHAN:     { date: '08-09', name: 'Raksha Bandhan',        type: 'festival' },
  JANMASHTAMI:        { date: '08-16', name: 'Janmashtami',           type: 'festival' },
  GANESH_CHATURTHI:   { date: '08-27', name: 'Ganesh Chaturthi',      type: 'festival' },
  DUSSEHRA:           { date: '10-02', name: 'Dussehra',              type: 'festival' },
  DIWALI:             { date: '10-20', name: 'Diwali',                type: 'festival' },
  GURU_NANAK_JAYANTI: { date: '11-15', name: 'Guru Nanak Jayanti',    type: 'festival' },
  CHRISTMAS:          { date: '12-25', name: 'Christmas',             type: 'festival' },
};

/**
 * Build holiday event objects for a given year — no API call needed.
 * Shape matches the task objects so ModernCalendar can render them uniformly.
 */
function buildHolidayEvents(year) {
  return Object.entries(INDIAN_HOLIDAYS).map(([key, h]) => {
    const [month, day] = h.date.split('-');
    const date = new Date(year, parseInt(month) - 1, parseInt(day));
    return {
      id: `holiday-${key}-${year}`,
      type: 'holiday',
      eventType: 'holiday',
      title: h.name,
      summary: h.name,
      task: h.name,           // ModernCalendar uses `task` field as label
      deadline: date.toISOString(),
      colorId: h.type === 'national' ? '11' : '6',
      transparency: 'transparent',
      status: 'holiday',
    };
  });
}

/**
 * @param {Object} user - The current user object { username, role }
 * @returns {Object} Calendar tasks state and actions
 */
export function useCalendarTasks(user) {
  const [selectedDate, setSelectedDate] = useState(null);
  const [viewMode, setViewMode] = useState('month'); // month | week | day
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Holiday events are generated locally — no API call needed
  const calendarEvents = useMemo(
    () => buildHolidayEvents(currentMonth.getFullYear()),
    [currentMonth]
  );

  // Task state (from tasksApi)
  const [userTasks, setUserTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ─── Fetch user tasks via MVC tasksApi ───────────────────────────────────
  const fetchUserTasks = useCallback(async () => {
    if (!user?.username) return;
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (user.role?.toLowerCase() === 'admin') {
        // Backend /api/tasks requires ?all=true to return ALL tenant tasks for admins
        params.all = 'true';
      } else {
        // Regular users only see tasks assigned to them
        params.assigned_to = user.username;
      }
      const response = await tasksApi.getTasks(params);
      // Only tasks with a deadline can appear on the calendar
      const withDeadlines = (response?.tasks || response?.data || []).filter(
        (task) => task.deadline
      );
      setUserTasks(withDeadlines);
    } catch (err) {
      console.error('[useCalendarTasks] Failed to fetch tasks:', err);
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [user?.username, user?.role]);

  // ─── Combined view: tasks + locally-generated holidays ───────────────────
  const tasks = useMemo(
    () => [...calendarEvents, ...userTasks],
    [calendarEvents, userTasks]
  );

  // ─── Public refresh helpers ───────────────────────────────────────────────
  const fetchTasks = useCallback(async () => {
    await fetchUserTasks();
  }, [fetchUserTasks]);

  const refreshTasks = useCallback(async () => {
    await fetchUserTasks();
  }, [fetchUserTasks]);

  // ─── Month navigation ─────────────────────────────────────────────────────
  const navigateMonth = useCallback((direction) => {
    setCurrentMonth((prev) => {
      const next = new Date(prev);
      next.setMonth(next.getMonth() + direction);
      return next;
    });
  }, []);

  // ─── Auto-load on mount / when user changes ──────────────────────────────
  useEffect(() => {
    if (user?.username) {
      fetchUserTasks();
    }
  }, [user?.username]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    // Data
    tasks,
    userTasks,
    calendarEvents,

    // State
    loading,
    error,
    selectedDate,
    viewMode,
    currentMonth,

    // Actions
    fetchTasks,
    refreshTasks,
    setSelectedDate,
    setViewMode,
    setCurrentMonth,
    navigateMonth,
  };
}

export default useCalendarTasks;
