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
  FileText,
  RefreshCcw,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/user'
import { createClient } from '@/lib/supabase/server'
import { PendingApprovalsList } from './components/pending-approvals-list'
import { PendingRenewalsList } from './components/pending-renewals-list'
import { PendingInvoicesList } from './components/pending-invoices-list'
import {
  fetchPendingApprovalsForPOC,
  fetchPendingInvoiceUploadsForPOC,
  fetchOverdueInvoices,
} from '@/lib/data-access'

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

  // Fetch payment cycle data for POC
  const [pendingRenewals, pendingInvoices, overdueInvoices] = await Promise.all([
    fetchPendingApprovalsForPOC(departmentIds),
    fetchPendingInvoiceUploadsForPOC(departmentIds),
    fetchOverdueInvoices(departmentIds),
  ])

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

      {/* Payment Cycles Section */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <RefreshCcw className="h-5 w-5" />
          Payment Cycles
        </h2>

        {/* Payment Cycle Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className={pendingRenewals.length > 0 ? 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/10' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Renewals</CardTitle>
              <Clock className={`h-4 w-4 ${pendingRenewals.length > 0 ? 'text-blue-600' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingRenewals.length}</div>
              <p className="text-xs text-muted-foreground">Cycles needing approval</p>
            </CardContent>
          </Card>

          <Card className={pendingInvoices.length > 0 ? 'border-purple-200 bg-purple-50/50 dark:bg-purple-950/10' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
              <FileText className={`h-4 w-4 ${pendingInvoices.length > 0 ? 'text-purple-600' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingInvoices.length}</div>
              <p className="text-xs text-muted-foreground">Awaiting invoice upload</p>
            </CardContent>
          </Card>

          <Card className={overdueInvoices.length > 0 ? 'border-red-200 bg-red-50/50 dark:bg-red-950/10' : ''}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
              <AlertCircle className={`h-4 w-4 ${overdueInvoices.length > 0 ? 'text-red-600' : 'text-muted-foreground'}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overdueInvoices.length}</div>
              <p className="text-xs text-muted-foreground">Past deadline</p>
            </CardContent>
          </Card>
        </div>

        {/* Overdue Invoices Alert */}
        {overdueInvoices.length > 0 && (
          <Card className="border-red-300 bg-red-50 dark:bg-red-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-red-800 dark:text-red-200">
                <AlertCircle className="h-5 w-5" />
                Urgent: {overdueInvoices.length} Overdue Invoice{overdueInvoices.length !== 1 ? 's' : ''}
              </CardTitle>
              <CardDescription className="text-red-700 dark:text-red-300">
                These payment cycles have passed their invoice deadline. Upload invoices immediately to prevent automatic cancellation.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Pending Renewals Section */}
        {pendingRenewals.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Renewal Approvals
              </CardTitle>
              <CardDescription>
                Review and approve these renewals before the cycle ends
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PendingRenewalsList paymentCycles={pendingRenewals} />
            </CardContent>
          </Card>
        )}

        {/* Pending Invoice Uploads Section */}
        {pendingInvoices.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Pending Invoice Uploads
              </CardTitle>
              <CardDescription>
                Upload invoices for these payment cycles
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PendingInvoicesList paymentCycles={pendingInvoices} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
