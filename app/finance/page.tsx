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
} from 'lucide-react'
import { FINANCE_ROUTES } from '@/lib/constants'
import { getSubscriptionCountsByStatus, fetchSubscriptions } from '@/lib/data-access'

export default async function FinanceDashboardPage() {
  // Fetch dashboard data
  const [statusCounts, { subscriptions: recentSubscriptions }] = await Promise.all([
    getSubscriptionCountsByStatus(),
    fetchSubscriptions({}, { page: 1, limit: 5, offset: 0 }),
  ])

  const totalSubscriptions =
    statusCounts.PENDING +
    statusCounts.ACTIVE +
    statusCounts.REJECTED +
    statusCounts.EXPIRED +
    statusCounts.CANCELLED

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
