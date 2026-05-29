'use client';
/* eslint-disable react/no-unescaped-entities */

import { useState, useEffect } from 'react';
import { budgetService, transactionService } from '@/services/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PiggyBank, TrendingUp, AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function BudgetPage() {
  const [budgetData, setBudgetData] = useState({
    monthly_budget: 0,
    monthly_spent: 0,
    reset_date: '',
  });
  const [newBudgetAmount, setNewBudgetAmount] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadBudgetData();
  }, []);

  const loadBudgetData = async () => {
    try {
      const stats = await transactionService.getStats();
      setBudgetData({
        monthly_budget: stats.monthly_budget,
        monthly_spent: stats.monthly_spent,
        reset_date: stats.reset_date,
      });
      setNewBudgetAmount(stats.monthly_budget > 0 ? stats.monthly_budget.toString() : '');
    } catch (error) {
      console.error('Error loading budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSetBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(newBudgetAmount);
    if (!amount || amount <= 0) {
      alert('Please enter a valid budget amount');
      return;
    }

    setSubmitting(true);
    try {
      await budgetService.setCurrentBudget(amount);
      await loadBudgetData();
      alert('Budget updated successfully');
    } catch (error) {
      console.error('Error setting budget:', error);
      alert('Failed to update budget');
    } finally {
      setSubmitting(false);
    }
  };

  const percentage = budgetData.monthly_budget > 0
    ? Math.round((budgetData.monthly_spent / budgetData.monthly_budget) * 100)
    : 0;

  const remaining = budgetData.monthly_budget - budgetData.monthly_spent;

  const getStatusColor = () => {
    if (percentage >= 100) return 'text-red-600';
    if (percentage >= 80) return 'text-orange-600';
    return 'text-green-600';
  };

  const getProgressColor = () => {
    if (percentage >= 100) return 'bg-red-600';
    if (percentage >= 80) return 'bg-orange-500';
    return 'bg-green-600';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Budget</h1>
          <p className="text-gray-500 mt-1">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Monthly Budget</h1>
        <p className="text-gray-500 mt-1">Track your spending against your budget</p>
      </div>

      {/* Set Budget Card */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="p-2 bg-red-50 rounded-lg ring-1 ring-red-100">
              <PiggyBank className="w-5 h-5 text-red-600" />
            </div>
            Set Monthly Budget
          </h2>
          <form onSubmit={handleSetBudget} className="space-y-4 max-w-md">
            <Input
              label="Budget Amount"
              type="number"
              step="0.01"
              value={newBudgetAmount}
              onChange={(e) => setNewBudgetAmount(e.target.value)}
              placeholder="Enter your monthly budget"
              required
            />
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="w-4 h-4" />
              <span>
                Resets on: {budgetData.reset_date ? format(new Date(budgetData.reset_date), 'MMM dd, yyyy') : 'Not set'}
              </span>
            </div>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : 'Update Budget'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Budget Overview */}
      {budgetData.monthly_budget > 0 && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card hover>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 rounded-xl ring-1 ring-red-100">
                    <PiggyBank size={24} className="text-red-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Monthly Budget</div>
                    <div className="text-2xl font-bold text-gray-900">
                      Rs {budgetData.monthly_budget.toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card hover>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 rounded-xl">
                    <TrendingUp size={24} className="text-red-600" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Spent This Month</div>
                    <div className="text-2xl font-bold text-gray-900">
                      Rs {budgetData.monthly_spent.toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card hover>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-xl ${remaining >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                    <AlertCircle size={24} className={remaining >= 0 ? 'text-green-600' : 'text-red-600'} />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-500">Remaining</div>
                    <div className={`text-2xl font-bold ${remaining >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      Rs {Math.abs(remaining).toLocaleString()}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Card */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-gray-900">Budget Progress</h3>
                  <span className={`text-3xl font-bold ${getStatusColor()}`}>
                    {percentage}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="relative w-full h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor()} transition-all duration-500 ease-out`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>

                {/* Status Message */}
                <div className="pt-2">
                  {percentage >= 100 && (
                    <div className="flex items-start gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-red-900">Budget Exceeded</p>
                        <p className="text-sm text-red-700 mt-1">
                          You've exceeded your monthly budget by Rs {Math.abs(remaining).toLocaleString()}. 
                          Consider reviewing your expenses.
                        </p>
                      </div>
                    </div>
                  )}
                  {percentage >= 80 && percentage < 100 && (
                    <div className="flex items-start gap-2 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-orange-900">Approaching Budget Limit</p>
                        <p className="text-sm text-orange-700 mt-1">
                          You've used {percentage}% of your budget. You have Rs {remaining.toLocaleString()} remaining.
                        </p>
                      </div>
                    </div>
                  )}
                  {percentage < 80 && (
                    <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-semibold text-green-900">On Track</p>
                        <p className="text-sm text-green-700 mt-1">
                          You're doing great! You have Rs {remaining.toLocaleString()} remaining in your budget.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* No Budget Set */}
      {budgetData.monthly_budget === 0 && (
        <Card>
          <CardContent className="p-12">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className="p-4 bg-gray-100 rounded-full">
                  <PiggyBank className="w-12 h-12 text-gray-400" />
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">No Budget Set</h3>
                <p className="text-gray-500 mt-2">
                  Set a monthly budget above to start tracking your spending
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
