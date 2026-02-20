import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Search, 
  Filter, 
  Plus,
  X,
  AlertCircle,
  CheckCircle,
  Eye,
  Edit3,
  Folder,
  File,
  Image,
  FileSpreadsheet,
  FileVideo,
  FileAudio,
  Archive,
  User,
  Calendar,
  HardDrive,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize
} from 'lucide-react';
import Button from '../ui/Button';

const ClientFileManager = ({ clientId, clientName, onUpdate = null, currentUser = null }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [summary, setSummary] = useState({});
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentVideo, setCurrentVideo] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);

  const categories = [
    { value: 'all', label: 'All Files', icon: FileText },
    { value: 'contracts', label: 'Contracts', icon: FileText },
    { value: 'proposals', label: 'Proposals', icon: FileText },
    { value: 'assets', label: 'Assets', icon: Image },
    { value: 'reports', label: 'Reports', icon: FileSpreadsheet },
    { value: 'misc', label: 'Miscellaneous', icon: File }
  ];

  const [uploadForm, setUploadForm] = useState({
    file: null,
    category: 'misc',
    description: '',
    tags: '',
    isPublic: false
  });

  useEffect(() => {
    if (clientId) {
      loadFiles();
    }
  }, [clientId, filterCategory]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError('');
      
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filterCategory !== 'all') {
        params.append('category', filterCategory);
      }
      
      const response = await fetch(`/api/clients/${clientId}/files?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setFiles(data.files || []);
        setSummary(data.summary || {});
      } else {
        setError(data.message || 'Failed to load files');
      }
    } catch (error) {
      console.error('Error loading files:', error);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadForm.file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setUploadProgress(0);

      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('category', uploadForm.category);
      formData.append('description', uploadForm.description);
      formData.append('isPublic', uploadForm.isPublic.toString());
      
      // Handle tags
      if (uploadForm.tags) {
        const tagsArray = uploadForm.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        tagsArray.forEach(tag => formData.append('tags', tag));
      }

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/clients/${clientId}/files`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`File "${uploadForm.file.name}" uploaded successfully`);
        setShowUploadModal(false);
        setUploadForm({
          file: null,
          category: 'misc',
          description: '',
          tags: '',
          isPublic: false
        });
        await loadFiles();
        
        if (onUpdate) {
          onUpdate();
        }

        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Failed to upload file');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteFile = async (fileId, fileName) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) {
      return;
    }

    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      const response = await fetch(`/api/clients/${clientId}/files?fileId=${fileId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`File "${fileName}" deleted successfully`);
        await loadFiles();
        
        if (onUpdate) {
          onUpdate();
        }

        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.message || 'Failed to delete file');
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      setError('Failed to delete file');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      const fileName = file.fileName || file.filename || file.name;
      const downloadUrl = `/api/files/clients/${clientId}/${fileName}?download=true`;
      
      console.log('Downloading file:', file);
      console.log('Download URL:', downloadUrl);
      
      const token = localStorage.getItem('token');
      const response = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.originalFileName || file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download file. Please try again.');
    }
  };

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) return Image;
    if (mimeType.startsWith('video/')) return FileVideo;
    if (mimeType.startsWith('audio/')) return FileAudio;
    if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return FileSpreadsheet;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return Archive;
    return FileText;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isVideoFile = (mimeType) => {
    return mimeType && mimeType.startsWith('video/');
  };

  const handleVideoPlay = async (file) => {
    try {
      console.log('Playing video:', file);
      setVideoLoading(true);
      setCurrentVideo(file);
      setShowVideoPlayer(true);
      
      const fileName = file.fileName || file.filename || file.name;
      const videoUrl = `/api/files/clients/${clientId}/${fileName}`;
      
      console.log('Video URL:', videoUrl);
      
      const token = localStorage.getItem('token');
      const response = await fetch(videoUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`Video fetch failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      
      setCurrentVideo(prev => ({
        ...prev,
        blobUrl: blobUrl
      }));
      
      setVideoLoading(false);
    } catch (error) {
      console.error('Video loading error:', error);
      setVideoLoading(false);
      setError('Failed to load video. Please try again.');
    }
  };

  const closeVideoPlayer = () => {
    if (currentVideo?.blobUrl) {
      window.URL.revokeObjectURL(currentVideo.blobUrl);
    }
    setShowVideoPlayer(false);
    setCurrentVideo(null);
  };

  const getCategoryColor = (category) => {
    const colors = {
      contracts: 'bg-blue-100 text-blue-800',
      proposals: 'bg-green-100 text-green-800',
      assets: 'bg-purple-100 text-purple-800',
      reports: 'bg-orange-100 text-orange-800',
      misc: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = !searchTerm || 
                         file.originalFileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (file.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (file.tags || []).some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = filterCategory === 'all' || file.category === filterCategory;
    
    return matchesSearch && matchesCategory;
  });

  if (loading && files.length === 0) {
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
            <Folder className="w-5 h-5" />
            <span>Files & Documents</span>
          </h3>
          {summary.totalFiles > 0 && (
            <p className="text-sm text-gray-500 mt-1 flex items-center space-x-4">
              <span>{summary.totalFiles} files</span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <HardDrive className="w-3 h-3" />
                <span>{formatFileSize(summary.totalSize)}</span>
              </span>
            </p>
          )}
        </div>
        <Button
          onClick={() => setShowUploadModal(true)}
          className="bg-black hover:bg-gray-800 flex items-center space-x-2"
          size="sm"
        >
          <Upload className="w-4 h-4" />
          <span>Upload File</span>
        </Button>
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black w-full"
          />
        </div>
        
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
          >
            {categories.map(category => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Files Grid */}
      {filteredFiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFiles.map((file) => {
            const FileIcon = getFileIcon(file.mimeType);
            return (
              <div key={file.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${isVideoFile(file.mimeType) ? 'bg-green-100' : 'bg-gray-100'}`}>
                      <FileIcon className={`w-5 h-5 ${isVideoFile(file.mimeType) ? 'text-green-600' : 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-black truncate" title={file.originalFileName}>
                        {file.originalFileName}
                      </h4>
                      <p className="text-sm text-gray-500">{formatFileSize(file.fileSize)}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1">
                    {/* Video Play Button - Only for admins and video files */}
                    {isVideoFile(file.mimeType) && currentUser?.role?.toLowerCase() === 'admin' && (
                      <button
                        onClick={() => handleVideoPlay(file)}
                        className="text-green-600 hover:text-green-800 transition-colors"
                        title="Play Video"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => handleDownloadFile(file)}
                      className="text-blue-600 hover:text-blue-800 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file.id, file.originalFileName)}
                      className="text-red-600 hover:text-red-800 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getCategoryColor(file.category)}`}>
                        {file.category}
                      </span>
                      {isVideoFile(file.mimeType) && (
                        <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded flex items-center space-x-1">
                          <Play className="w-3 h-3" />
                          <span>Video</span>
                        </span>
                      )}
                    </div>
                    {file.isPublic && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                        Public
                      </span>
                    )}
                  </div>
                  
                  {file.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{file.description}</p>
                  )}
                  
                  {file.tags && file.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {file.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center space-x-1">
                        <User className="w-3 h-3" />
                        <span>{file.uploadedBy}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>
                          {new Date(file.uploadedAt?.seconds * 1000).toLocaleDateString()}
                        </span>
                      </span>
                    </div>
                    {file.downloadCount > 0 && (
                      <div className="mt-1 text-xs text-gray-500">
                        Downloaded {file.downloadCount} times
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {searchTerm ? 'No files found matching your search' : 'No files uploaded yet'}
          </p>
          <p className="text-sm text-gray-400">
            {searchTerm ? 'Try adjusting your search terms' : 'Upload your first file to get started'}
          </p>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-black">Upload File</h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Select File *
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setUploadForm({...uploadForm, file: e.target.files[0]})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Category
                  </label>
                  <select
                    value={uploadForm.category}
                    onChange={(e) => setUploadForm({...uploadForm, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                  >
                    {categories.slice(1).map(category => (
                      <option key={category.value} value={category.value}>
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Description
                  </label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="Optional description..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-2">
                    Tags
                  </label>
                  <input
                    type="text"
                    value={uploadForm.tags}
                    onChange={(e) => setUploadForm({...uploadForm, tags: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-black"
                    placeholder="Optional tags (comma-separated)"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isPublic"
                    checked={uploadForm.isPublic}
                    onChange={(e) => setUploadForm({...uploadForm, isPublic: e.target.checked})}
                  />
                  <label htmlFor="isPublic" className="text-sm text-black">
                    Make file publicly accessible
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <Button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    variant="outline"
                    className="text-gray-600 border-gray-300"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={!uploadForm.file || loading}
                    className="bg-black hover:bg-gray-800 text-white"
                  >
                    {loading ? 'Uploading...' : 'Upload File'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Video Player Modal */}
      {showVideoPlayer && currentVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative bg-black rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="absolute top-0 left-0 right-0 z-10 bg-black bg-opacity-50 p-4 flex items-center justify-between">
              <div className="text-white">
                <h3 className="text-lg font-semibold truncate">{currentVideo.originalFileName}</h3>
                <p className="text-sm text-gray-300">{formatFileSize(currentVideo.fileSize)}</p>
              </div>
              <button
                onClick={closeVideoPlayer}
                className="text-white hover:text-gray-300 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Video Player */}
            <div className="flex items-center justify-center min-h-[400px]">
              <video
                key={currentVideo.id}
                controls
                autoPlay
                className="w-full h-full max-h-[80vh] object-contain"
                onLoadedData={() => setVideoLoading(false)}
                onError={(e) => {
                  console.error('Video error:', e);
                  console.error('Video source:', e.target.src);
                  setVideoLoading(false);
                  setError('Failed to load video. Please try downloading the file.');
                }}
                src={currentVideo.blobUrl}
              >
                Your browser does not support the video tag.
              </video>
              
              {/* Loading Indicator */}
              {videoLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="text-white flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                    <span>Loading video...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Video Info */}
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <FileVideo className="w-4 h-4" />
                    <span className="text-sm">Video File</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span className="text-sm">
                      {new Date(currentVideo.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <User className="w-4 h-4" />
                    <span className="text-sm">{currentVideo.uploadedBy}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownloadFile(currentVideo)}
                    className="text-blue-400 hover:text-blue-300 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {currentVideo.description && (
                <p className="text-sm text-gray-300 mt-2">{currentVideo.description}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientFileManager;