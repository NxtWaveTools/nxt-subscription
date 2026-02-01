// ============================================================================
// Payment Cycle Card Component
// Displays a payment cycle with its current status and actions
// ============================================================================

'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  FileText,
  AlertCircle,
  Upload,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { PAYMENT_CYCLE_STATUS, POC_APPROVAL_STATUS } from '@/lib/constants'
import type { SubscriptionPaymentWithRelations, PaymentCycleStatus, PocApprovalStatus, RoleName } from '@/lib/types'
import { useState } from 'react'

// ============================================================================
// Types
// ============================================================================

interface PaymentCycleCardProps {
  payment: SubscriptionPaymentWithRelations
  userRole: RoleName
  onRecordPayment?: (paymentId: string) => void
  onApproveRenewal?: (paymentId: string) => void
  onRejectRenewal?: (paymentId: string) => void
  onUploadInvoice?: (paymentId: string) => void
  onViewInvoice?: (fileId: string) => void
  className?: string
  expandable?: boolean
  defaultExpanded?: boolean
}

// ============================================================================
// Status Utilities
// ============================================================================

function getCycleStatusBadge(status: PaymentCycleStatus) {
  const statusConfig: Record<PaymentCycleStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
    PENDING: {
      label: 'Pending Approval',
      variant: 'secondary',
      icon: <Clock className="h-3 w-3" />,
    },
    APPROVED: {
      label: 'Approved',
      variant: 'default',
      icon: <CheckCircle className="h-3 w-3" />,
    },
    DECLINED: {
      label: 'Declined',
      variant: 'destructive',
      icon: <XCircle className="h-3 w-3" />,
    },
    PAID: {
      label: 'Paid',
      variant: 'default',
      icon: <DollarSign className="h-3 w-3" />,
    },
  }

  const config = statusConfig[status]
  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  )
}

function getApprovalStatusBadge(status: PocApprovalStatus) {
  const statusConfig: Record<PocApprovalStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    PENDING: { label: 'Pending', variant: 'secondary' },
    APPROVED: { label: 'Approved', variant: 'default' },
    REJECTED: { label: 'Rejected', variant: 'destructive' },
  }

  const config = statusConfig[status]
  return <Badge variant={config.variant}>{config.label}</Badge>
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function isDeadlineNear(deadlineString: string): boolean {
  const deadline = new Date(deadlineString)
  const today = new Date()
  const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return daysUntilDeadline <= 3 && daysUntilDeadline >= 0
}

function isDeadlinePassed(deadlineString: string): boolean {
  const deadline = new Date(deadlineString)
  const today = new Date()
  return today > deadline
}

// ============================================================================
// Component
// ============================================================================

