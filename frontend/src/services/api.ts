import {
  Transaction,
  TransactionQueryParams,
  User,
  Budget,
  RecurringTransaction,
  Category,
  MultiReceiptAnalysis,
  RecurringExpense,
  ReportTimeRange,
} from '../types';
import { STORAGE_KEYS } from '../utils/constants';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;

  // Get token from localStorage for cross-domain auth
  const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) : null;

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      ...options,
      // Merge headers if options has headers
      ...(options?.headers ? {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...options.headers,
        }
      } : {}),
    });
  } catch (error) {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      throw new Error(
        `Cannot connect to backend server at ${BASE_URL}. Please ensure the backend is running.`
      );
    }
    throw error;
  }

  if (!response.ok) {
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(STORAGE_KEYS.USER_DATA);
        localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);

        if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
          window.location.href = '/login';
        }
      }
      throw new Error('Authentication required. Please log in again.');
    }

    let errorMessage = `API Error: ${response.status} ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.map((err: { loc?: string[]; msg: string }) =>
            `${err.loc?.join('.')}: ${err.msg}`
          ).join(', ');
        } else {
          errorMessage = errorData.detail;
        }
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch {
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const authService = {
  async login(email: string, password: string, remember_me: boolean = false): Promise<User> {
    const response = await apiRequest<{ access_token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, remember_me }),
    });
    // Store token for cross-domain auth
    if (typeof window !== 'undefined' && response.access_token) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.access_token);
    }
    return response.user;
  },

  async register(userData: {
    name: string;
    email: string;
    password: string;
    otp_code: string;
  }): Promise<User> {
    const response = await apiRequest<{ access_token: string; user: User }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    // Store token for cross-domain auth
    if (typeof window !== 'undefined' && response.access_token) {
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, response.access_token);
    }
    return response.user;
  },

  async requestOTP(name: string, email: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/auth/request-otp', {
      method: 'POST',
      body: JSON.stringify({ name, email }),
    });
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(email: string, otp_code: string, new_password: string): Promise<{ message: string }> {
    return apiRequest<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email, otp_code, new_password }),
    });
  },

  async logout(): Promise<void> {
    try {
      await apiRequest<void>('/auth/logout', {
        method: 'POST',
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      return await apiRequest<User>('/users/me');
    } catch {
      return null;
    }
  },

  async checkAuthStatus(): Promise<User | null> {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) : null;
      const response = await fetch(`${BASE_URL}/users/me`, {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  },
};

export const transactionService = {
  async getTransactions(
    paramsOrType?: TransactionQueryParams | 'income' | 'expense'
  ): Promise<Transaction[]> {
    const params = new URLSearchParams();

    if (typeof paramsOrType === 'string') {
      params.set('type', paramsOrType);
    } else if (paramsOrType) {
      Object.entries(paramsOrType).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.set(key, String(value));
        }
      });
    }

    const query = params.toString();
    const url = query ? `/transactions?${query}` : '/transactions';
    return apiRequest<Transaction[]>(url);
  },

  async getStats(): Promise<{
    total_income: number;
    total_expenses: number;
    balance: number;
    monthly_budget: number;
    monthly_spent: number;
    reset_date: string;
    recent_transactions: Transaction[];
  }> {
    return apiRequest('/transactions/stats');
  },

  async createTransaction(transaction: {
    amount: number;
    type: 'income' | 'expense';
    category: string;
    note?: string;
    date: string;
    receipt_url?: string;
    frequency?: 'weekly' | 'monthly' | 'semi_annually' | 'yearly';
  }): Promise<Transaction> {
    return apiRequest<Transaction>('/transactions', {
      method: 'POST',
      body: JSON.stringify(transaction),
    });
  },

  async scanReceipt(file: File): Promise<MultiReceiptAnalysis> {
    const formData = new FormData();
    formData.append('file', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) : null;
    const cleanBaseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
    const url = `${cleanBaseUrl}/transactions/scan/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEYS.USER_DATA);
          localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);

          if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/login';
          }
        }
        throw new Error('Authentication required. Please log in again.');
      }

      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch {
      }

      throw new Error(errorMessage);
    }

    return response.json();
  },

  async deleteTransaction(id: string): Promise<void> {
    return apiRequest<void>(`/transactions/${id}`, {
      method: 'DELETE',
    });
  },

  async getIncomeExpenseComparison(months: number = 6): Promise<{
    data: Array<{
      month: string;
      income: number;
      expense: number;
    }>;
  }> {
    return apiRequest(`/transactions/income-expense-comparison?months=${months}`);
  },

  async getDashboardSummary(months: number = 6): Promise<{
    data: Array<Record<string, string | number>>;
  }> {
    return apiRequest<{
      data: Array<Record<string, string | number>>;
    }>(`/transactions/dashboard-summary?months=${months}`);
  },

  async getCategoryProportions(type: 'income' | 'expense'): Promise<{
    data: Array<{ category: string; total: number }>;
  }> {
    return apiRequest<{
      data: Array<{ category: string; total: number }>;
    }>(`/transactions/category-proportions?type=${type}`);
  },

  async getUpcomingRecurringExpenses(): Promise<RecurringExpense[]> {
    return apiRequest<RecurringExpense[]>('/transactions/recurring/upcoming');
  },

  async handleRecurringAction(id: string, action: 'mark_done' | 'skip_once' | 'turn_off'): Promise<void> {
    return apiRequest<void>(`/transactions/recurring/${id}/action`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
  },

  async getPrediction(): Promise<{
    status: string;
    target_month?: string;
    total_predicted?: number;
    categories?: { category: string; predicted_amount: number }[];
    insufficient_categories?: string[];
    message?: string;
  }> {
    return apiRequest('/transactions/predict-expense');
  },

  getExportUrl(filters: {
    type?: 'income' | 'expense' | 'all';
    time_range: ReportTimeRange;
    date_from?: string;
    date_to?: string;
  }): string {
    const params = new URLSearchParams({
      time_range: filters.time_range,
    });

    if (filters.type && filters.type !== 'all') {
      params.set('type', filters.type);
    }

    if (filters.time_range === 'custom') {
      if (filters.date_from) {
        params.set('date_from', filters.date_from);
      }
      if (filters.date_to) {
        params.set('date_to', filters.date_to);
      }
    }

    return `${BASE_URL}/transactions/export?${params.toString()}`;
  },
};

