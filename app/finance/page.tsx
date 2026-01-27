// ============================================================================
// Finance Dashboard
// Dashboard for FINANCE role - create and manage subscriptions
// ============================================================================

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CreditCard,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  RefreshCcw,
  FileText,
} from 'lucide-react'
import { FINANCE_ROUTES } from '@/lib/constants'
import {
  getSubscriptionCountsByStatus,
  fetchSubscriptions,
  getPaymentCycleCountsByStatus,
  getPaymentsPendingFinanceAction,
  getRecentPaymentCycles,
} from '@/lib/data-access'

export default async function FinanceDashboardPage() {
  // Fetch dashboard data
  const [
    statusCounts,
    { subscriptions: recentSubscriptions },
    paymentCycleCounts,
    pendingPayments,
    recentCycles,
  ] = await Promise.all([
    getSubscriptionCountsByStatus(),
    fetchSubscriptions({}, { page: 1, limit: 5, offset: 0 }),
    getPaymentCycleCountsByStatus(),
    getPaymentsPendingFinanceAction(),
    getRecentPaymentCycles(5),
  ])

  const totalSubscriptions =
    statusCounts.PENDING +
    statusCounts.ACTIVE +
    statusCounts.REJECTED +
    statusCounts.EXPIRED +
    statusCounts.CANCELLED

  const totalPaymentCycles =
    paymentCycleCounts.PENDING_PAYMENT +
    paymentCycleCounts.PAYMENT_RECORDED +
    paymentCycleCounts.PENDING_APPROVAL +
    paymentCycleCounts.APPROVED +
    paymentCycleCounts.REJECTED +
    paymentCycleCounts.INVOICE_UPLOADED +
    paymentCycleCounts.COMPLETED +
    paymentCycleCounts.CANCELLED

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Finance Dashboard</h1>
          <p className="text-muted-foreground">
            Create and manage subscriptions across all departments
          </p>
        </div>
        <Link href={FINANCE_ROUTES.SUBSCRIPTIONS}>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Subscription
          </Button>
        </Link>
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
            <p className="text-xs text-muted-foreground">Rejected by POC</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statusCounts.EXPIRED + statusCounts.CANCELLED}</div>
            <p className="text-xs text-muted-foreground">Expired/Cancelled</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Cycles Action Required */}
      {pendingPayments > 0 && (
        <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/10">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <AlertCircle className="h-5 w-5" />
              Action Required: {pendingPayments} Payment{pendingPayments !== 1 ? 's' : ''} Pending
            </CardTitle>
            <CardDescription className="text-orange-700 dark:text-orange-300">
              These payment cycles are waiting for you to record payment details.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Payment Cycles Stats */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Payment Cycles Overview</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cycles</CardTitle>
              <RefreshCcw className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPaymentCycles}</div>
              <p className="text-xs text-muted-foreground">All payment cycles</p>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-blue-50/50 dark:bg-blue-950/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payment</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paymentCycleCounts.PENDING_PAYMENT}</div>
              <p className="text-xs text-muted-foreground">Awaiting payment recording</p>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50/50 dark:bg-purple-950/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Awaiting POC</CardTitle>
              <FileText className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {paymentCycleCounts.PAYMENT_RECORDED + paymentCycleCounts.PENDING_APPROVAL}
              </div>
              <p className="text-xs text-muted-foreground">Approval/invoice pending</p>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50 dark:bg-green-950/10">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{paymentCycleCounts.COMPLETED}</div>
              <p className="text-xs text-muted-foreground">Successfully completed</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Payment Cycles */}
      {recentCycles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Payment Cycles</CardTitle>
            <CardDescription>Latest billing cycle activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCycles.map((cycle) => (
                <div
                  key={cycle.id}
                  className="flex items-center justify-between p-3 border rounded-lg text-sm"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-medium">
                      {cycle.cycle_number}
                    </div>
                    <div>
                      <p className="font-medium">Cycle #{cycle.cycle_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(cycle.cycle_start_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })} — {new Date(cycle.cycle_end_date).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      cycle.cycle_status === 'COMPLETED'
                        ? 'default'
                        : cycle.cycle_status === 'CANCELLED'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {cycle.cycle_status.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Subscriptions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Subscriptions</CardTitle>
            <CardDescription>Latest subscription requests</CardDescription>
          </div>
          <Link href={FINANCE_ROUTES.SUBSCRIPTIONS}>
            <Button variant="outline" size="sm">
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentSubscriptions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No subscriptions yet. Create your first subscription to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {recentSubscriptions.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div>
                    <Link
                      href={`${FINANCE_ROUTES.SUBSCRIPTIONS}/${sub.id}`}
                      className="font-medium hover:underline"
                    >
                      {sub.tool_name}
                    </Link>
                    <div className="text-sm text-muted-foreground">
                      {sub.tool_name} • {sub.departments?.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: sub.currency,
                        }).format(sub.amount)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {sub.billing_frequency}
                      </div>
                    </div>
                    <Badge
                      variant={
                        sub.status === 'ACTIVE'
                          ? 'default'
                          : sub.status === 'PENDING'
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {sub.status}
                    </Badge>
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
