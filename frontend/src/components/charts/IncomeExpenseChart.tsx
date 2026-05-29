'use client';

import { ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface IncomeExpenseChartProps {
  data: Array<{
    month: string;
    income: number;
    expense: number;
  }>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      month: string;
      income: number;
      expense: number;
    };
    name: string;
    value: number;
    color: string;
    dataKey: string | number;
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
        <p className="text-sm font-semibold text-gray-900 mb-2">{payload[0].payload.month}</p>
        <div className="space-y-1">
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm text-gray-600">{entry.name}:</span>
              <span className={`text-sm font-semibold ${entry.dataKey === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                Rs {entry.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

interface CustomLegendProps {
  payload?: Array<{
    value: string;
    color: string;
    dataKey: string | number;
  }>;
}

const CustomLegend = ({ payload }: CustomLegendProps) => {
  return (
    <div className="flex justify-center gap-6 mt-6">
      {payload?.map((entry, index) => (
        <div key={index} className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-600">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function IncomeExpenseChart({ data }: IncomeExpenseChartProps) {
  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
        <defs>
          <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
          </linearGradient>
          <linearGradient id="expenseGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#e5e7eb"
          strokeOpacity={0.5}
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fill: '#6b7280', fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif' }}
          axisLine={{ stroke: '#e5e7eb' }}
          tickLine={false}
          height={40}
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 12, fontFamily: 'Inter, system-ui, sans-serif' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `Rs ${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toLocaleString()}`}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend content={<CustomLegend />} />
        <Bar
          dataKey="income"
          fill="url(#incomeGradient)"
          name="Income"
          radius={[8, 8, 0, 0]}
        />
        <Bar
          dataKey="expense"
          fill="url(#expenseGradient)"
          name="Expense"
          radius={[8, 8, 0, 0]}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
