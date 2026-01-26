// ============================================================================
// Department Analytics Chart Component
// Bar chart showing users per department
// ============================================================================

'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface DepartmentAnalyticsChartProps {
  data: Array<{
    department_name: string | null
    total_users: number | null
    active_users: number | null
    hod_count: number | null
    poc_count: number | null
  }>
}

export function DepartmentAnalyticsChart({ data }: DepartmentAnalyticsChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No department data available
      </div>
    )
  }

  const chartData = data.map((dept) => ({
    name: dept.department_name || 'Unknown',
    total: dept.total_users || 0,
    active: dept.active_users || 0,
    inactive: (dept.total_users || 0) - (dept.active_users || 0),
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="active" fill="#22c55e" name="Active Users" />
        <Bar dataKey="inactive" fill="#ef4444" name="Inactive Users" />
      </BarChart>
    </ResponsiveContainer>
  )
}
