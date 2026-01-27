// ============================================================================
// HOD Dashboard
// Dashboard for HOD role - view-only access to department subscriptions
// ============================================================================

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  CreditCard,
  Calendar,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/user'
import { createClient } from '@/lib/supabase/server'

export default async function HODDashboardPage() {
  const user = await getCurrentUser()
  const supabase = await createClient()

  // Get HOD's departments from hod_departments table
  const { data: hodDepartments } = await supabase
    .from('hod_departments')
    .select(`
      department_id,
      departments:department_id (
        id,
        name
      )
    `)
    .eq('hod_id', user!.id)

  const departmentIds = hodDepartments?.map((d) => d.department_id) || []

  // If HOD has no departments assigned, show empty state
  if (departmentIds.length === 0) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">HOD Dashboard</h1>
          <p className="text-muted-foreground">
            View subscriptions for your department
          </p>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Department Assigned</p>
            <p className="text-sm text-muted-foreground mt-1">
              You have not been assigned as HOD for any department yet.
            </p>
            <p className="text-sm text-muted-foreground">
              Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Fetch subscriptions for HOD's departments
  const { data: subscriptions } = await supabase
    .from('subscriptions')
    .select(`
      id,
      tool_name,
      tool_name,
      vendor_name,
      amount,
      currency,
      billing_frequency,
      status,
      payment_status,
      start_date,
      end_date,
      created_at,
      departments:department_id (
        id,
        name
      )
    `)
    .in('department_id', departmentIds)
    .order('created_at', { ascending: false })
    .limit(20)

  // Calculate status counts
  const statusCounts = {
    PENDING: 0,
    ACTIVE: 0,
    REJECTED: 0,
    EXPIRED: 0,
    CANCELLED: 0,
  }

  subscriptions?.forEach((sub) => {
    if (sub.status in statusCounts) {
      statusCounts[sub.status as keyof typeof statusCounts]++
    }
  })

  const totalSubscriptions = subscriptions?.length || 0

  // Calculate total monthly spend (simplified - just active subscriptions)
  const activeSubscriptions = subscriptions?.filter((s) => s.status === 'ACTIVE') || []
  const totalSpend = activeSubscriptions.reduce((sum, sub) => {
    // Normalize to monthly
    let monthlyAmount = sub.amount
    if (sub.billing_frequency === 'QUARTERLY') monthlyAmount = sub.amount / 3
    if (sub.billing_frequency === 'YEARLY') monthlyAmount = sub.amount / 12
    return sum + monthlyAmount
  }, 0)

  const formatCurrency = (amount: number, currency: string = 'INR') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'ACTIVE': return 'default'
      case 'PENDING': return 'secondary'
      case 'REJECTED':
      case 'CANCELLED': return 'destructive'
      default: return 'outline'
    }
  }

  const statusLabels: Record<string, string> = {
    PENDING: 'Pending',
    ACTIVE: 'Active',
    REJECTED: 'Rejected',
    EXPIRED: 'Expired',
    CANCELLED: 'Cancelled',
  }

  const billingLabels: Record<string, string> = {
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly',
    USAGE_BASED: 'Usage Based',
  }

  const departments = hodDepartments?.map((d) => d.departments).filter(Boolean) || []

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">HOD Dashboard</h1>
        <p className="text-muted-foreground">
          View subscriptions for your department (read-only access)
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
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubscriptions}</div>
            <p className="text-xs text-muted-foreground">All subscriptions</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.PENDING}</div>
            <p className="text-xs text-muted-foreground">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.ACTIVE}</div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50/50 dark:bg-red-950/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.REJECTED}</div>
            <p className="text-xs text-muted-foreground">Rejected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalSpend)}</div>
            <p className="text-xs text-muted-foreground">Estimated</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Department Subscriptions
          </CardTitle>
          <CardDescription>
            All subscriptions for your department (view only)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-medium">No Subscriptions Yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Your department has no subscriptions at the moment.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptions?.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{sub.tool_name}</span>
                      <Badge variant={getStatusBadgeVariant(sub.status)}>
                        {statusLabels[sub.status] || sub.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{sub.tool_name}</span>
                      <span>•</span>
                      <span>{sub.vendor_name}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(sub.start_date)}
                        {sub.end_date && ` - ${formatDate(sub.end_date)}`}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-medium">
                      {formatCurrency(sub.amount, sub.currency)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {billingLabels[sub.billing_frequency] || sub.billing_frequency}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
