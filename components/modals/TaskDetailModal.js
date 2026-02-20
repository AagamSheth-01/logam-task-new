// components/modals/TaskDetailModal.js - Enhanced Task Detail Modal with Comments and Notes
import React, { useState, useEffect, useCallback } from 'react';
import Button from '../ui/Button';
import ConfirmationModal from './ConfirmationModal';
import { 
  X, 
  MessageSquare, 
  FileText, 
  Clock, 
  User, 
  Calendar, 
  Flag, 
  Building,
  Send,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Save,
  AlertCircle,
  CheckCircle
} from 'lucide-react';

const TaskDetailModal = ({ 
  isOpen, 
  onClose, 
  task, 
  currentUser,
  onTaskUpdate 
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [notes, setNotes] = useState({
    assignerNotes: '',
    personalNotes: '',
    assignerPrivateNotes: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [editingComment, setEditingComment] = useState(null);
  const [editCommentContent, setEditCommentContent] = useState('');
  const [notesChanged, setNotesChanged] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);
  const [commentSaved, setCommentSaved] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [commentToDelete, setCommentToDelete] = useState(null);

  const isAssigner = currentUser?.username === task?.given_by;
  const isAssignee = currentUser?.username === task?.assigned_to;
  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (isOpen && task) {
      loadComments();
      loadNotes();
    }
  }, [isOpen, task]);

  const saveNotes = useCallback(async () => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${task.id}/notes`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notes)
      });
      
      if (response.ok) {
        setNotesChanged(false);
        setNotesSaved(true);
        setMessage({ type: 'success', text: 'Notes saved successfully' });
        setTimeout(() => {
          setMessage({ type: '', text: '' });
          setNotesSaved(false);
        }, 3000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to save notes' });
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      setMessage({ type: 'error', text: 'Network error saving notes' });
    } finally {
      setSubmitting(false);
    }
  }, [task?.id, notes]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === 's' && activeTab === 'notes' && notesChanged) {
        e.preventDefault();
        saveNotes();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, activeTab, notesChanged, saveNotes]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadNotes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${task.id}/notes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setNotes(data.notes || {});
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newComment })
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(prev => [...prev, data.comment]);
        setNewComment('');
        setCommentSaved(true);
        setMessage({ type: 'success', text: 'Comment saved successfully' });
        setTimeout(() => {
          setMessage({ type: '', text: '' });
          setCommentSaved(false);
        }, 3000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to add comment' });
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setMessage({ type: 'error', text: 'Network error adding comment' });
    } finally {
      setSubmitting(false);
    }
  };

  const editComment = async (commentId) => {
    if (!editCommentContent.trim()) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ commentId, content: editCommentContent })
      });
      
      if (response.ok) {
        const data = await response.json();
        setComments(prev => prev.map(c => c.id === commentId ? data.comment : c));
        setEditingComment(null);
        setEditCommentContent('');
        setMessage({ type: 'success', text: 'Comment updated successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to update comment' });
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      setMessage({ type: 'error', text: 'Network error updating comment' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (comment) => {
    setCommentToDelete(comment);
    setDeleteConfirmOpen(true);
  };

  const deleteComment = async () => {
    if (!commentToDelete) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/tasks/${task.id}/comments`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ commentId: commentToDelete.id })
      });
      
      if (response.ok) {
        setComments(prev => prev.filter(c => c.id !== commentToDelete.id));
        setMessage({ type: 'success', text: 'Comment deleted successfully' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        setDeleteConfirmOpen(false);
        setCommentToDelete(null);
      } else {
        const error = await response.json();
        setMessage({ type: 'error', text: error.message || 'Failed to delete comment' });
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      setMessage({ type: 'error', text: 'Network error deleting comment' });
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleString();
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'done': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-semibold text-black">Task Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'details', label: 'Details', icon: FileText },
              { id: 'comments', label: `Comments (${comments.length})`, icon: MessageSquare },
              { id: 'notes', label: 'Notes', icon: FileText }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Messages */}
        {message.text && (
          <div className={`mx-6 mt-4 p-4 rounded-lg flex items-center space-x-2 ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <span className={`text-sm font-medium ${
              message.type === 'success' ? 'text-green-800' : 'text-red-800'
            }`}>
              {message.text}
            </span>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Task Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-4">Task Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <p className="text-sm text-gray-900">{task.task}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                      {task.status}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                    <p className="text-sm text-gray-900">{task.deadline}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center flex-shrink-0">
                        {task.assigned_to_profile_image ? (
                          <img
                            src={task.assigned_to_profile_image}
                            alt={task.assigned_to}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-900 font-medium">{task.assigned_to}</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Assigned By</label>
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-gray-200 border border-gray-300 flex items-center justify-center flex-shrink-0">
                        {task.given_by_profile_image ? (
                          <img
                            src={task.given_by_profile_image}
                            alt={task.given_by}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-4 h-4 text-gray-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-900 font-medium">{task.given_by}</p>
                    </div>
                  </div>
                  {task.client_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Client</label>
                      <p className="text-sm text-gray-900">{task.client_name}</p>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
                    <p className="text-sm text-gray-900">{formatDate(task.assigned_date)}</p>
                  </div>
                </div>
              </div>

              {/* Assignment Notes (visible to both assigner and assignee) */}
              {task.assignerNotes && (
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-2 flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>Assignment Notes</span>
                  </h4>
                  <p className="text-sm text-blue-800">{task.assignerNotes}</p>
                </div>
              )}

              {/* Personal Notes (visible to assignee only) */}
              {isAssignee && task.personalNotes && (
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-2 flex items-center space-x-2">
                    <Eye className="w-4 h-4" />
                    <span>Your Personal Notes</span>
                  </h4>
                  <p className="text-sm text-green-800">{task.personalNotes}</p>
                </div>
              )}

              {/* Private Notes (visible to assigner only) */}
              {isAssigner && task.assignerPrivateNotes && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 mb-2 flex items-center space-x-2">
                    <EyeOff className="w-4 h-4" />
                    <span>Private Notes</span>
                  </h4>
                  <p className="text-sm text-yellow-800">{task.assignerPrivateNotes}</p>
                </div>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="space-y-6">
              {/* Add Comment */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Add Comment</h4>
                <div className="space-y-3">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Write your comment..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      {newComment.trim() && !commentSaved && (
                        <div className="flex items-center space-x-2 text-blue-600">
                          <MessageSquare className="w-4 h-4" />
                          <span className="text-sm">Ready to save comment</span>
                        </div>
                      )}
                      {commentSaved && (
                        <div className="flex items-center space-x-2 text-green-600">
                          <CheckCircle className="w-4 h-4" />
                          <span className="text-sm">Comment saved successfully</span>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      {newComment.trim() && (
                        <Button
                          onClick={() => setNewComment('')}
                          variant="outline"
                          size="sm"
                          className="flex items-center space-x-1"
                        >
                          <X className="w-4 h-4" />
                          <span>Clear</span>
                        </Button>
                      )}
                      <Button
                        onClick={addComment}
                        disabled={!newComment.trim() || submitting}
                        className={`flex items-center space-x-2 ${newComment.trim() ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                      >
                        {submitting ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Save Comment</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No comments yet. Be the first to add one!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="bg-white border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center space-x-3 mb-2">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{comment.author}</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(comment.timestamp)}
                              {comment.isEdited && ' (edited)'}
                            </p>
                          </div>
                        </div>
                        
                        {comment.author === currentUser?.username && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => {
                                setEditingComment(comment.id);
                                setEditCommentContent(comment.content);
                              }}
                              className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteClick(comment)}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                      
                      {editingComment === comment.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editCommentContent}
                            onChange={(e) => setEditCommentContent(e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                          <div className="flex justify-end space-x-2">
                            <Button
                              onClick={() => {
                                setEditingComment(null);
                                setEditCommentContent('');
                              }}
                              variant="outline"
                              size="sm"
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={() => editComment(comment.id)}
                              size="sm"
                              disabled={!editCommentContent.trim() || submitting}
                            >
                              {submitting ? (
                                <>
                                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                                  <span>Saving...</span>
                                </>
                              ) : (
                                <>
                                  <Save className="w-3 h-3 mr-1" />
                                  <span>Save</span>
                                </>
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-700">{comment.content}</p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="space-y-6">
              {/* Assignment Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Notes
                  <span className="text-xs text-gray-500 ml-2">(Visible to both assigner and assignee)</span>
                </label>
                <textarea
                  value={notes.assignerNotes || ''}
                  onChange={(e) => {
                    setNotes(prev => ({ ...prev, assignerNotes: e.target.value }));
                    setNotesChanged(true);
                  }}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  placeholder="Add notes visible to both assigner and assignee..."
                />
              </div>

              {/* Personal Notes (for assignee) */}
              {isAssignee && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Personal Notes
                    <span className="text-xs text-gray-500 ml-2">(Only visible to you)</span>
                  </label>
                  <textarea
                    value={notes.personalNotes || ''}
                    onChange={(e) => {
                      setNotes(prev => ({ ...prev, personalNotes: e.target.value }));
                      setNotesChanged(true);
                    }}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Add your personal notes about this task..."
                  />
                </div>
              )}

              {/* Private Notes (for assigner) */}
              {isAssigner && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Private Notes
                    <span className="text-xs text-gray-500 ml-2">(Only visible to you and admins)</span>
                  </label>
                  <textarea
                    value={notes.assignerPrivateNotes || ''}
                    onChange={(e) => {
                      setNotes(prev => ({ ...prev, assignerPrivateNotes: e.target.value }));
                      setNotesChanged(true);
                    }}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="Add private notes only visible to you..."
                  />
                </div>
              )}

              {/* Save Notes */}
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  {notesChanged && (
                    <div className="flex items-center space-x-2 text-orange-600">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm">You have unsaved changes</span>
                      <span className="text-xs text-gray-500">• Press Ctrl+S to save</span>
                    </div>
                  )}
                  {notesSaved && (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm">Notes saved successfully</span>
                    </div>
                  )}
                </div>
                <div className="flex space-x-2">
                  {notesChanged && (
                    <Button
                      onClick={() => {
                        loadNotes();
                        setNotesChanged(false);
                      }}
                      variant="outline"
                      size="sm"
                      className="flex items-center space-x-1"
                    >
                      <X className="w-4 h-4" />
                      <span>Discard</span>
                    </Button>
                  )}
                  <Button
                    onClick={saveNotes}
                    disabled={submitting || !notesChanged}
                    className={`flex items-center space-x-2 ${notesChanged ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-400 cursor-not-allowed'}`}
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>Save Notes</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-100">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>

      {/* Delete Comment Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setCommentToDelete(null);
        }}
        onConfirm={deleteComment}
        title="Delete Comment"
        message="Are you sure you want to delete this comment? This action cannot be undone."
        type="danger"
        confirmText="Delete Comment"
        cancelText="Cancel"
        loading={submitting}
        details={commentToDelete ? {
          'Author': commentToDelete.author,
          'Posted': formatDate(commentToDelete.timestamp),
          'Content': commentToDelete.content?.substring(0, 100) + (commentToDelete.content?.length > 100 ? '...' : '')
        } : null}
      />
    </div>
  );
};

export default TaskDetailModal;