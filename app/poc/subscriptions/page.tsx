// ============================================================================
// POC Subscriptions Page
// Approve/reject subscriptions for assigned departments
// ============================================================================

import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { SubscriptionsTable } from '@/components/subscriptions/subscriptions-table'
import { SubscriptionsFilters } from '@/components/subscriptions/subscriptions-filters'
import { fetchSubscriptions, getSubscriptionCountsByStatus, fetchActiveDepartments, getPaymentCycleCountsForDepartments } from '@/lib/data-access'
import { validatePageParams, calculateTotalPages, clampPage } from '@/lib/utils/pagination'
import { getCurrentUser } from '@/lib/auth/user'
import { createClient } from '@/lib/supabase/server'
import {
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  BILLING_FREQUENCY,
  POC_ROUTES,
  type SubscriptionStatus,
  type PaymentStatus,
  type BillingFrequency,
} from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle2, XCircle, AlertCircle, FileCheck } from 'lucide-react'

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

// Status Card Component
function StatusCard({
  title,
  count,
  variant,
  icon: Icon,
}: {
  title: string
  count: number
  variant?: 'default' | 'warning' | 'success' | 'destructive'
  icon: React.ElementType
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{count}</div>
      </CardContent>
    </Card>
  )
}

export default async function POCSubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
  const params = await searchParams
  const user = await getCurrentUser()
  const supabase = await createClient()

  // Get POC's departments
  const { data: pocDepartments } = await supabase
    .from('poc_department_access')
    .select('department_id')
    .eq('poc_id', user!.id)

  const pocDepartmentIds = pocDepartments?.map((d) => d.department_id) || []

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

  // Fetch data in parallel - filter by POC's departments
  const [{ subscriptions, totalCount }, statusCounts, departments, paymentCycleCounts] = await Promise.all([
    fetchSubscriptions(
      {
        search,
        status,
        paymentStatus,
        billingFrequency,
        departmentId,
      },
      { page, limit, offset },
      pocDepartmentIds // Filter by POC's departments
    ),
    getSubscriptionCountsByStatus(pocDepartmentIds),
    fetchActiveDepartments(),
    getPaymentCycleCountsForDepartments(pocDepartmentIds),
  ])

  const totalPages = calculateTotalPages(totalCount, limit)
  const currentPage = clampPage(page, totalPages)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground">
            Review and approve payment cycles for your departments
          </p>
        </div>
      </div>

      {/* Pending Approval Alert */}
      {paymentCycleCounts.PENDING > 0 && (
        <Card className="border-yellow-300 bg-yellow-50/50 dark:border-yellow-700 dark:bg-yellow-950/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-yellow-100 p-2 dark:bg-yellow-900">
                  <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="font-semibold text-yellow-800 dark:text-yellow-200">
                    {paymentCycleCounts.PENDING} Payment Cycle{paymentCycleCounts.PENDING > 1 ? 's' : ''} Pending Your Approval
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    Click on a subscription below to view and approve/decline renewal cycles
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Cycle Status Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatusCard
          title="Cycles Pending Approval"
          count={paymentCycleCounts.PENDING}
          variant="warning"
          icon={Clock}
        />
        <StatusCard
          title="Cycles Approved"
          count={paymentCycleCounts.APPROVED}
          variant="success"
          icon={CheckCircle2}
        />
        <StatusCard
          title="Cycles Paid"
          count={paymentCycleCounts.PAID}
          variant="success"
          icon={FileCheck}
        />
        <StatusCard
          title="Cycles Declined"
          count={paymentCycleCounts.DECLINED}
          variant="destructive"
          icon={XCircle}
        />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Subscriptions</CardTitle>
              <CardDescription>
                {totalCount} subscription{totalCount !== 1 ? 's' : ''} found — Click on a subscription to view payment cycles and approve/decline
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SubscriptionsFilters
            departments={departments.filter(d => pocDepartmentIds.includes(d.id))}
            baseRoute={POC_ROUTES.SUBSCRIPTIONS}
          />
          <SubscriptionsTable 
            subscriptions={subscriptions} 
            totalCount={totalCount}
            pageSize={limit}
            currentPage={currentPage}
            baseRoute={POC_ROUTES.SUBSCRIPTIONS}
            readOnly={true}
          />
        </CardContent>
      </Card>
    </div>
  )
}
