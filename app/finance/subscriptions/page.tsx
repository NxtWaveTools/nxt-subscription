// ============================================================================
// Finance Subscriptions Page
// Page for FINANCE role to manage subscriptions
// ============================================================================

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SubscriptionsTable } from '@/components/subscriptions/subscriptions-table'
import { SubscriptionsFilters } from '@/components/subscriptions/subscriptions-filters'
import { CreateSubscriptionButton } from '@/components/subscriptions/create-subscription-button'
import { fetchSubscriptions, getSubscriptionCountsByStatus, fetchActiveDepartments } from '@/lib/data-access'
import { validatePageParams, calculateTotalPages, clampPage } from '@/lib/utils/pagination'
import {
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  BILLING_FREQUENCY,
  FINANCE_ROUTES,
  type SubscriptionStatus,
  type PaymentStatus,
  type BillingFrequency,
} from '@/lib/constants'

interface SubscriptionsPageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    payment_status?: string
    billing_frequency?: string
    department_id?: string
    page?: string
    limit?: string
  }>
}

// Validation helpers
function isValidSubscriptionStatus(value?: string): value is SubscriptionStatus {
  return value !== undefined && Object.values(SUBSCRIPTION_STATUS).includes(value as SubscriptionStatus)
}

function isValidPaymentStatus(value?: string): value is PaymentStatus {
  return value !== undefined && Object.values(PAYMENT_STATUS).includes(value as PaymentStatus)
}

function isValidBillingFrequency(value?: string): value is BillingFrequency {
  return value !== undefined && Object.values(BILLING_FREQUENCY).includes(value as BillingFrequency)
}

export default async function FinanceSubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
  const params = await searchParams

  // Validate and normalize pagination params
  const { page, limit, offset } = validatePageParams({
    page: params.page,
    limit: params.limit,
  })

  // Parse filter params
  const search = params.search?.trim().slice(0, 100) || ''
  const status = isValidSubscriptionStatus(params.status) ? params.status : undefined
  const paymentStatus = isValidPaymentStatus(params.payment_status) ? params.payment_status : undefined
  const billingFrequency = isValidBillingFrequency(params.billing_frequency) ? params.billing_frequency : undefined
  const departmentId = params.department_id || undefined

  // Fetch data in parallel
  const [{ subscriptions, totalCount }, statusCounts, departments] = await Promise.all([
    fetchSubscriptions(
      {
        search,
        status,
        paymentStatus,
        billingFrequency,
        departmentId,
      },
      { page, limit, offset }
    ),
    getSubscriptionCountsByStatus(),
    fetchActiveDepartments(),
  ])

  const totalPages = calculateTotalPages(totalCount, limit)
  const currentPage = clampPage(page, totalPages)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground">
            Create and manage software subscriptions
          </p>
        </div>
        <CreateSubscriptionButton departments={departments} />
      </div>

      {/* Status Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatusCard
          title="Total"
          count={
            statusCounts.PENDING +
            statusCounts.ACTIVE +
            statusCounts.REJECTED +
            statusCounts.EXPIRED +
            statusCounts.CANCELLED
          }
          variant="default"
        />
        <StatusCard
          title="Pending"
          count={statusCounts.PENDING}
          variant="warning"
        />
        <StatusCard
          title="Active"
          count={statusCounts.ACTIVE}
          variant="success"
        />
        <StatusCard
          title="Rejected"
          count={statusCounts.REJECTED}
          variant="destructive"
        />
        <StatusCard
          title="Expired/Cancelled"
          count={statusCounts.EXPIRED + statusCounts.CANCELLED}
          variant="secondary"
        />
      </div>

      {/* Filters */}
      <SubscriptionsFilters
        departments={departments}
        baseRoute={FINANCE_ROUTES.SUBSCRIPTIONS}
      />

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
          <CardDescription>
            {totalCount} subscription{totalCount !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriptionsTable
            subscriptions={subscriptions}
            totalCount={totalCount}
            pageSize={limit}
            currentPage={currentPage}
            baseRoute={FINANCE_ROUTES.SUBSCRIPTIONS}
            userRole="FINANCE"
          />
        </CardContent>
      </Card>
    </div>
  )
}

// Status Card Component
function StatusCard({
  title,
  count,
  variant,
}: {
  title: string
  count: number
  variant: 'default' | 'warning' | 'success' | 'destructive' | 'secondary'
}) {
  const variantStyles = {
    default: '',
    warning: 'border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/10',
    success: 'border-green-200 bg-green-50/50 dark:bg-green-950/10',
    destructive: 'border-red-200 bg-red-50/50 dark:bg-red-950/10',
    secondary: '',
  }

  return (
    <Card className={variantStyles[variant]}>
      <CardHeader className="pb-2">
        <CardDescription>{title}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
      </CardContent>
    </Card>
  )
}
