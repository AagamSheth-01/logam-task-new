import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Button from '../components/ui/Button';
import { Eye, EyeOff, Lock, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [token, setToken] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Get token from URL query parameter
    const { token: urlToken } = router.query;
    if (urlToken) {
      setToken(urlToken);
    }
  }, [router.query]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/');
        }, 3000);
      } else {
        setError(data.message || 'Failed to reset password');
      }
    } catch (error) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Reset Password - Logam Task Manager</title>
        <meta name="description" content="Reset your password" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-white flex items-center justify-center p-6">
        <div className="w-full max-w-md">

          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gray-50 border-2 border-gray-200 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-10 h-10 text-gray-700" />
            </div>
            <h1 className="text-2xl font-bold text-black">Logam Task Manager</h1>
            <p className="text-gray-600">Professional Edition</p>
          </div>

          {/* Reset Password Card */}
          <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 shadow-lg">

            {success ? (
              // Success Message
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-black mb-2">Password Reset Successful!</h2>
                <p className="text-gray-600 mb-6">
                  Your password has been updated successfully.
                </p>
                <p className="text-sm text-gray-500">
                  Redirecting to login page...
                </p>
              </div>
            ) : (
              // Reset Password Form
              <>
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-black mb-2">Reset Password</h2>
                  <p className="text-gray-600 text-sm">
                    Enter your new password below
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-red-700 text-sm font-medium flex-1">{error}</p>
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-6">
                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter new password (min 6 characters)"
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
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter your new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-4 pr-12 bg-gray-50 border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:border-black focus:bg-white focus:outline-none transition-all font-medium"
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-black transition-colors"
                        disabled={loading}
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full py-4 text-lg font-bold bg-black text-white hover:bg-gray-800 border-2 border-black"
                    loading={loading}
                    disabled={loading}
                  >
                    {loading ? 'Resetting Password...' : 'Reset Password'}
                  </Button>
                </form>

                {/* Back to Login */}
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="text-gray-600 hover:text-black font-medium text-sm transition-colors"
                  >
                    Back to Login
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 font-medium">
              Secure Password Reset
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
