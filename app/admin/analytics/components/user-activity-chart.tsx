// ============================================================================
// User Activity Chart Component
// Bar chart showing active vs inactive users
// ============================================================================

'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface UserActivityChartProps {
  active: number
  inactive: number
}

export function UserActivityChart({ active, inactive }: UserActivityChartProps) {
  const data = [
    {
      name: 'User Status',
      active,
      inactive,
    },
  ]

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
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
