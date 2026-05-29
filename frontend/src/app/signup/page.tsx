'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SearchParamsWrapper } from '../../components/common/SearchParamsWrapper';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Mail, Lock, User, ArrowRight, AlertCircle, Check, X } from 'lucide-react';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { FormInput } from '../../components/forms/FormInput';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { GoogleOAuthButton } from '../../components/auth/GoogleOAuthButton';
import { PageTransition } from '../../components/common/PageTransition';
import { useForm } from '../../hooks/useForm';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword, validateName, checkPasswordRequirements } from '../../lib/utils';

function SignupContent({ searchParams, onAuthError }: {
  searchParams: URLSearchParams;
  onAuthError: (error: string | null) => void;
}) {
  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'auth_failed') {
      onAuthError('Authentication failed. Please try again.');
    }
  }, [searchParams, onAuthError]);

  return null;
}

export default function Signup() {
  const { signup, requestOTP, loading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [otpCode, setOtpCode] = useState('');

  const [formState, formActions] = useForm<{
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
  }>({
    initialValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationRules: {
      name: [validateName],
      email: [validateEmail],
      password: [validatePassword],
    },
  });

  const { values, errors } = formState;
  const { handleChange, handleSubmit, setFieldError } = formActions;

  useEffect(() => {
    if (values.confirmPassword) {
      if (!values.confirmPassword) {
        setFieldError('confirmPassword', 'Please confirm your password');
      } else if (values.password && values.confirmPassword !== values.password) {
        setFieldError('confirmPassword', 'Passwords do not match');
      } else {
        setFieldError('confirmPassword', '');
      }
    }
  }, [values.password, values.confirmPassword, setFieldError]);


  const onSubmit = async (formValues: Record<string, string>) => {
    if (step === 'details') {
      if (formValues.password !== formValues.confirmPassword) {
        setFieldError('confirmPassword', 'Passwords do not match');
        return;
      }

      try {
        await requestOTP(formValues.name, formValues.email);
        setStep('otp');
        setAuthError(null);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to request OTP. Please try again.';
        if (errorMessage.includes('already exists')) {
          setFieldError('email', 'An account with this email already exists.');
        } else {
          setAuthError(errorMessage);
        }
      }
    } else {
      if (!otpCode || otpCode.length !== 6) {
        setAuthError('Please enter a valid 6-digit verification code.');
        return;
      }

      try {
        await signup(
          formValues.name,
          formValues.email,
          formValues.password,
          otpCode
        );
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Signup failed. Please check the code and try again.';
        setAuthError(errorMessage);
      }
    }
  };

  const handleGoogleSuccess = () => {
  };

  const handleGoogleError = (error: string) => {
    setAuthError(error);
  };

  return (
    <PageTransition>
      <SearchParamsWrapper>
        {(searchParams) => (
          <>
            <SignupContent searchParams={searchParams} onAuthError={setAuthError} />
            <AuthLayout
              title={step === 'details' ? "Create your account" : "Verify Email"}
              subtitle={step === 'details' ? "Join Paisatrack and start your journey" : `Enter the code sent to ${values.email}`}
            >
              <Card className="backdrop-blur-sm bg-white/80 border border-gray-200 shadow-xl">
                <div className="p-8">
                  {/* Auth Error Display */}
                  {authError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-600 text-sm">
                      <AlertCircle className="h-4 w-4" />
                      {authError}
                    </div>
                  )}

                  {step === 'details' ? (
                    <>
                      {/* Google OAuth Button */}
                      <div className="mb-6">
                        <GoogleOAuthButton
                          onSuccess={handleGoogleSuccess}
                          onError={handleGoogleError}
                          disabled={loading}
                        />
                      </div>

                      {/* Divider */}
                      <div className="relative mb-6">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                          <span className="bg-white px-2 text-gray-500">
                            Or continue with email
                          </span>
                        </div>
                      </div>

                      {/* Signup Form - Step 1 */}
                      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

                        {/* Name Field */}
                        <div className="space-y-2">
                          <label htmlFor="name" className="text-sm font-medium text-gray-700">
                            Full Name
                          </label>
                          <FormInput
                            id="name"
                            type="text"
                            placeholder="Enter your full name"
                            value={values.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            error={errors.name}
                            icon={User}
                            disabled={loading}
                          />
                        </div>

                        {/* Email Field */}
                        <div className="space-y-2">
                          <label htmlFor="email" className="text-sm font-medium text-gray-700">
                            Email
                          </label>
                          <FormInput
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={values.email}
                            onChange={(e) => handleChange('email', e.target.value)}
                            error={errors.email}
                            icon={Mail}
                            disabled={loading}
                          />
                        </div>

                        {/* Password Field */}
                        <div className="space-y-2">
                          <label htmlFor="password" className="text-sm font-medium text-gray-700">
                            Password
                          </label>
                          <FormInput
                            id="password"
                            type="password"
                            placeholder="Create a password"
                            value={values.password}
                            onChange={(e) => handleChange('password', e.target.value)}
                            error={errors.password}
                            icon={Lock}
                            disabled={loading}
                          />
                          {/* Password Requirements */}
                          {values.password && (
                            <div className="mt-2 space-y-1">
                              {(() => {
                                const requirements = checkPasswordRequirements(values.password);
                                return (
                                  <>
                                    <div className={`flex items-center gap-2 text-xs ${requirements.hasMinLength ? 'text-green-600' : 'text-red-500'}`}>
                                      {requirements.hasMinLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                      At least 8 characters
                                    </div>
                                    <div className={`flex items-center gap-2 text-xs ${requirements.hasNumber ? 'text-green-600' : 'text-red-500'}`}>
                                      {requirements.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                      At least one number
                                    </div>
                                    <div className={`flex items-center gap-2 text-xs ${requirements.hasSymbol ? 'text-green-600' : 'text-red-500'}`}>
                                      {requirements.hasSymbol ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                      At least one symbol (!@#$%^&* etc.)
                                    </div>
                                  </>
                                );
                              })()}
                            </div>
                          )}
                        </div>

                        {/* Confirm Password Field */}
                        <div className="space-y-2">
                          <label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                            Confirm Password
                          </label>
                          <FormInput
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm your password"
                            value={values.confirmPassword}
                            onChange={(e) => handleChange('confirmPassword', e.target.value)}
                            error={errors.confirmPassword}
                            icon={Lock}
                            disabled={loading}
                          />
                        </div>

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={loading}
                        >
                          {loading ? (
                            <LoadingSpinner size="sm" className="mr-2" />
                          ) : (
                            <ArrowRight className="mr-2 h-4 w-4" />
                          )}
                          {loading ? 'Sending Code...' : 'Continue'}
                        </Button>
                      </form>
                    </>
                  ) : (
                    /* OTP Form - Step 2 */
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                      <div className="text-center mb-6">
                        <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Mail className="h-8 w-8 text-blue-600" />
                        </div>
                        <p className="text-sm text-gray-600">
                          We&apos;ve sent a 6-digit verification code to <span className="font-semibold">{values.email}</span>.
                          Please enter it below to confirm your account.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="otp" className="text-sm font-medium text-center block text-gray-700">
                          Verification Code
                        </label>
                        <input
                          id="otp"
                          type="text"
                          maxLength={6}
                          value={otpCode}
                          onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full text-center text-2xl tracking-[0.5em] font-bold py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                          placeholder="000000"
                          disabled={loading}
                          autoFocus
                          required
                        />
                      </div>

                      <div className="flex flex-col gap-3">
                        <Button
                          type="submit"
                          className="w-full"
                          disabled={loading || otpCode.length !== 6}
                        >
                          {loading ? <LoadingSpinner size="sm" className="mr-2" /> : null}
                          {loading ? 'Verifying...' : 'Verify & Create Account'}
                        </Button>

                        <button
                          type="button"
                          onClick={() => setStep('details')}
                          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                          disabled={loading}
                        >
                          Back to details
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Sign In Link (only show in step 1) */}
                  {step === 'details' && (
                    <div className="mt-6 text-center">
                      <p className="text-sm text-gray-600">
                        Already have an account?{' '}
                        <Link
                          href="/login"
                          className="text-red-600 hover:text-red-500 font-medium transition-colors"
                        >
                          Sign in
                        </Link>
                      </p>
                    </div>
                  )}

                  {/* Back to Home Link */}
                  {step === 'details' && (
                    <div className="mt-4 text-center">
                      <Link
                        href="/"
                        className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        ← Back to home
                      </Link>
                    </div>
                  )}
                </div>
              </Card>
            </AuthLayout>
          </>
        )}
      </SearchParamsWrapper>
    </PageTransition>
  );
}
