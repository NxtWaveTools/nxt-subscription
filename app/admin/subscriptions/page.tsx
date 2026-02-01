// ============================================================================
// Subscriptions Page
// Admin page for managing subscriptions with approval workflow
// ============================================================================

import { Suspense } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SubscriptionsTable } from '@/components/subscriptions/subscriptions-table'
import { SubscriptionsFilters } from '@/components/subscriptions/subscriptions-filters'
import { CreateSubscriptionButton } from '@/components/subscriptions/create-subscription-button'
import { fetchSubscriptions, getSubscriptionCountsByStatus, fetchActiveDepartments } from '@/lib/data-access'
import { validatePageParams, calculateTotalPages, clampPage } from '@/lib/utils/pagination'
import {
  ADMIN_ROUTES,
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  BILLING_FREQUENCY,
  REQUEST_TYPES,
  type SubscriptionStatus,
  type PaymentStatus,
  type BillingFrequency,
  type RequestType,
} from '@/lib/constants'

interface SubscriptionsPageProps {
  searchParams: Promise<{
    search?: string
    status?: string
    payment_status?: string
    accounting_status?: string
    billing_frequency?: string
    request_type?: string
    department_id?: string
    page?: string
    limit?: string
  }>
}

export default async function SubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
  const params = await searchParams

  // Validate and normalize pagination params
  const { page, limit, offset } = validatePageParams({
    page: params.page,
    limit: params.limit,
  })

  // Parse filter params with validation
  const search = params.search?.trim().slice(0, 100) || ''
  const status = isValidSubscriptionStatus(params.status) ? params.status : undefined
  const paymentStatus = isValidPaymentStatus(params.payment_status) ? params.payment_status : undefined
  const billingFrequency = isValidBillingFrequency(params.billing_frequency) ? params.billing_frequency : undefined
  const requestType = isValidRequestType(params.request_type) ? params.request_type : undefined
  const departmentId = params.department_id || undefined

  // Fetch data in parallel
  const [{ subscriptions, totalCount }, statusCounts, departments] = await Promise.all([
    fetchSubscriptions(
      {
        search,
        status,
        paymentStatus,
        billingFrequency,
        requestType,
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
            Manage software subscriptions and approval workflows
          </p>
        </div>
        <CreateSubscriptionButton departments={departments} />
      </div>

      {/* Status Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <StatusCard
          label="Pending Approval"
          count={statusCounts.PENDING}
          variant="warning"
        />
        <StatusCard
          label="Active"
          count={statusCounts.ACTIVE}
          variant="success"
        />
        <StatusCard
          label="Rejected"
          count={statusCounts.REJECTED}
          variant="destructive"
        />
        <StatusCard
          label="Expired"
          count={statusCounts.EXPIRED}
          variant="secondary"
        />
        <StatusCard
          label="Cancelled"
          count={statusCounts.CANCELLED}
          variant="secondary"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Subscriptions</CardTitle>
          <CardDescription>
            {totalCount} total subscription{totalCount !== 1 ? 's' : ''}
            {totalPages > 1 && ` • Page ${currentPage} of ${totalPages}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-96" />}>
            <SubscriptionsFilters departments={departments} baseRoute={ADMIN_ROUTES.SUBSCRIPTIONS} />
            <div className="mt-4">
              {subscriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-muted-foreground">No subscriptions found</p>
                  {search && (
                    <p className="text-sm text-muted-foreground mt-1">
                      Try adjusting your search or filters
                    </p>
                  )}
                </div>
              ) : (
                <SubscriptionsTable
                  subscriptions={subscriptions}
                  totalCount={totalCount}
                  pageSize={limit}
                  currentPage={currentPage}
                  baseRoute={ADMIN_ROUTES.SUBSCRIPTIONS}
                  userRole="ADMIN"
                />
              )}
            </div>
          </Suspense>
        </CardContent>
      </Card>
    </div>
  )
}

// ============================================================================
// Helper Components
// ============================================================================

interface StatusCardProps {
  label: string
  count: number
  variant: 'success' | 'warning' | 'destructive' | 'secondary'
}

function StatusCard({ label, count, variant }: StatusCardProps) {
  const variantStyles = {
    success: 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900',
    warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900',
    destructive: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900',
    secondary: 'bg-gray-50 border-gray-200 dark:bg-gray-950/20 dark:border-gray-800',
  }

  return (
    <Card className={`${variantStyles[variant]} border`}>
      <CardContent className="p-4">
        <div className="text-sm font-medium text-muted-foreground">{label}</div>
        <div className="text-2xl font-bold">{count}</div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Validation Helpers
// ============================================================================

function isValidSubscriptionStatus(value: string | undefined): value is SubscriptionStatus {
  return value !== undefined && Object.values(SUBSCRIPTION_STATUS).includes(value as SubscriptionStatus)
}

function isValidPaymentStatus(value: string | undefined): value is PaymentStatus {
  return value !== undefined && Object.values(PAYMENT_STATUS).includes(value as PaymentStatus)
}

function isValidBillingFrequency(value: string | undefined): value is BillingFrequency {
  return value !== undefined && Object.values(BILLING_FREQUENCY).includes(value as BillingFrequency)
}

function isValidRequestType(value: string | undefined): value is RequestType {
  return value !== undefined && Object.values(REQUEST_TYPES).includes(value as RequestType)
}
