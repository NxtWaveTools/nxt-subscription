// ============================================================================
// Subscriptions Table Component
// Client component for displaying subscriptions with actions
// ============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { DataTable, type Column } from '@/components/admin/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  CreditCard,
  Building2,
  Calendar,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { toast } from 'sonner'
import { cancelSubscription, deleteSubscription } from '@/app/admin/actions/subscriptions'
import type { SubscriptionWithRelations, RoleName } from '@/lib/types'

interface SubscriptionsTableProps {
  subscriptions: SubscriptionWithRelations[]
  totalCount: number
  pageSize: number
  currentPage: number
  baseRoute: string // e.g., '/admin/subscriptions', '/finance/subscriptions', etc.
  readOnly?: boolean // If true, hide edit/delete/cancel actions (for HOD view-only access)
  userRole?: RoleName // Used to control delete button visibility (ADMIN only)
}

export function SubscriptionsTable({
  subscriptions,
  totalCount,
  pageSize,
  currentPage,
  baseRoute,
  readOnly = false,
  userRole,
}: SubscriptionsTableProps) {
  const router = useRouter()
  const [subscriptionToDelete, setSubscriptionToDelete] = useState<SubscriptionWithRelations | null>(null)
  const [subscriptionToCancel, setSubscriptionToCancel] = useState<SubscriptionWithRelations | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleCancelSubscription = async () => {
    if (!subscriptionToCancel) return

    setIsProcessing(true)
    const result = await cancelSubscription(subscriptionToCancel.id)

    if (result.success) {
      toast.success('Subscription cancelled successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to cancel subscription')
    }

    setIsProcessing(false)
    setSubscriptionToCancel(null)
  }

  const handleDeleteSubscription = async () => {
    if (!subscriptionToDelete) return

    setIsProcessing(true)
    const result = await deleteSubscription(subscriptionToDelete.id)

    if (result.success) {
      toast.success('Subscription deleted successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete subscription')
    }

    setIsProcessing(false)
    setSubscriptionToDelete(null)
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
      month: 'short',
      day: 'numeric',
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
    IN_PROGRESS: 'In Progress',
  }

  const billingFrequencyLabels: Record<string, string> = {
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly',
    USAGE_BASED: 'Usage Based',
  }

  const columns: Column<SubscriptionWithRelations>[] = [
    {
      key: 'tool_name',
      label: 'Tool Name',
      sortable: true,
      render: (subscription) => (
        <div className="min-w-[150px]">
          <Link
            href={`${baseRoute}/${subscription.id}`}
            className="font-medium hover:underline"
          >
            {subscription.tool_name}
          </Link>
        </div>
      ),
    },
    {
      key: 'vendor_name',
      label: 'Vendor',
      sortable: true,
      render: (subscription) => (
        <div className="min-w-[120px]">{subscription.vendor_name}</div>
      ),
    },
    {
      key: 'pr_id',
      label: 'PR ID',
      render: (subscription) => (
        <div className="min-w-[100px]">{subscription.pr_id || '—'}</div>
      ),
    },
    {
      key: 'request_type',
      label: 'Request Type',
      render: (subscription) => (
        <div className="min-w-[100px]">{subscription.request_type}</div>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      render: (subscription) => (
        <div className="min-w-[120px]">{subscription.departments?.name || 'Unknown'}</div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (subscription) => (
        <div className="min-w-[120px] font-semibold">
          {formatCurrency(subscription.amount, subscription.currency)}
        </div>
      ),
    },
    {
      key: 'billing_frequency',
      label: 'Billing Frequency',
      render: (subscription) => (
        <div className="min-w-[120px]">
          {billingFrequencyLabels[subscription.billing_frequency] || subscription.billing_frequency}
        </div>
      ),
    },
    {
      key: 'subscription_id',
      label: 'Subscription ID',
      sortable: true,
      render: (subscription) => (
        <div className="min-w-[140px] font-mono text-sm">
          {subscription.subscription_id || '—'}
        </div>
      ),
    },
    {
      key: 'start_date',
      label: 'Start Date',
      render: (subscription) => (
        <div className="min-w-[110px] text-sm">{formatDate(subscription.start_date)}</div>
      ),
    },
    {
      key: 'end_date',
      label: 'End Date',
      render: (subscription) => (
        <div className="min-w-[110px] text-sm">{formatDate(subscription.end_date)}</div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (subscription) => (
        <div className="min-w-[120px]">
          <Badge variant="outline">
            {statusLabels[subscription.status] || subscription.status}
          </Badge>
        </div>
      ),
    },
    {
      key: 'payment_status',
      label: 'Payment Status',
      render: (subscription) => (
        <div className="min-w-[110px]">
          <Badge variant="outline">
            {paymentStatusLabels[subscription.payment_status] || subscription.payment_status}
          </Badge>
        </div>
      ),
    },
    {
      key: 'subscription_email',
      label: 'Subscription Email',
      render: (subscription) => (
        <div className="min-w-[180px] text-sm">{subscription.subscription_email || '—'}</div>
      ),
    },
    {
      key: 'poc_email',
      label: 'POC Email',
      render: (subscription) => (
        <div className="min-w-[180px] text-sm">{subscription.poc_email || '—'}</div>
      ),
    },
    // View button - always shown (for readOnly mode like POC)
    ...(readOnly ? [{
      key: 'view',
      label: '',
      render: (subscription) => (
        <div className="min-w-[80px]">
          <Button variant="outline" size="sm" asChild>
            <a href={`${baseRoute}/${subscription.id}`}>
              <Eye className="h-4 w-4 mr-1" />
              View
            </a>
          </Button>
        </div>
      ),
    }] as Column<SubscriptionWithRelations>[] : [{
      key: 'actions',
      label: '',
      render: (subscription) => (
        <div className="min-w-[50px]">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`${baseRoute}/${subscription.id}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`${baseRoute}/${subscription.id}/edit`}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {subscription.status === 'ACTIVE' && (
                <DropdownMenuItem
                  onClick={() => setSubscriptionToCancel(subscription)}
                  className="text-orange-600"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Subscription
                </DropdownMenuItem>
              )}
              {/* Delete is ADMIN-only */}
              {subscription.status === 'PENDING' && userRole === 'ADMIN' && (
                <DropdownMenuItem
                  onClick={() => setSubscriptionToDelete(subscription)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    }] as Column<SubscriptionWithRelations>[]),
  ]

  return (
    <>
      <DataTable
        data={subscriptions}
        columns={columns}
        totalCount={totalCount}
        pageSize={pageSize}
        currentPage={currentPage}
        onPageChange={(page) => {
          const params = new URLSearchParams(window.location.search)
          params.set('page', page.toString())
          router.push(`?${params.toString()}`)
        }}
        getRowId={(subscription) => subscription.id}
      />

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={!!subscriptionToCancel}
        onOpenChange={() => setSubscriptionToCancel(null)}
        title="Cancel Subscription"
        description={`Are you sure you want to cancel "${subscriptionToCancel?.subscription_id} - ${subscriptionToCancel?.tool_name}"? This action cannot be undone.`}
        confirmText="Cancel Subscription"
        variant="destructive"
        onConfirm={handleCancelSubscription}
        loading={isProcessing}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!subscriptionToDelete}
        onOpenChange={() => setSubscriptionToDelete(null)}
        title="Delete Subscription"
        description={`Are you sure you want to delete "${subscriptionToDelete?.subscription_id} - ${subscriptionToDelete?.tool_name}"? This will permanently remove the subscription and all associated data.`}
        confirmText="Delete"
        variant="destructive"
        onConfirm={handleDeleteSubscription}
        loading={isProcessing}
      />
    </>
  )
}
