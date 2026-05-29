'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ExpenseBarChartProps {
  data: Array<{ category: string; total: number }>;
}

// Gradient from Dark Red/Orange to Light Orange
const getExpenseColor = (index: number, total: number) => {
  const colors = [
    '#DC2626', // Red-600 (Darkest - Top expense)
    '#EA580C', // Orange-600
    '#F97316', // Orange-500
    '#FB923C', // Orange-400
    '#FDBA74', // Orange-300
    '#FED7AA', // Orange-200
    '#FFEDD5', // Orange-100 (Lightest)
  ];

  // Use darker colors for top expenses, lighter for bottom
  const colorIndex = Math.floor((index / total) * (colors.length - 1));
  return colors[colorIndex] || colors[colors.length - 1];
};

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      category: string;
      total: number;
      percentage: number;
    };
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const total = data.total;
    const percentage = data.percentage || 0;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-gray-900 mb-1">{data.category}</p>
        <p className="text-sm text-gray-600">
          Rs {Number(total).toLocaleString()} ({percentage.toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
};

export function ExpenseBarChart({ data }: ExpenseBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        No expense data available. Add expense transactions to see the breakdown.
      </div>
    );
  }

  // Calculate total and add percentage
  const totalExpenses = data.reduce((sum, item) => sum + item.total, 0);
  const chartData = data.map((item, index) => ({
    ...item,
    name: item.category,
    value: item.total,
    percentage: (item.total / totalExpenses) * 100,
    color: getExpenseColor(index, data.length),
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(400, data.length * 50)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#e5e7eb"
          strokeOpacity={0.5}
          horizontal={true}
          vertical={false}
        />
        <XAxis
          type="number"
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) =>
            `Rs ${value >= 1000 ? (value / 1000).toFixed(1) + 'k' : value.toLocaleString()}`
          }
        />
        <YAxis
          type="category"
          dataKey="category"
          tick={{ fill: '#6b7280', fontSize: 12 }}
          axisLine={false}
          tickLine={false}
          width={120}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar
          dataKey="value"
          radius={[0, 8, 8, 0]}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
