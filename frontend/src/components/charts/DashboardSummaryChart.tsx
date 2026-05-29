'use client';

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS } from '@/utils/constants';

interface DashboardSummaryChartProps {
  data: Array<Record<string, string | number>>;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: Record<string, number | string>;
    dataKey: string | number;
    name: string;
    value: number;
    color: string;
  }>;
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const income = Number(data.Income) || 0;

    // Calculate total expenses from all category values
    const expenseCategories: Array<{ name: string; value: number; color: string }> = [];
    let totalExpenses = 0;

    payload.forEach((entry) => {
      if (entry.dataKey !== 'Income' && typeof entry.value === 'number' && entry.value > 0) {
        expenseCategories.push({
          name: entry.name as string,
          value: entry.value,
          color: entry.color as string,
        });
        totalExpenses += entry.value;
      }
    });

    const savings = income - totalExpenses;

    return (
      <div className="min-w-[240px] rounded-xl bg-white/95 backdrop-blur-md ring-1 ring-gray-900/5 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.25)] overflow-hidden">
        <div className="px-4 py-2.5 bg-gradient-to-r from-gray-900 to-gray-700">
          <p className="text-xs font-semibold uppercase tracking-wider text-white/90">{label}</p>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-4 pb-2.5 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-green-100"></div>
              <span className="text-xs font-medium text-gray-500">Income</span>
            </div>
            <span className="text-sm font-bold text-green-600 tabular-nums">
              Rs {Number(income).toLocaleString()}
            </span>
          </div>

          {expenseCategories.length > 0 && (
            <>
              <div className="space-y-1.5 pt-1">
                {expenseCategories.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-sm"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-xs text-gray-600">{cat.name}</span>
                    </div>
                    <span className="text-xs font-semibold text-gray-900 tabular-nums">
                      Rs {Number(cat.value).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="pt-2.5 mt-1 border-t border-gray-100 space-y-1">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-gray-500">Total Expenses</span>
                  <span className="text-sm font-bold text-red-600 tabular-nums">
                    Rs {Number(totalExpenses).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-xs font-medium text-gray-500">Savings</span>
                  <span className={`text-sm font-bold tabular-nums ${savings >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {savings >= 0 ? '+' : ''}Rs {Number(savings).toLocaleString()}
                  </span>
                </div>
              </div>
            </>
          )}
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
  if (!payload) return null;

  // Separate Income (line) from expense categories (bars)
  const incomeEntry = payload.find((entry) => entry.dataKey === 'Income');
  const expenseEntries = payload.filter((entry) => entry.dataKey !== 'Income');

  return (
    <div className="flex flex-wrap justify-end items-center gap-x-4 gap-y-2 pr-2 pb-3">
      {incomeEntry && (
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-0.5 bg-green-500 rounded-full"></div>
          <span className="text-xs font-medium text-gray-700">{incomeEntry.value}</span>
        </div>
      )}
      {expenseEntries.map((entry, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <div
            className="w-2.5 h-2.5 rounded-sm"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-gray-600">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function DashboardSummaryChart({ data }: DashboardSummaryChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        No data available. Add transactions to see your financial summary.
      </div>
    );
  }

  // Extract all unique category names (excluding 'month' and 'Income')
  const categoryKeys = new Set<string>();
  data.forEach((item) => {
    Object.keys(item).forEach((key) => {
      if (key !== 'month' && key !== 'Income') {
        categoryKeys.add(key);
      }
    });
  });

  const categories = Array.from(categoryKeys);
  const colorMap: Record<string, string> = {};
  categories.forEach((cat, idx) => {
    colorMap[cat] = CHART_COLORS[idx % CHART_COLORS.length];
  });

  return (
    <ResponsiveContainer width="100%" height={400}>
      <ComposedChart
        data={data}
        margin={{ top: 10, right: 20, left: 10, bottom: 10 }}
      >
        <defs>
          {categories.map((cat) => (
            <linearGradient
              key={cat}
              id={`gradient-${cat}`}
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop offset="0%" stopColor={colorMap[cat]} stopOpacity={0.9} />
              <stop offset="100%" stopColor={colorMap[cat]} stopOpacity={0.6} />
            </linearGradient>
          ))}
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
          tickFormatter={(value) =>
            `Rs ${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toLocaleString()}`
          }
          width={60}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99, 102, 241, 0.06)' }} />
        <Legend content={<CustomLegend />} verticalAlign="top" align="right" height={36} />

        {/* Stacked bars for expense categories */}
        {categories.map((category) => (
          <Bar
            key={category}
            dataKey={category}
            stackId="expenses"
            fill={`url(#gradient-${category})`}
            name={category}
            radius={[0, 0, 0, 0]}
          />
        ))}

        {/* Line for Income */}
        <Line
          type="monotone"
          dataKey="Income"
          stroke="#10b981"
          strokeWidth={3}
          dot={{ fill: '#10b981', r: 4 }}
          activeDot={{ r: 6 }}
          name="Income"
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
