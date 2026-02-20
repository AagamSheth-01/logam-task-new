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
import CustomAlert from './ui/CustomAlert';
import {
  getIndiaDate,
  getIndiaLocaleDateString,
  getIndiaLocaleTimeString,
  getIndiaDateTime,
  getReadableIndiaDateTime
} from '../lib/timezoneClient';

// Button Component
const Button = ({ children, onClick, variant = 'default', size = 'default', className = '', disabled = false, ...props }) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    default: 'bg-black text-white hover:bg-gray-800 focus:ring-black',
    outline: 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
    ghost: 'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500'
  };
  
  const sizes = {
    sm: 'px-3 py-2 text-sm rounded-md',
    default: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-6 py-3 text-base rounded-lg'
  };
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Location Services
const LocationService = {
  getCurrentPosition: () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes cache
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          });
        },
        (error) => {
          let message = 'Location access denied';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              message = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              message = 'Location request timed out';
              break;
          }
          reject(new Error(message));
        },
        options
      );
    });
  },

  getAddress: async (latitude, longitude) => {
    try {
      // Add User-Agent and referer headers for OpenStreetMap compliance
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'LogamTaskManager/1.0',
            'Referer': typeof window !== 'undefined' ? window.location.origin : ''
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Address lookup response:', data);

      if (data && data.display_name) {
        return {
          full_address: data.display_name,
          road: data.address?.road || '',
          suburb: data.address?.suburb || data.address?.neighbourhood || '',
          city: data.address?.city || data.address?.town || data.address?.village || '',
          state: data.address?.state || '',
          country: data.address?.country || '',
          postcode: data.address?.postcode || ''
        };
      }

      // Fallback to Google Maps Geocoding if OSM fails
      console.log('OSM failed, trying Google Maps fallback...');
      return await LocationService.getAddressGoogle(latitude, longitude);
    } catch (error) {
      console.error('Address lookup failed:', error);
      // Return fallback address with coordinates
      return {
        full_address: `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
        road: 'Address lookup unavailable',
        suburb: '',
        city: 'Unknown',
        state: '',
        country: 'India',
        postcode: ''
      };
    }
  },

  // Fallback to Google Maps geocoding
  getAddressGoogle: async (latitude, longitude) => {
    try {
      // Using a simple reverse geocoding service
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=YOUR_GOOGLE_API_KEY`
      );

      if (!response.ok) throw new Error('Google Maps API failed');

      const data = await response.json();

      if (data.results && data.results[0]) {
        const result = data.results[0];
        const components = result.address_components;

        return {
          full_address: result.formatted_address,
          road: components.find(c => c.types.includes('route'))?.long_name || '',
          suburb: components.find(c => c.types.includes('sublocality'))?.long_name || '',
          city: components.find(c => c.types.includes('locality'))?.long_name || '',
          state: components.find(c => c.types.includes('administrative_area_level_1'))?.long_name || '',
          country: components.find(c => c.types.includes('country'))?.long_name || '',
          postcode: components.find(c => c.types.includes('postal_code'))?.long_name || ''
        };
      }

      return null;
    } catch (error) {
      console.error('Google Maps geocoding failed:', error);
      return null;
    }
  }
};

