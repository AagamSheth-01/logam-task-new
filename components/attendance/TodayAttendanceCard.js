/**
 * Today Attendance Card Component - View Layer
 * Displays current day attendance with clock in/out functionality
 */

import React, { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  Building,
  Home as HomeIcon,
  CheckCircle,
  LogOut,
  Loader,
  Wifi,
  WifiOff,
  AlertTriangle
} from 'lucide-react';
import Button from '../ui/Button';
import WhatsAppWFHModal from './WhatsAppWFHModal';
import { LocationService, OfflineService } from '../../lib/attendanceServices';
import { getIndiaLocaleDateString } from '../../lib/timezoneClient';

const TodayAttendanceCard = ({
  todayRecord,
  onMarkAttendance,
  onClockOut,
  clockOutLoading = false,
  currentUser
}) => {
  const [selectedWorkType, setSelectedWorkType] = useState('office');
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [location, setLocation] = useState(null);
  const [locationError, setLocationError] = useState('');
  const [isOnline, setIsOnline] = useState(OfflineService.isOnline());

  const today = getIndiaLocaleDateString();

  useEffect(() => {
    const handleOnlineStatus = () => {
      setIsOnline(OfflineService.isOnline());
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, []);

  const handleGetLocation = async () => {
    setLocationLoading(true);
    setLocationError('');

    try {
      const position = await LocationService.getCurrentPosition();
      const address = await LocationService.getAddress(position.latitude, position.longitude);
      const locationData = { ...position, address };
      setLocation(locationData);
      return locationData;
    } catch (error) {
      const errorMessage = error.message || 'Unable to get your location';
      setLocationError(errorMessage);
      console.error('Location error:', error);
      return { error: errorMessage };
    } finally {
      setLocationLoading(false);
    }
  };

  const handleMarkAttendance = async () => {
    // Get location first
    const locationData = await handleGetLocation();

    // For WFH, show WhatsApp modal first
    if (selectedWorkType === 'wfh' && !locationData.error) {
      setShowWhatsAppModal(true);
      return;
    }

    // For office or if location failed, mark attendance directly
    const success = await onMarkAttendance(selectedWorkType, locationData);

    if (success && selectedWorkType === 'wfh' && locationData.error) {
      // Show fallback message for WFH without location
      alert('Marked as WFH. Location was not available for WhatsApp notification.');
    }
  };

  const handleWhatsAppConfirm = async () => {
    setShowWhatsAppModal(false);
    await onMarkAttendance(selectedWorkType, location);
  };

  const statCards = [
    {
      icon: Clock,
      label: 'Check In',
      value: todayRecord?.checkIn || 'Not checked in',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      icon: LogOut,
      label: 'Check Out',
      value: todayRecord?.checkOut || 'Not checked out',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50'
    },
    {
      icon: Clock,
      label: 'Total Hours',
      value: todayRecord?.totalHours || 'In progress',
      color: 'text-green-600',
      bgColor: 'bg-green-50'
    }
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4 sm:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Today's Attendance</span>
          </h3>
          <p className="text-sm text-gray-600">{today}</p>
        </div>

        {/* Online/Offline Status */}
        <div className="flex items-center space-x-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-green-600" />
          ) : (
            <WifiOff className="w-4 h-4 text-red-600" />
          )}
          <span className={`text-xs ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className={`${stat.bgColor} rounded-lg p-3`}>
              <div className="flex items-center space-x-2 mb-1">
                <IconComponent className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs font-medium text-gray-700">{stat.label}</span>
              </div>
              <p className="text-sm font-semibold text-gray-900">{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {!todayRecord ? (
        <div className="space-y-4">
          {/* Work Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Work Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedWorkType('office')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg border transition-colors ${
                  selectedWorkType === 'office'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <Building className="w-4 h-4" />
                <span className="text-sm">Office</span>
              </button>

              <button
                onClick={() => setSelectedWorkType('wfh')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 rounded-lg border transition-colors ${
                  selectedWorkType === 'wfh'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                }`}
              >
                <HomeIcon className="w-4 h-4" />
                <span className="text-sm">WFH</span>
              </button>
            </div>
          </div>

          {/* Location Info */}
          {location && !location.error && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">
                    Location captured
                  </p>
                  <p className="text-xs text-blue-600">
                    {location.address?.city}, {location.address?.state}
                  </p>
                  <p className="text-xs text-blue-500">
                    Accuracy: ±{Math.round(location.accuracy || 0)}m
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Location Error */}
          {locationError && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-800">
                    Location unavailable
                  </p>
                  <p className="text-xs text-amber-600">{locationError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Mark Attendance Button */}
          <Button
            onClick={handleMarkAttendance}
            disabled={locationLoading}
            className="w-full bg-black hover:bg-gray-800 text-white flex items-center justify-center space-x-2"
          >
            {locationLoading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Getting location...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Mark Attendance ({selectedWorkType === 'office' ? 'Office' : 'WFH'})</span>
              </>
            )}
          </Button>

          {/* WFH Info */}
          {selectedWorkType === 'wfh' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs text-green-700">
                📱 Selecting WFH will send a WhatsApp notification to Anas Bhai
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Already Marked Status */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">
                Attendance Marked
              </span>
            </div>
            <p className="text-sm text-green-700">
              Working {todayRecord.workType === 'office' ? 'from Office' : 'from Home'} today
            </p>
            {todayRecord.workType === 'wfh' && (
              <p className="text-xs text-green-600 mt-1">
                🏠 WhatsApp notification sent to Anas Bhai
              </p>
            )}
          </div>

          {/* Clock Out Button */}
          {todayRecord.status === 'present' && !todayRecord.checkOut && (
            <Button
              onClick={onClockOut}
              disabled={clockOutLoading}
              className="w-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center space-x-2"
            >
              {clockOutLoading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Clocking out...</span>
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4" />
                  <span>Clock Out</span>
                </>
              )}
            </Button>
          )}
        </div>
      )}

      {/* WhatsApp Modal */}
      <WhatsAppWFHModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        onConfirm={handleWhatsAppConfirm}
        username={currentUser?.username}
        location={location}
      />
    </div>
  );
};

export default TodayAttendanceCard;