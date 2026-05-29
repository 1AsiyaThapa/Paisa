'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { LoginCredentials, SignupData, User } from '../types';
import { authService } from '../services/authService';

interface UseAuthReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (data: SignupData) => Promise<void>;
  logout: () => void;
  loginError: Error | null;
  signupError: Error | null;
  isLoginPending: boolean;
  isSignupPending: boolean;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoginPending, setIsLoginPending] = useState(false);
  const [isSignupPending, setIsSignupPending] = useState(false);
  const [loginError, setLoginError] = useState<Error | null>(null);
  const [signupError, setSignupError] = useState<Error | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Auth check failed:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (credentials: LoginCredentials) => {
    setIsLoginPending(true);
    setLoginError(null);

    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      router.push('/dashboard');
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error('Login failed');
      setLoginError(errorMessage);
      throw error;
    } finally {
      setIsLoginPending(false);
    }
  }, [router]);

  const signup = useCallback(async (data: SignupData) => {
    setIsSignupPending(true);
    setSignupError(null);

    try {
      const response = await authService.signup(data);
      setUser(response.user);
      router.push('/dashboard');
    } catch (error) {
      const errorMessage = error instanceof Error ? error : new Error('Signup failed');
      setSignupError(errorMessage);
      throw error;
    } finally {
      setIsSignupPending(false);
    }
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      router.push('/');
    }
  }, [router]);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    signup,
    logout,
    loginError,
    signupError,
    isLoginPending,
    isSignupPending,
  };
}
