// ============================================================================
// Pending Renewals List Component
// Client component for POC to approve/reject renewal cycles
// ============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CheckCircle2, XCircle, Loader2, Calendar, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { approveRenewalAction, rejectRenewalAction } from '@/app/poc/actions/payment-cycles'
import type { SubscriptionPaymentWithRelations } from '@/lib/types'

interface PendingRenewalsListProps {
  paymentCycles: SubscriptionPaymentWithRelations[]
}

export function PendingRenewalsList({ paymentCycles }: PendingRenewalsListProps) {
  const router = useRouter()
  const [selectedCycle, setSelectedCycle] = useState<SubscriptionPaymentWithRelations | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [comments, setComments] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleApprove = async () => {
    if (!selectedCycle) return

    setIsProcessing(true)
    const result = await approveRenewalAction(selectedCycle.id, comments || undefined)
    setIsProcessing(false)

    if (result.success) {
      toast.success('Renewal approved successfully')
      handleClose()
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to approve renewal')
    }
  }

  const handleReject = async () => {
    if (!selectedCycle) return

    if (!comments || comments.length < 10) {
      toast.error('Please provide a reason for rejection (at least 10 characters)')
      return
    }

    setIsProcessing(true)
    const result = await rejectRenewalAction(selectedCycle.id, comments)
    setIsProcessing(false)

    if (result.success) {
      toast.success('Renewal rejected')
      handleClose()
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to reject renewal')
    }
  }

  const handleClose = () => {
    setSelectedCycle(null)
    setAction(null)
    setComments('')
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getDaysUntilEnd = (cycleEndDate: string) => {
    const end = new Date(cycleEndDate)
    const today = new Date()
    const diff = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (paymentCycles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
        <p className="font-medium">No Pending Renewals</p>
        <p className="text-sm text-muted-foreground mt-1">
          All renewal approvals are up to date.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {paymentCycles.map((cycle) => {
          const daysUntilEnd = getDaysUntilEnd(cycle.cycle_end_date)
          const isUrgent = daysUntilEnd <= 3

          return (
            <div
              key={cycle.id}
              className={`flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors ${
                isUrgent ? 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/10' : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">Cycle #{cycle.cycle_number}</span>
                  {isUrgent && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      {daysUntilEnd <= 0 ? 'Overdue' : `${daysUntilEnd} days left`}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(cycle.cycle_start_date)} — {formatDate(cycle.cycle_end_date)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Deadline: {formatDate(cycle.invoice_deadline)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700"
                  onClick={() => {
                    setSelectedCycle(cycle)
                    setAction('approve')
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={() => {
                    setSelectedCycle(cycle)
                    setAction('reject')
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Approval/Rejection Dialog */}
      <Dialog open={!!selectedCycle && !!action} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve Renewal' : 'Reject Renewal'}
            </DialogTitle>
            <DialogDescription>
              {selectedCycle && (
                <>
                  Cycle #{selectedCycle.cycle_number} ({formatDate(selectedCycle.cycle_start_date)} — {formatDate(selectedCycle.cycle_end_date)})
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium">
                {action === 'approve' ? 'Comments (optional)' : 'Reason for Rejection *'}
              </label>
              <Textarea
                placeholder={
                  action === 'approve'
                    ? 'Add any comments for the renewal...'
                    : 'Please explain why this renewal is being rejected...'
                }
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
                className="mt-2"
              />
              {action === 'reject' && comments.length > 0 && comments.length < 10 && (
                <p className="text-xs text-destructive mt-1">
                  Rejection reason must be at least 10 characters
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={action === 'approve' ? handleApprove : handleReject}
              disabled={isProcessing || (action === 'reject' && comments.length < 10)}
              variant={action === 'approve' ? 'default' : 'destructive'}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {action === 'approve' ? 'Approve Renewal' : 'Reject Renewal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
