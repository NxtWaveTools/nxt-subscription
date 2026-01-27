// ============================================================================
// Analytics Dashboard Page
// Admin analytics with charts and metrics
// ============================================================================

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DepartmentAnalyticsChart } from './components/department-analytics-chart'
import { RoleDistributionChart } from './components/role-distribution-chart'
import { UserActivityChart } from './components/user-activity-chart'
import { Users, Building2, UserCheck, UserX } from 'lucide-react'
import {
  fetchRoleDistribution,
  fetchUserActivityStats,
  fetchActiveDepartmentCount,
  fetchDepartmentAnalytics,
} from '@/lib/data-access'

export default async function AnalyticsPage() {
  // Use data access layer with database-level aggregation (no in-memory filtering)
  const [roleDistribution, userStats, departmentCount, departmentAnalytics] = await Promise.all([
    fetchRoleDistribution(),
    fetchUserActivityStats(),
    fetchActiveDepartmentCount(),
    fetchDepartmentAnalytics(),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">
          Organization insights and metrics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.activeUsers}</div>
            <p className="text-xs text-muted-foreground">
              {userStats.activePercentage}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
            <UserX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.inactiveUsers}</div>
            <p className="text-xs text-muted-foreground">
              {userStats.totalUsers > 0 
                ? Math.round((userStats.inactiveUsers / userStats.totalUsers) * 100) 
                : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{departmentCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Department Analytics</CardTitle>
            <CardDescription>Users per department</CardDescription>
          </CardHeader>
          <CardContent>
            <DepartmentAnalyticsChart data={departmentAnalytics} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
            <CardDescription>User count by role</CardDescription>
          </CardHeader>
          <CardContent>
            <RoleDistributionChart data={roleDistribution} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Activity Status</CardTitle>
          <CardDescription>Active vs Inactive users</CardDescription>
        </CardHeader>
        <CardContent>
          <UserActivityChart active={userStats.activeUsers} inactive={userStats.inactiveUsers} />
        </CardContent>
      </Card>
    </div>
  )
}
