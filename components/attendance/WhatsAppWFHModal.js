/**
 * WhatsApp WFH Modal Component - View Layer
 * Handles WFH notification through WhatsApp
 */

import React, { useState } from 'react';
import { X, MessageCircle, Loader, Check } from 'lucide-react';

const WhatsAppWFHModal = ({ isOpen, onClose, onConfirm, username, location }) => {
  const [messageSent, setMessageSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const ANAS_WHATSAPP = "919408391548";

  const sendWhatsAppMessage = () => {
    setLoading(true);

    try {
      // Generate message
      const locationText = location?.address
        ? `${location.address.city || 'Unknown City'}, ${location.address.state || 'Unknown State'}`
        : 'Location not available';

      const message = `Hello Anas Bhai,

${username} is working from home today.

Location: ${locationText}
Time: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}

Best regards,
Logam Academy Task Manager`;

      const whatsappUrl = `https://wa.me/${ANAS_WHATSAPP}?text=${encodeURIComponent(message)}`;

      // Open WhatsApp
      window.open(whatsappUrl, '_blank');

      setMessageSent(true);

      // Auto close after 2 seconds
      setTimeout(() => {
        onConfirm();
        onClose();
        setMessageSent(false);
      }, 2000);

    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <MessageCircle className="w-6 h-6 text-green-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              WhatsApp Notification
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!messageSent ? (
            <>
              <p className="text-gray-600 mb-4">
                Do you want to notify Anas Bhai that <strong>{username}</strong> is working from home today?
              </p>

              {location && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Location:</strong> {location.address?.city || 'Unknown'}, {location.address?.state || 'Unknown'}
                  </p>
                </div>
              )}

              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-6">
                <p className="text-xs text-gray-600">
                  This will open WhatsApp with a pre-filled message to Anas Bhai (+91 {ANAS_WHATSAPP.slice(2)})
                </p>
              </div>

              {/* Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={sendWhatsAppMessage}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Opening...</span>
                    </>
                  ) : (
                    <>
                      <MessageCircle className="w-4 h-4" />
                      <span>Send WhatsApp</span>
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-4">
              <Check className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-green-800 font-medium">
                WhatsApp opened successfully!
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Marking your attendance now...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppWFHModal;