'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { LogOut, User, Mail, Calendar, Shield } from 'lucide-react'
import { useAuth } from '@/lib/hooks/use-auth'
import type { UserWithRoles, RoleName } from '@/lib/types'
import { ROLES } from '@/lib/constants'

interface DashboardContentProps {
  user: UserWithRoles
  roles: RoleName[]
}

export function DashboardContent({ user, roles }: DashboardContentProps) {
  const { signOut, loading } = useAuth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {user.name || 'User'}!</p>
          </div>
          <Button variant="outline" onClick={signOut} disabled={loading}>
            {loading ? (
              <div className="flex items-center gap-2">
                <Spinner size="sm" />
                <span>Signing out...</span>
              </div>
            ) : (
              <>
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </>
            )}
          </Button>
        </div>

        {/* User Profile Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>Your account details and role assignments</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="h-4 w-4" />
                  <span>Name</span>
                </div>
                <p className="font-medium">{user.name || 'Not set'}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span>Email</span>
                </div>
                <p className="font-medium">{user.email}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Member Since</span>
                </div>
                <p className="font-medium">
                  {new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Roles</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {roles.length > 0 ? (
                    roles.map((role) => (
                      <Badge key={role} variant="secondary">
                        {role}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline">No roles assigned</Badge>
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    user.is_active ? 'bg-green-500' : 'bg-red-500'
                  }`}
                />
                <span className="text-sm">
                  Account Status:{' '}
                  <span className="font-medium">
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Role-based Content */}
        {roles.includes(ROLES.ADMIN) && (
          <Card>
            <CardHeader>
              <CardTitle>Admin Panel</CardTitle>
              <CardDescription>Manage users and system settings</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Admin features coming soon...</p>
            </CardContent>
          </Card>
        )}

        {roles.includes(ROLES.FINANCE) && (
          <Card>
            <CardHeader>
              <CardTitle>Finance Dashboard</CardTitle>
              <CardDescription>View financial reports and analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Finance features coming soon...</p>
            </CardContent>
          </Card>
        )}

        {roles.includes(ROLES.HOD) && (
          <Card>
            <CardHeader>
              <CardTitle>Department Management</CardTitle>
              <CardDescription>Manage your departments</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">HOD features coming soon...</p>
            </CardContent>
          </Card>
        )}

        {roles.includes(ROLES.POC) && (
          <Card>
            <CardHeader>
              <CardTitle>POC Dashboard</CardTitle>
              <CardDescription>Manage assigned departments</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">POC features coming soon...</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
