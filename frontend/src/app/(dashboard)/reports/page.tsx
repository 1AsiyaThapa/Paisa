'use client';

import { useEffect, useMemo, useState } from 'react';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { CalendarRange, Download, Filter, FileSpreadsheet } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Input } from '@/components/ui/Input';
import { transactionService } from '@/services/api';
import { ReportTimeRange, Transaction, TransactionQueryParams } from '@/types';

const RANGE_OPTIONS: Array<{ value: ReportTimeRange; label: string; description: string }> = [
  { value: 'all_time', label: 'All time', description: 'Everything in your account' },
  { value: 'last_week', label: 'Last 7 days', description: 'Recent activity only' },
  { value: 'last_month', label: 'Last 30 days', description: 'A monthly snapshot' },
  { value: 'last_year', label: 'Last 1 year', description: 'Long-term trend export' },
  { value: 'custom', label: 'Custom range', description: 'Pick exact start and end dates' },
];

function buildPreviewParams(filters: {
  type: 'all' | 'income' | 'expense';
  timeRange: ReportTimeRange;
  dateFrom: string;
  dateTo: string;
}): TransactionQueryParams {
  const params: TransactionQueryParams = {
    sort_by: 'date',
    sort_order: 'desc',
    limit: 20,
  };

  if (filters.type !== 'all') {
    params.type = filters.type;
  }

  if (filters.timeRange === 'last_week') {
    params.date_from = format(startOfDay(subDays(new Date(), 7)), 'yyyy-MM-dd');
  } else if (filters.timeRange === 'last_month') {
    params.date_from = format(startOfDay(subDays(new Date(), 30)), 'yyyy-MM-dd');
  } else if (filters.timeRange === 'last_year') {
    params.date_from = format(startOfDay(subDays(new Date(), 365)), 'yyyy-MM-dd');
  } else if (filters.timeRange === 'custom') {
    if (filters.dateFrom) {
      params.date_from = format(startOfDay(new Date(filters.dateFrom)), 'yyyy-MM-dd');
    }
    if (filters.dateTo) {
      params.date_to = format(endOfDay(new Date(filters.dateTo)), 'yyyy-MM-dd');
    }
  }

  return params;
}

export default function ReportsPage() {
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all');
  const [timeRange, setTimeRange] = useState<ReportTimeRange>('all_time');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadPreview = async () => {
      setLoading(true);
      setError(null);

      try {
        const params = buildPreviewParams({ type, timeRange, dateFrom, dateTo });
        const data = await transactionService.getTransactions(params);
        setTransactions(data);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load report preview.');
      } finally {
        setLoading(false);
      }
    };

    void loadPreview();
  }, [type, timeRange, dateFrom, dateTo]);

  const previewTotals = useMemo(() => {
    return transactions.reduce(
      (acc, transaction) => {
        if (transaction.type === 'income') {
          acc.income += Number(transaction.amount);
        } else {
          acc.expense += Number(transaction.amount);
        }
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [transactions]);

  const handleExport = () => {
    if (timeRange === 'custom' && (!dateFrom || !dateTo)) {
      setError('Select both start and end dates for a custom export.');
      return;
    }

    setExporting(true);
    setError(null);

    const exportUrl = transactionService.getExportUrl({
      type,
      time_range: timeRange,
      date_from: dateFrom,
      date_to: dateTo,
    });

    window.location.href = exportUrl;

    window.setTimeout(() => {
      setExporting(false);
    }, 700);
  };

  return (
    <div className="app-page">
      <div className="app-page-header">
        <div>
          <h1 className="app-page-title">Reports & Exports</h1>
          <p className="app-page-copy">
            Filter your transactions, preview the latest rows, and download a clean CSV for analysis or sharing.
          </p>
        </div>
        <div className="app-chip">
          <FileSpreadsheet className="h-3.5 w-3.5" />
          CSV export ready
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-50 p-3">
              <Filter className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Filters</h2>
              <p className="text-sm text-slate-500">Choose what should appear in the preview and export file.</p>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Transaction type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as 'all' | 'income' | 'expense')}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-200"
              >
                <option value="all">All transactions</option>
                <option value="income">Income only</option>
                <option value="expense">Expenses only</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Date range</label>
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as ReportTimeRange)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm outline-none transition focus:border-red-300 focus:ring-2 focus:ring-red-200"
              >
                {RANGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                {RANGE_OPTIONS.find((option) => option.value === timeRange)?.description}
              </p>
            </div>
          </div>

          <div className="flex justify-end border-t border-slate-100 pt-4">
            <Button
              onClick={handleExport}
              className="w-full sm:w-auto px-5 py-2.5"
              disabled={exporting}
            >
              {exporting ? <LoadingSpinner size="sm" className="mr-2" /> : <Download className="h-4 w-4" />}
              {exporting ? 'Preparing export...' : 'Export CSV'}
            </Button>
          </div>

          {timeRange === 'custom' && (
            <div className="grid gap-4 md:grid-cols-2">
              <Input
                label="Start date"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <Input
                label="End date"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="app-surface-muted p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Preview rows</div>
              <div className="mt-2 text-2xl font-bold text-slate-900">{transactions.length}</div>
              <div className="mt-1 text-sm text-slate-500">Latest matching transactions</div>
            </div>
            <div className="app-surface-muted p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Income preview</div>
              <div className="mt-2 text-2xl font-bold text-green-600">Rs {previewTotals.income.toLocaleString()}</div>
              <div className="mt-1 text-sm text-slate-500">Sum of visible income rows</div>
            </div>
            <div className="app-surface-muted p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-400">Expense preview</div>
              <div className="mt-2 text-2xl font-bold text-red-600">Rs {previewTotals.expense.toLocaleString()}</div>
              <div className="mt-1 text-sm text-slate-500">Sum of visible expense rows</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Preview</h2>
              <p className="text-sm text-slate-500">Showing up to the latest 20 matching transactions.</p>
            </div>
            <div className="app-chip">
              <CalendarRange className="h-3.5 w-3.5" />
              Updated automatically
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : transactions.length === 0 ? (
            <div className="px-6 py-16 text-center text-slate-500">
              No transactions match the current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/70">
                  <tr className="text-left text-xs uppercase tracking-[0.16em] text-slate-500">
                    <th className="px-6 py-4 font-medium">Date</th>
                    <th className="px-6 py-4 font-medium">Type</th>
                    <th className="px-6 py-4 font-medium">Category</th>
                    <th className="px-6 py-4 font-medium">Note</th>
                    <th className="px-6 py-4 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {transactions.map((transaction) => (
                    <tr key={transaction.id} className="text-sm text-slate-700">
                      <td className="px-6 py-4 whitespace-nowrap">{format(new Date(transaction.date), 'MMM dd, yyyy')}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                            transaction.type === 'income'
                              ? 'bg-green-50 text-green-700'
                              : 'bg-red-50 text-red-700'
                          }`}
                        >
                          {transaction.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-medium text-slate-900">{transaction.category}</td>
                      <td className="px-6 py-4 text-slate-500">{transaction.note || 'No note'}</td>
                      <td
                        className={`px-6 py-4 text-right font-semibold ${
                          transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {transaction.type === 'income' ? '+' : '-'}Rs {Number(transaction.amount).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