export const budgetService = {
  async getCurrentBudget(): Promise<Budget> {
    return apiRequest<Budget>('/budgets/current');
  },

  async setCurrentBudget(amount: number): Promise<Budget> {
    return apiRequest<Budget>('/budgets/current', {
      method: 'PUT',
      body: JSON.stringify({ amount }),
    });
  },
};

export const recurringTransactionService = {
  async getRecurringTransactions(): Promise<RecurringTransaction[]> {
    return apiRequest<RecurringTransaction[]>('/recurring-transactions');
  },

  async markAsPaid(id: string): Promise<void> {
    return apiRequest<void>(`/recurring-transactions/${id}/mark-paid`, {
      method: 'POST',
    });
  },

  async skipThisTime(id: string): Promise<void> {
    return apiRequest<void>(`/recurring-transactions/${id}/skip`, {
      method: 'POST',
    });
  },
};

export const userService = {
  async getProfile(): Promise<User> {
    return apiRequest<User>('/users/me');
  },

  async updateProfile(userData: { name?: string; password?: string; new_password?: string }): Promise<User> {
    return apiRequest<User>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  },

  async uploadProfilePicture(file: File): Promise<User> {
    const formData = new FormData();
    formData.append('file', file);

    const token = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) : null;
    const cleanBaseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
    const url = `${cleanBaseUrl}/users/me/picture/`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.detail) {
          errorMessage = errorData.detail;
        }
      } catch {
      }

      throw new Error(errorMessage);
    }

    return response.json();
  },
};

export const categoryService = {
  async getCategories(type?: 'income' | 'expense'): Promise<Category[]> {
    const url = type ? `/categories?type=${type}` : '/categories';
    return apiRequest<Category[]>(url);
  },

  async createCategory(category: {
    name: string;
    type: 'income' | 'expense';
    icon: string;
    color?: string;
  }): Promise<Category> {
    return apiRequest<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(category),
    });
  },

  async updateCategory(id: string, category: {
    name: string;
    type: 'income' | 'expense';
    icon: string;
    color?: string;
  }): Promise<Category> {
    return apiRequest<Category>(`/categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(category),
    });
  },

  async deleteCategory(id: string): Promise<void> {
    return apiRequest<void>(`/categories/${id}`, {
      method: 'DELETE',
    });
  },
};
