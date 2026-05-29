'use client';

import { RecurringExpense } from '@/types';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { format, differenceInDays } from 'date-fns';
import { Clock, CheckCircle2, X, BellOff } from 'lucide-react';
import { useState } from 'react';
import { transactionService } from '@/services/api';

interface RecurringExpenseCardProps {
  expenses: RecurringExpense[];
  onUpdate: () => void;
}

export function RecurringExpenseCard({ expenses, onUpdate }: RecurringExpenseCardProps) {
  const [processing, setProcessing] = useState<string | null>(null);

  const handleAction = async (id: string, action: 'mark_done' | 'skip_once' | 'turn_off') => {
    setProcessing(id);
    try {
      await transactionService.handleRecurringAction(id, action);
      onUpdate();
    } catch (error) {
      console.error('Error handling recurring action:', error);
      alert('Failed to process action');
    } finally {
      setProcessing(null);
    }
  };

  const getFrequencyLabel = (frequency: string) => {
    const labels: Record<string, string> = {
      weekly: 'Weekly',
      monthly: 'Monthly',
      semi_annually: 'Semi-Annually',
      yearly: 'Yearly',
    };
    return labels[frequency] || frequency;
  };

  const getDaysUntilDue = (dueDate: string) => {
    return differenceInDays(new Date(dueDate), new Date());
  };

  if (expenses.length === 0) {
    return null;
  }

  return (
    <Card className="border-none shadow-sm bg-gradient-to-br from-orange-50 to-white backdrop-blur-sm">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Clock className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Upcoming Recurring Expenses</h2>
            <p className="text-sm text-gray-500">Expenses due within the next 3 days</p>
          </div>
        </div>

        <div className="space-y-3">
          {expenses.map((expense) => {
            const daysUntil = getDaysUntilDue(expense.next_due_date);
            const isToday = daysUntil === 0;
            const isPast = daysUntil < 0;

            return (
              <div
                key={expense.id}
                className={`bg-white rounded-xl border-2 p-4 transition-all ${
                  isPast ? 'border-red-200 bg-red-50/50' : 
                  isToday ? 'border-orange-200 bg-orange-50/50' : 
                  'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{expense.category}</h3>
                      <span className="text-xs bg-red-50 text-red-700 ring-1 ring-red-100 px-2 py-0.5 rounded-full">
                        {getFrequencyLabel(expense.frequency)}
                      </span>
                    </div>
                    {expense.note && (
                      <p className="text-sm text-gray-600 mb-2">{expense.note}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Due: {format(new Date(expense.next_due_date), 'MMM dd, yyyy')}</span>
                      <span className={`font-medium ${
                        isPast ? 'text-red-600' : 
                        isToday ? 'text-orange-600' : 
                        'text-gray-600'
                      }`}>
                        {isPast ? 'Overdue' : isToday ? 'Due Today' : `In ${daysUntil} day${daysUntil > 1 ? 's' : ''}`}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-bold text-red-600 mb-3">
                      Rs {Number(expense.amount).toLocaleString()}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleAction(expense.id, 'mark_done')}
                        disabled={processing === expense.id}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        {processing === expense.id ? 'Processing...' : 'Mark as Done'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAction(expense.id, 'skip_once')}
                        disabled={processing === expense.id}
                        className="text-xs"
                      >
                        <X className="w-3 h-3 mr-1" />
                        Skip This Time
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleAction(expense.id, 'turn_off')}
                        disabled={processing === expense.id}
                        className="text-gray-500 hover:text-red-600 text-xs"
                      >
                        <BellOff className="w-3 h-3 mr-1" />
                        Turn Off
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
