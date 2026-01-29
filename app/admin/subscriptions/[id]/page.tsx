// ============================================================================
// Subscription Detail Page
// View full subscription details including files and approval history
// ============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  CreditCard,
  Building2,
  MapPin,
  Calendar,
  DollarSign,
  Globe,
  FileText,
  History,
  User,
  CheckCircle2,
  XCircle,
  Pencil,
} from 'lucide-react'
import {
  fetchSubscriptionById,
  fetchSubscriptionFiles,
  fetchSubscriptionApprovals,
} from '@/lib/data-access'
import { ADMIN_ROUTES } from '@/lib/constants'
import { ApprovalActions } from './components/approval-actions'
import { FileUploadSection } from './components/file-upload-section'

interface SubscriptionDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function SubscriptionDetailPage({ params }: SubscriptionDetailPageProps) {
  const { id } = await params

  // Fetch subscription and related data
  const [subscription, files, approvals] = await Promise.all([
    fetchSubscriptionById(id),
    fetchSubscriptionFiles(id),
    fetchSubscriptionApprovals(id),
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
      case 'PENDING':
        return 'outline'
      case 'OVERDUE':
        return 'destructive'
      case 'CANCELLED':
        return 'secondary'
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
              <Badge variant={getStatusBadgeVariant(subscription.status)}>
                {statusLabels[subscription.status]}
              </Badge>
              <span className="text-muted-foreground">
                Created {formatDateTime(subscription.created_at)}
              </span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`${ADMIN_ROUTES.SUBSCRIPTIONS}/${subscription.id}/edit`}>
            <Button variant="outline">
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Subscription Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tool Name</Label>
                  <p className="font-medium">{subscription.tool_name}</p>
                </div>
                <div>
                  <Label>Vendor</Label>
                  <p className="font-medium">{subscription.vendor_name}</p>
                </div>
                <div>
                  <Label>Request Type</Label>
                  <p className="font-medium">{subscription.request_type}</p>
                </div>
                <div>
                  <Label>Billing Frequency</Label>
                  <p className="font-medium">
                    {billingFrequencyLabels[subscription.billing_frequency]}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>Department</Label>
                    <p className="font-medium">{subscription.departments?.name || 'Unknown'}</p>
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>Start Date</Label>
                    <p className="font-medium">{formatDate(subscription.start_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label>End Date</Label>
                    <p className="font-medium">{formatDate(subscription.end_date)}</p>
                  </div>
                </div>
              </div>

              {subscription.login_url && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <Label>Login URL</Label>
                      <a
                        href={subscription.login_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary hover:underline"
                      >
                        {subscription.login_url}
                      </a>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Approval History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Approval History
              </CardTitle>
              <CardDescription>
                {approvals.length === 0
                  ? 'No approval actions yet'
                  : `${approvals.length} approval action${approvals.length !== 1 ? 's' : ''}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {approvals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {subscription.status === 'PENDING'
                    ? 'Waiting for POC approval'
                    : 'No approval history available'}
                </p>
              ) : (
                <div className="space-y-4">
                  {approvals.map((approval) => (
                    <div
                      key={approval.id}
                      className="flex items-start gap-4 p-4 rounded-lg border"
                    >
                      {approval.action === 'APPROVED' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="font-medium">
                            {approval.action === 'APPROVED' ? 'Approved' : 'Rejected'}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(approval.created_at)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <User className="h-3 w-3" />
                          {approval.approver?.name || approval.approver?.email || 'Unknown'}
                        </div>
                        {approval.comments && (
                          <p className="text-sm mt-2 p-2 bg-muted rounded">
                            {approval.comments}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Files Section */}
          <FileUploadSection subscriptionId={subscription.id} files={files} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Financial
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Amount</Label>
                <p className="text-2xl font-bold">
                  {formatCurrency(subscription.amount, subscription.currency)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {billingFrequencyLabels[subscription.billing_frequency]}
                </p>
              </div>

              <Separator />

              <div>
                <Label>Payment Status</Label>
                <Badge
                  variant={getPaymentStatusBadgeVariant(subscription.payment_status)}
                  className="mt-1"
                >
                  {paymentStatusLabels[subscription.payment_status]}
                </Badge>
              </div>

              <div>
                <Label>Accounting Status</Label>
                <Badge
                  variant={subscription.accounting_status === 'DONE' ? 'default' : 'outline'}
                  className="mt-1"
                >
                  {accountingStatusLabels[subscription.accounting_status]}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Approval Actions (for POC) */}
          {subscription.status === 'PENDING' && (
            <ApprovalActions subscriptionId={subscription.id} />
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <Label className="text-xs">Created By</Label>
                <p>{subscription.creator?.name || subscription.creator?.email || 'Unknown'}</p>
              </div>
              <div>
                <Label className="text-xs">Created At</Label>
                <p>{formatDateTime(subscription.created_at)}</p>
              </div>
              <div>
                <Label className="text-xs">Last Updated</Label>
                <p>{formatDateTime(subscription.updated_at)}</p>
              </div>
              <div>
                <Label className="text-xs">Version</Label>
                <p>v{subscription.version}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
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
