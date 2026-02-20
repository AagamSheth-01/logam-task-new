import React, { useState, useEffect } from 'react';
import { Clock, CalendarIcon, CheckCircle, XCircle, Timer } from 'lucide-react';
import Button from '../ui/Button';

const WorkingAttendanceWidget = ({ user, setActiveTab }) => {
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attendanceStats, setAttendanceStats] = useState({
    thisMonth: { present: 0, total: 0, rate: 0 }
  });

  useEffect(() => {
    if (user?.username) {
      loadPersonalAttendance();
    }
  }, [user?.username]);

  const loadPersonalAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Get today's attendance
      const todayResponse = await fetch(`/api/attendance?user=${user.username}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (todayResponse.ok) {
        const todayData = await todayResponse.json();
        if (todayData.success) {
          setTodayRecord(todayData.todayRecord);
        }
      }

      // Get this month's stats - calculate proper working days
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const monthResponse = await fetch(`/api/attendance?user=${user.username}&startDate=${startOfMonth}&endDate=${endOfMonth}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (monthResponse.ok) {
        const monthData = await monthResponse.json();
        if (monthData.success) {
          // Calculate total working days in month (excluding weekends)
          const currentDate = new Date();
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();

          // Count working days from start of month to today
          let totalWorkingDays = 0;
          const today = new Date();
          const firstDay = new Date(year, month, 1);

          for (let d = new Date(firstDay); d <= today; d.setDate(d.getDate() + 1)) {
            const dayOfWeek = d.getDay();
            // Exclude Sundays (0) - count Monday to Saturday as working days
            if (dayOfWeek !== 0) {
              totalWorkingDays++;
            }
          }

          const presentDays = monthData.stats?.presentDays || 0;
          const attendanceRate = totalWorkingDays > 0 ? Math.round((presentDays / totalWorkingDays) * 100) : 0;

          setAttendanceStats({
            thisMonth: {
              present: presentDays,
              total: totalWorkingDays,
              rate: attendanceRate
            }
          });
        }
      }
    } catch (error) {
      console.error('Error loading personal attendance:', error);
    } finally {
      setLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
              <div className="h-5 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
              <div className="h-8 bg-gray-200 rounded w-16 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Use standard JavaScript Date for today's display
  const today = new Date().toLocaleDateString();

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
          <Clock className="w-5 h-5" />
          <span>Today's Attendance</span>
        </h3>
        <Button
          onClick={() => setActiveTab('attendance')}
          variant="outline"
          size="sm"
          className="text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          View All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Status */}
        <div className={`p-4 rounded-lg border ${
          todayRecord?.status === 'present'
            ? 'bg-green-50 border-green-200'
            : 'bg-gray-50 border-gray-200'
        }`}>
          <div className="flex items-center space-x-2 mb-2">
            {todayRecord?.status === 'present' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-400" />
            )}
            <span className="font-medium text-black">
              {todayRecord?.status === 'present' ? 'Present' : 'Not Marked'}
            </span>
          </div>
          <p className="text-sm text-gray-600">{today}</p>
          {todayRecord?.workType && (
            <p className="text-xs text-gray-500 mt-1">
              {todayRecord.workType === 'office' ? '🏢 Office' : '🏠 Work From Home'}
            </p>
          )}
        </div>

        {/* This Month Stats */}
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <div className="flex items-center space-x-2 mb-2">
            <CalendarIcon className="w-5 h-5 text-blue-600" />
            <span className="font-medium text-blue-800">This Month</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {attendanceStats.thisMonth.present}/{attendanceStats.thisMonth.total}
          </p>
          <p className="text-sm text-blue-600">
            {attendanceStats.thisMonth.rate}% attendance
          </p>
        </div>

        {/* Quick Action */}
        <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
          <div className="flex items-center space-x-2 mb-2">
            <Timer className="w-5 h-5 text-amber-600" />
            <span className="font-medium text-amber-800">Quick Action</span>
          </div>
          {todayRecord ? (
            <div className="text-sm text-amber-700">
              <p>Check-in: {todayRecord.checkIn || 'N/A'}</p>
              <p>Hours: {todayRecord.totalHours || 'In progress'}</p>
            </div>
          ) : (
            <Button
              onClick={() => setActiveTab('attendance')}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white w-full"
            >
              Mark Attendance
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkingAttendanceWidget;