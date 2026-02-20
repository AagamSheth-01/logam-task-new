// components/UserProfile.js - User Profile Component
import React, { useState, useEffect, useRef } from 'react';
import { User, Mail, Shield, Calendar, Eye, EyeOff, Lock, Save, X, Camera, Trash2, Upload } from 'lucide-react';

const UserProfile = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password change state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Password viewing state
  const [displayPassword, setDisplayPassword] = useState('');
  const [showDisplayPassword, setShowDisplayPassword] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Profile edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editedEmail, setEditedEmail] = useState('');

  // Profile image state
  const [profileImage, setProfileImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // Custom alert state
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [successAlertMessage, setSuccessAlertMessage] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const userData = JSON.parse(localStorage.getItem('user') || '{}');

      if (!userData.username) {
        setError('No user data found');
        return;
      }

      setUser(userData);
      setEditedEmail(userData.email || '');
      setProfileImage(userData.profileImage || null);

      // Load password display
      await loadPasswordDisplay();
    } catch (error) {
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const loadPasswordDisplay = async () => {
    try {
      setLoadingPassword(true);
      const token = localStorage.getItem('token');

      const response = await fetch('/api/users/get-password', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success && data.password) {
        setDisplayPassword(data.password);
      }
    } catch (error) {
      console.error('Failed to load password display:', error);
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All password fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setError('New password must be different from current password');
      return;
    }

    setPasswordLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');

        // Reload password display
        await loadPasswordDisplay();

        setTimeout(() => {
          setShowChangePassword(false);
          setSuccess('');
        }, 2000);
      } else {
        setError(data.message || 'Failed to change password');
      }
    } catch (error) {
      setError('Failed to change password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/update-profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: editedEmail
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Profile updated successfully!');
        setIsEditing(false);

        // Update local storage
        const updatedUser = { ...user, email: editedEmail };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);

        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to update profile');
      }
    } catch (error) {
      setError('Failed to update profile. Please try again.');
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, or WebP)');
      return;
    }

    // Validate file size (max 1.5MB)
    if (file.size > 1.5 * 1024 * 1024) {
      setError('Image too large. Maximum size is 1.5MB');
      return;
    }

    // Read and compress image
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Create canvas for compression
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Calculate new dimensions (max 400x400)
        let width = img.width;
        let height = img.height;
        const maxSize = 400;

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const compressedImage = canvas.toDataURL(file.type, 0.8);

        // Upload image
        handleImageUpload(compressedImage);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = async (imageData) => {
    setError('');
    setSuccess('');
    setUploadingImage(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/upload-profile-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ imageData })
      });

      const data = await response.json();

      if (data.success) {
        setProfileImage(data.profileImage);

        // Update local storage
        const updatedUser = { ...user, profileImage: data.profileImage };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);

        // Trigger event to notify dashboard of profile update
        window.dispatchEvent(new CustomEvent('profileUpdated', {
          detail: { user: updatedUser }
        }));

        // Show custom success alert
        setSuccessAlertMessage('Profile picture uploaded successfully!');
        setShowSuccessAlert(true);
      } else {
        setError(data.message || 'Failed to upload image');
      }
    } catch (error) {
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const confirmDeleteImage = () => {
    setShowDeleteConfirm(true);
  };

  const handleImageDelete = async () => {
    setShowDeleteConfirm(false);
    setError('');
    setSuccess('');
    setUploadingImage(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/users/delete-profile-image', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setProfileImage(null);

        // Update local storage
        const updatedUser = { ...user, profileImage: null };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);

        // Trigger event to notify dashboard of profile update
        window.dispatchEvent(new CustomEvent('profileUpdated', {
          detail: { user: updatedUser }
        }));

        // Show custom success alert
        setSuccessAlertMessage('Profile picture removed successfully!');
        setShowSuccessAlert(true);
      } else {
        setError(data.message || 'Failed to delete image');
      }
    } catch (error) {
      setError('Failed to delete image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent"></div>
        <span className="ml-3 text-gray-600">Loading profile...</span>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-600">Failed to load user profile</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-black flex items-center space-x-3">
            <User className="w-6 h-6 lg:w-8 lg:h-8" />
            <span>My Profile</span>
          </h2>
          <p className="text-sm lg:text-base text-gray-600 mt-1">Manage your account settings and preferences</p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between">
          <p className="text-red-600 font-medium">{error}</p>
          <button onClick={() => setError('')} className="text-red-400 hover:text-red-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
          <p className="text-green-600 font-medium">{success}</p>
          <button onClick={() => setSuccess('')} className="text-green-400 hover:text-green-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Profile Information Card */}
      <div className="bg-white border border-gray-100 rounded-lg p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4 lg:mb-6">
          <h3 className="text-lg lg:text-xl font-bold text-black">Profile Information</h3>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3 lg:px-4 py-1.5 lg:py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-xs lg:text-sm transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>

        <div className="space-y-6">
          {/* Profile Picture */}
          <div className="flex items-center space-x-6">
            {/* Profile Image Display */}
            <div className="relative">
              <div className="w-20 h-20 lg:w-24 lg:h-24 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 shadow-md">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User className="w-12 h-12 text-gray-400" />
                  </div>
                )}
              </div>
              {/* Camera Icon Overlay */}
              {!uploadingImage && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-black hover:bg-gray-800 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
                  title="Upload profile picture"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
              {/* Loading Spinner */}
              {uploadingImage && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent"></div>
                </div>
              )}
            </div>

            {/* User Info and Actions */}
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-black">{user.username}</h3>
              <p className="text-gray-600 capitalize">{user.role || 'User'}</p>

              {/* Image Upload Buttons */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs lg:text-sm font-medium transition-colors flex items-center space-x-1 disabled:opacity-50"
                >
                  <Upload className="w-3 h-3" />
                  <span>{profileImage ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
                {profileImage && (
                  <button
                    onClick={confirmDeleteImage}
                    disabled={uploadingImage}
                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs lg:text-sm font-medium transition-colors flex items-center space-x-1 disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                JPEG, PNG, GIF or WebP. Max 1.5MB
              </p>
            </div>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {/* Profile Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Username
              </label>
              <div className="p-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
                <p className="text-black font-medium">{user.username}</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">Username cannot be changed by users</p>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={editedEmail}
                  onChange={(e) => setEditedEmail(e.target.value)}
                  className="w-full p-3 bg-white border-2 border-gray-300 rounded-lg focus:border-black focus:outline-none"
                  placeholder="Enter your email"
                />
              ) : (
                <div className="p-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
                  <p className="text-black font-medium">{user.email || 'No email set'}</p>
                </div>
              )}
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                <Shield className="w-4 h-4 inline mr-2" />
                Role
              </label>
              <div className="p-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                  user.role === 'admin'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {user.role === 'admin' ? 'Administrator' : 'User'}
                </span>
              </div>
            </div>

            {/* Member Since */}
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                <Calendar className="w-4 h-4 inline mr-2" />
                Member Since
              </label>
              <div className="p-3 bg-gray-50 border-2 border-gray-200 rounded-lg">
                <p className="text-black font-medium">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </p>
              </div>
            </div>
          </div>

          {/* Edit Actions */}
          {isEditing && (
            <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleUpdateProfile}
                className="flex-1 px-4 py-2 lg:py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-medium lg:font-semibold text-sm transition-colors flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4" />
                <span>Save Changes</span>
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditedEmail(user.email || '');
                }}
                className="flex-1 px-4 py-2 lg:py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium lg:font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white border border-gray-100 rounded-lg p-4 lg:p-6">
        <h3 className="text-lg lg:text-xl font-bold text-black mb-4 lg:mb-6">Security</h3>

        <div className="space-y-4">
          {/* Password Display */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Lock className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-semibold text-black">Current Password</p>
                  {loadingPassword ? (
                    <p className="text-sm text-gray-600">Loading...</p>
                  ) : (
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-sm text-black font-mono">
                        {showDisplayPassword && displayPassword ? displayPassword : '••••••••••••'}
                      </p>
                      {displayPassword && (
                        <button
                          onClick={() => setShowDisplayPassword(!showDisplayPassword)}
                          className="text-gray-500 hover:text-black transition-colors"
                          title={showDisplayPassword ? "Hide password" : "Show password"}
                        >
                          {showDisplayPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowChangePassword(true)}
                className="px-3 lg:px-4 py-1.5 lg:py-2 bg-black text-white rounded-lg hover:bg-gray-800 font-medium text-xs lg:text-sm transition-colors"
              >
                Change Password
              </button>
            </div>
          </div>

          {/* Security Warning */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>⚠️ Security Warning:</strong> Your password is displayed for convenience.
              Do not share your password with anyone. Keep it confidential.
            </p>
          </div>

          {/* Security Tip */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Security Tip:</strong> Use a strong password with at least 6 characters.
              Consider using a mix of letters, numbers, and symbols.
            </p>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 lg:p-8 max-w-md w-full shadow-xl border border-gray-200">
            <div className="flex items-center justify-between mb-4 lg:mb-6">
              <h3 className="text-lg lg:text-xl font-bold text-black flex items-center space-x-2">
                <Lock className="w-5 h-5 lg:w-6 lg:h-6" />
                <span>Change Password</span>
              </h3>
              <button
                onClick={() => {
                  setShowChangePassword(false);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setError('');
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleChangePassword} className="space-y-4">
              {/* Current Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border-2 border-gray-300 rounded-xl focus:border-black focus:bg-white focus:outline-none"
                    placeholder="Enter current password"
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-black"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border-2 border-gray-300 rounded-xl focus:border-black focus:bg-white focus:outline-none"
                    placeholder="Enter new password (min 6 chars)"
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-black"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-gray-50 border-2 border-gray-300 rounded-xl focus:border-black focus:bg-white focus:outline-none"
                    placeholder="Confirm new password"
                    disabled={passwordLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-black"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 lg:py-3 bg-black text-white rounded-lg hover:bg-gray-800 font-medium lg:font-semibold text-sm transition-colors disabled:opacity-50"
                  disabled={passwordLoading}
                >
                  {passwordLoading ? 'Changing...' : 'Change Password'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setCurrentPassword('');
                    setNewPassword('');
                    setConfirmPassword('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-2 lg:py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium lg:font-semibold text-sm transition-colors"
                  disabled={passwordLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Success Alert Modal */}
      {showSuccessAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl border border-gray-200 animate-fadeIn">
            <div className="flex flex-col items-center text-center">
              {/* Success Icon */}
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* Message */}
              <h3 className="text-lg font-bold text-black mb-2">Success!</h3>
              <p className="text-gray-600 mb-6">{successAlertMessage}</p>

              {/* Profile Image Preview */}
              {profileImage && (
                <div className="mb-4">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-green-500 shadow-md">
                    <img
                      src={profileImage}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* OK Button */}
              <button
                onClick={() => setShowSuccessAlert(false)}
                className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl border border-gray-200">
            <div className="flex flex-col items-center text-center">
              {/* Warning Icon */}
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <Trash2 className="w-8 h-8 text-red-600" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-bold text-black mb-2">Delete Profile Picture?</h3>

              {/* Message */}
              <p className="text-gray-600 mb-6">
                Are you sure you want to remove your profile picture? This action cannot be undone.
              </p>

              {/* Current Image Preview */}
              {profileImage && (
                <div className="mb-6">
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-gray-300 shadow-md grayscale opacity-50">
                    <img
                      src={profileImage}
                      alt="Current"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImageDelete}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;
