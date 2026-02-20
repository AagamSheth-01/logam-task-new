import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Link from 'next/link';
import Button from '../components/ui/Button';
import { Eye, EyeOff, Building2, User, Mail, Lock, CheckCircle, ArrowRight } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { plan: urlPlan } = router.query;

  // Form state
  const [step, setStep] = useState(1);  // 1: Organization details, 2: Admin details
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Organization details
  const [organizationName, setOrganizationName] = useState('');
  const [slug, setSlug] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState('');
  const [plan, setPlan] = useState('professional');

  // Admin user details
  const [adminFullName, setAdminFullName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  // Set plan from URL parameter
  useEffect(() => {
    if (urlPlan && ['starter', 'professional', 'enterprise'].includes(urlPlan)) {
      setPlan(urlPlan);
    }
  }, [urlPlan]);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    }
  }, [router]);

  // Auto-generate slug from organization name
  useEffect(() => {
    if (organizationName) {
      const generatedSlug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setSlug(generatedSlug);
    }
  }, [organizationName]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (step === 1) {
      if (!organizationName.trim()) {
        setError('Organization name is required');
        return;
      }
      setStep(2);
      return;
    }

    // Step 2 validation
    if (!adminFullName.trim() || !adminUsername.trim() || !adminEmail.trim() || !adminPassword) {
      setError('All fields are required');
      return;
    }

    if (!adminEmail.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (adminPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (adminPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreeToTerms) {
      setError('Please agree to the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/organizations/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationName: organizationName.trim(),
          slug: slug.trim(),
          plan: plan,
          adminUsername: adminUsername.trim(),
          adminEmail: adminEmail.trim(),
          adminPassword: adminPassword,
          adminFullName: adminFullName.trim(),
          billingEmail: adminEmail.trim(),
          companyWebsite: companyWebsite.trim() || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Store token and user info
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('organization', JSON.stringify(data.organization));

        // Redirect to onboarding
        router.push(data.redirectTo || '/onboarding');
      } else {
        setError(data.message || 'Registration failed. Please try again.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: '$29',
      period: '/month',
      features: ['Up to 5 users', '5 GB storage', 'Basic features', 'Email support'],
      recommended: false,
    },
    {
      id: 'professional',
      name: 'Professional',
      price: '$79',
      period: '/month',
      features: ['Up to 50 users', '50 GB storage', 'All features + Analytics', 'Priority support', 'API access'],
      recommended: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: '$299',
      period: '/month',
      features: ['Unlimited users', 'Unlimited storage', 'Dedicated database', 'SSO & Advanced security', '24/7 phone support'],
      recommended: false,
    },
  ];

  return (
    <>
      <Head>
        <title>Sign Up - Logam Task Manager</title>
        <meta name="description" content="Create your organization account and start your free trial" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex flex-col">

        {/* Header */}
        <div className="border-b border-gray-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <Link href="/" className="flex items-center space-x-3">
                <img src="/icons/Logam Academy LOGO 512x512.png" alt="Logo" className="h-10 w-10 object-contain" />
                <span className="text-xl font-bold text-black">Logam Task Manager</span>
              </Link>
              <div className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link href="/login" className="text-black font-bold hover:underline">
                  Sign In
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
          <div className="w-full max-w-4xl">

            {/* Progress Indicator */}
            <div className="mb-8">
              <div className="flex items-center justify-center space-x-4">
                <div className={`flex items-center ${step >= 1 ? 'text-black' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 1 ? 'bg-black text-white' : 'bg-gray-200'}`}>
                    {step > 1 ? <CheckCircle className="w-6 h-6" /> : '1'}
                  </div>
                  <span className="ml-2 font-medium hidden sm:inline">Organization</span>
                </div>
                <div className="w-12 h-1 bg-gray-300"></div>
                <div className={`flex items-center ${step >= 2 ? 'text-black' : 'text-gray-400'}`}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${step >= 2 ? 'bg-black text-white' : 'bg-gray-200'}`}>
                    2
                  </div>
                  <span className="ml-2 font-medium hidden sm:inline">Admin Account</span>
                </div>
              </div>
            </div>

            {/* Signup Card */}
            <div className="bg-white border-2 border-gray-200 rounded-2xl p-8 lg:p-12 shadow-xl">

              {/* Header */}
              <div className="text-center mb-8">
                <h2 className="text-3xl lg:text-4xl font-bold text-black mb-2">
                  {step === 1 ? 'Create Your Organization' : 'Set Up Admin Account'}
                </h2>
                <p className="text-gray-600 text-lg">
                  {step === 1
                    ? 'Start your 14-day free trial. No credit card required.'
                    : 'Create the first administrator account for your organization.'}
                </p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-6 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
                  <p className="text-red-700 text-sm font-medium">{error}</p>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-6">

                {/* Step 1: Organization Details */}
                {step === 1 && (
                  <>
                    {/* Organization Name */}
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">
                        Organization Name *
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          placeholder="Acme Corporation"
                          value={organizationName}
                          onChange={(e) => setOrganizationName(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:border-black focus:bg-white focus:outline-none transition-all font-medium"
                          disabled={loading}
                          required
                        />
                      </div>
                    </div>

                    {/* Organization Slug (Auto-generated) */}
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">
                        Organization URL
                      </label>
                      <div className="flex items-center bg-gray-50 border-2 border-gray-300 rounded-xl px-4 py-4">
                        <span className="text-gray-500 font-medium">app.logam.com/</span>
                        <input
                          type="text"
                          value={slug}
                          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                          className="flex-1 bg-transparent text-black font-medium focus:outline-none ml-1"
                          placeholder="acme-corp"
                          disabled={loading}
                        />
                      </div>
                      <p className="text-sm text-gray-500 mt-2">This will be your unique organization identifier</p>
                    </div>

                    {/* Company Website (Optional) */}
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">
                        Company Website (Optional)
                      </label>
                      <input
                        type="url"
                        placeholder="https://www.example.com"
                        value={companyWebsite}
                        onChange={(e) => setCompanyWebsite(e.target.value)}
                        className="w-full px-4 py-4 bg-gray-50 border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:border-black focus:bg-white focus:outline-none transition-all font-medium"
                        disabled={loading}
                      />
                    </div>

                    {/* Plan Selection */}
                    <div>
                      <label className="block text-sm font-bold text-black mb-4">
                        Choose Your Plan
                      </label>
                      <div className="grid md:grid-cols-3 gap-4">
                        {plans.map((p) => (
                          <div
                            key={p.id}
                            onClick={() => setPlan(p.id)}
                            className={`relative cursor-pointer p-6 border-2 rounded-xl transition-all ${
                              plan === p.id
                                ? 'border-black bg-black text-white'
                                : 'border-gray-300 bg-white hover:border-gray-400'
                            }`}
                          >
                            {p.recommended && (
                              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full">
                                RECOMMENDED
                              </div>
                            )}
                            <div className="text-center">
                              <h3 className={`text-lg font-bold mb-2 ${plan === p.id ? 'text-white' : 'text-black'}`}>
                                {p.name}
                              </h3>
                              <div className="mb-4">
                                <span className={`text-3xl font-bold ${plan === p.id ? 'text-white' : 'text-black'}`}>
                                  {p.price}
                                </span>
                                <span className={plan === p.id ? 'text-gray-300' : 'text-gray-600'}>
                                  {p.period}
                                </span>
                              </div>
                              <ul className="space-y-2 text-sm">
                                {p.features.slice(0, 3).map((feature, idx) => (
                                  <li key={idx} className="flex items-center gap-2">
                                    <CheckCircle className={`w-4 h-4 flex-shrink-0 ${plan === p.id ? 'text-green-400' : 'text-green-600'}`} />
                                    <span className={plan === p.id ? 'text-white' : 'text-gray-700'}>{feature}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-gray-500 mt-4 text-center">
                        All plans include a 14-day free trial. You can change or cancel anytime.
                      </p>
                    </div>
                  </>
                )}

                {/* Step 2: Admin Account Details */}
                {step === 2 && (
                  <>
                    {/* Full Name */}
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">
                        Full Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          placeholder="John Doe"
                          value={adminFullName}
                          onChange={(e) => setAdminFullName(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:border-black focus:bg-white focus:outline-none transition-all font-medium"
                          disabled={loading}
                          required
                        />
                      </div>
                    </div>

                    {/* Username */}
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">
                        Username *
                      </label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="text"
                          placeholder="johndoe"
                          value={adminUsername}
                          onChange={(e) => setAdminUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:border-black focus:bg-white focus:outline-none transition-all font-medium"
                          disabled={loading}
                          required
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">
                        Email Address *
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type="email"
                          placeholder="john@example.com"
                          value={adminEmail}
                          onChange={(e) => setAdminEmail(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:border-black focus:bg-white focus:outline-none transition-all font-medium"
                          disabled={loading}
                          required
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-sm font-bold text-black mb-2">
                        Password *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Minimum 8 characters"
                          value={adminPassword}
                          onChange={(e) => setAdminPassword(e.target.value)}
                          className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:border-black focus:bg-white focus:outline-none transition-all font-medium"
                          disabled={loading}
                          required
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
                      <label className="block text-sm font-bold text-black mb-2">
                        Confirm Password *
                      </label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Re-enter your password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-300 rounded-xl text-black placeholder-gray-500 focus:border-black focus:bg-white focus:outline-none transition-all font-medium"
                          disabled={loading}
                          required
                        />
                      </div>
                    </div>

                    {/* Terms Agreement */}
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="terms"
                        checked={agreeToTerms}
                        onChange={(e) => setAgreeToTerms(e.target.checked)}
                        className="mt-1 w-5 h-5 border-2 border-gray-300 rounded focus:ring-2 focus:ring-black"
                        required
                      />
                      <label htmlFor="terms" className="text-sm text-gray-700">
                        I agree to the{' '}
                        <a href="#" className="text-black font-bold hover:underline">Terms of Service</a>
                        {' '}and{' '}
                        <a href="#" className="text-black font-bold hover:underline">Privacy Policy</a>
                      </label>
                    </div>
                  </>
                )}

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  {step === 2 && (
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="flex-1 py-4 px-6 bg-gray-100 text-black border-2 border-gray-300 rounded-xl hover:bg-gray-200 font-bold text-lg transition-all"
                      disabled={loading}
                    >
                      Back
                    </button>
                  )}
                  <Button
                    type="submit"
                    className={`${step === 1 ? 'w-full' : 'flex-1'} py-4 text-lg font-bold bg-black text-white hover:bg-gray-800 border-2 border-black flex items-center justify-center group`}
                    loading={loading}
                    disabled={loading}
                  >
                    {loading ? 'Creating...' : step === 1 ? 'Continue' : 'Create Organization'}
                    {!loading && <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />}
                  </Button>
                </div>
              </form>

            </div>

            {/* Trust Indicators */}
            <div className="mt-8 flex items-center justify-center gap-8 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span>Cancel anytime</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </>
  );
}
