// ============================================================================
// Admin Dashboard Page
// ============================================================================

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Building2, UserCheck, BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { ADMIN_ROUTES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = await createClient()

  // Fetch quick stats
  const [usersResult, departmentsResult, activeUsersResult] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('departments').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const stats = {
    totalUsers: usersResult.count || 0,
    totalDepartments: departmentsResult.count || 0,
    activeUsers: activeUsersResult.count || 0,
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage users, departments, and view analytics
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href={ADMIN_ROUTES.USERS}>
          <Card className="transition-colors hover:bg-accent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">All registered users</p>
            </CardContent>
          </Card>
        </Link>

        <Link href={ADMIN_ROUTES.USERS}>
          <Card className="transition-colors hover:bg-accent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Users</CardTitle>
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeUsers}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((stats.activeUsers / stats.totalUsers) * 100) || 0}% of total
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={ADMIN_ROUTES.DEPARTMENTS}>
          <Card className="transition-colors hover:bg-accent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departments</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalDepartments}</div>
              <p className="text-xs text-muted-foreground">Active departments</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administrative tasks</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Link
            href={ADMIN_ROUTES.USERS}
            className="flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-accent"
          >
            <Users className="h-4 w-4" />
            <span className="font-medium">Manage Users</span>
          </Link>
          <Link
            href={ADMIN_ROUTES.DEPARTMENTS}
            className="flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-accent"
          >
            <Building2 className="h-4 w-4" />
            <span className="font-medium">Manage Departments</span>
          </Link>
          <Link
            href={ADMIN_ROUTES.ANALYTICS}
            className="flex items-center gap-2 rounded-lg border p-3 transition-colors hover:bg-accent"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="font-medium">View Analytics</span>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
