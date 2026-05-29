'use client';

import { transactionService } from '@/services/api';
import { Transaction } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { CategorySelect } from '@/components/ui/CategorySelect';
import { IncomeDonutChart } from '@/components/charts/IncomeDonutChart';

export default function IncomePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartData, setChartData] = useState<Array<{ category: string; total: number }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    amount: '',
    category: '',
    note: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });
  const [submitting, setSubmitting] = useState(false);

  // Delete Confirmation State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadTransactions();
    loadChartData();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await transactionService.getTransactions('income');
      setTransactions(data);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = async () => {
    try {
      const response = await transactionService.getCategoryProportions('income');
      console.log('Chart data response:', response);
      setChartData(response.data || []);
    } catch (error) {
      console.error('Error loading chart data:', error);
      setChartData([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.category) {
      alert('Please fill in amount and category');
      return;
    }

    setSubmitting(true);
    try {
      await transactionService.createTransaction({
        amount: Number(formData.amount),
        type: 'income',
        category: formData.category,
        note: formData.note || undefined,
        date: new Date(formData.date).toISOString(),
      });
      setFormData({ amount: '', category: '', note: '', date: format(new Date(), 'yyyy-MM-dd') });
      loadTransactions();
      loadChartData();
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Failed to add income');
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      await transactionService.deleteTransaction(deleteId);
      loadTransactions();
      loadChartData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
    } finally {
      setDeleteId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Income</h1>
        <p className="text-gray-500 mt-1">Manage your income sources</p>
      </div>

      {/* Income Source Distribution Chart */}
      <Card className="mb-6">
        <CardContent>
          <h2 className="text-lg font-semibold mb-2">Income Source Distribution</h2>
          <p className="text-sm text-gray-500 mb-6">
            See how diversified your income sources are. Click on a segment to filter transactions below.
          </p>
          {chartData.length > 0 ? (
            <IncomeDonutChart
              data={chartData}
              onCategoryClick={setSelectedCategory}
              selectedCategory={selectedCategory}
            />
          ) : (
            <div className="text-center py-12 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              No income data available. Add income transactions to see the distribution.
            </div>
          )}
          {selectedCategory && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
              <p className="text-sm text-blue-900">
                Showing transactions for: <span className="font-semibold">{selectedCategory}</span>
              </p>
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear filter
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Income Form */}
      <Card className="mb-6">
        <CardContent>
          <h2 className="text-lg font-semibold mb-4">Add Income</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
                required
              />
              <CategorySelect
                value={formData.category}
                onChange={(value) => setFormData({ ...formData, category: value })}
                type="income"
                placeholder="Select category"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
              <Input
                label="Note (Optional)"
                type="text"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                placeholder="Add a note"
              />
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Income'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Income List */}
      <Card>
        <CardContent>
          <h2 className="text-lg font-semibold mb-4">All Income</h2>
          {transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No income records yet. Add your first income above.
            </div>
          ) : (
            <div className="space-y-2">
              {(selectedCategory
                ? transactions.filter((tx) => tx.category === selectedCategory)
                : transactions
              ).map((tx) => (
                <div
                  key={tx.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-medium">{tx.category}</div>
                    {tx.note && <div className="text-sm text-gray-500">{tx.note}</div>}
                    <div className="text-xs text-gray-400">
                      {format(new Date(tx.date), 'MMM dd, yyyy')}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-bold text-green-600">
                      +Rs {Number(tx.amount).toLocaleString()}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(tx.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmationModal
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Delete Income"
        message="Are you sure you want to delete this income record? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}

