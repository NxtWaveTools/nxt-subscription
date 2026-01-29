// ============================================================================
// Finance Subscription Detail Page
// View subscription details and manage payment cycles
// ============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Pencil,
  Building2,
  MapPin,
  Calendar,
  CreditCard,
  User,
  Mail,
  Link as LinkIcon,
  FileText,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { FINANCE_ROUTES } from '@/lib/constants'
import { fetchSubscriptionById, fetchSubscriptionPayments, fetchSubscriptionFiles } from '@/lib/data-access'
import { PaymentCycleSection } from './components/payment-cycle-section'

interface SubscriptionDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SubscriptionDetailPage({ params }: SubscriptionDetailPageProps) {
  const { id } = await params

  // Fetch subscription with payment cycles
  const [subscription, paymentCycles, files] = await Promise.all([
    fetchSubscriptionById(id),
    fetchSubscriptionPayments(id),
    fetchSubscriptionFiles(id),
  ])

  if (!subscription) {
    notFound()
  }

  // Helper functions
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

  const getStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'ACTIVE':
        return 'default'
      case 'PENDING':
        return 'secondary'
      case 'REJECTED':
      case 'CANCELLED':
        return 'destructive'
      case 'EXPIRED':
        return 'outline'
      default:
        return 'secondary'
    }
  }

  const getPaymentStatusBadgeVariant = (status: string): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'PAID':
        return 'default'
      case 'IN_PROGRESS':
        return 'secondary'
      case 'DECLINED':
        return 'destructive'
      default:
        return 'outline'
    }
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={FINANCE_ROUTES.SUBSCRIPTIONS}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">{subscription.tool_name}</h1>
              <Badge variant={getStatusBadgeVariant(subscription.status)}>
                {statusLabels[subscription.status] || subscription.status}
              </Badge>
            </div>
            <p className="text-muted-foreground font-mono">
              {subscription.subscription_id}
            </p>
          </div>
        </div>
        <Link href={`${FINANCE_ROUTES.SUBSCRIPTIONS}/${subscription.id}/edit`}>
          <Button variant="outline">
            <Pencil className="h-4 w-4 mr-2" />
            Edit Subscription
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscription Overview */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
              <CardDescription>
                Core information about this subscription
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount & Billing */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Amount</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(subscription.amount, subscription.currency)}
                  </p>
                  {subscription.equivalent_inr_amount && subscription.currency !== 'INR' && (
                    <p className="text-sm text-muted-foreground">
                      ≈ {formatCurrency(subscription.equivalent_inr_amount, 'INR')}
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Billing Frequency</p>
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {billingFrequencyLabels[subscription.billing_frequency]}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Period */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Start Date
                  </p>
                  <p className="font-medium">{formatDate(subscription.start_date)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    End Date
                  </p>
                  <p className="font-medium">{formatDate(subscription.end_date)}</p>
                </div>
              </div>

              <Separator />

              {/* Department */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    Department
                  </p>
                  <p className="font-medium">{subscription.departments?.name || '—'}</p>
                </div>
              </div>

              <Separator />

              {/* Vendor & Request Type */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Vendor</p>
                  <p className="font-medium">{subscription.vendor_name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Request Type
                  </p>
                  <Badge variant="outline">{subscription.request_type}</Badge>
                </div>
              </div>

              {/* Additional Details */}
              {(subscription.login_url || subscription.subscription_email || subscription.poc_email) && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    {subscription.login_url && (
                      <div className="flex items-center gap-2">
                        <LinkIcon className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={subscription.login_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:underline"
                        >
                          {subscription.login_url}
                        </a>
                      </div>
                    )}
                    {subscription.subscription_email && (
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{subscription.subscription_email}</span>
                      </div>
                    )}
                    {subscription.poc_email && (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">POC: {subscription.poc_email}</span>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Remarks */}
              {subscription.requester_remarks && (
                <>
                  <Separator />
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Requester Remarks</p>
                    <p className="text-sm bg-muted p-3 rounded-md">
                      {subscription.requester_remarks}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Payment Cycles Section - Client Component */}
          <PaymentCycleSection
            subscriptionId={subscription.id}
            subscriptionStatus={subscription.status}
            billingFrequency={subscription.billing_frequency}
            cycleEndDate={subscription.end_date}
            initialPaymentCycles={paymentCycles}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Payment Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payment Status</span>
                <Badge variant={getPaymentStatusBadgeVariant(subscription.payment_status)}>
                  {subscription.payment_status}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Accounting Status</span>
                <Badge variant={subscription.accounting_status === 'DONE' ? 'default' : 'secondary'}>
                  {subscription.accounting_status}
                </Badge>
              </div>
              {subscription.payment_utr && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">Last Payment UTR</p>
                  <p className="font-mono text-sm">{subscription.payment_utr}</p>
                </div>
              )}
              {subscription.mandate_id && (
                <div>
                  <p className="text-sm text-muted-foreground">Mandate ID</p>
                  <p className="font-mono text-sm">{subscription.mandate_id}</p>
                </div>
              )}
              {subscription.budget_period && (
                <div>
                  <p className="text-sm text-muted-foreground">Budget Period</p>
                  <p className="text-sm">{subscription.budget_period}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Files Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              {files.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No files uploaded yet
                </p>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-2 border rounded-md text-sm"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="truncate">{file.original_filename}</span>
                      </div>
                      <Badge variant="outline" className="flex-shrink-0 ml-2">
                        {file.file_type === 'PROOF_OF_PAYMENT' ? 'Payment' : 'Invoice'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meta Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Meta Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Created By</p>
                <p className="font-medium">{subscription.creator?.name || subscription.creator?.email || '—'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created At</p>
                <p className="font-medium">{formatDate(subscription.created_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">{formatDate(subscription.updated_at)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Version</p>
                <p className="font-medium">{subscription.version}</p>
              </div>
            </CardContent>
          </Card>

          {/* Active Cycle Alert */}
          {paymentCycles.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/10">
              <CardContent className="flex items-start gap-3 pt-6">
                <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-800 dark:text-yellow-200">
                    {paymentCycles.length} Payment Cycle{paymentCycles.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-yellow-700 dark:text-yellow-300">
                    Manage recurring payments in the Payment Cycles section below.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