export function PaymentCycleCard({
  payment,
  userRole,
  onRecordPayment,
  onApproveRenewal,
  onRejectRenewal,
  onUploadInvoice,
  onViewInvoice,
  className,
  expandable = false,
  defaultExpanded = true,
}: PaymentCycleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const showFinanceActions = userRole === 'FINANCE'
  const showPOCActions = userRole === 'POC'
  const isHOD = userRole === 'HOD'

  // Finance can record payment when cycle is APPROVED (POC approved, waiting for payment)
  const canRecordPayment = 
    showFinanceActions && 
    payment.cycle_status === PAYMENT_CYCLE_STATUS.APPROVED

  // POC can approve/reject when cycle is PENDING
  const canApproveReject = 
    showPOCActions && 
    payment.cycle_status === PAYMENT_CYCLE_STATUS.PENDING

  // POC can upload invoice when cycle is APPROVED (before Finance records payment)
  const canUploadInvoice = 
    showPOCActions && 
    payment.cycle_status === PAYMENT_CYCLE_STATUS.APPROVED &&
    !payment.invoice_file_id

  const deadlineNear = !payment.invoice_file_id && isDeadlineNear(payment.invoice_deadline)
  const deadlinePassed = !payment.invoice_file_id && isDeadlinePassed(payment.invoice_deadline)

  return (
    <Card className={cn('relative', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">
              Cycle #{payment.cycle_number}
            </CardTitle>
            {getCycleStatusBadge(payment.cycle_status)}
          </div>
          {expandable && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          )}
        </div>
      </CardHeader>

      {(!expandable || isExpanded) && (
        <CardContent className="space-y-4">
          {/* Cycle Period */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>
              {formatDate(payment.cycle_start_date)} - {formatDate(payment.cycle_end_date)}
            </span>
          </div>

          <Separator />

          {/* Payment Information */}
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Payment Status</span>
              <Badge variant={payment.payment_status === 'PAID' ? 'default' : 'secondary'}>
                {payment.payment_status}
              </Badge>
            </div>

            {payment.payment_utr && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment UTR</span>
                <span className="font-mono text-xs">{payment.payment_utr}</span>
              </div>
            )}

            {payment.mandate_id && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mandate ID</span>
                <span className="font-mono text-xs">{payment.mandate_id}</span>
              </div>
            )}

            <div className="flex justify-between">
              <span className="text-muted-foreground">Accounting Status</span>
              <Badge variant={payment.accounting_status === 'DONE' ? 'default' : 'secondary'}>
                {payment.accounting_status}
              </Badge>
            </div>

            {payment.payment_recorded_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Recorded</span>
                <span>{formatDate(payment.payment_recorded_at)}</span>
              </div>
            )}

            {payment.payment_recorder && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recorded By</span>
                <span>{payment.payment_recorder.name || payment.payment_recorder.email}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* POC Approval */}
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">POC Approval</span>
              {getApprovalStatusBadge(payment.poc_approval_status as PocApprovalStatus)}
            </div>

            {payment.poc_approver && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Approved By</span>
                <span>{payment.poc_approver.name || payment.poc_approver.email}</span>
              </div>
            )}

            {payment.poc_approved_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Approved At</span>
                <span>{formatDate(payment.poc_approved_at)}</span>
              </div>
            )}

            {payment.poc_rejection_reason && (
              <div className="mt-2 p-2 bg-destructive/10 rounded-md">
                <span className="text-xs text-destructive font-medium">Rejection Reason:</span>
                <p className="text-sm mt-1">{payment.poc_rejection_reason}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Invoice Information */}
          <div className="grid gap-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Invoice Deadline</span>
              <span className={cn(
                deadlinePassed && 'text-destructive font-medium',
                deadlineNear && !deadlinePassed && 'text-orange-600 font-medium'
              )}>
                {formatDate(payment.invoice_deadline)}
                {deadlinePassed && ' (Overdue)'}
                {deadlineNear && !deadlinePassed && ' (Due Soon)'}
              </span>
            </div>

            {payment.invoice_file_id && payment.invoice_file && (
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Invoice</span>
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  onClick={() => onViewInvoice?.(payment.invoice_file_id!)}
                >
                  <FileText className="h-3 w-3 mr-1" />
                  View Invoice
                </Button>
              </div>
            )}

            {payment.invoice_uploaded_at && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Invoice Uploaded</span>
                <span>{formatDate(payment.invoice_uploaded_at)}</span>
              </div>
            )}

            {!payment.invoice_file_id && (deadlineNear || deadlinePassed) && (
              <div className={cn(
                'mt-2 p-2 rounded-md flex items-center gap-2',
                deadlinePassed ? 'bg-destructive/10' : 'bg-orange-100 dark:bg-orange-900/20'
              )}>
                <AlertCircle className={cn(
                  'h-4 w-4',
                  deadlinePassed ? 'text-destructive' : 'text-orange-600'
                )} />
                <span className={cn(
                  'text-xs',
                  deadlinePassed ? 'text-destructive' : 'text-orange-600'
                )}>
                  {deadlinePassed 
                    ? 'Invoice upload deadline has passed!' 
                    : 'Invoice upload deadline is approaching!'}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          {(canRecordPayment || canApproveReject || canUploadInvoice) && (
            <>
              <Separator />
              <div className="flex flex-wrap gap-2">
                {canRecordPayment && (
                  <Button
                    size="sm"
                    onClick={() => onRecordPayment?.(payment.id)}
                  >
                    <DollarSign className="h-4 w-4 mr-1" />
                    Record Payment
                  </Button>
                )}

                {canApproveReject && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => onApproveRenewal?.(payment.id)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => onRejectRenewal?.(payment.id)}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </>
                )}

                {canUploadInvoice && (
                  <Button
                    size="sm"
                    variant={deadlineNear || deadlinePassed ? 'destructive' : 'default'}
                    onClick={() => onUploadInvoice?.(payment.id)}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload Invoice
                  </Button>
                )}
              </div>
            </>
          )}

          {/* HOD Read-Only Notice */}
          {isHOD && (
            <div className="mt-2 p-2 bg-muted rounded-md">
              <span className="text-xs text-muted-foreground">
                View-only access. Contact POC for actions.
              </span>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
