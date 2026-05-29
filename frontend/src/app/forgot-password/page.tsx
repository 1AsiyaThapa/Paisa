'use client';

import Link from 'next/link';
import { startTransition, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, KeyRound, Lock, Mail, ShieldCheck, X } from 'lucide-react';

import { AuthLayout } from '@/components/layout/AuthLayout';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FormInput } from '@/components/forms/FormInput';
import { Input } from '@/components/ui/Input';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageTransition } from '@/components/common/PageTransition';
import { authService } from '@/services/api';
import { checkPasswordRequirements, validateEmail, validatePassword } from '@/lib/utils';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();

    const emailError = validateEmail(email);
    if (emailError) {
      setError(emailError);
      return;
    }

    setSubmitting(true);
    setError(null);
    setInfo(null);

    try {
      const response = await authService.forgotPassword(email);
      setInfo(response.message);
      setStep('reset');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to request reset code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (!otpCode || otpCode.length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await authService.resetPassword(email, otpCode, newPassword);
      startTransition(() => {
        router.push('/login?reset=success');
      });
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Unable to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  const requirements = checkPasswordRequirements(newPassword);

  return (
    <PageTransition>
      <AuthLayout
        title={step === 'request' ? 'Forgot your password?' : 'Reset your password'}
        subtitle={
          step === 'request'
            ? 'Enter your email and we will send you a verification code.'
            : `Enter the 6-digit code sent to ${email}`
        }
      >
        <Card className="bg-white/85 shadow-xl">
          <div className="p-8 space-y-6">
            <div className="app-chip">
              {step === 'request' ? <ShieldCheck className="h-3.5 w-3.5" /> : <KeyRound className="h-3.5 w-3.5" />}
              {step === 'request' ? 'Secure account recovery' : 'Code verification required'}
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {info && (
              <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {info}
              </div>
            )}

            {step === 'request' ? (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <FormInput
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  icon={Mail}
                  disabled={submitting}
                />

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? <LoadingSpinner size="sm" className="mr-2" /> : <ArrowRight className="h-4 w-4" />}
                  {submitting ? 'Sending code...' : 'Send reset code'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <Input
                  label="Verification Code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-xl tracking-[0.5em]"
                  placeholder="000000"
                />

                <FormInput
                  id="new-password"
                  type="password"
                  placeholder="Create a new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  icon={Lock}
                  disabled={submitting}
                />

                {newPassword && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-1.5">
                    <div className={`flex items-center gap-2 text-xs ${requirements.hasMinLength ? 'text-green-600' : 'text-slate-500'}`}>
                      {requirements.hasMinLength ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      At least 8 characters
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${requirements.hasNumber ? 'text-green-600' : 'text-slate-500'}`}>
                      {requirements.hasNumber ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      At least one number
                    </div>
                    <div className={`flex items-center gap-2 text-xs ${requirements.hasSymbol ? 'text-green-600' : 'text-slate-500'}`}>
                      {requirements.hasSymbol ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                      At least one symbol
                    </div>
                  </div>
                )}

                <FormInput
                  id="confirm-password"
                  type="password"
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  icon={Lock}
                  disabled={submitting}
                />

                <div className="flex flex-col gap-3">
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? <LoadingSpinner size="sm" className="mr-2" /> : <ArrowRight className="h-4 w-4" />}
                    {submitting ? 'Resetting password...' : 'Reset password'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    disabled={submitting}
                    onClick={() => {
                      setStep('request');
                      setOtpCode('');
                      setNewPassword('');
                      setConfirmPassword('');
                      setError(null);
                    }}
                  >
                    Use a different email
                  </Button>
                </div>
              </form>
            )}

            <div className="text-center text-sm text-slate-500">
              Remember your password?{' '}
              <Link href="/login" className="font-medium text-red-600 hover:text-red-500">
                Back to sign in
              </Link>
            </div>
          </div>
        </Card>
      </AuthLayout>
    </PageTransition>
  );
}
