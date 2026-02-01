// ============================================================================
// HOD Subscriptions Page
// View-only access to department subscriptions
// ============================================================================

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SubscriptionsTable } from '@/components/subscriptions/subscriptions-table'
import { SubscriptionsFilters } from '@/components/subscriptions/subscriptions-filters'
import { fetchSubscriptions, getSubscriptionCountsByStatus, fetchActiveDepartments } from '@/lib/data-access'
import { validatePageParams, calculateTotalPages, clampPage } from '@/lib/utils/pagination'
import { getCurrentUser } from '@/lib/auth/user'
import { createClient } from '@/lib/supabase/server'
import {
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  BILLING_FREQUENCY,
  HOD_ROUTES,
  type SubscriptionStatus,
  type PaymentStatus,
  type BillingFrequency,
} from '@/lib/constants'
import { Badge } from '@/components/ui/badge'
import { Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'

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

export default async function HODSubscriptionsPage({ searchParams }: SubscriptionsPageProps) {
  const params = await searchParams
  const user = await getCurrentUser()
  const supabase = await createClient()

  // Get HOD's departments
  const { data: hodDepartments } = await supabase
    .from('hod_departments')
    .select('department_id')
    .eq('hod_id', user!.id)

  const hodDepartmentIds = hodDepartments?.map((d) => d.department_id) || []

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

  // Fetch data in parallel - filter by HOD's departments
  const [{ subscriptions, totalCount }, statusCounts, departments] = await Promise.all([
    fetchSubscriptions(
      {
        search,
        status,
        paymentStatus,
        billingFrequency,
        departmentId,
      },
      { page, limit, offset },
      hodDepartmentIds // Filter by HOD's departments
    ),
    getSubscriptionCountsByStatus(hodDepartmentIds),
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
            View subscriptions for your departments
          </p>
        </div>
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
          icon={AlertCircle}
        />
        <StatusCard title="Pending" count={statusCounts.PENDING} variant="warning" icon={Clock} />
        <StatusCard title="Active" count={statusCounts.ACTIVE} variant="success" icon={CheckCircle2} />
        <StatusCard title="Rejected" count={statusCounts.REJECTED} variant="destructive" icon={XCircle} />
        <StatusCard title="Expired" count={statusCounts.EXPIRED} icon={AlertCircle} />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Subscriptions</CardTitle>
              <CardDescription>
                {totalCount} subscription{totalCount !== 1 ? 's' : ''} found
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <SubscriptionsFilters
            departments={departments.filter(d => hodDepartmentIds.includes(d.id))}
            baseRoute={HOD_ROUTES.SUBSCRIPTIONS}
          />
          <SubscriptionsTable 
            subscriptions={subscriptions} 
            totalCount={totalCount}
            pageSize={limit}
            currentPage={currentPage}
            baseRoute={HOD_ROUTES.SUBSCRIPTIONS}
            readOnly={true}
          />
        </CardContent>
      </Card>
    </div>
  )
}
