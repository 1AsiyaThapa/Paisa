export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  google_id?: string;
  picture?: string;
  role?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}


export interface Transaction {
  id: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  note?: string;
  date: string;
  receipt_url?: string;
  created_at: string;
  frequency?: 'weekly' | 'monthly' | 'semi_annually' | 'yearly';
  last_handled_date?: string;
}

export interface TransactionQueryParams {
  type?: 'income' | 'expense';
  category?: string;
  date_from?: string;
  date_to?: string;
  month?: number;
  year?: number;
  search?: string;
  sort_by?: 'date' | 'amount';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface RecurringExpense {
  id: string;
  amount: number;
  category: string;
  note?: string;
  frequency: 'weekly' | 'monthly' | 'semi_annually' | 'yearly';
  next_due_date: string;
  original_date: string;
}

export interface Budget {
  amount: number;
  month: number;
  year: number;
  reset_date: string;
}

export interface BudgetUpdate {
  amount: number;
}

export interface RecurringTransaction {
  id: string;
  amount: number;
  description: string;
  category: string;
  type: 'income' | 'expense';
  frequency: 'monthly' | 'weekly' | 'yearly' | 'daily';
  nextDate: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color?: string;
  created_at: string;
}

export interface CategoryCreate {
  name: string;
  type: 'income' | 'expense';
  icon: string;
  color?: string;
}

export interface UserUpdate {
  name?: string;
  password?: string;
  new_password?: string;
}

export interface ReceiptItem {
  item_name: string;
  amount: number;
  category: string;
  note?: string;
}

export interface MultiReceiptAnalysis {
  receipt_url: string;
  date: string;
  total_on_receipt: number;
  suggested_transactions: ReceiptItem[];
}

export type ReportTimeRange =
  | 'last_week'
  | 'last_month'
  | 'last_year'
  | 'all_time'
  | 'custom';
