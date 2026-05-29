'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { STORAGE_KEYS } from '@/utils/constants';
import { authService } from '@/services/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function AuthCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const token = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        router.push(`/login?error=${error}`);
        return;
      }

      if (token) {
        // Store token in localStorage so api.ts can use it
        localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, token);

        // Fetch user data using the token
        try {
          const user = await authService.checkAuthStatus();
          if (user) {
            localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
            router.push('/dashboard');
          } else {
            router.push('/login?error=auth_failed');
          }
        } catch {
          router.push('/login?error=auth_failed');
        }
      } else {
        router.push('/login');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner />
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    }>
      <AuthCallbackInner />
    </Suspense>
  );
}
