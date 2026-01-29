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
import type { SubscriptionWithRelations } from '@/lib/types'

interface SubscriptionsTableProps {
  subscriptions: SubscriptionWithRelations[]
  totalCount: number
  pageSize: number
  currentPage: number
  baseRoute: string // e.g., '/admin/subscriptions', '/finance/subscriptions', etc.
  readOnly?: boolean // If true, hide edit/delete/cancel actions (for HOD view-only access)
}

export function SubscriptionsTable({
  subscriptions,
  totalCount,
  pageSize,
  currentPage,
  baseRoute,
  readOnly = false,
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
  }

  const billingFrequencyLabels: Record<string, string> = {
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly',
    USAGE_BASED: 'Usage Based',
  }

  const columns: Column<SubscriptionWithRelations>[] = [
    {
      key: 'subscription_id',
      label: 'Subscription ID',
      sortable: true,
      render: (subscription) => (
        <div className="min-w-[120px]">
          <Link
            href={`${baseRoute}/${subscription.id}`}
            className="font-medium font-mono text-sm hover:underline"
          >
            {subscription.subscription_id || '—'}
          </Link>
        </div>
      ),
    },
    {
      key: 'tool_name',
      label: 'Tool / Vendor',
      sortable: true,
      render: (subscription) => (
        <div className="min-w-[200px]">
          <span className="font-medium">
            {subscription.tool_name}
          </span>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <span>{subscription.vendor_name}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'department',
      label: 'Department',
      render: (subscription) => (
        <div className="min-w-[150px]">
          <div className="flex items-center gap-1 text-sm">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            {subscription.departments?.name || 'Unknown'}
          </div>
        </div>
      ),
    },
    {
      key: 'amount',
      label: 'Amount',
      sortable: true,
      render: (subscription) => (
        <div className="min-w-[100px]">
          <div className="font-medium">
            {formatCurrency(subscription.amount, subscription.currency)}
          </div>
          <div className="text-xs text-muted-foreground">
            {billingFrequencyLabels[subscription.billing_frequency] || subscription.billing_frequency}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (subscription) => (
        <Badge variant={getStatusBadgeVariant(subscription.status)}>
          {statusLabels[subscription.status] || subscription.status}
        </Badge>
      ),
    },
    {
      key: 'payment_status',
      label: 'Payment',
      render: (subscription) => (
        <Badge variant={getPaymentStatusBadgeVariant(subscription.payment_status)}>
          {paymentStatusLabels[subscription.payment_status] || subscription.payment_status}
        </Badge>
      ),
    },
    {
      key: 'dates',
      label: 'Period',
      render: (subscription) => (
        <div className="min-w-[120px] text-sm">
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3 text-muted-foreground" />
            {formatDate(subscription.start_date)}
          </div>
          {subscription.end_date && (
            <div className="text-xs text-muted-foreground mt-1">
              to {formatDate(subscription.end_date)}
            </div>
          )}
        </div>
      ),
    },
    ...(readOnly ? [] : [{
      key: 'actions',
      label: '',
      render: (subscription) => (
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
            {subscription.status === 'PENDING' && (
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
