/**
 * Attendance Table Component - View Layer
 * Maintains exact UI from commit 73b7d93
 */

import React, { useState } from 'react';
import {
  Eye,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Building,
  Home as HomeIcon,
  CheckCircle,
  XCircle,
  Edit3,
  Save,
  X
} from 'lucide-react';

const AttendanceTable = ({ records, userRole, selectedUser, onUpdateAttendance }) => {
  const [viewMode, setViewMode] = useState('table');
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editData, setEditData] = useState({});

  const handleEdit = (record) => {
    setEditingRecord(record.id);
    setEditData({
      status: record.status,
      workType: record.workType,
      checkIn: record.checkIn,
      checkOut: record.checkOut,
      notes: record.notes || ''
    });
  };

  const handleSave = async () => {
    if (onUpdateAttendance && editingRecord) {
      await onUpdateAttendance(editingRecord, editData);
      setEditingRecord(null);
      setEditData({});
    }
  };

  const handleCancel = () => {
    setEditingRecord(null);
    setEditData({});
  };

  // Card View Component (maintained from original)
  const CardView = () => (
    <div className="grid gap-4">
      {records.map((record) => (
        <div key={record.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {record.status === 'present' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : (
                  <XCircle className="w-6 h-6 text-gray-400" />
                )}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-semibold text-gray-900">
                    {new Date(record.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  {userRole === 'admin' && (
                    <span className="text-sm text-gray-600">• {record.username}</span>
                  )}
                </div>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    record.status === 'present'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {record.status === 'present' ? 'Present' : 'Absent'}
                  </span>
                  {record.workType && (
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      record.workType === 'office'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {record.workType === 'office' ? (
                        <>
                          <Building className="w-3 h-3 mr-1" />
                          Office
                        </>
                      ) : (
                        <>
                          <HomeIcon className="w-3 h-3 mr-1" />
                          WFH
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              {userRole === 'admin' && (
                <button
                  onClick={() => handleEdit(record)}
                  className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {expandedRecord === record.id ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Time Information */}
          <div className="grid grid-cols-3 gap-4 mb-3">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Check In</div>
              <div className="text-sm font-medium text-gray-900">
                {record.checkIn || '--:--'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Check Out</div>
              <div className="text-sm font-medium text-gray-900">
                {record.checkOut || '--:--'}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Hours</div>
              <div className="text-sm font-medium text-gray-900">
                {record.totalHours || '--:--'}
              </div>
            </div>
          </div>

          {/* Expanded Details */}
          {expandedRecord === record.id && (
            <div className="border-t border-gray-200 pt-3 mt-3">
              {record.location && record.location.address && (
                <div className="mb-3">
                  <div className="flex items-start space-x-2">
                    <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {record.location.address.road || record.location.address.suburb || 'Unknown Location'}
                      </div>
                      <div className="text-xs text-gray-600">
                        {record.location.address.city || 'Unknown City'}
                      </div>
                      <div className="text-xs text-gray-500">
                        Accuracy: ±{Math.round(record.location.accuracy || 0)}m
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {record.notes && (
                <div className="text-xs text-gray-600">
                  <strong>Notes:</strong> {record.notes}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // Table View Component (maintained from original)
  const TableView = () => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            {userRole === 'admin' && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Work Type
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Check In
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Check Out
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Hours
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-gray-50">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900">
                  {new Date(record.date).toLocaleDateString()}
                </div>
              </td>
              {userRole === 'admin' && (
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{record.username}</div>
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap">
                {editingRecord === record.id ? (
                  <select
                    value={editData.status}
                    onChange={(e) => setEditData({...editData, status: e.target.value})}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                  </select>
                ) : (
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    record.status === 'present'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {record.status}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingRecord === record.id ? (
                  <select
                    value={editData.workType}
                    onChange={(e) => setEditData({...editData, workType: e.target.value})}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  >
                    <option value="office">Office</option>
                    <option value="wfh">WFH</option>
                  </select>
                ) : (
                  <div className="flex items-center">
                    {record.workType === 'office' ? (
                      <>
                        <Building className="w-4 h-4 text-blue-600 mr-1" />
                        <span className="text-sm text-gray-900">Office</span>
                      </>
                    ) : record.workType === 'wfh' ? (
                      <>
                        <HomeIcon className="w-4 h-4 text-green-600 mr-1" />
                        <span className="text-sm text-gray-900">WFH</span>
                      </>
                    ) : (
                      <span className="text-sm text-gray-500">--</span>
                    )}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingRecord === record.id ? (
                  <input
                    type="time"
                    value={editData.checkIn}
                    onChange={(e) => setEditData({...editData, checkIn: e.target.value})}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  />
                ) : (
                  <div className="text-sm text-gray-900">
                    {record.checkIn || '--:--'}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {editingRecord === record.id ? (
                  <input
                    type="time"
                    value={editData.checkOut}
                    onChange={(e) => setEditData({...editData, checkOut: e.target.value})}
                    className="text-sm border border-gray-300 rounded px-2 py-1"
                  />
                ) : (
                  <div className="text-sm text-gray-900">
                    {record.checkOut || '--:--'}
                  </div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900">
                  {record.totalHours || '--:--'}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center space-x-2">
                  {editingRecord === record.id ? (
                    <>
                      <button
                        onClick={handleSave}
                        className="text-green-600 hover:text-green-800"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={handleCancel}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      {userRole === 'admin' && (
                        <button
                          onClick={() => handleEdit(record)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => setExpandedRecord(expandedRecord === record.id ? null : record.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="bg-white border border-gray-100 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0">
          <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
            <Clock className="w-5 h-5" />
            <span>Attendance Records</span>
          </h3>

          {/* View Toggle */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'table'
                  ? 'bg-black text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('card')}
              className={`px-3 py-1 text-sm rounded-md transition-colors ${
                viewMode === 'card'
                  ? 'bg-black text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Cards
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {records.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p>No attendance records found</p>
          </div>
        ) : viewMode === 'card' ? (
          <CardView />
        ) : (
          <TableView />
        )}
      </div>
    </div>
  );
};

export default AttendanceTable;