import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Button from '../components/ui/Button';
import { Eye, EyeOff, Mail } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Verify token validity with backend
          const response = await fetch('/api/auth/verify', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });

          if (response.ok) {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            if (user.role?.toLowerCase() === 'admin') {
              router.push('/admin');
            } else {
              router.push('/dashboard');
            }
          } else {
            // Invalid token - clear storage
            console.log('Token invalid, clearing storage');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          // Don't clear on network error, just let them see login screen
        }
      } else {
        // Auto-start tutorial for new users
        // tutorialService.autoStartTutorial('login', () => tutorialService.startLoginTutorial());
      }
    };

    checkAuth();
  }, [router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (data.success) {
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        if (data.user.role.toLowerCase() === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(data.message || 'Invalid credentials');
      }
    } catch (error) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setResetMessage('');
    setError('');

    if (!resetEmail || !resetEmail.includes('@')) {
      setResetMessage('Please enter a valid email address');
      return;
    }

    setResetLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail }),
      });

      const data = await response.json();

      if (data.success) {
        setResetMessage('Password reset link has been sent to your email!');
        setTimeout(() => {
          setShowForgotPassword(false);
          setResetEmail('');
          setResetMessage('');
        }, 3000);
      } else {
        setResetMessage(data.message || 'Failed to send reset email');
      }
    } catch (error) {
      setResetMessage('Connection error. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login - Logam Task Manager Pro</title>
        <meta name="description" content="Enterprise Task Management System" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      
      <div className="h-screen bg-white flex overflow-hidden">
        
        {/* Left Panel - Logo & Branding */}
        <div className="hidden lg:flex lg:w-1/2 bg-white relative overflow-hidden border-r border-gray-200">
          {/* Subtle background elements */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-20 left-20 w-40 h-40 border border-gray-300 rounded-full"></div>
            <div className="absolute bottom-20 right-20 w-32 h-32 border border-gray-300 rounded-full"></div>
          </div>
          
          {/* Content - Perfectly Centered */}
          <div className="relative z-10 flex flex-col items-center justify-center w-full h-full px-12 text-center">
            {/* Logo */}
            <div className="mb-12">
              <div className="w-32 h-32 bg-gray-50 border-2 border-gray-200 rounded-2xl flex items-center justify-center mb-8 shadow-lg mx-auto">
                {/* Logam Academy Logo - Replace with your actual logo */}
               <div className="text-center">
             <img src="/icons/Logam Academy LOGO 512x512.png" alt="Logo" className="w-24 h-24 object-contain" />
    
              </div>
  
             </div>

              <h1 className="text-5xl font-bold text-black mb-4">
                Logam Task Manager
              </h1>
              <p className="text-2xl text-gray-600 font-light">
                Professional Edition
              </p>
            </div>
            
            {/* Simple tagline */}
            <div className="text-center max-w-lg">
              <p className="text-xl text-gray-700 leading-relaxed">
                Streamline your workflow with powerful task management
              </p>
            </div>
            
            {/* Version info - Positioned at bottom */}
            <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2">
              <p className="text-sm text-gray-500">Version 2.0.1 Professional</p>
            </div>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-md">
            
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-8">
              <div className="w-20 h-20 bg-gray-50 border-2 border-gray-200 rounded-xl flex items-center justify-center mx-auto mb-4">
                {/* Mobile Logam Academy Logo */}
                <div className="text-center">
                  <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center mb-1">
                    <span className="text-white font-bold text-sm">L</span>
                  </div>
                  <div className="text-xs font-bold text-black">ACADEMY</div>
                </div>
              </div>
              <h1 className="text-2xl font-bold text-black">Logam Task Manager</h1>
              <p className="text-gray-600">Professional Edition</p>
            </div>

            {/* Login Card */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-lg">
              
              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-black mb-2">Welcome Back</h2>
                <p className="text-gray-700">Sign in to your account</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:border-black focus:bg-white focus:outline-none transition-all font-medium"
                    disabled={loading}
                  />
                </div>

                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-4 pr-12 bg-gray-50 border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:border-black focus:bg-white focus:outline-none transition-all font-medium"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-black transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>

                <Button
                  type="submit"
                  className="w-full py-4 text-lg font-bold bg-black text-white hover:bg-gray-800 border-2 border-black"
                  loading={loading}
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>

              {/* Forgot Password Link */}
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(true);
                    setError('');
                  }}
                  className="text-gray-600 hover:text-black font-medium text-sm transition-colors"
                >
                  Forgot your password?
                </button>
              </div>

            </div>

            {/* Footer */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 font-medium">
                Secure Enterprise Authentication
              </p>
            </div>
          </div>
        </div>

        {/* Forgot Password Modal */}
        {showForgotPassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border-2 border-gray-200">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-8 h-8 text-gray-700" />
                </div>
                <h3 className="text-2xl font-bold text-black mb-2">Reset Password</h3>
                <p className="text-gray-600 text-sm">
                  Enter your email address and we'll send you a link to reset your password
                </p>
              </div>

              {resetMessage && (
                <div className={`mb-6 p-4 rounded-lg border-2 ${
                  resetMessage.includes('sent')
                    ? 'bg-green-50 border-green-200'
                    : 'bg-red-50 border-red-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    resetMessage.includes('sent') ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {resetMessage}
                  </p>
                </div>
              )}

              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:border-black focus:bg-white focus:outline-none transition-all font-medium"
                    disabled={resetLoading}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(false);
                      setResetEmail('');
                      setResetMessage('');
                    }}
                    className="flex-1 py-3 px-4 bg-gray-100 text-gray-700 border-2 border-gray-300 rounded-xl hover:bg-gray-200 hover:border-gray-400 font-medium transition-all"
                    disabled={resetLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-black text-white border-2 border-black rounded-xl hover:bg-gray-800 font-medium transition-all disabled:opacity-50"
                    disabled={resetLoading}
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 