// Offline Storage Service
const OfflineService = {
  saveOfflineRecord: (record) => {
    const offlineRecords = JSON.parse(localStorage.getItem('offlineAttendanceRecords') || '[]');
    offlineRecords.push({
      ...record,
      id: `offline_${Date.now()}`,
      offline: true,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('offlineAttendanceRecords', JSON.stringify(offlineRecords));
  },

  getOfflineRecords: () => {
    return JSON.parse(localStorage.getItem('offlineAttendanceRecords') || '[]');
  },

  clearOfflineRecords: () => {
    localStorage.removeItem('offlineAttendanceRecords');
  },

  isOnline: () => {
    return navigator.onLine;
  }
};

// Location Display Component
const LocationDisplay = ({ location, showDetails = false, className = '' }) => {
  const [expanded, setExpanded] = useState(false);

  if (!location) {
    return (
      <div className={`text-gray-500 text-sm ${className}`}>
        <div className="flex items-center space-x-1">
          <MapPin className="w-3 h-3" />
          <span>No location data</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <MapPin className="w-4 h-4 text-blue-600 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-gray-900 truncate">
              {location.address?.road || location.address?.suburb || 'Unknown Location'}
            </div>
            <div className="text-xs text-gray-500">
              {location.address?.city || 'Unknown City'}
              {location.accuracy && ` • ±${Math.round(location.accuracy)}m`}
            </div>
          </div>
        </div>
        {showDetails && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            className="flex-shrink-0"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        )}
      </div>
      
      {expanded && location.address && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border">
          <div className="space-y-2">
            <div className="text-xs text-gray-600">
              <strong>Full Address:</strong>
              <div className="mt-1">{location.address.full_address}</div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <strong>Coordinates:</strong>
                <div>{location.latitude?.toFixed(6)}, {location.longitude?.toFixed(6)}</div>
              </div>
              <div>
                <strong>Accuracy:</strong>
                <div>±{Math.round(location.accuracy || 0)} meters</div>
              </div>
            </div>
            {location.timestamp && (
              <div className="text-xs text-gray-600">
                <strong>Captured:</strong>
                <div>{new Date(location.timestamp).toLocaleString()}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// WhatsApp WFH Notification Modal Component with Location
const WhatsAppWFHModal = ({ isOpen, onClose, onConfirm, username, location }) => {
  const [messageSent, setMessageSent] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const ANAS_WHATSAPP = "919408391548"; // Replace with actual complete number (no spaces, no +)
  
  const sendWhatsAppMessage = () => {
    // Check if phone number is properly configured
    if (!ANAS_WHATSAPP || ANAS_WHATSAPP.length < 10) {
      showAlert('error', 'Configuration Error', 'WhatsApp number not properly configured. Please contact administrator.');
      return;
    }

    const locationText = location?.address 
      ? `\nLocation: ${location.address.road || location.address.suburb || 'Unknown'}, ${location.address.city || 'Unknown City'}`
      : '\nLocation: Not available';
    
    const message = `Hello Anas Bhai,

I am working from home today.

Name: ${username}
Date: ${getIndiaLocaleDateString()}
Time: ${getIndiaLocaleTimeString()}${locationText}

Thanks!`;
    
    const whatsappUrl = `https://wa.me/${ANAS_WHATSAPP}?text=${encodeURIComponent(message)}`;
    
    console.log('WhatsApp URL:', whatsappUrl);
    console.log('Phone number:', ANAS_WHATSAPP);
    
    // Try to open WhatsApp
    try {
      window.open(whatsappUrl, '_blank');
      setMessageSent(true);
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      showAlert('error', 'WhatsApp Error', 'Failed to open WhatsApp. Please copy the message manually and send it to Anas Bhai.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
            <div className="w-6 h-6 text-green-600">📱</div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-black">WFH Notification Required</h3>
            <p className="text-sm text-gray-600">You must notify Anas Bhai via WhatsApp</p>
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <p className="text-sm text-blue-800">
            <strong>Policy:</strong> All Work From Home requests must be communicated to Anas Bhai via WhatsApp before marking attendance.
          </p>
          {ANAS_WHATSAPP && (
            <p className="text-xs text-blue-600 mt-2">
              <strong>WhatsApp Number:</strong> +{ANAS_WHATSAPP}
            </p>
          )}
        </div>

        {location && (
          <div className="mb-4">
            <LocationDisplay location={location} showDetails={true} />
          </div>
        )}
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-gray-700 font-medium mb-2">Message Preview:</p>
          <div className="text-sm text-gray-600 italic whitespace-pre-line">
            Hello Anas Bhai,{'\n\n'}
            I am working from home today.{'\n\n'}
            Name: {username}{'\n'}
            Date: {getIndiaLocaleDateString()}{'\n'}
            Time: {getIndiaLocaleTimeString()}{'\n'}
            {location?.address && `Location: ${location.address.road || location.address.suburb || 'Unknown'}, ${location.address.city || 'Unknown City'}`}{'\n\n'}
            Thanks!
          </div>
        </div>
        
        {!messageSent ? (
          <div className="space-y-3">
            <button
              onClick={sendWhatsAppMessage}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
            >
              <span>📱</span>
              <span>Send WhatsApp Message to Anas Bhai</span>
            </button>
            <button
              onClick={() => {
                const message = `Hello Anas Bhai,

I am working from home today.

Name: ${username}
Date: ${getIndiaLocaleDateString()}
Time: ${getIndiaLocaleTimeString()}
${location?.address ? `Location: ${location.address.road || location.address.suburb || 'Unknown'}, ${location.address.city || 'Unknown City'}` : 'Location: Not available'}

Thanks!`;
                navigator.clipboard.writeText(message).then(() => {
                  showAlert('success', 'Copied!', 'Message copied to clipboard! You can paste it in WhatsApp manually.');
                }).catch(() => {
                  showAlert('error', 'Copy Failed', 'Could not copy message. Please copy it manually from the preview above.');
                });
              }}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
            >
              <span>📋</span>
              <span>Copy Message (Manual Send)</span>
            </button>
            <button
              onClick={onClose}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <div className="text-2xl mb-2">✅</div>
              <p className="text-green-800 font-medium">WhatsApp message sent!</p>
              <p className="text-green-600 text-sm">You can now mark your WFH attendance</p>
            </div>
            <button
              onClick={onConfirm}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-colors"
            >
              Mark WFH Attendance
            </button>
            <button
              onClick={onClose}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-4 rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// Today's Attendance Card Component with Location
const TodayAttendanceCard = ({ todayRecord, onMarkAttendance, onClockOut, clockOutLoading = false, currentUser }) => {
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

  const getCurrentLocation = async () => {
    try {
      setLocationLoading(true);
      setLocationError('');
      
      const position = await LocationService.getCurrentPosition();
      const address = await LocationService.getAddress(position.latitude, position.longitude);
      
      const locationData = {
        ...position,
        address
      };
      
      setLocation(locationData);
      return locationData;
    } catch (error) {
      setLocationError(error.message);
      throw error;
    } finally {
      setLocationLoading(false);
    }
  };

  const handleAttendanceClick = async () => {
    try {
      const currentLocation = await getCurrentLocation();
      
      if (selectedWorkType === 'wfh') {
        setShowWhatsAppModal(true);
      } else {
        onMarkAttendance(selectedWorkType, currentLocation);
      }
    } catch (error) {
      // If location fails, ask user if they want to proceed without location
      const proceed = window.confirm(
        `Could not get your location: ${error.message}\n\nDo you want to mark attendance without location data?`
      );
      
      if (proceed) {
        if (selectedWorkType === 'wfh') {
          setShowWhatsAppModal(true);
        } else {
          onMarkAttendance(selectedWorkType, null);
        }
      }
    }
  };

  const handleWFHConfirm = () => {
    setShowWhatsAppModal(false);
    onMarkAttendance('wfh', location);
  };

  return (
    <>
      <div className="bg-white border border-gray-100 rounded-lg p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 space-y-2 sm:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Today's Attendance</span>
            </h3>
            <p className="text-sm text-gray-600">{today}</p>
          </div>
          
          <div className="flex items-center space-x-2">
            {!isOnline && (
              <div className="flex items-center space-x-1 text-amber-600 text-sm">
                <WifiOff className="w-4 h-4" />
                <span className="hidden sm:inline">Offline</span>
              </div>
            )}
            
            {todayRecord && (
              <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-lg ${
                todayRecord.status === 'present' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {todayRecord.status === 'present' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                <span className="font-medium capitalize">{todayRecord.status}</span>
              </div>
            )}
          </div>
        </div>

        {todayRecord ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  {todayRecord.workType === 'office' ? (
                    <Building className="w-4 h-4 text-blue-600" />
                  ) : (
                    <HomeIcon className="w-4 h-4 text-blue-600" />
                  )}
                  <span className="text-sm font-medium text-blue-800">
                    {todayRecord.workType === 'office' ? 'Office' : 'Work From Home'}
                  </span>
                </div>
                {todayRecord.workType === 'wfh' && (
                  <div className="text-xs text-blue-600 mt-1 flex items-center space-x-1">
                    <span>📱</span>
                    <span>Anas Bhai notified</span>
                  </div>
                )}
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Timer className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Check In</span>
                </div>
                <p className="text-lg font-bold text-green-900">
                  {todayRecord.checkIn || 'Not recorded'}
                </p>
              </div>

              <div className={`border rounded-lg p-4 ${
                todayRecord.checkOut
                  ? 'bg-red-50 border-red-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Timer className={`w-4 h-4 ${todayRecord.checkOut ? 'text-red-600' : 'text-gray-400'}`} />
                  <span className={`text-sm font-medium ${todayRecord.checkOut ? 'text-red-800' : 'text-gray-600'}`}>
                    Check Out
                  </span>
                </div>
                <p className={`text-lg font-bold ${todayRecord.checkOut ? 'text-red-900' : 'text-gray-500'}`}>
                  {todayRecord.checkOut || 'Not clocked out'}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Timer className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Total Hours</span>
                </div>
                <p className="text-lg font-bold text-amber-900">
                  {todayRecord.totalHours || 'In progress...'}
                </p>
              </div>
            </div>

            {/* Clock Out Button */}
            {todayRecord.checkIn && !todayRecord.checkOut && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={onClockOut}
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

            {todayRecord.location && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <LocationDisplay
                  location={todayRecord.location}
                  showDetails={true}
                />
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
            
            {selectedWorkType === 'wfh' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-amber-600">📱</span>
                  <span className="text-sm font-medium text-amber-800">WhatsApp Notification Required</span>
                </div>
                <p className="text-sm text-amber-700">
                  You must notify Anas Bhai via WhatsApp before marking WFH attendance.
                </p>
              </div>
            )}

            {locationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">Location Error</span>
                </div>
                <p className="text-sm text-red-700">{locationError}</p>
              </div>
            )}

            {location && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <LocationDisplay location={location} showDetails={true} />
              </div>
            )}
            
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
                    <span>
                      {selectedWorkType === 'wfh' 
                        ? 'Notify & Mark WFH Attendance' 
                        : 'Mark Office Attendance'
                      }
                    </span>
                  </>
                )}
              </button>
            </div>

            {!isOnline && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <WifiOff className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Offline Mode</span>
                </div>
                <p className="text-sm text-amber-700">
                  Your attendance will be saved locally and synced when you're back online.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <WhatsAppWFHModal
        isOpen={showWhatsAppModal}
        onClose={() => setShowWhatsAppModal(false)}
        onConfirm={handleWFHConfirm}
        username={currentUser?.username}
        location={location}
      />
    </>
  );
};

// Admin User Summary Component
const AdminUserSummary = ({ usersSummary }) => {
  const presentToday = usersSummary.filter(user => user.todayStatus === 'present').length;
  const absentToday = usersSummary.filter(user => user.todayStatus === 'absent').length;
  const wfhToday = usersSummary.filter(user => user.todayStatus === 'present' && user.todayWorkType === 'wfh').length;
  const officeToday = usersSummary.filter(user => user.todayStatus === 'present' && user.todayWorkType === 'office').length;

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4 sm:p-6">
      <h3 className="text-lg font-semibold text-black mb-4 flex items-center space-x-2">
        <Users className="w-5 h-5" />
        <span>Today's Team Status</span>
      </h3>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="text-2xl font-bold text-green-600">{presentToday}</div>
          <div className="text-sm text-green-800">Present Today</div>
        </div>
        <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="text-2xl font-bold text-red-600">{absentToday}</div>
          <div className="text-sm text-red-800">Absent Today</div>
        </div>
        <div className="text-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="text-2xl font-bold text-blue-600">{officeToday}</div>
          <div className="text-sm text-blue-800">In Office</div>
        </div>
        <div className="text-center p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <div className="text-2xl font-bold text-amber-600">{wfhToday}</div>
          <div className="text-sm text-amber-800">Work From Home</div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {usersSummary.map((user, index) => (
          <div key={index} className={`p-3 border rounded-lg ${
            user.todayStatus === 'present' 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
              <div className="min-w-0 flex-1">
                <div className="font-medium text-sm text-black truncate">{user.username}</div>
                <div className="text-xs text-gray-600">{user.role}</div>
              </div>
              <div className="text-right flex-shrink-0">
                <div className={`text-xs font-medium ${
                  user.todayStatus === 'present' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {user.todayStatus === 'present' ? '✓ Present' : '✗ Absent'}
                </div>
                {user.todayStatus === 'present' && user.todayWorkType && (
                  <div className="text-xs text-gray-500 flex items-center space-x-1 justify-end">
                    {user.todayWorkType === 'office' ? (
                      <>
                        <Building className="w-3 h-3" />
                        <span>Office</span>
                      </>
                    ) : (
                      <>
                        <HomeIcon className="w-3 h-3" />
                        <span>WFH</span>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Attendance Statistics Component
const AttendanceStats = ({ stats, userRole, usersSummary, selectedUser }) => {
  let displayStats = stats;

  if (userRole === 'admin' && selectedUser === 'all' && usersSummary && usersSummary.length > 0) {
    displayStats = {
      totalDays: usersSummary.reduce((acc, user) => acc + (user.stats?.totalDays || 0), 0),
      presentDays: usersSummary.reduce((acc, user) => acc + (user.stats?.presentDays || 0), 0),
      halfDays: usersSummary.reduce((acc, user) => acc + (user.stats?.halfDays || 0), 0),
      absentDays: usersSummary.reduce((acc, user) => acc + (user.stats?.absentDays || 0), 0),
      wfhDays: usersSummary.reduce((acc, user) => acc + (user.stats?.wfhDays || 0), 0),
      officeDays: usersSummary.reduce((acc, user) => acc + (user.stats?.officeDays || 0), 0),
    };

    displayStats.attendanceRate = displayStats.totalDays > 0
      ? Math.round((displayStats.presentDays / displayStats.totalDays) * 100)
      : 0;
  }

  const statCards = [
    { label: 'Total Days', value: displayStats.totalDays, icon: CalendarIcon, color: 'text-black' },
    { label: 'Present', value: displayStats.presentDays, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Half Day', value: displayStats.halfDays || 0, icon: Timer, color: 'text-orange-600' },
    { label: 'Absent', value: displayStats.absentDays, icon: XCircle, color: 'text-red-600' },
    { label: 'WFH Days', value: displayStats.wfhDays, icon: HomeIcon, color: 'text-amber-600' },
    { label: 'Office Days', value: displayStats.officeDays, icon: Building, color: 'text-blue-600' },
    { label: 'Attendance Rate', value: `${displayStats.attendanceRate}%`, icon: TrendingUp, color: 'text-green-600' }
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
      {statCards.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="bg-white border border-gray-100 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs text-gray-600 truncate">{stat.label}</p>
                <p className="text-lg font-bold text-black mt-1">{stat.value}</p>
              </div>
              <Icon className={`w-5 h-5 ${stat.color} flex-shrink-0 ml-2`} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// Attendance Filters Component
const AttendanceFilters = ({
  userRole,
  allUsers,
  selectedUser,
  setSelectedUser,
  dateRange,
  setDateRange,
  filterStatus,
  setFilterStatus,
  filterWorkType,
  setFilterWorkType,
  searchTerm,
  setSearchTerm,
  onRefresh,
  onGenerateReport
}) => {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-4">
      {/* Mobile filter toggle */}
      <div className="sm:hidden mb-4">
        <Button
          onClick={() => setShowFilters(!showFilters)}
          variant="outline"
          className="w-full flex items-center justify-between"
        >
          <span>Filters</span>
          {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </div>

      <div className={`space-y-4 ${showFilters ? 'block' : 'hidden sm:block'}`}>
        {/* Date Range Row */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="flex flex-col sm:flex-row gap-4 w-full">
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">From:</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">To:</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
              />
            </div>

            {/* User Filter (Admin only) */}
            {userRole === 'admin' && (
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black min-w-0 flex-1 sm:flex-initial"
              >
                <option value="all">All Users</option>
                {allUsers.map(user => (
                  <option key={user.username} value={user.username}>
                    {user.username} ({user.role})
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Filters and Actions Row */}
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black w-full sm:w-48"
              />
            </div>
            
            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="half-day">Half Day</option>
              <option value="absent">Absent</option>
            </select>
            
            {/* Work Type Filter */}
            <select
              value={filterWorkType}
              onChange={(e) => setFilterWorkType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-black focus:border-black"
            >
              <option value="all">All Types</option>
              <option value="office">Office</option>
              <option value="wfh">Work From Home</option>
            </select>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
            <Button
              onClick={onRefresh}
              variant="outline"
              size="sm"
              className="flex items-center justify-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
            
            <Button
              onClick={onGenerateReport}
              variant="outline"
              size="sm"
              className="flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Attendance Table Component
const AttendanceTable = ({ records, userRole, selectedUser, onUpdateAttendance }) => {
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [viewMode, setViewMode] = useState('table'); // 'table' or 'cards'

  const getStatusColor = (status) => {
    if (status === 'present') {
      return 'text-green-600 bg-green-50 border-green-200';
    } else if (status === 'half-day') {
      return 'text-orange-600 bg-orange-50 border-orange-200';
    } else {
      return 'text-red-600 bg-red-50 border-red-200';
    }
  };

  const getWorkTypeColor = (workType) => {
    return workType === 'office'
      ? 'text-blue-600 bg-blue-50 border-blue-200'
      : 'text-amber-600 bg-amber-50 border-amber-200';
  };

  const sortedRecords = records.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB - dateA;
  });

  // Mobile Card View
  const CardView = () => (
    <div className="space-y-4">
      {sortedRecords.map((record, index) => (
        <div key={record.id || index} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CalendarIcon className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-sm">{record.date}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 border rounded text-xs font-medium ${getStatusColor(record.status)}`}>
                {record.status === 'present' ? '✓ Present' :
                 record.status === 'half-day' ? '◐ Half Day' : '✗ Absent'}
              </span>
            </div>
          </div>

          {(userRole === 'admin' && selectedUser === 'all') && (
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center flex-shrink-0">
                {record.profileImage ? (
                  <img
                    src={record.profileImage}
                    alt={record.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-3 h-3 text-gray-600" />
                )}
              </div>
              <span className="text-sm font-medium">{record.username}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Work Type</div>
              <span className={`px-2 py-1 border rounded text-xs font-medium ${getWorkTypeColor(record.workType)}`}>
                {record.workType === 'office' ? (
                  <div className="flex items-center space-x-1">
                    <Building className="w-3 h-3" />
                    <span>Office</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-1">
                    <HomeIcon className="w-3 h-3" />
                    <span>WFH</span>
                    {record.notes && record.notes.includes('WhatsApp') && (
                      <span className="text-green-600">📱</span>
                    )}
                  </div>
                )}
              </span>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Check In</div>
              <div className="text-sm font-medium">{record.checkIn || 'N/A'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-500 mb-1">Check Out</div>
              <div className="text-sm font-medium">{record.checkOut || 'N/A'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500 mb-1">Hours</div>
              <div className="text-sm font-medium">{record.totalHours || 'N/A'}</div>
            </div>
          </div>

          {record.location && (
            <div className="border-t border-gray-100 pt-3">
              <LocationDisplay 
                location={record.location} 
                showDetails={expandedRecord === record.id}
                className="w-full"
              />
              <Button
                onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                variant="ghost"
                size="sm"
                className="mt-2 text-blue-600"
              >
                {expandedRecord === record.id ? 'Hide Location Details' : 'Show Location Details'}
              </Button>
            </div>
          )}

          {userRole === 'admin' && (
            <div className="border-t border-gray-100 pt-3 flex items-center space-x-2">
              <Button
                onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Eye className="w-3 h-3 mr-1" />
                Details
              </Button>
              
              {record.status === 'present' && !record.checkOut && (
                <Button
                  onClick={() => onUpdateAttendance(record.id, { 
                    checkOut: new Date().toLocaleTimeString('en-US', { 
                      hour12: false,
                      hour: '2-digit',
                      minute: '2-digit'
                    }),
                    status: 'present'
                  })}
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-200 hover:bg-green-50"
                >
                  Check Out
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // Desktop Table View
  const TableView = () => (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Date
            </th>
            {(userRole === 'admin' && selectedUser === 'all') && (
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                User
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Work Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Location
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Check In
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Check Out
            </th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Hours
            </th>
            {userRole === 'admin' && (
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sortedRecords.map((record, index) => (
            <tr key={record.id || index} className="hover:bg-gray-50 transition-colors">
              <td className="px-6 py-4 text-sm text-gray-900">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span className="font-medium">{record.date}</span>
                </div>
              </td>
              
              {(userRole === 'admin' && selectedUser === 'all') && (
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center flex-shrink-0">
                      {record.profileImage ? (
                        <img
                          src={record.profileImage}
                          alt={record.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <User className="w-4 h-4 text-gray-600" />
                      )}
                    </div>
                    <span className="font-medium">{record.username}</span>
                  </div>
                </td>
              )}
              
              <td className="px-6 py-4">
                <span className={`px-2 py-1 border rounded text-xs font-medium ${getStatusColor(record.status)}`}>
                  {record.status === 'present' ? (
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="w-3 h-3" />
                      <span>Present</span>
                    </div>
                  ) : record.status === 'half-day' ? (
                    <div className="flex items-center space-x-1">
                      <Timer className="w-3 h-3" />
                      <span>Half Day</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <XCircle className="w-3 h-3" />
                      <span>Absent</span>
                    </div>
                  )}
                </span>
              </td>
              
              <td className="px-6 py-4">
                <span className={`px-2 py-1 border rounded text-xs font-medium ${getWorkTypeColor(record.workType)}`}>
                  {record.workType === 'office' ? (
                    <div className="flex items-center space-x-1">
                      <Building className="w-3 h-3" />
                      <span>Office</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-1">
                      <HomeIcon className="w-3 h-3" />
                      <span>WFH</span>
                      {record.notes && record.notes.includes('WhatsApp') && (
                        <span className="text-green-600">📱</span>
                      )}
                    </div>
                  )}
                </span>
              </td>

              <td className="px-6 py-4 max-w-xs">
                {record.location ? (
                  <LocationDisplay 
                    location={record.location} 
                    showDetails={expandedRecord === record.id}
                  />
                ) : (
                  <span className="text-gray-500 text-sm">No location</span>
                )}
              </td>
              
              <td className="px-6 py-4 text-sm text-gray-900">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="font-mono">{record.checkIn || 'N/A'}</span>
                </div>
              </td>
              
              <td className="px-6 py-4 text-sm text-gray-900">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="font-mono">{record.checkOut || 'N/A'}</span>
                </div>
              </td>
              
              <td className="px-6 py-4 text-sm text-gray-900">
                <div className="flex items-center space-x-2">
                  <Timer className="w-4 h-4 text-gray-400" />
                  <span className="font-medium font-mono">{record.totalHours || 'N/A'}</span>
                </div>
              </td>

              {userRole === 'admin' && (
                <td className="px-6 py-4">
                  {!record.isPlaceholder ? (
                    <div className="flex items-center space-x-2">
                      <Button
                        onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                        variant="outline"
                        size="sm"
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        <Eye className="w-3 h-3" />
                      </Button>

                      {record.status === 'present' && !record.checkOut && (
                        <Button
                          onClick={() => onUpdateAttendance(record.id, {
                            checkOut: new Date().toLocaleTimeString('en-US', {
                              hour12: false,
                              hour: '2-digit',
                              minute: '2-digit'
                            }),
                            status: 'present'
                          })}
                          variant="outline"
                          size="sm"
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          Check Out
                        </Button>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs">No record</span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
          <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
            <BarChart3 className="w-5 h-5" />
            <span>
              Attendance Records ({records.length})
              {userRole === 'admin' && selectedUser !== 'all' && (
                <span className="text-sm font-normal text-gray-600 ml-2">- {selectedUser}</span>
              )}
              {userRole === 'admin' && selectedUser === 'all' && (
                <span className="text-sm font-normal text-gray-600 ml-2">- All Users</span>
              )}
            </span>
          </h3>
          
          {/* View Mode Toggle for Mobile */}
          <div className="sm:hidden flex items-center space-x-2">
            <Button
              onClick={() => setViewMode('cards')}
              variant={viewMode === 'cards' ? 'default' : 'outline'}
              size="sm"
            >
              Cards
            </Button>
            <Button
              onClick={() => setViewMode('table')}
              variant={viewMode === 'table' ? 'default' : 'outline'}
              size="sm"
            >
              Table
            </Button>
          </div>
        </div>
      </div>
      
      {/* Responsive View */}
      <div className="p-4">
        <div className="block sm:hidden">
          <CardView />
        </div>
        <div className="hidden sm:block">
          <TableView />
        </div>
        
        {records.length === 0 && (
          <div className="py-12 text-center">
            <div className="flex flex-col items-center space-y-2">
              <BarChart3 className="w-12 h-12 text-gray-300" />
              <p className="text-gray-500">No attendance records found</p>
              <p className="text-sm text-gray-400">
                {userRole === 'admin' && selectedUser === 'all' 
                  ? 'No attendance data available for the selected date range'
                  : 'Try adjusting your date range or filters'
                }
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Attendance Management Component
const AttendanceManagement = ({ userRole = 'user', currentUser }) => {
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [clockOutLoading, setClockOutLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isOnline, setIsOnline] = useState(OfflineService.isOnline());
  const [alertState, setAlertState] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: ''
  });
  const [pagination, setPagination] = useState({
    hasMore: false,
    limit: 30,
    currentPage: 1
  });

  // Helper function to show custom alerts
  const showAlert = (type, title, message) => {
    setAlertState({
      isOpen: true,
      type,
      title,
      message
    });
  };

  const closeAlert = () => {
    setAlertState(prev => ({ ...prev, isOpen: false }));
  };
  
  // Admin specific states
  const [allUsers, setAllUsers] = useState([]);
  const [allUsersData, setAllUsersData] = useState([]);
  const [selectedUser, setSelectedUser] = useState('all');

  // Initialize date range to last 7 days for faster loading
  const getDefaultDateRange = () => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 6); // Last 7 days including today

    return {
      start: sevenDaysAgo.toISOString().split('T')[0],
      end: today.toISOString().split('T')[0]
    };
  };

  const [dateRange, setDateRange] = useState(getDefaultDateRange());

  // Memoize dateRange to prevent unnecessary re-renders
  const memoizedDateRange = useMemo(() => `${dateRange.start}-${dateRange.end}`, [dateRange.start, dateRange.end]);

  // Ref to prevent duplicate requests
  const loadingRef = useRef(false);

  // Cache for attendance data (in-memory cache for 2 minutes)
  const cacheRef = useRef({});
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutes

  // Filter states
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterWorkType, setFilterWorkType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Statistics
  const [stats, setStats] = useState({
    totalDays: 0,
    presentDays: 0,
    halfDays: 0,
    absentDays: 0,
    wfhDays: 0,
    officeDays: 0,
    attendanceRate: 0
  });

  useEffect(() => {
    console.log('AttendanceManagement mounted:', { userRole, currentUser, selectedUser });
    loadAttendanceData();
    if (userRole === 'admin') {
      loadAllUsers();
    }

    // Handle online/offline events
    const handleOnlineStatus = () => {
      const online = OfflineService.isOnline();
      setIsOnline(online);
      if (online) {
        syncOfflineRecords();
      }
    };

    window.addEventListener('online', handleOnlineStatus);
    window.addEventListener('offline', handleOnlineStatus);

    return () => {
      window.removeEventListener('online', handleOnlineStatus);
      window.removeEventListener('offline', handleOnlineStatus);
    };
  }, [userRole, selectedUser, memoizedDateRange]); // Use memoized date range to prevent unnecessary re-renders

  const syncOfflineRecords = async () => {
    const offlineRecords = OfflineService.getOfflineRecords();
    if (offlineRecords.length === 0) return;

    try {
      const token = localStorage.getItem('token');
      
      for (const record of offlineRecords) {
        await fetch('/api/attendance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            workType: record.workType,
            location: record.location,
            notes: record.notes,
            timestamp: record.timestamp
          })
        });
      }
      
      OfflineService.clearOfflineRecords();
      setSuccessMessage('✅ Offline records synced successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadAttendanceData();
    } catch (error) {
      console.error('Failed to sync offline records:', error);
    }
  };

  const loadAttendanceData = async (isLoadMore = false) => {
    // Prevent duplicate requests
    if (loadingRef.current && !isLoadMore) {
      console.log('🚫 Skipping duplicate request');
      return;
    }

    // Check cache first (skip for load more)
    const cacheKey = `${userRole}-${selectedUser}-${dateRange.start}-${dateRange.end}`;
    if (!isLoadMore && cacheRef.current[cacheKey]) {
      const cachedData = cacheRef.current[cacheKey];
      const age = Date.now() - cachedData.timestamp;

      if (age < CACHE_DURATION) {
        console.log(`💾 Using cached data (${Math.round(age/1000)}s old)`);
        setAttendanceRecords(cachedData.records);
        setTodayRecord(cachedData.todayRecord);
        setStats(cachedData.stats);
        setAllUsersData(cachedData.allUsersData || []);
        return;
      }
    }

    try {
      loadingRef.current = true;

      if (isLoadMore) {
        setLoadingMore(true);
      } else {
        setLoading(true);
      }
      const token = localStorage.getItem('token');

      let url = '/api/attendance';
      const params = new URLSearchParams();
      
      if (userRole === 'admin') {
        if (selectedUser === 'all') {
          params.append('all', 'true');
          console.log('Admin requesting all users attendance');
        } else {
          params.append('user', selectedUser);
          console.log('Admin requesting specific user:', selectedUser);
        }
      } else {
        params.append('user', currentUser?.username);
        console.log('User requesting own data:', currentUser?.username);
      }

      // Add pagination parameters
      params.append('pageSize', '30'); // Load 30 records at a time

      if (dateRange.start) params.append('startDate', dateRange.start);
      if (dateRange.end) params.append('endDate', dateRange.end);

      console.log('Making request to:', `${url}?${params}`);
      
      const response = await fetch(`${url}?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      console.log('Attendance API response:', data);
      
      if (data.success) {
        // Update pagination info
        if (data.pagination) {
          setPagination({
            hasMore: data.pagination.hasMore || false,
            limit: data.pagination.limit || 30,
            currentPage: isLoadMore ? pagination.currentPage + 1 : 1
          });
        }

        if (userRole === 'admin' && selectedUser === 'all') {
          console.log('Processing admin all-users data');

          let allRecords = [];
          if (data.usersSummary && data.usersSummary.length > 0) {
            data.usersSummary.forEach(userSummary => {
              if (userSummary.recentRecords && userSummary.recentRecords.length > 0) {
                allRecords = [...allRecords, ...userSummary.recentRecords];
              }
            });
          }

          if (data.records && data.records.length > 0) {
            allRecords = [...allRecords, ...data.records];
          }

          const uniqueRecords = allRecords.filter((record, index, self) =>
            index === self.findIndex(r => r.id === record.id)
          );

          if (isLoadMore) {
            setAttendanceRecords(prev => [...prev, ...uniqueRecords]);
          } else {
            setAttendanceRecords(uniqueRecords);
          }
          setTodayRecord(null);
          setAllUsersData(data.usersSummary || []);
          
          if (data.usersSummary && data.usersSummary.length > 0) {
            const systemStats = {
              totalDays: data.usersSummary.reduce((acc, user) => acc + (user.stats?.totalDays || 0), 0),
              presentDays: data.usersSummary.reduce((acc, user) => acc + (user.stats?.presentDays || 0), 0),
              halfDays: data.usersSummary.reduce((acc, user) => acc + (user.stats?.halfDays || 0), 0),
              absentDays: data.usersSummary.reduce((acc, user) => acc + (user.stats?.absentDays || 0), 0),
              wfhDays: data.usersSummary.reduce((acc, user) => acc + (user.stats?.wfhDays || 0), 0),
              officeDays: data.usersSummary.reduce((acc, user) => acc + (user.stats?.officeDays || 0), 0),
            };

            systemStats.attendanceRate = systemStats.totalDays > 0
              ? Math.round((systemStats.presentDays / systemStats.totalDays) * 100)
              : 0;

            setStats(systemStats);
          } else {
            setStats(data.stats || stats);
          }
        } else {
          if (isLoadMore) {
            setAttendanceRecords(prev => [...prev, ...(data.records || [])]);
          } else {
            setAttendanceRecords(data.records || []);
          }
          setTodayRecord(data.todayRecord || null);
          setStats(data.stats || stats);
          console.log('📊 User stats loaded:', {
            dateRange: { start: dateRange.start, end: dateRange.end },
            stats: data.stats,
            recordsCount: data.records?.length || 0,
            todayRecord: !!data.todayRecord
          });
          setAllUsersData([]);

          // Cache the data
          cacheRef.current[cacheKey] = {
            records: data.records || [],
            todayRecord: data.todayRecord || null,
            stats: data.stats || stats,
            allUsersData: [],
            timestamp: Date.now()
          };
        }
      } else {
        setError(data.message || 'Failed to load attendance data');
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      loadingRef.current = false; // Reset ref to allow future requests
    }
  };

  const loadMoreRecords = () => {
    loadAttendanceData(true);
  };

  const forceRefresh = () => {
    // Clear all cache
    cacheRef.current = {};
    console.log('🔄 Cache cleared, forcing refresh');
    loadAttendanceData(false);
  };

  const loadAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      if (data.success) {
        setAllUsers(data.users || []);
        console.log('Loaded users for dropdown:', data.users?.length || 0);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
    }
  };

  const markAttendance = async (workType = 'office', location = null) => {
    try {
      const attendanceData = {
        workType,
        location,
        notes: workType === 'wfh' ? 'WhatsApp notification sent to Anas Bhai' : '',
        timestamp: getIndiaDateTime().toISOString()
      };

      if (!isOnline) {
        // Save offline
        OfflineService.saveOfflineRecord(attendanceData);
        setSuccessMessage(`✅ Attendance marked offline for ${workType === 'wfh' ? 'Work From Home' : 'Office'}! Will sync when online.`);
        setTimeout(() => setSuccessMessage(''), 4000);
        return;
      }

      const token = localStorage.getItem('token');
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(attendanceData)
      });

      const data = await response.json();
      if (data.success) {
        const workTypeText = workType === 'wfh' ? 'Work From Home' : 'Office';
        const statusText = data.record?.status === 'half-day' ? '(Marked as Half Day - after deadline)' : '';

        // Clear dashboard cache to ensure widget updates
        const cacheKey = `attendance_cache_${currentUser?.username}`;
        localStorage.removeItem(cacheKey);

        showAlert('success', 'Success!', `Attendance marked successfully for ${workTypeText}!\n${statusText}`);
        await loadAttendanceData();

        // Trigger a window event to notify other components
        window.dispatchEvent(new CustomEvent('attendanceUpdated'));
      } else {
        showAlert('error', 'Error', data.message || 'Failed to mark attendance. Please try again.');
      }
    } catch (error) {
      console.error('Mark attendance error:', error);
      showAlert('error', 'Error', 'Failed to mark attendance. Please check your connection and try again.');
    }
  };

  const clockOut = async () => {
    try {
      if (!isOnline) {
        showAlert('warning', 'Offline', 'Cannot clock out while offline. Please connect to the internet.');
        return;
      }

      setClockOutLoading(true);
      const token = localStorage.getItem('token');

      // Get pending daily tasks from localStorage
      const today = new Date().toISOString().split('T')[0];
      const storageKey = `pending_daily_tasks_${currentUser?.username}_${today}`;
      const pendingTasks = JSON.parse(localStorage.getItem(storageKey) || '[]');

      const response = await fetch('/api/attendance/clock-out', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          pendingTasks: pendingTasks
        })
      });

      const data = await response.json();
      setClockOutLoading(false);

      if (data.success) {
        const totalHours = data.record?.totalHours || 'calculating...';

        // Clear dashboard cache to ensure widget updates
        const cacheKey = `attendance_cache_${currentUser?.username}`;
        localStorage.removeItem(cacheKey);

        // Clear pending tasks from localStorage
        localStorage.removeItem(storageKey);

        showAlert('success', 'Success!', `Clocked out successfully!\n\nTotal hours worked: ${totalHours}`);
        await loadAttendanceData();

        // Trigger a window event to notify other components
        window.dispatchEvent(new CustomEvent('attendanceUpdated'));
      } else {
        showAlert('error', 'Error', data.message || 'Failed to clock out. Please try again.');
      }
    } catch (error) {
      setClockOutLoading(false);
      showAlert('error', 'Error', 'Failed to clock out. Please check your connection and try again.');
    }
  };

  const updateAttendance = async (recordId, updates) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/attendance/${recordId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      const data = await response.json();
      if (data.success) {
        setSuccessMessage('✅ Attendance updated successfully!');
        loadAttendanceData();
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        setError(data.message || 'Failed to update attendance');
      }
    } catch (error) {
      setError('Failed to update attendance');
    }
  };

  // Generate all days in the date range and fill missing days with absent status
  const generateAllDaysInRange = (records, startDate, endDate, username) => {
    // Only generate if we have a date range selected and viewing a specific user
    if (!startDate || !endDate || !username || username === 'all') {
      return records;
    }

    const allDaysMap = new Map();

    // First, add all existing records to the map
    records.forEach(record => {
      if (record.date) {
        allDaysMap.set(record.date, record);
      }
    });

    // Generate all dates in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let currentDate = new Date(start);

    while (currentDate <= end && currentDate <= today) {
      const dateStr = currentDate.toISOString().split('T')[0];

      // Only add absent record if this date doesn't exist in records
      if (!allDaysMap.has(dateStr)) {
        allDaysMap.set(dateStr, {
          id: `absent-${dateStr}`,
          date: dateStr,
          username: username,
          status: 'absent',
          workType: 'office',
          checkIn: '',
          checkOut: '',
          totalHours: '0',
          isPlaceholder: true // Mark as placeholder so we know it's not a real record
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Convert map back to array and sort by date descending
    return Array.from(allDaysMap.values()).sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );
  };

  const filterRecords = (records) => {
    // First, generate all days in range with placeholders for missing days
    let filtered = generateAllDaysInRange(records, dateRange.start, dateRange.end, selectedUser);

    if (filterStatus !== 'all') {
      filtered = filtered.filter(record => record.status === filterStatus);
    }

    if (filterWorkType !== 'all') {
      filtered = filtered.filter(record => record.workType === filterWorkType);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(record =>
        record.username?.toLowerCase().includes(term) ||
        record.date?.toLowerCase().includes(term) ||
        record.location?.address?.full_address?.toLowerCase().includes(term) ||
        record.location?.address?.city?.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const generateReport = () => {
    const filteredRecords = filterRecords(attendanceRecords);

    // Calculate additional statistics
    const calculateAdvancedStats = (records, userData) => {
      const presentRecords = records.filter(r => r.status === 'present');

      // Calculate longest absent streak
      let currentStreak = 0;
      let maxStreak = 0;
      const sortedRecords = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
      sortedRecords.forEach(r => {
        if (r.status === 'absent') {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 0;
        }
      });

      // Calculate per-user statistics for admin view
      let userStats = [];
      if (userData && userData.length > 0) {
        userStats = userData.map(user => {
          const userRecords = records.filter(r => r.username === user.username);
          const userPresent = userRecords.filter(r => r.status === 'present').length;
          const userAbsent = userRecords.filter(r => r.status === 'absent').length;
          const userWfh = userRecords.filter(r => r.workType === 'wfh' && r.status === 'present').length;
          const userOffice = userRecords.filter(r => r.workType === 'office' && r.status === 'present').length;
          const userRate = userRecords.length > 0 ? ((userPresent / userRecords.length) * 100).toFixed(1) : '0.0';

          return {
            username: user.username,
            role: user.role,
            totalDays: userRecords.length,
            presentDays: userPresent,
            absentDays: userAbsent,
            wfhDays: userWfh,
            officeDays: userOffice,
            attendanceRate: userRate,
            todayStatus: user.todayStatus,
            todayWorkType: user.todayWorkType
          };
        });
      }

      return {
        maxAbsentStreak: maxStreak,
        perfectAttendance: stats.absentDays === 0 && stats.totalDays > 0,
        userStats
      };
    };

    const advancedStats = calculateAdvancedStats(filteredRecords, allUsersData);

    const reportData = {
      generated_on: getIndiaLocaleDateString(),
      generated_time: getIndiaLocaleTimeString(),
      user: userRole === 'user' ? currentUser?.username : (selectedUser === 'all' ? 'All Users' : selectedUser),
      date_range: `${dateRange.start} to ${dateRange.end}`,
      stats,
      advancedStats,
      records: filteredRecords,
      usersSummary: allUsersData
    };

    const reportHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attendance Report - ${reportData.generated_on}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Arial', 'Helvetica', sans-serif;
            margin: 0;
            padding: 20px;
            background: white;
            color: #000;
            line-height: 1.5;
        }

        .container {
            max-width: 1000px;
            margin: 0 auto;
            background: white;
            border: 2px solid #000;
        }

        .header {
            background: #000;
            color: white;
            padding: 20px 30px;
            text-align: center;
            border-bottom: 3px solid #000;
        }

        .header h1 {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }

        .header p {
            font-size: 12px;
            margin: 3px 0;
        }

        .content {
            padding: 25px 30px;
        }

        .section-title {
            font-size: 16px;
            font-weight: bold;
            margin: 20px 0 10px 0;
            padding-bottom: 5px;
            border-bottom: 2px solid #000;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 15px 0;
            page-break-inside: avoid;
        }

        .stat-card {
            border: 2px solid #000;
            padding: 12px;
            text-align: center;
            background: white;
        }

        .stat-number {
            font-size: 28px;
            font-weight: bold;
            margin-bottom: 3px;
            color: #000;
        }

        .stat-label {
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }

        .stat-detail {
            font-size: 9px;
            margin-top: 2px;
            color: #333;
        }

        .summary-box {
            border: 2px solid #000;
            padding: 15px;
            margin: 15px 0;
            background: #f9f9f9;
            page-break-inside: avoid;
        }

        .summary-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #ccc;
        }

        .summary-row:last-child {
            border-bottom: none;
        }

        .summary-label {
            font-weight: 600;
            font-size: 12px;
        }

        .summary-value {
            font-weight: bold;
            font-size: 12px;
        }

        .user-summary-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin: 15px 0;
        }

        .user-card {
            border: 2px solid #000;
            padding: 12px;
            background: white;
            page-break-inside: avoid;
        }

        .user-card-header {
            font-weight: bold;
            font-size: 13px;
            margin-bottom: 8px;
            padding-bottom: 5px;
            border-bottom: 1px solid #000;
        }

        .user-stat-row {
            display: flex;
            justify-content: space-between;
            font-size: 10px;
            margin: 3px 0;
        }

        .user-stat-label {
            color: #333;
        }

        .user-stat-value {
            font-weight: 600;
        }

        .attendance-table {
            width: 100%;
            border-collapse: collapse;
            margin: 15px 0;
            font-size: 10px;
            page-break-inside: auto;
        }

        .attendance-table th,
        .attendance-table td {
            padding: 8px 6px;
            text-align: left;
            border: 1px solid #000;
        }

        .attendance-table th {
            background: #000;
            color: white;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.3px;
        }

        .attendance-table tbody tr:nth-child(even) {
            background: #f5f5f5;
        }

        .status-badge {
            padding: 2px 6px;
            border: 1px solid #000;
            font-size: 9px;
            font-weight: 600;
            text-transform: uppercase;
            display: inline-block;
        }

        .status-present {
            background: white;
        }

        .status-absent {
            background: #e0e0e0;
        }

        .footer {
            text-align: center;
            padding: 15px;
            background: #000;
            color: white;
            border-top: 2px solid #000;
            font-size: 9px;
        }

        .footer p {
            margin: 3px 0;
        }

        /* Print-specific styles */
        @media print {
            body {
                padding: 0;
                background: white;
            }

            .container {
                border: none;
                max-width: 100%;
            }

            .header {
                border-bottom: 2px solid #000;
            }

            .stat-card,
            .user-card,
            .summary-box {
                page-break-inside: avoid;
            }

            .attendance-table {
                page-break-inside: auto;
            }

            .attendance-table tr {
                page-break-inside: avoid;
                page-break-after: auto;
            }

            .attendance-table thead {
                display: table-header-group;
            }

            .section-title {
                page-break-after: avoid;
            }
        }

        @media (max-width: 768px) {
            .stats-grid {
                grid-template-columns: repeat(2, 1fr);
                gap: 10px;
            }

            .user-summary-grid {
                grid-template-columns: 1fr;
            }

            .attendance-table {
                font-size: 8px;
            }

            .attendance-table th,
            .attendance-table td {
                padding: 5px 3px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Attendance Report</h1>
            <p>Generated for: ${reportData.user}</p>
            <p>Period: ${reportData.date_range}</p>
            <p>Generated on: ${reportData.generated_on} at ${reportData.generated_time}</p>
        </div>

        <div class="content">
            <!-- Overall Summary -->
            <div class="section-title">Summary</div>
            <div class="summary-box">
                <div class="summary-row">
                    <span class="summary-label">Total Working Days in Period:</span>
                    <span class="summary-value">${reportData.stats.totalDays} days</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Days Present:</span>
                    <span class="summary-value">${reportData.stats.presentDays} out of ${reportData.stats.totalDays} days (${reportData.stats.attendanceRate}%)</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Days Absent:</span>
                    <span class="summary-value">${reportData.stats.absentDays} out of ${reportData.stats.totalDays} days</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Work From Home:</span>
                    <span class="summary-value">${reportData.stats.wfhDays} out of ${reportData.stats.presentDays} present days</span>
                </div>
                <div class="summary-row">
                    <span class="summary-label">Office Days:</span>
                    <span class="summary-value">${reportData.stats.officeDays} out of ${reportData.stats.presentDays} present days</span>
                </div>
                ${reportData.advancedStats.perfectAttendance ? `
                <div class="summary-row">
                    <span class="summary-label">Achievement:</span>
                    <span class="summary-value">PERFECT ATTENDANCE</span>
                </div>
                ` : ''}
            </div>

            <!-- Key Metrics -->
            <div class="section-title">Key Metrics</div>
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-number">${reportData.stats.attendanceRate}%</div>
                    <div class="stat-label">Attendance Rate</div>
                    <div class="stat-detail">${reportData.stats.presentDays}/${reportData.stats.totalDays} days</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${reportData.stats.presentDays}</div>
                    <div class="stat-label">Present Days</div>
                    <div class="stat-detail">Total present</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${reportData.stats.absentDays}</div>
                    <div class="stat-label">Absent Days</div>
                    <div class="stat-detail">Total absent</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${reportData.stats.wfhDays}</div>
                    <div class="stat-label">WFH Days</div>
                    <div class="stat-detail">Work from home</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${reportData.stats.officeDays}</div>
                    <div class="stat-label">Office Days</div>
                    <div class="stat-detail">Working from office</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">${reportData.advancedStats.maxAbsentStreak}</div>
                    <div class="stat-label">Max Absent Streak</div>
                    <div class="stat-detail">Consecutive days</div>
                </div>
            </div>

            ${reportData.advancedStats.userStats && reportData.advancedStats.userStats.length > 0 ? `
            <!-- Individual User Statistics -->
            <div class="section-title">Individual User Summary</div>
            <div class="user-summary-grid">
                ${reportData.advancedStats.userStats.map(user => `
                    <div class="user-card">
                        <div class="user-card-header">${user.username} (${user.role})</div>
                        <div class="user-stat-row">
                            <span class="user-stat-label">Present:</span>
                            <span class="user-stat-value">${user.presentDays} out of ${user.totalDays} days</span>
                        </div>
                        <div class="user-stat-row">
                            <span class="user-stat-label">Absent:</span>
                            <span class="user-stat-value">${user.absentDays} days</span>
                        </div>
                        <div class="user-stat-row">
                            <span class="user-stat-label">Attendance Rate:</span>
                            <span class="user-stat-value">${user.attendanceRate}%</span>
                        </div>
                        <div class="user-stat-row">
                            <span class="user-stat-label">WFH Days:</span>
                            <span class="user-stat-value">${user.wfhDays} days</span>
                        </div>
                        <div class="user-stat-row">
                            <span class="user-stat-label">Office Days:</span>
                            <span class="user-stat-value">${user.officeDays} days</span>
                        </div>
                        <div class="user-stat-row">
                            <span class="user-stat-label">Today's Status:</span>
                            <span class="user-stat-value">${user.todayStatus}${user.todayWorkType ? ` (${user.todayWorkType})` : ''}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
            ` : ''}

            <!-- Detailed Attendance Records -->
            <div class="section-title">Detailed Attendance Records</div>
            <table class="attendance-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        ${userRole === 'admin' ? '<th>User</th>' : ''}
                        <th>Status</th>
                        <th>Work Type</th>
                        <th>Check In</th>
                        <th>Check Out</th>
                        <th>Total Hours</th>
                        <th>Location</th>
                    </tr>
                </thead>
                <tbody>
                    ${reportData.records.map(record => `
                        <tr>
                            <td>${record.date}</td>
                            ${userRole === 'admin' ? `<td>${record.username}</td>` : ''}
                            <td>
                                <span class="status-badge ${record.status === 'present' ? 'status-present' : 'status-absent'}">
                                    ${record.status === 'present' ? 'Present' : 'Absent'}
                                </span>
                            </td>
                            <td>${record.workType ? (record.workType === 'office' ? 'Office' : 'WFH') : 'N/A'}</td>
                            <td>${record.checkIn || 'N/A'}</td>
                            <td>${record.checkOut || 'N/A'}</td>
                            <td>${record.totalHours || 'N/A'}</td>
                            <td>${record.location && record.location.address ?
                                `${record.location.address.city || 'Unknown'}` :
                                'N/A'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>Report generated by Logam Academy Task Manager</p>
            <p>This is a computer-generated document. No signature is required.</p>
            <p>For any queries, please contact the administrator.</p>
        </div>
    </div>
</body>
</html>`;

    const blob = new Blob([reportHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `attendance-report-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    setSuccessMessage('✅ Report generated successfully!');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent mx-auto"></div>
          <p className="mt-4 text-gray-600 text-sm">Loading attendance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-0">
      {/* Connection Status */}
      {!isOnline && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-center space-x-3">
          <WifiOff className="w-5 h-5 text-amber-600" />
          <div>
            <p className="text-amber-800 text-sm font-medium">You're currently offline</p>
            <p className="text-amber-700 text-xs">Attendance will be saved locally and synced when you're back online.</p>
          </div>
        </div>
      )}

      {/* Error and Success Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <p className="text-red-600 text-sm flex-1">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
          <p className="text-green-800 text-sm font-medium flex-1">{successMessage}</p>
          <button onClick={() => setSuccessMessage('')} className="text-green-400 hover:text-green-600 flex-shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Attendance Marking */}
      {userRole === 'user' && (
        <TodayAttendanceCard
          todayRecord={todayRecord}
          onMarkAttendance={markAttendance}
          onClockOut={clockOut}
          clockOutLoading={clockOutLoading}
          currentUser={currentUser}
        />
      )}

      {/* Admin User Summary Cards */}
      {userRole === 'admin' && selectedUser === 'all' && allUsersData.length > 0 && (
        <AdminUserSummary usersSummary={allUsersData} />
      )}

      {/* Statistics Cards */}
      <AttendanceStats 
        stats={stats} 
        userRole={userRole} 
        usersSummary={allUsersData}
        selectedUser={selectedUser}
      />

      {/* Filters and Controls */}
      <AttendanceFilters
        userRole={userRole}
        allUsers={allUsers}
        selectedUser={selectedUser}
        setSelectedUser={setSelectedUser}
        dateRange={dateRange}
        setDateRange={setDateRange}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filterWorkType={filterWorkType}
        setFilterWorkType={setFilterWorkType}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onRefresh={forceRefresh}
        onGenerateReport={generateReport}
      />

      {/* Attendance Records Table */}
      <AttendanceTable
        records={filterRecords(attendanceRecords)}
        userRole={userRole}
        selectedUser={selectedUser}
        onUpdateAttendance={updateAttendance}
      />

      {/* Load More Button */}
      {pagination.hasMore && (
        <div className="mt-6 flex justify-center">
          <Button
            onClick={loadMoreRecords}
            disabled={loadingMore}
            variant="outline"
            className="flex items-center space-x-2"
          >
            {loadingMore ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                <span>Loading more...</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>Load More ({pagination.limit} more records)</span>
              </>
            )}
          </Button>
        </div>
      )}

      {/* Records Info */}
      <div className="mt-4 text-center text-sm text-gray-600">
        Showing {filterRecords(attendanceRecords).length} records
        {pagination.hasMore && ` • Click "Load More" to see older records`}
      </div>

      {/* Custom Alert Modal */}
      <CustomAlert
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        type={alertState.type}
        title={alertState.title}
        message={alertState.message}
      />
    </div>
  );
};

export default AttendanceManagement;