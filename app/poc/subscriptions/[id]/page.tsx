// ============================================================================
// POC Subscription Detail Page
// View subscription details and approve/decline payment cycles
// ============================================================================

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import {
  fetchSubscriptionById,
  fetchSubscriptionPayments,
} from '@/lib/data-access'
import { getCurrentUser, hasAnyRole } from '@/lib/auth/user'
import { createAdminClient } from '@/lib/supabase/server'
import { POC_ROUTES } from '@/lib/constants'
import { POCPaymentCycleSection } from './components/poc-payment-cycle-section'

interface SubscriptionDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function POCSubscriptionDetailPage({ params }: SubscriptionDetailPageProps) {
  const { id } = await params
  
  // Verify user is POC and has access to this subscription's department
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }

  // Fetch subscription first to check department access
  const subscription = await fetchSubscriptionById(id)
  
  if (!subscription) {
    notFound()
  }

  // Check if user has access to this department (unless admin)
  if (!hasAnyRole(user, ['ADMIN'])) {
    // Use admin client to check POC access (bypasses RLS for this internal check)
    const supabase = createAdminClient()
    const { data: access } = await supabase
      .from('poc_department_access')
      .select('poc_id, department_id')
      .eq('poc_id', user.id)
      .eq('department_id', subscription.department_id)
      .single()
    
    if (!access) {
      redirect('/unauthorized')
    }
  }

  // Fetch payment cycles
  const paymentCycles = await fetchSubscriptionPayments(id)

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const statusLabels: Record<string, string> = {
    PENDING: 'Pending Approval',
    ACTIVE: 'Active',
    REJECTED: 'Rejected',
    EXPIRED: 'Expired',
    CANCELLED: 'Cancelled',
  }

  const billingFrequencyLabels: Record<string, string> = {
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly',
    USAGE_BASED: 'Usage Based',
  }

  // Count pending cycles for alert
  const pendingCyclesCount = paymentCycles.filter(c => c.cycle_status === 'PENDING').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={POC_ROUTES.SUBSCRIPTIONS}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{subscription.tool_name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline">
                {statusLabels[subscription.status]}
              </Badge>
              {pendingCyclesCount > 0 && (
                <Badge variant="secondary">
                  {pendingCyclesCount} cycle{pendingCyclesCount > 1 ? 's' : ''} pending approval
                </Badge>
              )}
              <span className="text-muted-foreground text-sm">
                Created {formatDateTime(subscription.created_at)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Details (View Only) */}
      <Card>
        <CardHeader>
          <CardTitle>Subscription Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody>
                <tr className="border-b">
                  <td className="py-4 px-4 text-sm text-muted-foreground w-1/6">Tool Name</td>
                  <td className="py-4 px-4 w-1/3">{subscription.tool_name}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground w-1/6">Vendor</td>
                  <td className="py-4 px-4 w-1/3">{subscription.vendor_name}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4 text-sm text-muted-foreground">Department</td>
                  <td className="py-4 px-4">{subscription.departments?.name || 'Unknown'}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">Amount</td>
                  <td className="py-4 px-4 font-semibold">{formatCurrency(subscription.amount, subscription.currency)}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4 text-sm text-muted-foreground">Billing Frequency</td>
                  <td className="py-4 px-4">{billingFrequencyLabels[subscription.billing_frequency]}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">Subscription ID</td>
                  <td className="py-4 px-4 font-mono text-sm">{subscription.subscription_id || '—'}</td>
                </tr>
                <tr className="border-b">
                  <td className="py-4 px-4 text-sm text-muted-foreground">Start Date</td>
                  <td className="py-4 px-4">{formatDate(subscription.start_date)}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">End Date</td>
                  <td className="py-4 px-4">{formatDate(subscription.end_date)}</td>
                </tr>
                {subscription.login_url && (
                  <tr className="border-b">
                    <td className="py-4 px-4 text-sm text-muted-foreground">Tool Link/URL</td>
                    <td className="py-4 px-4" colSpan={3}>
                      <a
                        href={subscription.login_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {subscription.login_url}
                      </a>
                    </td>
                  </tr>
                )}
                {subscription.poc_email && (
                  <tr className="border-b">
                    <td className="py-4 px-4 text-sm text-muted-foreground">POC Email</td>
                    <td className="py-4 px-4" colSpan={3}>{subscription.poc_email}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Cycles with Approve/Decline Actions */}
      <POCPaymentCycleSection
        subscriptionId={subscription.id}
        subscriptionStatus={subscription.status}
        paymentCycles={paymentCycles}
        currency={subscription.currency}
        amount={subscription.amount}
      />
    </div>
  )
}
