// TUTORIAL SERVICE - COMMENTED OUT FOR NOW
/*
class TutorialService {
  constructor() {
    this.isInitialized = false;
    this.introJs = null;
  }

  // Dynamically import intro.js only in browser
  async loadIntroJs() {
    if (typeof window === 'undefined') return null;
    
    if (!this.introJs) {
      try {
        // Try different import patterns for intro.js
        const introModule = await import('intro.js');
        
        // Handle different export patterns
        if (introModule.default && typeof introModule.default === 'function') {
          this.introJs = introModule.default;
        } else if (typeof introModule === 'function') {
          this.introJs = introModule;
        } else if (introModule.intro && typeof introModule.intro === 'function') {
          this.introJs = introModule.intro;
        } else {
          console.error('Could not find intro.js function in module:', introModule);
          return null;
        }
        
        console.log('Intro.js loaded successfully:', typeof this.introJs);
      } catch (error) {
        console.error('Failed to load intro.js:', error);
        return null;
      }
    }
    return this.introJs;
  }

  // Initialize intro.js
  async init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    
    const introJs = await this.loadIntroJs();
    if (!introJs) return;

    this.isInitialized = true;
  }

  // Get default options for intro.js
  getDefaultOptions() {
    return {
      showStepNumbers: true,
      showBullets: false,
      showProgress: true,
      exitOnOverlayClick: false,
      exitOnEsc: true,
      nextLabel: 'Next →',
      prevLabel: '← Previous',
      skipLabel: 'Skip Tour',
      doneLabel: 'Finish',
      overlayOpacity: 0.8,
      tooltipPosition: 'auto',
      tooltipClass: 'customTooltip',
      highlightClass: 'customHighlight',
      hintPosition: 'top-middle',
      hintButtonLabel: 'Got it'
    };
  }

  // Start a tutorial with given steps
  async startTutorial(steps) {
    if (typeof window === 'undefined') return null;
    
    await this.init();
    const introJs = await this.loadIntroJs();
    if (!introJs) {
      console.error('Failed to load intro.js');
      return null;
    }

    try {
      const defaultOptions = this.getDefaultOptions();
      const tutorial = introJs().setOptions({ ...defaultOptions, steps });
      return tutorial.start();
    } catch (error) {
      console.error('Failed to start tutorial:', error);
      return null;
    }
  }

  // Start login page tutorial
  async startLoginTutorial() {
    const steps = [
      {
        intro: "Welcome to Logam Task Manager! Let's take a quick tour of the login process."
      },
      {
        element: 'input[type="text"]',
        intro: "Enter your username here. You can use the demo credentials provided below.",
        position: 'bottom'
      },
      {
        element: 'input[type="password"]',
        intro: "Enter your password here. Make sure it's secure!",
        position: 'bottom'
      },
      {
        element: 'button[type="submit"]',
        intro: "Click this button to sign in to your account.",
        position: 'top'
      }
    ];

    return this.startTutorial(steps);
  }

  // Start dashboard tutorial
  async startDashboardTutorial() {
    const steps = [
      {
        intro: "Welcome to your Dashboard! This is your command center for managing tasks and projects."
      },
      {
        element: '[data-tour="sidebar"]',
        intro: "This is your navigation sidebar. Switch between different sections of the application.",
        position: 'right'
      },
      {
        element: '[data-tour="task-stats"]',
        intro: "Here you can see your task statistics - completed, pending, and overdue tasks.",
        position: 'bottom'
      },
      {
        element: '[data-tour="task-table"]',
        intro: "This is your main task table where you can view, edit, and manage all your tasks.",
        position: 'top'
      },
      {
        element: '[data-tour="add-task"]',
        intro: "Click here to add new tasks to your project.",
        position: 'left'
      },
      {
        element: '[data-tour="calendar"]',
        intro: "Use the calendar to view tasks by date and manage deadlines.",
        position: 'left'
      },
      {
        element: '[data-tour="search"]',
        intro: "Search through your tasks quickly using this search bar.",
        position: 'bottom'
      },
      {
        element: '[data-tour="profile"]',
        intro: "Access your profile settings and logout options here.",
        position: 'left'
      }
    ];

    return this.startTutorial(steps);
  }

  // Start admin tutorial
  async startAdminTutorial() {
    const steps = [
      {
        intro: "Welcome to the Admin Panel! Here you can manage users, monitor system performance, and configure settings."
      },
      {
        element: '[data-tour="user-management"]',
        intro: "Manage all users, their roles, and permissions from this section.",
        position: 'right'
      },
      {
        element: '[data-tour="task-analytics"]',
        intro: "View detailed analytics and reports about task performance across all users.",
        position: 'bottom'
      },
      {
        element: '[data-tour="system-settings"]',
        intro: "Configure system-wide settings and preferences.",
        position: 'left'
      }
    ];

    return this.startTutorial(steps);
  }

  // Start task management tutorial
  async startTaskTutorial() {
    const steps = [
      {
        intro: "Learn how to effectively manage your tasks with these powerful features."
      },
      {
        element: '[data-tour="task-create"]',
        intro: "Click here to create a new task. You can set priorities, deadlines, and assign team members.",
        position: 'bottom'
      },
      {
        element: '[data-tour="task-filters"]',
        intro: "Use these filters to organize and find specific tasks quickly.",
        position: 'bottom'
      },
      {
        element: '[data-tour="task-actions"]',
        intro: "Each task has action buttons for editing, marking complete, or deleting.",
        position: 'top'
      },
      {
        element: '[data-tour="task-status"]',
        intro: "Monitor task status with visual indicators - green for complete, yellow for in-progress, red for overdue.",
        position: 'left'
      }
    ];

    return this.startTutorial(steps);
  }

  // Start client management tutorial
  async startClientTutorial() {
    const steps = [
      {
        intro: "Manage your clients and their projects efficiently with these tools."
      },
      {
        element: '[data-tour="client-list"]',
        intro: "View all your clients and their basic information here.",
        position: 'right'
      },
      {
        element: '[data-tour="client-dashboard"]',
        intro: "Access detailed client dashboards to see project progress and communications.",
        position: 'bottom'
      },
      {
        element: '[data-tour="client-files"]',
        intro: "Manage client files, documents, and shared resources.",
        position: 'left'
      },
      {
        element: '[data-tour="client-calendar"]',
        intro: "Schedule meetings and track important dates for each client.",
        position: 'top'
      }
    ];

    return this.startTutorial(steps);
  }

  // Generic tutorial for any page
  async startCustomTutorial(steps) {
    return this.startTutorial(steps);
  }

  // Show hints for specific elements
  async showHints() {
    if (typeof window === 'undefined') return null;
    
    await this.init();
    const introJs = await this.loadIntroJs();
    if (!introJs) return null;
    
    return introJs().showHints();
  }

  // Add hint to specific element
  addHint(element, hint, position = 'top') {
    if (typeof window === 'undefined') return;
    
    const hintElement = document.querySelector(element);
    if (hintElement) {
      hintElement.setAttribute('data-hint', hint);
      hintElement.setAttribute('data-hintPosition', position);
    }
  }

  // Check if user has seen tutorial
  hasSeenTutorial(tutorialName) {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(`tutorial_seen_${tutorialName}`) === 'true';
  }

  // Mark tutorial as seen
  markTutorialAsSeen(tutorialName) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(`tutorial_seen_${tutorialName}`, 'true');
  }

  // Reset tutorial status
  resetTutorial(tutorialName) {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(`tutorial_seen_${tutorialName}`);
  }

  // Reset all tutorials
  resetAllTutorials() {
    if (typeof window === 'undefined') return;
    const keys = Object.keys(localStorage).filter(key => key.startsWith('tutorial_seen_'));
    keys.forEach(key => localStorage.removeItem(key));
  }

  // Auto-start tutorial for new users
  autoStartTutorial(tutorialName, tutorialFunction) {
    if (typeof window === 'undefined') return;
    
    if (!this.hasSeenTutorial(tutorialName)) {
      setTimeout(async () => {
        try {
          const tour = await tutorialFunction();
          if (tour) {
            tour.onexit(() => {
              this.markTutorialAsSeen(tutorialName);
            });
            tour.oncomplete(() => {
              this.markTutorialAsSeen(tutorialName);
            });
          }
        } catch (error) {
          console.error('Auto-start tutorial failed:', error);
        }
      }, 1000); // Small delay to ensure DOM is ready
    }
  }
}

// Export singleton instance
export default new TutorialService();
*/

// Placeholder service when tutorial is disabled
class DisabledTutorialService {
  async startLoginTutorial() { return null; }
  async startDashboardTutorial() { return null; }
  async startAdminTutorial() { return null; }
  async startTaskTutorial() { return null; }
  async startClientTutorial() { return null; }
  async startCustomTutorial() { return null; }
  async showHints() { return null; }
  addHint() { return; }
  hasSeenTutorial() { return false; }
  markTutorialAsSeen() { return; }
  resetTutorial() { return; }
  resetAllTutorials() { return; }
  autoStartTutorial() { return; }
}

export default new DisabledTutorialService();