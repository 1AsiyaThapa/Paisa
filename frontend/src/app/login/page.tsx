'use client';

import Link from 'next/link';
import { SearchParamsWrapper } from '../../components/common/SearchParamsWrapper';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { FormInput } from '../../components/forms/FormInput';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { GoogleOAuthButton } from '../../components/auth/GoogleOAuthButton';
import { PageTransition } from '../../components/common/PageTransition';
import { useForm } from '../../hooks/useForm';
import { useAuth } from '../../contexts/AuthContext';
import { validateEmail, validatePassword } from '../../lib/utils';
import { useState, useEffect } from 'react';

function LoginContent({ searchParams, onAuthError, onStatusMessage }: {
  searchParams: URLSearchParams;
  onAuthError: (error: string | null) => void;
  onStatusMessage: (message: string | null) => void;
}) {
  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'auth_failed') {
      onAuthError('Authentication failed. Please try again.');
    }
    if (searchParams.get('reset') === 'success') {
      onStatusMessage('Password updated successfully. Please sign in with your new password.');
    }
  }, [searchParams, onAuthError, onStatusMessage]);

  return null; // This component only handles side effects
}

export default function Login() {
  const { login, loading } = useAuth();
  const [authError, setAuthError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [formState, formActions] = useForm<{
    email: string;
    password: string;
    rememberMe: string;
  }>({
    initialValues: { email: '', password: '', rememberMe: 'false' },
    validationRules: {
      email: [validateEmail],
      password: [validatePassword],
    },
  });

  const { values, errors } = formState;
  const { handleChange, handleSubmit, setFieldError } = formActions;


  const onSubmit = async (formValues: Record<string, string>) => {
    try {
      await login(
        formValues.email,
        formValues.password,
        formValues.rememberMe === 'true',
      );
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Login failed. Please try again.';
      setFieldError('email', errorMessage);
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
            <LoginContent
              searchParams={searchParams}
              onAuthError={setAuthError}
              onStatusMessage={setStatusMessage}
            />
            <AuthLayout
              title="Welcome back"
              subtitle="Sign in to your account to continue"
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

                  {statusMessage && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                      {statusMessage}
                    </div>
                  )}

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

                  {/* Login Form */}
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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

                    <div className="space-y-2">
                      <label htmlFor="password" className="text-sm font-medium text-gray-700">
                        Password
                      </label>
                      <FormInput
                        id="password"
                        type="password"
                        placeholder="Enter your password"
                        value={values.password}
                        onChange={(e) => handleChange('password', e.target.value)}
                        error={errors.password}
                        icon={Lock}
                        disabled={loading}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <input
                          id="rememberMe"
                          type="checkbox"
                          checked={values.rememberMe === 'true'}
                          onChange={(e) => handleChange('rememberMe', e.target.checked.toString())}
                          className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                          disabled={loading}
                        />
                        <label htmlFor="rememberMe" className="text-sm text-gray-600">
                          Remember me
                        </label>
                      </div>
                      <Link
                        href="/forgot-password"
                        className="text-sm text-red-600 hover:text-red-500 transition-colors"
                      >
                        Forgot password?
                      </Link>
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
                      {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                  </form>

                  {/* Sign Up Link */}
                  <div className="mt-6 text-center">
                    <p className="text-sm text-gray-600">
                      Don&apos;t have an account?{' '}
                      <Link
                        href="/signup"
                        className="text-red-600 hover:text-red-500 font-medium transition-colors"
                      >
                        Sign up
                      </Link>
                    </p>
                  </div>

                  {/* Back to Home Link */}
                  <div className="mt-4 text-center">
                    <Link
                      href="/"
                      className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      ← Back to home
                    </Link>
                  </div>
                </div>
              </Card>
            </AuthLayout>
          </>
        )}
      </SearchParamsWrapper>
    </PageTransition>
  );
}
