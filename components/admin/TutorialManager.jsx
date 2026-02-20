// TUTORIAL MANAGER COMPONENT - COMMENTED OUT FOR NOW
/*
import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Play, 
  RotateCcw, 
  Settings, 
  Users, 
  Eye,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';
import Button from '../ui/Button';
import tutorialService from '../../lib/tutorialService';

const TutorialManager = () => {
  const [tutorialStats, setTutorialStats] = useState({});
  const [autoStart, setAutoStart] = useState(true);

  const tutorials = [
    {
      id: 'login',
      name: 'Login Tutorial',
      description: 'Basic login process and authentication',
      category: 'Authentication',
      action: () => tutorialService.startLoginTutorial()
    },
    {
      id: 'dashboard',
      name: 'Dashboard Tour',
      description: 'Main dashboard features and navigation',
      category: 'User Interface',
      action: () => tutorialService.startDashboardTutorial()
    },
    {
      id: 'admin',
      name: 'Admin Panel',
      description: 'Administrative controls and user management',
      category: 'Administration',
      action: () => tutorialService.startAdminTutorial()
    },
    {
      id: 'tasks',
      name: 'Task Management',
      description: 'Creating, editing, and managing tasks',
      category: 'Task Management',
      action: () => tutorialService.startTaskTutorial()
    },
    {
      id: 'clients',
      name: 'Client Management',
      description: 'Managing clients and client relationships',
      category: 'Client Relations',
      action: () => tutorialService.startClientTutorial()
    }
  ];

  useEffect(() => {
    loadTutorialStats();
  }, []);

  const loadTutorialStats = () => {
    const stats = {};
    tutorials.forEach(tutorial => {
      stats[tutorial.id] = {
        seen: tutorialService.hasSeenTutorial(tutorial.id),
        lastSeen: localStorage.getItem(`tutorial_last_seen_${tutorial.id}`)
      };
    });
    setTutorialStats(stats);
  };

  const handleTutorialStart = async (tutorial) => {
    await tutorial.action();
    // Update last seen timestamp
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tutorial_last_seen_${tutorial.id}`, new Date().toISOString());
    }
    setTimeout(loadTutorialStats, 100);
  };

  const resetTutorial = (tutorialId) => {
    tutorialService.resetTutorial(tutorialId);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`tutorial_last_seen_${tutorialId}`);
    }
    loadTutorialStats();
  };

  const resetAllTutorials = () => {
    if (confirm('Are you sure you want to reset all tutorial progress? This will make tutorials show again for all users.')) {
      tutorialService.resetAllTutorials();
      if (typeof window !== 'undefined') {
        tutorials.forEach(tutorial => {
          localStorage.removeItem(`tutorial_last_seen_${tutorial.id}`);
        });
      }
      loadTutorialStats();
    }
  };

  const exportTutorialData = () => {
    const data = {
      tutorials: tutorials.map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        ...tutorialStats[t.id]
      })),
      exportedAt: new Date().toISOString(),
      autoStartEnabled: autoStart
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tutorial-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <BookOpen className="w-6 h-6 text-blue-600" />
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Tutorial Management</h2>
            <p className="text-sm text-gray-600">Manage and monitor user tutorial progress</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            onClick={exportTutorialData}
            variant="outline"
            size="sm"
            className="text-gray-600"
          >
            Export Data
          </Button>
          <Button
            onClick={resetAllTutorials}
            variant="outline"
            size="sm"
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset All
          </Button>
        </div>
      </div>

      {/* Settings */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Settings className="w-5 h-5 text-gray-600" />
            <div>
              <h3 className="font-medium text-gray-900">Tutorial Settings</h3>
              <p className="text-sm text-gray-600">Configure tutorial behavior</p>
            </div>
          </div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoStart}
              onChange={(e) => setAutoStart(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Auto-start for new users</span>
          </label>
        </div>
      </div>

      {/* Tutorial List */}
      <div className="space-y-4">
        <h3 className="font-medium text-gray-900 flex items-center space-x-2">
          <Users className="w-5 h-5" />
          <span>Available Tutorials</span>
        </h3>

        <div className="grid gap-4">
          {tutorials.map((tutorial) => {
            const stats = tutorialStats[tutorial.id] || {};
            const hasBeenSeen = stats.seen;
            const lastSeen = stats.lastSeen;

            return (
              <div
                key={tutorial.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-gray-900">{tutorial.name}</h4>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-700">
                        {tutorial.category}
                      </span>
                      {hasBeenSeen ? (
                        <CheckCircle className="w-4 h-4 text-green-500" title="Tutorial completed" />
                      ) : (
                        <XCircle className="w-4 h-4 text-gray-400" title="Tutorial not completed" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{tutorial.description}</p>
                    {lastSeen && (
                      <p className="text-xs text-gray-500">
                        Last seen: {new Date(lastSeen).toLocaleDateString()} at {new Date(lastSeen).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      onClick={() => handleTutorialStart(tutorial)}
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Preview
                    </Button>
                    
                    {hasBeenSeen && (
                      <Button
                        onClick={() => resetTutorial(tutorial.id)}
                        size="sm"
                        variant="outline"
                        className="text-gray-600"
                        title="Reset tutorial progress"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tutorial Statistics */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <Info className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-blue-900">Tutorial Statistics</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {tutorials.length}
            </div>
            <div className="text-sm text-blue-700">Total Tutorials</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">
              {Object.values(tutorialStats).filter(s => s.seen).length}
            </div>
            <div className="text-sm text-green-700">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {Object.values(tutorialStats).filter(s => !s.seen).length}
            </div>
            <div className="text-sm text-gray-700">Pending</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {tutorials.length > 0 ? Math.round((Object.values(tutorialStats).filter(s => s.seen).length / tutorials.length) * 100) : 0}%
            </div>
            <div className="text-sm text-blue-700">Completion Rate</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TutorialManager;
*/

// Placeholder component when tutorial is disabled
const TutorialManager = () => null;
export default TutorialManager;