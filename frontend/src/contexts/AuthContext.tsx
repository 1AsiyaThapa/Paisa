'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { authService } from '../services/api';
import { STORAGE_KEYS } from '../utils/constants';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  signup: (name: string, email: string, password: string, otp_code: string) => Promise<void>;
  requestOTP: (name: string, email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  updateUserState: (nextUser: User | null) => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const persistUser = useCallback((nextUser: User | null) => {
    setUser(nextUser);
    if (typeof window === 'undefined') {
      return;
    }

    if (nextUser) {
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(nextUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    const userData = await authService.checkAuthStatus();
    persistUser(userData);
    return userData;
  }, [persistUser]);

  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window !== 'undefined') {
        const savedUser = localStorage.getItem(STORAGE_KEYS.USER_DATA);
        if (savedUser) {
          try {
            setUser(JSON.parse(savedUser));
            setLoading(false);
            return;
          } catch (error) {
            console.error('Error parsing stored user data:', error);
            localStorage.removeItem(STORAGE_KEYS.USER_DATA);
          }
        }

        try {
          await refreshUser();
        } catch (error) {
          console.error('Error checking auth status:', error);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [refreshUser]);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    setLoading(true);
    try {
      const userData = await authService.login(email, password, rememberMe);

      persistUser(userData);
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, otp_code: string) => {
    setLoading(true);
    try {
      const userData = await authService.register({ name, email, password, otp_code });

      persistUser(userData);
      if (typeof window !== 'undefined') {
        window.location.href = '/dashboard';
      }
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const requestOTP = async (name: string, email: string) => {
    setLoading(true);
    try {
      await authService.requestOTP(name, email);
    } catch (error) {
      console.error('Request OTP error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      persistUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, requestOTP, logout, refreshUser, updateUserState: persistUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
