// ============================================================================
// Analytics Dashboard Page
// Admin analytics with charts and metrics
// ============================================================================

import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { DepartmentAnalyticsChart } from './components/department-analytics-chart'
import { RoleDistributionChart } from './components/role-distribution-chart'
import { UserActivityChart } from './components/user-activity-chart'
import { Users, Building2, UserCheck, UserX } from 'lucide-react'

export default async function AnalyticsPage() {
  const supabase = await createClient()

  // Fetch department analytics - simplified approach
  const { data: departments } = await supabase
    .from('departments')
    .select('id, name, is_active')
    .eq('is_active', true)

  // Calculate stats for each department
  const departmentAnalytics = await Promise.all(
    (departments || []).map(async (dept) => {
      const { count: hodCount } = await supabase
        .from('hod_departments')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', dept.id)

      const { count: pocCount } = await supabase
        .from('poc_department_access')
        .select('*', { count: 'exact', head: true })
        .eq('department_id', dept.id)

      return {
        department_name: dept.name,
        total_users: (hodCount || 0) + (pocCount || 0),
        active_users: (hodCount || 0) + (pocCount || 0),
        hod_count: hodCount || 0,
        poc_count: pocCount || 0,
      }
    })
  )

  // Fetch role distribution
  const { data: roleStats } = await supabase
    .from('user_roles')
    .select(`
      role_id,
      roles!inner(name)
    `)

  // Count roles
  const roleCounts = roleStats?.reduce((acc: any, ur: any) => {
    const roleName = ur.roles.name
    acc[roleName] = (acc[roleName] || 0) + 1
    return acc
  }, {})

  // Fetch overall stats
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  const { count: activeUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const { count: totalDepartments } = await supabase
    .from('departments')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)

  const inactiveUsers = (totalUsers || 0) - (activeUsers || 0)

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
            <div className="text-2xl font-bold">{totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              {totalUsers ? Math.round(((activeUsers || 0) / totalUsers) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
            <UserX className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{inactiveUsers}</div>
            <p className="text-xs text-muted-foreground">
              {totalUsers ? Math.round((inactiveUsers / totalUsers) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Departments</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDepartments || 0}</div>
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
            <Suspense fallback={<Skeleton className="h-[300px]" />}>
              <DepartmentAnalyticsChart data={departmentAnalytics || []} />
            </Suspense>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Distribution</CardTitle>
            <CardDescription>User count by role</CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<Skeleton className="h-[300px]" />}>
              <RoleDistributionChart data={roleCounts || {}} />
            </Suspense>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Activity Status</CardTitle>
          <CardDescription>Active vs Inactive users</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-[300px]" />}>
            <UserActivityChart active={activeUsers || 0} inactive={inactiveUsers} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}
