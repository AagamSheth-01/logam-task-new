// components/dashboard/RecentFiles.js - Display recent files in dashboard
import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Eye, 
  File, 
  Image, 
  FileSpreadsheet, 
  Archive,
  User,
  Calendar,
  RefreshCw,
  AlertCircle,
  Folder,
  Video,
  Music,
  FileVideo,
  Play,
  ExternalLink
} from 'lucide-react';
import Button from '../ui/Button';

const RecentFiles = ({ currentUser }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadRecentFiles();
  }, []);

  const loadRecentFiles = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const response = await fetch('/api/files/recent', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFiles(data.files || []);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to load recent files');
      }
    } catch (error) {
      setError('Unable to load files. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getFileIcon = (type, mimeType) => {
    if (mimeType?.startsWith('video/')) {
      return <FileVideo className="w-4 h-4 text-red-500" />;
    }
    if (mimeType?.startsWith('audio/')) {
      return <Music className="w-4 h-4 text-green-500" />;
    }
    
    switch (type) {
      case 'image':
        return <Image className="w-4 h-4 text-blue-500" />;
      case 'video':
        return <FileVideo className="w-4 h-4 text-red-500" />;
      case 'audio':
        return <Music className="w-4 h-4 text-green-500" />;
      case 'spreadsheet':
        return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
      case 'archive':
        return <Archive className="w-4 h-4 text-purple-500" />;
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'document':
        return <FileText className="w-4 h-4 text-blue-600" />;
      default:
        return <File className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleDownload = (file) => {
    const url = file.url || file.downloadUrl;
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handlePreview = (file) => {
    const url = file.url || file.downloadUrl;
    const mimeType = file.mimeType || '';
    
    if (mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType === 'application/pdf') {
      window.open(url, '_blank');
    } else {
      handleDownload(file);
    }
  };

  const isPreviewable = (file) => {
    const mimeType = file.mimeType || '';
    return mimeType.startsWith('image/') || mimeType.startsWith('video/') || mimeType === 'application/pdf';
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-lg p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-black border-t-transparent"></div>
          <span className="ml-3 text-gray-600">Loading recent files...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-100 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
            <Folder className="w-5 h-5" />
            <span>Recent Files</span>
          </h3>
          <Button
            onClick={loadRecentFiles}
            variant="outline"
            size="sm"
            className="flex items-center space-x-1"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Retry</span>
          </Button>
        </div>
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span className="text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-black flex items-center space-x-2">
          <Folder className="w-5 h-5" />
          <span>Recent Files</span>
        </h3>
        <Button
          onClick={loadRecentFiles}
          variant="outline"
          size="sm"
          className="flex items-center space-x-1"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </Button>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Folder className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-sm">No recent files found</p>
          <p className="text-xs text-gray-400 mt-1">Upload files to client folders to see them here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {files.slice(0, 10).map((file) => (
            <div key={file.id} className="group p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 border border-gray-200 hover:border-blue-200 hover:shadow-md">
              <div className="flex items-center space-x-4">
                {/* File Icon */}
                <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                  {getFileIcon(file.type, file.mimeType)}
                </div>
                
                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="font-semibold text-sm text-gray-900 truncate" title={file.name}>
                      {file.name}
                    </h4>
                    {file.clientName && (
                      <span className="text-xs text-blue-700 bg-blue-100 px-2 py-1 rounded-full font-medium">
                        {file.clientName}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <span className="flex items-center space-x-1">
                      <User className="w-3 h-3" />
                      <span>{file.uploadedBy}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3 h-3" />
                      <span>{formatDate(file.uploadedAt)}</span>
                    </span>
                    <span className="font-medium text-gray-600">{formatFileSize(file.sizeBytes || 0)}</span>
                    {file.compressed && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                        Compressed {file.compressionRatio}%
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  {isPreviewable(file) && (
                    <Button
                      onClick={() => handlePreview(file)}
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50 flex items-center space-x-1"
                    >
                      {file.mimeType?.startsWith('video/') ? (
                        <Play className="w-3 h-3" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                      <span>Preview</span>
                    </Button>
                  )}
                  <Button
                    onClick={() => handleDownload(file)}
                    size="sm"
                    variant="outline"
                    className="text-gray-600 border-gray-200 hover:bg-gray-50 flex items-center space-x-1"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </Button>
                </div>
              </div>
            </div>
          ))}
          
          {files.length > 10 && (
            <div className="text-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Showing 10 of {files.length} files
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => {/* Navigate to full files page */}}
              >
                <ExternalLink className="w-3 h-3 mr-1" />
                View All Files
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecentFiles;