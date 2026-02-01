// ============================================================================
// Subscription Detail Page
// View full subscription details including files and approval history
// ============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Pencil,
} from 'lucide-react'
import {
  fetchSubscriptionById,
  fetchSubscriptionPayments,
} from '@/lib/data-access'
import { ADMIN_ROUTES } from '@/lib/constants'
import { PaymentCycleSection } from './components/payment-cycle-section'

interface SubscriptionDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SubscriptionDetailPage({ params }: SubscriptionDetailPageProps) {
  const { id } = await params

  // Fetch subscription and related data
  const [subscription, paymentCycles] = await Promise.all([
    fetchSubscriptionById(id),
    fetchSubscriptionPayments(id),
  ])

  if (!subscription) {
    notFound()
  }

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

  const paymentStatusLabels: Record<string, string> = {
    PENDING: 'Pending',
    PAID: 'Paid',
    OVERDUE: 'Overdue',
    CANCELLED: 'Cancelled',
  }

  const accountingStatusLabels: Record<string, string> = {
    PENDING: 'Pending',
    DONE: 'Done',
  }

  const billingFrequencyLabels: Record<string, string> = {
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly',
    USAGE_BASED: 'Usage Based',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={ADMIN_ROUTES.SUBSCRIPTIONS}>
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
              <span className="text-muted-foreground text-sm">
                Created {formatDateTime(subscription.created_at)}
              </span>
            </div>
          </div>
        </div>
        <Link href={`${ADMIN_ROUTES.SUBSCRIPTIONS}/${subscription.id}/edit`}>
          <Button variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
        </Link>
      </div>

      {/* Subscription Details */}
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
                  <td className="py-4 px-4 text-sm text-muted-foreground">PR ID</td>
                  <td className="py-4 px-4">{subscription.pr_id || '—'}</td>
                  <td className="py-4 px-4 text-sm text-muted-foreground">Request Type</td>
                  <td className="py-4 px-4">{subscription.request_type}</td>
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
                {subscription.subscription_email && (
                  <tr className="border-b">
                    <td className="py-4 px-4 text-sm text-muted-foreground">Subscription Email</td>
                    <td className="py-4 px-4" colSpan={3}>{subscription.subscription_email}</td>
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

      {/* Payment Cycles - Interactive component for Admin */}
      <PaymentCycleSection
        subscriptionId={subscription.id}
        subscriptionStatus={subscription.status}
        billingFrequency={subscription.billing_frequency}
        cycleEndDate={subscription.end_date}
        initialPaymentCycles={paymentCycles}
      />
    </div>
  )
}

// Helper component for consistent labels
function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`text-xs text-muted-foreground uppercase tracking-wider ${className}`}>
      {children}
    </span>
  )
}
