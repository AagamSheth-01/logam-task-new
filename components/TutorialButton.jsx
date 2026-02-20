// TUTORIAL COMPONENT - COMMENTED OUT FOR NOW
/*
import React, { useState } from 'react';
import { HelpCircle, BookOpen, Play, RotateCcw } from 'lucide-react';
import Button from './ui/Button';
import tutorialService from '../lib/tutorialService';

const TutorialButton = ({ 
  tutorialType = 'dashboard', 
  className = '', 
  variant = 'outline',
  size = 'sm',
  showText = true,
  showDropdown = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const tutorials = {
    login: {
      name: 'Login Tutorial',
      description: 'Learn how to sign in to your account',
      action: () => tutorialService.startLoginTutorial()
    },
    dashboard: {
      name: 'Dashboard Tour',
      description: 'Explore the main dashboard features',
      action: () => tutorialService.startDashboardTutorial()
    },
    admin: {
      name: 'Admin Panel Tour',
      description: 'Learn admin panel features and controls',
      action: () => tutorialService.startAdminTutorial()
    },
    tasks: {
      name: 'Task Management',
      description: 'Master task creation and management',
      action: () => tutorialService.startTaskTutorial()
    },
    clients: {
      name: 'Client Management',
      description: 'Learn client management features',
      action: () => tutorialService.startClientTutorial()
    }
  };

  const handleTutorialStart = async (type = tutorialType) => {
    const tutorial = tutorials[type];
    if (tutorial && tutorial.action) {
      await tutorial.action();
      setIsOpen(false);
    }
  };

  const resetTutorials = () => {
    tutorialService.resetAllTutorials();
    setIsOpen(false);
    alert('All tutorial progress has been reset. You will see tutorials again on your next visit.');
  };

  if (showDropdown) {
    return (
      <div className="relative">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          variant={variant}
          size={size}
          className={`${className} flex items-center space-x-2`}
          title="Tutorial Options"
        >
          <BookOpen className="w-4 h-4" />
          {showText && <span>Tutorials</span>}
        </Button>

        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-10" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Dropdown Menu */}
            <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              <div className="p-3 border-b border-gray-100">
                <h3 className="font-medium text-gray-900">Available Tutorials</h3>
                <p className="text-sm text-gray-500">Get help with different features</p>
              </div>
              
              <div className="py-2">
                {Object.entries(tutorials).map(([key, tutorial]) => (
                  <button
                    key={key}
                    onClick={() => handleTutorialStart(key)}
                    className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-start space-x-3"
                  >
                    <Play className="w-4 h-4 mt-0.5 text-blue-500" />
                    <div>
                      <div className="font-medium text-sm text-gray-900">
                        {tutorial.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {tutorial.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              
              <div className="border-t border-gray-100 p-2">
                <button
                  onClick={resetTutorials}
                  className="w-full px-4 py-2 text-left text-sm text-gray-600 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Reset All Tutorials</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // Simple button mode
  return (
    <Button
      onClick={() => handleTutorialStart()}
      variant={variant}
      size={size}
      className={`${className} flex items-center space-x-2`}
      title={`Start ${tutorials[tutorialType]?.name || 'Tutorial'}`}
    >
      <HelpCircle className="w-4 h-4" />
      {showText && <span>Help</span>}
    </Button>
  );
};

export default TutorialButton;
*/

// Placeholder component when tutorial is disabled
const TutorialButton = () => null;
export default TutorialButton;