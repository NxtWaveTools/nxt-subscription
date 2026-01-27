// ============================================================================
// POC Dashboard
// Dashboard for POC role - approve/reject subscriptions for their departments
// ============================================================================

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ClipboardCheck,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/user'
import { createClient } from '@/lib/supabase/server'
import { PendingApprovalsList } from './components/pending-approvals-list'

export default async function POCDashboardPage() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  // Get POC's departments
  const { data: pocDepartments } = await supabase
    .from('poc_department_access')
    .select(`
      department_id,
      departments:department_id (
        id,
        name
      )
    `)
    .eq('poc_id', user!.id)

  const departmentIds = pocDepartments?.map((d) => d.department_id) || []

  // If POC has no departments assigned, show empty state
  if (departmentIds.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">POC Dashboard</h1>
          <p className="text-muted-foreground">
            Approve and manage subscriptions for your departments
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Departments Assigned</p>
            <p className="text-sm text-muted-foreground mt-1">
              You have not been assigned as POC for any department yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch subscription counts for POC's departments
  const { data: subscriptionCounts } = await supabase
    .from('subscriptions')
    .select('status')
    .in('department_id', departmentIds)

  const statusCounts = {
    PENDING: 0,
    ACTIVE: 0,
    REJECTED: 0,
    EXPIRED: 0,
    CANCELLED: 0,
  }

  subscriptionCounts?.forEach((sub) => {
    if (sub.status in statusCounts) {
      statusCounts[sub.status as keyof typeof statusCounts]++
    }
  })

  // Fetch pending subscriptions for approval
  const { data: pendingSubscriptions } = await supabase
    .from('subscriptions')
    .select(`
      id,
      tool_name,
      vendor_name,
      amount,
      currency,
      billing_frequency,
      status,
      created_at,
      departments:department_id (
        id,
        name
      ),
      creator:created_by (
        id,
        name,
        email
      )
    `)
    .in('department_id', departmentIds)
    .eq('status', 'PENDING')
    .order('created_at', { ascending: false })
    .limit(10)

  const departments = pocDepartments?.map((d) => d.departments).filter(Boolean) || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">POC Dashboard</h1>
        <p className="text-muted-foreground">
          Approve and manage subscriptions for your departments
        </p>
      </div>

      {/* Departments Badge */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium">Your Departments:</span>
        {departments.map((dept: { id: string; name: string } | null) => (
          dept && (
            <Badge key={dept.id} variant="outline">
              <Building2 className="h-3 w-3 mr-1" />
              {dept.name}
            </Badge>
          )
        ))}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.PENDING}</div>
            <p className="text-xs text-muted-foreground">Requires your action</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.ACTIVE}</div>
            <p className="text-xs text-muted-foreground">Approved subscriptions</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.REJECTED}</div>
            <p className="text-xs text-muted-foreground">Rejected by you</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Other</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statusCounts.EXPIRED + statusCounts.CANCELLED}
            </div>
            <p className="text-xs text-muted-foreground">Expired/Cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" />
            Pending Approvals
          </CardTitle>
          <CardDescription>
            {statusCounts.PENDING === 0
              ? 'No subscriptions waiting for your approval'
              : `${statusCounts.PENDING} subscription${statusCounts.PENDING !== 1 ? 's' : ''} waiting for your approval`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PendingApprovalsList subscriptions={pendingSubscriptions || []} />
        </CardContent>
      </Card>
    </div>
  )
}
