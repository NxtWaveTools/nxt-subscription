// ============================================================================
// Role Distribution Chart Component
// Pie chart showing user count by role
// ============================================================================

'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface RoleDistributionChartProps {
  data: Record<string, number>
}

const COLORS = {
  ADMIN: '#ef4444',
  FINANCE: '#3b82f6',
  HOD: '#8b5cf6',
  POC: '#10b981',
}

export function RoleDistributionChart({ data }: RoleDistributionChartProps) {
  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No role data available
      </div>
    )
  }

  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name}: ${percent ? (percent * 100).toFixed(0) : 0}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[entry.name as keyof typeof COLORS] || '#6b7280'}
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
