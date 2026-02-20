import React, { useState, useEffect } from 'react';
import { 
  Video, 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  MapPin,
  X,
  AlertCircle,
  CheckCircle,
  Edit3,
  Trash2,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import Button from '../ui/Button';

const ClientMeetingScheduler = ({ clientId, clientName, onUpdate = null }) => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [activeDropdown, setActiveDropdown] = useState(null);

  const [meetingForm, setMeetingForm] = useState({
    title: '',
    description: '',
    startDateTime: '',
    endDateTime: '',
    timezone: 'UTC',
    attendees: [],
    agenda: '',
    location: 'Virtual',
    reminderMinutes: [15, 60],
    createGoogleMeet: true
  });

  useEffect(() => {
    if (clientId) {
      loadMeetings();
      loadAvailableUsers();
    }
  }, [clientId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (activeDropdown && !event.target.closest('.meeting-dropdown')) {
        setActiveDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeDropdown]);

  const loadMeetings = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/clients/${clientId}/meetings`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        console.log('📅 Meetings API response:', {
          total: data.meetings?.length || 0,
          meetings: data.meetings,
          clientId,
          timestamp: new Date().toISOString()
        });
        setMeetings(data.meetings || []);
      } else {
        console.error('❌ Failed to load meetings:', data.message);
        setError(data.message || 'Failed to load meetings');
      }
    } catch (error) {
      console.error('Error loading meetings:', error);
      setError('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setAvailableUsers(data.users || []);
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleCreateMeeting = async (e) => {
    e.preventDefault();
    
    if (!meetingForm.title || !meetingForm.startDateTime || !meetingForm.endDateTime) {
      setError('Title, start time, and end time are required');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/clients/${clientId}/meetings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(meetingForm)
      });

      const data = await response.json();

      if (data.success) {
        console.log('✅ Meeting created successfully:', data.meeting);
        setSuccess('Meeting created successfully! You can now access meeting links from the dropdown menu.');
        setShowCreateModal(false);
        resetMeetingForm();
        
        // Force reload meetings
        console.log('🔄 Reloading meetings after creation...');
        await loadMeetings();
        
        if (onUpdate) {
          console.log('📞 Calling onUpdate callback...');
          onUpdate();
        }

        setTimeout(() => setSuccess(''), 5000);
      } else {
        console.error('❌ Failed to create meeting:', data.message);
        setError(data.message || 'Failed to create meeting');
      }
    } catch (error) {
      console.error('Error creating meeting:', error);
      setError('Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelMeeting = async (meetingId) => {
    if (!confirm('Are you sure you want to cancel this meeting?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/clients/${clientId}/meetings?meetingId=${meetingId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Meeting cancelled successfully');
        await loadMeetings();
        
        if (onUpdate) {
          onUpdate();
        }

        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to cancel meeting');
      }
    } catch (error) {
      console.error('Error cancelling meeting:', error);
      setError('Failed to cancel meeting');
    } finally {
      setLoading(false);
    }
  };

  const resetMeetingForm = () => {
    setMeetingForm({
      title: '',
      description: '',
      startDateTime: '',
      endDateTime: '',
      timezone: 'UTC',
      attendees: [],
      agenda: '',
      location: 'Virtual',
      reminderMinutes: [15, 60],
      createGoogleMeet: true
    });
  };

  const formatMeetingTime = (startDateTime, endDateTime) => {
    try {
      let start, end;
      
      // Handle startDateTime
      if (startDateTime?.seconds) {
        start = new Date(startDateTime.seconds * 1000);
      } else if (startDateTime?.toDate) {
        start = startDateTime.toDate();
      } else {
        start = new Date(startDateTime);
      }
      
      // Handle endDateTime
      if (endDateTime?.seconds) {
        end = new Date(endDateTime.seconds * 1000);
      } else if (endDateTime?.toDate) {
        end = endDateTime.toDate();
      } else {
        end = new Date(endDateTime);
      }
      
      // Validate dates
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return 'Invalid date';
      }
      
      const dateStr = start.toLocaleDateString();
      const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      
      return `${dateStr} ${startTime} - ${endTime}`;
    } catch (error) {
      console.error('Error formatting meeting time:', error);
      return 'Invalid date format';
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const upcomingMeetings = meetings.filter(meeting => {
    // Handle different date formats safely
    let meetingDate;
    try {
      if (meeting.startDateTime?.seconds) {
        // Firestore timestamp
        meetingDate = new Date(meeting.startDateTime.seconds * 1000);
      } else if (meeting.startDateTime?.toDate) {
        // Firestore timestamp with toDate method
        meetingDate = meeting.startDateTime.toDate();
      } else {
        // Regular date string
        meetingDate = new Date(meeting.startDateTime);
      }
      
      // Validate the date
      if (isNaN(meetingDate.getTime())) {
        console.warn('⚠️ Invalid meeting date:', {
          id: meeting.id,
          title: meeting.title,
          startDateTime: meeting.startDateTime,
          type: typeof meeting.startDateTime
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Error parsing meeting date:', error, {
        id: meeting.id,
        startDateTime: meeting.startDateTime
      });
      return false;
    }
    
    const now = new Date();
    const isUpcoming = (meeting.status === 'scheduled' || !meeting.status) && meetingDate > now;
    
    console.log('🔍 Meeting filter check:', {
      id: meeting.id,
      title: meeting.title,
      status: meeting.status,
      startDateTime: meeting.startDateTime,
      meetingDate: meetingDate.toISOString(),
      now: now.toISOString(),
      isUpcoming,
      timeCheck: meetingDate > now,
      statusCheck: meeting.status === 'scheduled' || !meeting.status
    });
    
    return isUpcoming;
  });

  const pastMeetings = meetings.filter(meeting => {
    // Handle different date formats safely
    let meetingDate;
    try {
      if (meeting.startDateTime?.seconds) {
        // Firestore timestamp
        meetingDate = new Date(meeting.startDateTime.seconds * 1000);
      } else if (meeting.startDateTime?.toDate) {
        // Firestore timestamp with toDate method
        meetingDate = meeting.startDateTime.toDate();
      } else {
        // Regular date string
        meetingDate = new Date(meeting.startDateTime);
      }
      
      // Validate the date
      if (isNaN(meetingDate.getTime())) {
        console.warn('⚠️ Invalid past meeting date:', {
          id: meeting.id,
          title: meeting.title,
          startDateTime: meeting.startDateTime
        });
        return false;
      }
    } catch (error) {
      console.error('❌ Error parsing past meeting date:', error, {
        id: meeting.id,
        startDateTime: meeting.startDateTime
      });
      return false;
    }
    
    const now = new Date();
    return meeting.status === 'completed' || meeting.status === 'cancelled' || meetingDate < now;
  });

  console.log('Meeting counts:', {
    total: meetings.length,
    upcoming: upcomingMeetings.length,
    past: pastMeetings.length
  });

  if (loading && meetings.length === 0) {
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
        <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
          <Video className="w-5 h-5" />
          <span>Meetings ({meetings.length} total)</span>
        </h3>
        <div className="flex items-center space-x-2">
          <Button
            onClick={() => {
              console.log('🔄 Manual refresh triggered');
              loadMeetings();
            }}
            variant="outline"
            className="flex items-center space-x-2"
            size="sm"
          >
            <span>Refresh</span>
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-black hover:bg-gray-800 flex items-center space-x-2"
            size="sm"
          >
            <Plus className="w-4 h-4" />
            <span>Schedule Meeting</span>
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

      {/* Upcoming Meetings */}
      {upcomingMeetings.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-black">Upcoming Meetings</h4>
          {upcomingMeetings.map((meeting) => (
            <div key={meeting.id} className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h5 className="font-medium text-black">{meeting.title}</h5>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(meeting.status)}`}>
                      {meeting.status}
                    </span>
                  </div>
                  
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{formatMeetingTime(meeting.startDateTime, meeting.endDateTime)}</span>
                    </div>
                    
                    {meeting.location && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <MapPin className="w-4 h-4" />
                        <span>{meeting.location}</span>
                      </div>
                    )}
                    
                    {meeting.attendees && meeting.attendees.length > 0 && (
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Users className="w-4 h-4" />
                        <span>{meeting.attendees.length} attendees</span>
                      </div>
                    )}
                  </div>
                  
                  {meeting.description && (
                    <p className="text-sm text-gray-600 mt-2">{meeting.description}</p>
                  )}
                </div>
                
                <div className="flex items-center space-x-2">
                  {/* Meeting Links Dropdown */}
                  {(meeting.meetUrl || meeting.meetingLinks) && (
                    <div className="relative meeting-dropdown">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === meeting.id ? null : meeting.id);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-1 flex items-center space-x-1"
                        size="sm"
                      >
                        <Video className="w-3 h-3" />
                        <span>Join Meeting</span>
                        <ChevronDown className={`w-3 h-3 transition-transform ${activeDropdown === meeting.id ? 'rotate-180' : ''}`} />
                      </Button>
                      
                      {/* Dropdown Menu */}
                      {activeDropdown === meeting.id && (
                        <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                          <div className="p-2 space-y-1">
                            {meeting.meetingLinks?.googleMeet && (
                              <button
                                onClick={() => {
                                  window.open(meeting.meetingLinks.googleMeet, '_blank');
                                  setActiveDropdown(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center space-x-2"
                              >
                                <Video className="w-3 h-3" />
                                <span>Google Meet</span>
                              </button>
                            )}
                            {meeting.meetingLinks?.googleCalendar && (
                              <button
                                onClick={() => {
                                  window.open(meeting.meetingLinks.googleCalendar, '_blank');
                                  setActiveDropdown(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center space-x-2"
                              >
                                <Calendar className="w-3 h-3" />
                                <span>Add to Calendar</span>
                              </button>
                            )}
                            {meeting.meetingLinks?.zoom && (
                              <button
                                onClick={() => {
                                  window.open(meeting.meetingLinks.zoom, '_blank');
                                  setActiveDropdown(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center space-x-2"
                              >
                                <Video className="w-3 h-3" />
                                <span>Zoom</span>
                              </button>
                            )}
                            {meeting.meetingLinks?.teams && (
                              <button
                                onClick={() => {
                                  window.open(meeting.meetingLinks.teams, '_blank');
                                  setActiveDropdown(null);
                                }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 rounded flex items-center space-x-2"
                              >
                                <Video className="w-3 h-3" />
                                <span>Teams</span>
                              </button>
                            )}
                            {meeting.meetingLinks?.instructions && (
                              <div className="px-3 py-2 text-xs text-gray-600 border-t">
                                {meeting.meetingLinks.instructions}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={() => handleCancelMeeting(meeting.id)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                    title="Cancel meeting"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Past Meetings */}
      {pastMeetings.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-md font-medium text-black">Past Meetings</h4>
          {pastMeetings.slice(0, 5).map((meeting) => (
            <div key={meeting.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <h5 className="font-medium text-gray-700">{meeting.title}</h5>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(meeting.status)}`}>
                      {meeting.status}
                    </span>
                  </div>
                  
                  <div className="mt-2">
                    <div className="flex items-center space-x-2 text-sm text-gray-600">
                      <Clock className="w-4 h-4" />
                      <span>{formatMeetingTime(meeting.startDateTime, meeting.endDateTime)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {meetings.length === 0 && !loading && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Video className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No meetings scheduled yet</p>
          <p className="text-sm text-gray-400">Schedule your first meeting to get started</p>
          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-xs text-left max-w-md mx-auto">
              <p><strong>Debug Info:</strong></p>
              <p>Client ID: {clientId}</p>
              <p>API Endpoint: /api/clients/{clientId}/meetings</p>
              <p>Total meetings loaded: {meetings.length}</p>
              <p>Check browser console for API logs</p>
            </div>
          )}
        </div>
      )}

      {/* Show filtered results */}
      {meetings.length > 0 && upcomingMeetings.length === 0 && pastMeetings.length === 0 && (
        <div className="text-center py-12 bg-yellow-50 rounded-lg">
          <Video className="w-12 h-12 text-yellow-300 mx-auto mb-4" />
          <p className="text-yellow-700">No meetings found matching the current filters</p>
          <p className="text-sm text-yellow-600">Total meetings: {meetings.length}</p>
          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-3 bg-yellow-100 border border-yellow-200 rounded text-xs text-left max-w-md mx-auto">
              <p><strong>Filter Debug:</strong></p>
              <p>Total meetings: {meetings.length}</p>
              <p>Upcoming meetings: {upcomingMeetings.length}</p>
              <p>Past meetings: {pastMeetings.length}</p>
              <p>Check console for filter logs</p>
            </div>
          )}
        </div>
      )}

      {/* Create Meeting Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-black">Schedule Meeting</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateMeeting} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Meeting Title *
                  </label>
                  <input
                    type="text"
                    value={meetingForm.title}
                    onChange={(e) => setMeetingForm({...meetingForm, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Description
                  </label>
                  <textarea
                    value={meetingForm.description}
                    onChange={(e) => setMeetingForm({...meetingForm, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      Start Date/Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={meetingForm.startDateTime}
                      onChange={(e) => setMeetingForm({...meetingForm, startDateTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-black mb-2">
                      End Date/Time *
                    </label>
                    <input
                      type="datetime-local"
                      value={meetingForm.endDateTime}
                      onChange={(e) => setMeetingForm({...meetingForm, endDateTime: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Agenda
                  </label>
                  <textarea
                    value={meetingForm.agenda}
                    onChange={(e) => setMeetingForm({...meetingForm, agenda: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="Meeting agenda items..."
                  />
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      id="createGoogleMeet"
                      checked={meetingForm.createGoogleMeet}
                      onChange={(e) => setMeetingForm({...meetingForm, createGoogleMeet: e.target.checked})}
                    />
                    <label htmlFor="createGoogleMeet" className="text-sm font-medium text-black">
                      Generate meeting links
                    </label>
                  </div>
                  <p className="text-xs text-gray-600 ml-5">
                    This will provide multiple meeting options including Google Meet, Zoom, and calendar integration links.
                  </p>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
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
                    {loading ? 'Scheduling...' : 'Schedule Meeting'}
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

export default ClientMeetingScheduler;