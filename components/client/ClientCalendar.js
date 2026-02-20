import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Video, 
  FileText, 
  Clock, 
  Users,
  MapPin,
  AlertCircle,
  CheckCircle,
  X,
  Eye,
  Edit3,
  Trash2,
  Filter,
  Search,
  ExternalLink
} from 'lucide-react';
import Button from '../ui/Button';

const ClientCalendar = ({ clientId, clientName, onUpdate = null }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState('month');
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [summary, setSummary] = useState({});
  const [filterType, setFilterType] = useState('all');

  const eventTypes = [
    { value: 'all', label: 'All Events', color: 'bg-gray-100 text-gray-800' },
    { value: 'meeting', label: 'Meetings', color: 'bg-blue-100 text-blue-800' },
    { value: 'event', label: 'Events', color: 'bg-purple-100 text-purple-800' },
    { value: 'task', label: 'Task Deadlines', color: 'bg-orange-100 text-orange-800' }
  ];

  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    eventType: 'reminder',
    startDateTime: '',
    endDateTime: '',
    isAllDay: false,
    location: '',
    attendees: [],
    color: '#9c27b0',
    reminderMinutes: [15]
  });

  useEffect(() => {
    if (clientId) {
      loadCalendarData();
    }
  }, [clientId, currentDate, view]);

  const loadCalendarData = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const startDate = getViewStartDate();
      const endDate = getViewEndDate();
      
      const params = new URLSearchParams({
        view: view,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      });
      
      const response = await fetch(`/api/clients/${clientId}/calendar?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setEvents(data.events || []);
        setSummary(data.summary || {});
      } else {
        setError(data.message || 'Failed to load calendar data');
      }
    } catch (error) {
      console.error('Error loading calendar:', error);
      setError('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const getViewStartDate = () => {
    const start = new Date(currentDate);
    if (view === 'month') {
      start.setDate(1);
      start.setDate(start.getDate() - start.getDay());
    } else if (view === 'week') {
      start.setDate(start.getDate() - start.getDay());
    }
    return start;
  };

  const getViewEndDate = () => {
    const end = new Date(currentDate);
    if (view === 'month') {
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
      end.setDate(end.getDate() + (6 - end.getDay()));
    } else if (view === 'week') {
      end.setDate(end.getDate() + (6 - end.getDay()));
    }
    return end;
  };

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    
    if (!eventForm.title || !eventForm.startDateTime) {
      setError('Title and start date/time are required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/clients/${clientId}/calendar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(eventForm)
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Event created successfully');
        setShowEventModal(false);
        resetEventForm();
        await loadCalendarData();
        
        if (onUpdate) {
          onUpdate();
        }

        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to create event');
      }
    } catch (error) {
      console.error('Error creating event:', error);
      setError('Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/clients/${clientId}/calendar?eventId=${eventId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Event deleted successfully');
        await loadCalendarData();
        
        if (onUpdate) {
          onUpdate();
        }

        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to delete event');
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      setError('Failed to delete event');
    } finally {
      setLoading(false);
    }
  };

  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      eventType: 'reminder',
      startDateTime: '',
      endDateTime: '',
      isAllDay: false,
      location: '',
      attendees: [],
      color: '#9c27b0',
      reminderMinutes: [15]
    });
  };

  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else {
      newDate.setDate(newDate.getDate() + direction);
    }
    setCurrentDate(newDate);
  };

  const getEventIcon = (type, subtype) => {
    if (type === 'meeting') return Video;
    if (type === 'task') return FileText;
    return CalendarIcon;
  };

  const getEventColor = (event) => {
    if (event.color) return event.color;
    if (event.type === 'meeting') return '#4285f4';
    if (event.type === 'task') {
      if (event.status === 'done') return '#4caf50';
      if (event.priority === 'High') return '#f44336';
      return '#ff9800';
    }
    return '#9c27b0';
  };

  const formatEventTime = (start, end, allDay) => {
    const startDate = new Date(start);
    const endDate = new Date(end);
    
    if (allDay) {
      return 'All Day';
    }
    
    const startTime = startDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = endDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    return `${startTime} - ${endTime}`;
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Previous month days
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: prevMonth.getDate() - i,
        isCurrentMonth: false,
        fullDate: new Date(year, month - 1, prevMonth.getDate() - i)
      });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        date: day,
        isCurrentMonth: true,
        fullDate: new Date(year, month, day)
      });
    }
    
    // Next month days
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        date: day,
        isCurrentMonth: false,
        fullDate: new Date(year, month + 1, day)
      });
    }
    
    return days;
  };

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start);
      return eventDate.toDateString() === date.toDateString();
    });
  };

  const filteredEvents = events.filter(event => {
    if (filterType === 'all') return true;
    return event.type === filterType;
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading && events.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
            <CalendarIcon className="w-5 h-5" />
            <span>Calendar</span>
          </h3>
          {summary.totalEvents > 0 && (
            <p className="text-sm text-gray-500 mt-1">
              {summary.totalEvents} events • {summary.todayEvents} today • {summary.upcomingEvents} upcoming
            </p>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => setShowEventModal(true)}
            className="bg-black hover:bg-gray-800 flex items-center space-x-2"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            <span>New Event</span>
          </Button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <p className="text-red-600">{error}</p>
          <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-green-600">{success}</p>
          <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateDate(-1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h2 className="text-xl font-semibold text-black">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button
              onClick={() => navigateDate(1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          
          <Button
            onClick={() => setCurrentDate(new Date())}
            variant="outline"
            size="sm"
            className="text-gray-600 border-gray-300"
          >
            Today
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black text-sm"
          >
            {eventTypes.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
          
          <div className="flex items-center border border-gray-300 rounded-lg">
            <button
              onClick={() => setView('month')}
              className={`px-3 py-2 text-sm ${view === 'month' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Month
            </button>
            <button
              onClick={() => setView('week')}
              className={`px-3 py-2 text-sm ${view === 'week' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              Week
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid */}
      {view === 'month' && (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Day Headers */}
          <div className="grid grid-cols-7 border-b border-gray-200">
            {dayNames.map(day => (
              <div key={day} className="p-3 text-center text-sm font-medium text-gray-600 bg-gray-50">
                {day}
              </div>
            ))}
          </div>
          
          {/* Calendar Days */}
          <div className="grid grid-cols-7">
            {getDaysInMonth().map((day, index) => {
              const dayEvents = getEventsForDate(day.fullDate).filter(event => {
                if (filterType === 'all') return true;
                return event.type === filterType;
              });
              
              return (
                <div key={index} className="min-h-[120px] border-r border-b border-gray-200 p-2">
                  <div className={`text-sm ${day.isCurrentMonth ? 'text-black' : 'text-gray-400'}`}>
                    {day.date}
                  </div>
                  <div className="mt-1 space-y-1">
                    {dayEvents.slice(0, 3).map((event, eventIndex) => {
                      const EventIcon = getEventIcon(event.type, event.subtype);
                      return (
                        <div
                          key={eventIndex}
                          className="px-2 py-1 text-xs rounded truncate cursor-pointer hover:opacity-80 transition-opacity"
                          style={{ backgroundColor: getEventColor(event) + '20', color: getEventColor(event) }}
                          onClick={() => setSelectedEvent(event)}
                          title={event.title}
                        >
                          <div className="flex items-center space-x-1">
                            <EventIcon className="w-3 h-3" />
                            <span className="truncate">{event.title}</span>
                          </div>
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 px-2">
                        +{dayEvents.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event List View */}
      {view === 'week' && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="space-y-4">
            {filteredEvents.length > 0 ? (
              filteredEvents.map((event) => {
                const EventIcon = getEventIcon(event.type, event.subtype);
                return (
                  <div
                    key={event.id}
                    className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div 
                          className="p-2 rounded-lg"
                          style={{ backgroundColor: getEventColor(event) + '20', color: getEventColor(event) }}
                        >
                          <EventIcon className="w-5 h-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-black">{event.title}</h4>
                          {event.description && (
                            <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                          )}
                          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-4 h-4" />
                              <span>{formatEventTime(event.start, event.end, event.allDay)}</span>
                            </div>
                            {event.location && (
                              <div className="flex items-center space-x-1">
                                <MapPin className="w-4 h-4" />
                                <span>{event.location}</span>
                              </div>
                            )}
                            {event.attendees && event.attendees.length > 0 && (
                              <div className="flex items-center space-x-1">
                                <Users className="w-4 h-4" />
                                <span>{event.attendees.length} attendees</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {event.url && (
                          <button
                            onClick={() => window.open(event.url, '_blank')}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Open link"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>
                        )}
                        {event.type === 'event' && (
                          <button
                            onClick={() => handleDeleteEvent(event.id.replace('event_', ''))}
                            className="text-red-600 hover:text-red-800 transition-colors"
                            title="Delete event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8">
                <CalendarIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No events found</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-black">Create New Event</h3>
                <button
                  onClick={() => setShowEventModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={eventForm.title}
                    onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Description
                  </label>
                  <textarea
                    value={eventForm.description}
                    onChange={(e) => setEventForm({...eventForm, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Event Type
                  </label>
                  <select
                    value={eventForm.eventType}
                    onChange={(e) => setEventForm({...eventForm, eventType: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  >
                    <option value="reminder">Reminder</option>
                    <option value="milestone">Milestone</option>
                    <option value="deadline">Deadline</option>
                    <option value="review">Review</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Start Date/Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={eventForm.startDateTime}
                      onChange={(e) => setEventForm({...eventForm, startDateTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      End Date/Time
                    </label>
                    <input
                      type="datetime-local"
                      value={eventForm.endDateTime}
                      onChange={(e) => setEventForm({...eventForm, endDateTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isAllDay"
                    checked={eventForm.isAllDay}
                    onChange={(e) => setEventForm({...eventForm, isAllDay: e.target.checked})}
                  />
                  <label htmlFor="isAllDay" className="text-sm text-black">
                    All Day Event
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={eventForm.location}
                    onChange={(e) => setEventForm({...eventForm, location: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="Optional location"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={eventForm.color}
                    onChange={(e) => setEventForm({...eventForm, color: e.target.value})}
                    className="w-full h-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => setShowEventModal(false)}
                    variant="outline"
                    className="text-gray-600 border-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-black hover:bg-gray-800 text-white"
                  >
                    {loading ? 'Creating...' : 'Create Event'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientCalendar;