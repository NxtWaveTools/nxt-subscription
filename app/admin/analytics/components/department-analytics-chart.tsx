// ============================================================================
// Department Analytics Chart Component
// Bar chart showing users per department
// ============================================================================

'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// Type matches the department_analytics view from Supabase
interface DepartmentAnalyticsChartProps {
  data: Array<{
    id: string | null
    name: string | null
    is_active: boolean | null
    active_user_count: number | null
    hod_count: number | null
    poc_count: number | null
    created_at: string | null
    updated_at: string | null
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
    name: dept.name || 'Unknown',
    activeUsers: dept.active_user_count || 0,
    hodCount: dept.hod_count || 0,
    pocCount: dept.poc_count || 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="activeUsers" fill="#22c55e" name="Active Users" />
        <Bar dataKey="hodCount" fill="#3b82f6" name="HODs" />
        <Bar dataKey="pocCount" fill="#8b5cf6" name="POCs" />
      </BarChart>
    </ResponsiveContainer>
  )
}
