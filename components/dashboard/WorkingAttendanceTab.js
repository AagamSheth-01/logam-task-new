import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Clock,
  Calendar,
  MapPin,
  Home as HomeIcon,
  Building,
  CheckCircle,
  XCircle,
  Filter,
  Download,
  RefreshCw,
  User,
  Users,
  BarChart3,
  Search,
  ChevronDown,
  ChevronUp,
  Timer,
  AlertTriangle,
  Eye,
  Calendar as CalendarIcon,
  TrendingUp,
  X,
  Navigation,
  Globe,
  Wifi,
  WifiOff,
  Loader
} from 'lucide-react';
import {
  getIndiaDate,
  getIndiaLocaleDateString,
  getIndiaLocaleTimeString,
  getIndiaDateTime,
  getReadableIndiaDateTime
} from '../../lib/timezoneClient';

const WorkingAttendanceTab = ({ user }) => {
  const [attendanceData, setAttendanceData] = useState({
    todayRecord: null,
    records: [],
    usersSummary: [],
    stats: { totalDays: 0, presentDays: 0, absentDays: 0, attendanceRate: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedWorkType, setSelectedWorkType] = useState('office');
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState(false);

  useEffect(() => {
    loadAttendanceData();
  }, [user]);

  const loadAttendanceData = async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      if (!token) return;

      // Calculate date range for this month
      const today = getIndiaDate();
      const [year, month] = today.split('-');
      const startOfMonth = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endOfMonth = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;

      // Load attendance data
      const response = await fetch(`/api/attendance?user=${user.username}&startDate=${startOfMonth}&endDate=${endOfMonth}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error('Failed to load attendance data');
      }

      const data = await response.json();

      if (data.success) {
        setAttendanceData({
          todayRecord: data.todayRecord,
          records: data.records || [],
          usersSummary: data.usersSummary || [],
          stats: data.stats || { totalDays: 0, presentDays: 0, absentDays: 0, attendanceRate: 0 }
        });
      } else {
        throw new Error(data.message || 'Failed to load attendance data');
      }
    } catch (err) {
      console.error('Error loading attendance:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);

      if (!navigator.geolocation) {
        throw new Error('Geolocation is not supported by this browser');
      }

      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        });
      });

      const locationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date().toISOString()
      };

      setLocation(locationData);
      return locationData;
    } catch (error) {
      throw new Error(`Could not get location: ${error.message}`);
    } finally {
      setLocationLoading(false);
    }
  };

  const markAttendance = async (workType, locationData) => {
    try {
      const token = localStorage.getItem('token');

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          workType,
          location: locationData,
          notes: locationData ? `Location: ${locationData.latitude}, ${locationData.longitude}` : 'No location data'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark attendance');
      }

      const result = await response.json();

      if (result.success) {
        setSuccess('Attendance marked successfully!');

        // Trigger update event for other components
        window.dispatchEvent(new CustomEvent('attendanceUpdated'));

        // Reload data
        await loadAttendanceData();

        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(result.message || 'Failed to mark attendance');
      }
    } catch (err) {
      console.error('Error marking attendance:', err);
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleMarkAttendance = async (workType, locationData) => {
    await markAttendance(workType, locationData);
  };

  const handleAttendanceClick = async () => {
    try {
      const currentLocation = await getCurrentLocation();
      await handleMarkAttendance(selectedWorkType, currentLocation);
    } catch (error) {
      // If location fails, ask user if they want to proceed without location
      const proceed = window.confirm(
        `Could not get your location: ${error.message}\n\nDo you want to mark attendance without location data?`
      );

      if (proceed) {
        await handleMarkAttendance(selectedWorkType, null);
      }
    }
  };

  const clockOut = async () => {
    try {
      setClockOutLoading(true);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to clock out');
      }

      const result = await response.json();

      if (result.success) {
        setSuccess('Clocked out successfully!');
        await loadAttendanceData();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        throw new Error(result.message || 'Failed to clock out');
      }
    } catch (err) {
      console.error('Error clocking out:', err);
      setError(err.message);
      setTimeout(() => setError(''), 5000);
    } finally {
      setClockOutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 px-3 sm:px-4 lg:px-6 py-3">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading attendance data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 px-3 sm:px-4 lg:px-6 py-3">
      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <p className="text-green-800 text-sm font-medium">{success}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <p className="text-red-800 text-sm font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Today's Attendance Card */}
      <div className="bg-white border border-gray-100 rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-2 sm:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Today's Attendance</span>
            </h3>
            <p className="text-sm text-gray-600">{getIndiaLocaleDateString()}</p>
          </div>

          <div className="flex items-center space-x-2">
            {attendanceData.todayRecord && (
              <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-lg ${
                attendanceData.todayRecord.status === 'present'
                  ? 'bg-green-50 text-green-800 border border-green-200'
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {attendanceData.todayRecord.status === 'present' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span className="font-medium capitalize">{attendanceData.todayRecord.status}</span>
              </div>
            )}
          </div>
        </div>

        {attendanceData.todayRecord ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  {attendanceData.todayRecord.workType === 'office' ? (
                    <Building className="w-4 h-4 text-blue-600" />
                  ) : (
                    <HomeIcon className="w-4 h-4 text-blue-600" />
                  )}
                  <span className="text-sm font-medium text-blue-800">
                    {attendanceData.todayRecord.workType === 'office' ? 'Office' : 'Work From Home'}
                  </span>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Timer className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Check In</span>
                </div>
                <p className="text-lg font-bold text-green-900">
                  {attendanceData.todayRecord.checkIn || 'Not recorded'}
                </p>
              </div>

              <div className={`border rounded-lg p-4 ${
                attendanceData.todayRecord.checkOut
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Timer className={`w-4 h-4 ${attendanceData.todayRecord.checkOut ? 'text-red-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${attendanceData.todayRecord.checkOut ? 'text-red-800' : 'text-gray-600'}`}>
                    Check Out
                  </span>
                </div>
                <p className={`text-lg font-bold ${attendanceData.todayRecord.checkOut ? 'text-red-900' : 'text-gray-500'}`}>
                  {attendanceData.todayRecord.checkOut || 'Not clocked out'}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Timer className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Total Hours</span>
                </div>
                <p className="text-lg font-bold text-amber-900">
                  {attendanceData.todayRecord.totalHours || 'In progress...'}
                </p>
              </div>
            </div>

            {/* Clock Out Button */}
            {attendanceData.todayRecord.checkIn && !attendanceData.todayRecord.checkOut && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={clockOut}
                  disabled={clockOutLoading}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                    clockOutLoading
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700'
                  } text-white`}
                >
                  {clockOutLoading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Clocking Out...</span>
                    </>
                  ) : (
                    <>
                      <Timer className="w-4 h-4" />
                      <span>Clock Out</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-center space-y-4 sm:space-y-0 sm:space-x-6">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="workType"
                  value="office"
                  checked={selectedWorkType === 'office'}
                  onChange={(e) => setSelectedWorkType(e.target.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <Building className="w-5 h-5 text-blue-600" />
                <span className="text-black font-medium">Office</span>
              </label>

              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  name="workType"
                  value="wfh"
                  checked={selectedWorkType === 'wfh'}
                  onChange={(e) => setSelectedWorkType(e.target.value)}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <HomeIcon className="w-5 h-5 text-amber-600" />
                <span className="text-black font-medium">Work From Home</span>
              </label>
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleAttendanceClick}
                disabled={locationLoading}
                className="bg-black hover:bg-gray-800 disabled:bg-gray-400 text-white flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                {locationLoading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Getting Location...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>Mark Attendance</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Monthly Stats */}
      <div className="bg-white border border-gray-100 rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
          <BarChart3 className="w-5 h-5" />
          <span>This Month's Statistics</span>
        </h3>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{attendanceData.stats.totalDays}</div>
            <div className="text-sm text-blue-800">Total Days</div>
          </div>
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{attendanceData.stats.presentDays}</div>
            <div className="text-sm text-green-800">Present Days</div>
          </div>
          <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="text-2xl font-bold text-red-600">{attendanceData.stats.absentDays}</div>
            <div className="text-sm text-red-800">Absent Days</div>
          </div>
          <div className="text-center p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{Math.round(attendanceData.stats.attendanceRate || 0)}%</div>
            <div className="text-sm text-purple-800">Attendance Rate</div>
          </div>
        </div>
      </div>

      {/* Records List */}
      <div className="bg-white border border-gray-100 rounded-lg p-4 sm:p-6">
        <h3 className="text-lg font-semibold text-black mb-4">Recent Records</h3>

        {attendanceData.records.length > 0 ? (
          <div className="space-y-2">
            {attendanceData.records.slice(0, 10).map((record, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                <div className="flex items-center space-x-3">
                  {record.status === 'present' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-gray-400" />
                  )}
                  <div>
                    <div className="font-medium text-gray-900">{record.date}</div>
                    <div className="text-sm text-gray-600">
                      {record.status === 'present' ? (
                        record.workType === 'office' ? 'Office' : 'Work From Home'
                      ) : 'Absent'}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  {record.checkIn && (
                    <div className="text-sm text-gray-900">
                      {record.checkIn} - {record.checkOut || '--:--'}
                    </div>
                  )}
                  {record.totalHours && (
                    <div className="text-xs text-gray-500">{record.totalHours}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            No attendance records found
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkingAttendanceTab;