// ============================================================================
// POC Payment Cycle Section
// Allows POC to approve/decline payment cycles and upload invoices
// ============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  CheckCircle2,
  XCircle,
  Upload,
  Clock,
  CreditCard,
  AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { approveCycleAction, declineCycleAction } from '@/app/poc/actions/payment-cycles'
import type { SubscriptionPayment } from '@/lib/types'

interface POCPaymentCycleSectionProps {
  subscriptionId: string
  subscriptionStatus: string
  paymentCycles: SubscriptionPayment[]
  currency: string
  amount: number
}

// Cycle status labels and colors
const cycleStatusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline', icon: React.ElementType }> = {
  PENDING: { label: 'Pending Approval', variant: 'secondary', icon: Clock },
  APPROVED: { label: 'Approved', variant: 'default', icon: CheckCircle2 },
  DECLINED: { label: 'Declined', variant: 'destructive', icon: XCircle },
  PAID: { label: 'Paid', variant: 'default', icon: CreditCard },
}

// Local formatting functions (cannot be passed from Server Components)
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

export function POCPaymentCycleSection({
  subscriptionId,
  subscriptionStatus,
  paymentCycles,
  currency,
  amount,
}: POCPaymentCycleSectionProps) {
  const router = useRouter()
  const [cycleToApprove, setCycleToApprove] = useState<SubscriptionPayment | null>(null)
  const [cycleToDecline, setCycleToDecline] = useState<SubscriptionPayment | null>(null)
  const [declineReason, setDeclineReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  // Handle approve cycle
  const handleApprove = async () => {
    if (!cycleToApprove) return

    setIsProcessing(true)
    const result = await approveCycleAction(cycleToApprove.id)

    if (result.success) {
      toast.success('Payment cycle approved successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to approve cycle')
    }

    setIsProcessing(false)
    setCycleToApprove(null)
  }

  // Handle decline cycle
  const handleDecline = async () => {
    if (!cycleToDecline || !declineReason.trim()) {
      toast.error('Please provide a reason for declining')
      return
    }

    setIsProcessing(true)
    const result = await declineCycleAction(cycleToDecline.id, declineReason)

    if (result.success) {
      toast.success('Payment cycle declined')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to decline cycle')
    }

    setIsProcessing(false)
    setCycleToDecline(null)
    setDeclineReason('')
  }

  // Check if there are any cycles pending POC approval
  const pendingCycles = paymentCycles.filter(c => c.cycle_status === 'PENDING')
  const hasPendingCycles = pendingCycles.length > 0

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Payment Cycles
                {hasPendingCycles && (
                  <Badge variant="secondary" className="ml-2">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    {pendingCycles.length} pending approval
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Review and approve payment cycles for this subscription
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {paymentCycles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payment cycles found for this subscription.
            </div>
          ) : (
            <div className="space-y-4">
              {paymentCycles.map((cycle) => {
                const config = cycleStatusConfig[cycle.cycle_status] || { label: cycle.cycle_status, variant: 'outline' as const, icon: Clock }
                const StatusIcon = config.icon
                const canApproveDecline = cycle.cycle_status === 'PENDING'

                return (
                  <div
                    key={cycle.id}
                    className={`border rounded-lg p-4 ${canApproveDecline ? 'border-yellow-300 bg-yellow-50/30 dark:border-yellow-700 dark:bg-yellow-950/30' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        {/* Cycle Header */}
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-lg">Cycle #{cycle.cycle_number}</span>
                          <Badge variant={config.variant}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {config.label}
                          </Badge>
                        </div>

                        {/* Cycle Details */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Period:</span>
                            <div className="font-medium">
                              {formatDate(cycle.cycle_start_date)} - {formatDate(cycle.cycle_end_date)}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Amount:</span>
                            <div className="font-semibold">{formatCurrency(amount, currency)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Invoice:</span>
                            <div>{cycle.invoice_file_id ? 'Uploaded' : 'Not uploaded'}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">UTR:</span>
                            <div className="font-mono text-xs">{cycle.payment_utr || '—'}</div>
                          </div>
                        </div>

                        {/* Rejection Reason if declined */}
                        {cycle.cycle_status === 'DECLINED' && cycle.poc_rejection_reason && (
                          <div className="mt-2 p-2 bg-destructive/10 rounded text-sm">
                            <span className="text-muted-foreground">Reason: </span>
                            <span>{cycle.poc_rejection_reason}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2">
                        {canApproveDecline && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => setCycleToApprove(cycle)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setCycleToDecline(cycle)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Decline
                            </Button>
                          </>
                        )}
                        {cycle.cycle_status === 'APPROVED' && !cycle.invoice_file_id && (
                          <Button size="sm" variant="outline">
                            <Upload className="h-4 w-4 mr-1" />
                            Upload Invoice
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Approve Confirmation Dialog */}
      <ConfirmDialog
        open={!!cycleToApprove}
        onOpenChange={() => setCycleToApprove(null)}
        title="Approve Payment Cycle"
        description={`Are you sure you want to approve Cycle #${cycleToApprove?.cycle_number}? This will allow Finance to proceed with the payment.`}
        confirmText="Approve"
        onConfirm={handleApprove}
        loading={isProcessing}
      />

      {/* Decline Dialog with Reason */}
      <Dialog open={!!cycleToDecline} onOpenChange={() => {
        setCycleToDecline(null)
        setDeclineReason('')
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Payment Cycle</DialogTitle>
            <DialogDescription>
              Please provide a reason for declining Cycle #{cycleToDecline?.cycle_number}.
              This will be visible to Finance.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="reason">Reason for Declining</Label>
            <Textarea
              id="reason"
              placeholder="Enter your reason..."
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCycleToDecline(null)
                setDeclineReason('')
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDecline}
              disabled={isProcessing || !declineReason.trim()}
            >
              {isProcessing ? 'Declining...' : 'Decline Cycle'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
