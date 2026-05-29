'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface IncomeDonutChartProps {
  data: Array<{ category: string; total: number }>;
  onCategoryClick?: (category: string | null) => void;
  selectedCategory?: string | null;
}

// Green and Teal shades for income
const INCOME_COLORS = [
  '#10B981', // Green-500
  '#059669', // Green-600
  '#047857', // Green-700
  '#06B6D4', // Cyan-500
  '#0891B2', // Cyan-600
  '#0E7490', // Cyan-700
  '#34D399', // Emerald-400
  '#6EE7B7', // Emerald-300
  '#A7F3D0', // Emerald-200
];

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    payload: {
      category: string;
      total: number;
      percentage: number;
    };
    name: string;
  }>;
}

const CustomTooltip = ({ active, payload }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const total = data.payload.total;
    const percentage = data.payload.percentage || 0;

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-semibold text-gray-900 mb-1">{data.name}</p>
        <p className="text-sm text-gray-600">
          Rs {Number(total).toLocaleString()} ({percentage.toFixed(1)}%)
        </p>
      </div>
    );
  }
  return null;
};

const CustomLabel = (props: unknown) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props as {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
  };
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Only show label if segment is > 5%
  if (percent < 0.05) return null;

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      className="text-xs font-bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export function IncomeDonutChart({ data, onCategoryClick, selectedCategory }: IncomeDonutChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        No income data available. Add income transactions to see the distribution.
      </div>
    );
  }

  // Calculate total and add percentage
  const totalIncome = data.reduce((sum, item) => sum + item.total, 0);

  const formatCompact = (n: number) => {
    if (n >= 1_00_00_000) return `${(n / 1_00_00_000).toFixed(2)} Cr`;
    if (n >= 1_00_000) return `${(n / 1_00_000).toFixed(2)} L`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return n.toLocaleString();
  };

  const chartData = data.map((item, index) => ({
    ...item,
    name: item.category,
    value: item.total,
    percentage: (item.total / totalIncome) * 100,
    color: INCOME_COLORS[index % INCOME_COLORS.length],
  }));

  return (
    <div className="relative">
      <ResponsiveContainer width="100%" height={400}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={CustomLabel}
            outerRadius={120}
            innerRadius={80}
            fill="#8884d8"
            dataKey="value"
            onClick={(data, index) => {
              if (onCategoryClick) {
                const clickedCategory = chartData[index]?.category;
                if (selectedCategory === clickedCategory) {
                  onCategoryClick(null); // Deselect if clicking same category
                } else {
                  onCategoryClick(clickedCategory);
                }
              }
            }}
            style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.color}
                opacity={selectedCategory && selectedCategory !== entry.category ? 0.3 : 1}
                stroke={selectedCategory === entry.category ? '#059669' : 'none'}
                strokeWidth={selectedCategory === entry.category ? 3 : 0}
              />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-sm text-gray-600">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Center Label */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center px-4 max-w-[140px]">
          <p className="text-xs text-gray-500 mb-1">Total Income</p>
          <p
            className="font-bold text-gray-900 leading-tight break-words"
            style={{ fontSize: 'clamp(0.875rem, 2.2vw, 1.25rem)' }}
            title={`Rs ${totalIncome.toLocaleString()}`}
          >
            Rs {formatCompact(totalIncome)}
          </p>
        </div>
      </div>
    </div>
  );
}
