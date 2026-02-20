import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const CustomAlert = ({ isOpen, onClose, type = 'info', title, message, children }) => {
  if (!isOpen) return null;

  const types = {
    success: {
      icon: CheckCircle,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      iconColor: 'text-green-600',
      titleColor: 'text-green-900',
      textColor: 'text-green-800',
      buttonBg: 'bg-green-600 hover:bg-green-700'
    },
    error: {
      icon: XCircle,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      iconColor: 'text-red-600',
      titleColor: 'text-red-900',
      textColor: 'text-red-800',
      buttonBg: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
      icon: AlertTriangle,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-600',
      titleColor: 'text-yellow-900',
      textColor: 'text-yellow-800',
      buttonBg: 'bg-yellow-600 hover:bg-yellow-700'
    },
    info: {
      icon: Info,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-600',
      titleColor: 'text-blue-900',
      textColor: 'text-blue-800',
      buttonBg: 'bg-blue-600 hover:bg-blue-700'
    }
  };

  const config = types[type] || types.info;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className={`flex items-start gap-3 p-5 border-b ${config.borderColor}`}>
          <div className={`flex-shrink-0 ${config.iconColor}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={`text-lg font-semibold ${config.titleColor}`}>
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5">
          {message && (
            <p className={`text-sm ${config.textColor} whitespace-pre-line`}>
              {message}
            </p>
          )}
          {children && (
            <div className={`text-sm ${config.textColor}`}>
              {children}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 p-5 border-t border-gray-200">
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${config.buttonBg} transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2`}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomAlert;
