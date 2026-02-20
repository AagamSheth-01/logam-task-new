import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { CheckCircle, Users, FolderOpen, Calendar, Sparkles, ArrowRight, /* Fingerprint, */ Shield } from 'lucide-react';
// import BiometricEnrollment from '../components/BiometricEnrollment';
// import biometricService from '../lib/biometricService';

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  // const [showBiometricEnrollment, setShowBiometricEnrollment] = useState(false);
  // const [biometricSetup, setBiometricSetup] = useState(false);

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    // Load user and organization data
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    const orgData = JSON.parse(localStorage.getItem('organization') || '{}');

    setUser(userData);
    setOrganization(orgData);
  }, [router]);

  const onboardingSteps = [
    {
      title: 'Welcome to Logam Task Manager!',
      description: `Congratulations ${user?.username || 'there'}! Your organization "${organization?.name}" is now set up and ready to go.`,
      icon: Sparkles,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    // {
    //   title: 'Secure Your Account',
    //   description: 'Set up biometric authentication for quick and secure attendance marking. Use your fingerprint, Face ID, or Touch ID.',
    //   icon: Fingerprint,
    //   color: 'text-indigo-600',
    //   bgColor: 'bg-indigo-100',
    //   action: {
    //     label: biometricSetup ? 'Biometric Auth Set Up ✓' : 'Set Up Biometric Auth',
    //     onClick: () => setShowBiometricEnrollment(true),
    //     disabled: biometricSetup,
    //     style: biometricSetup ? 'bg-green-600 text-white' : 'bg-indigo-600 text-white'
    //   },
    //   optional: true,
    // },
    {
      title: 'Invite Your Team',
      description: 'Start by inviting team members to collaborate. You can add users from the Admin Panel.',
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      action: {
        label: 'Invite Team Members',
        onClick: () => router.push('/admin?tab=users'),
      },
    },
    {
      title: 'Create Your First Client',
      description: 'Organize your work by setting up clients. Track projects, files, and communications all in one place.',
      icon: FolderOpen,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      action: {
        label: 'Add a Client',
        onClick: () => router.push('/admin?tab=clients'),
      },
    },
    {
      title: 'Plan Your Tasks',
      description: 'Create and assign tasks to keep your team organized and productive.',
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      action: {
        label: 'Create Tasks',
        onClick: () => router.push('/admin?tab=tasks'),
      },
    },
  ];

  const handleSkipOnboarding = () => {
    // Mark onboarding as completed
    localStorage.setItem('onboardingCompleted', 'true');

    // Redirect to admin panel
    router.push('/admin');
  };

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSkipOnboarding();
    }
  };

  // const handleBiometricEnrollmentSuccess = (result) => {
  //   setShowBiometricEnrollment(false);
  //   setBiometricSetup(true);
  // };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const currentStepData = onboardingSteps[currentStep];

  if (!user || !organization) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Welcome - Logam Task Manager</title>
        <meta name="description" content="Get started with Logam Task Manager" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col">

        {/* Header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <img src="/icons/Logam Academy LOGO 512x512.png" alt="Logo" className="h-10 w-10 object-contain" />
                <div>
                  <div className="text-xl font-bold text-black">Logam Task Manager</div>
                  <div className="text-sm text-gray-600">{organization.name}</div>
                </div>
              </div>
              <button
                onClick={handleSkipOnboarding}
                className="text-sm text-gray-600 hover:text-black font-medium transition-colors"
              >
                Skip Setup
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-4xl">

            {/* Progress Indicator */}
            <div className="mb-12">
              <div className="flex items-center justify-center space-x-2">
                {onboardingSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      index === currentStep
                        ? 'w-12 bg-black'
                        : index < currentStep
                        ? 'w-8 bg-green-500'
                        : 'w-8 bg-gray-300'
                    }`}
                  ></div>
                ))}
              </div>
              <p className="text-center mt-4 text-sm text-gray-600">
                Step {currentStep + 1} of {onboardingSteps.length}
              </p>
            </div>

            {/* Onboarding Card */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 lg:p-12 shadow-xl">

              {/* Icon */}
              <div className={`w-20 h-20 ${currentStepData.bgColor} rounded-2xl flex items-center justify-center mb-8 mx-auto`}>
                <currentStepData.icon className={`w-10 h-10 ${currentStepData.color}`} />
              </div>

              {/* Content */}
              <div className="text-center mb-8">
                <h1 className="text-4xl lg:text-5xl font-bold text-black mb-4">
                  {currentStepData.title}
                </h1>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                  {currentStepData.description}
                </p>
              </div>

              {/* Trial Info (only on first step) */}
              {currentStep === 0 && organization.status === 'trial' && (
                <div className="mb-8 p-6 bg-green-50 border-2 border-green-200 rounded-xl">
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                    <h3 className="text-xl font-bold text-green-900">Your 14-Day Free Trial is Active!</h3>
                  </div>
                  <p className="text-center text-green-800">
                    You're on the <span className="font-bold capitalize">{organization.plan}</span> plan.
                    Trial ends on {new Date(organization.trialEndsAt).toLocaleDateString()}.
                  </p>
                </div>
              )}

              {/* Quick Stats (only on first step) */}
              {currentStep === 0 && (
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                  <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
                    <div className="text-3xl font-bold text-black mb-1">1</div>
                    <div className="text-sm text-gray-600">Active User</div>
                  </div>
                  <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
                    <div className="text-3xl font-bold text-black mb-1">0</div>
                    <div className="text-sm text-gray-600">Tasks</div>
                  </div>
                  <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-center">
                    <div className="text-3xl font-bold text-black mb-1">0</div>
                    <div className="text-sm text-gray-600">Clients</div>
                  </div>
                </div>
              )}

              {/* Feature Highlights (steps 1-3) */}
              {currentStep > 0 && (
                <div className="mb-8 p-6 bg-gray-50 border border-gray-200 rounded-xl">
                  <h3 className="font-bold text-black mb-4">Quick Tips:</h3>
                  <ul className="space-y-3">
                    {currentStep === 1 && (
                      <>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Invite team members by email from the Users section</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Set user roles: Admin, Manager, or User</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Track team attendance and performance</span>
                        </li>
                      </>
                    )}
                    {currentStep === 2 && (
                      <>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Add client information and contact details</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Upload files and documents for each client</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Schedule meetings and track communications</span>
                        </li>
                      </>
                    )}
                    {currentStep === 3 && (
                      <>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Create tasks and assign them to team members</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Set priorities, deadlines, and track progress</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                          <span className="text-gray-700">Link tasks to clients for better organization</span>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                {currentStep > 0 && (
                  <button
                    onClick={handleBack}
                    className="flex-1 py-4 px-6 bg-gray-100 text-black border-2 border-gray-300 rounded-xl hover:bg-gray-200 font-bold text-lg transition-all"
                  >
                    Back
                  </button>
                )}
                {currentStepData.action ? (
                  <button
                    onClick={currentStepData.action.onClick}
                    className="flex-1 py-4 px-6 bg-black text-white rounded-xl hover:bg-gray-800 font-bold text-lg transition-all flex items-center justify-center group"
                  >
                    {currentStepData.action.label}
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className={`${currentStep === 0 ? 'w-full' : 'flex-1'} py-4 px-6 bg-black text-white rounded-xl hover:bg-gray-800 font-bold text-lg transition-all flex items-center justify-center group`}
                  >
                    {currentStep === onboardingSteps.length - 1 ? 'Get Started' : 'Continue'}
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}
              </div>

              {/* Skip Option */}
              <div className="mt-6 text-center">
                <button
                  onClick={handleSkipOnboarding}
                  className="text-sm text-gray-600 hover:text-black font-medium transition-colors"
                >
                  Skip and go to dashboard →
                </button>
              </div>

            </div>

            {/* Help Text */}
            <div className="mt-8 text-center">
              <p className="text-sm text-gray-600">
                Need help? Check out our{' '}
                <a href="#" className="text-black font-bold hover:underline">documentation</a>
                {' '}or{' '}
                <a href="#" className="text-black font-bold hover:underline">contact support</a>
              </p>
            </div>

          </div>
        </div>

        {/* Biometric Enrollment Modal - HIDDEN */}
        {/* {showBiometricEnrollment && (
          <BiometricEnrollment
            user={user}
            isOpen={showBiometricEnrollment}
            onClose={() => setShowBiometricEnrollment(false)}
            onSuccess={handleBiometricEnrollmentSuccess}
          />
        )} */}

      </div>
    </>
  );
}
