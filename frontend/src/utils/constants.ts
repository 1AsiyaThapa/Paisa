export const TRANSACTION_CATEGORIES = {
  INCOME: [
    'Salary',
    'Freelance',
    'Business',
    'Investment',
    'Gift',
    'Other Income'
  ],
  EXPENSE: [
    'Food & Dining',
    'Transportation',
    'Bills & Utilities',
    'Shopping',
    'Entertainment',
    'Healthcare',
    'Education',
    'Travel',
    'Groceries',
    'Other Expense'
  ]
} as const;

export const CHART_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#84CC16', // Lime
  '#EC4899', // Pink
  '#6B7280'  // Gray
] as const;

export const BUDGET_COLORS = {
  GOOD: 'bg-green-500',
  WARNING: 'bg-amber-500',
  DANGER: 'bg-red-500'
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'paisatrack-auth-token',
  USER_DATA: 'paisatrack-user',
  CURRENCY: 'paisatrack-currency',
  THEME: 'paisatrack-theme'
} as const;

export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  TRANSACTION_MAX_AMOUNT: 1000000,
  DESCRIPTION_MAX_LENGTH: 255
} as const;
