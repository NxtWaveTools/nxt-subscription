// ============================================================================
// Payment Cycle Section Component (Admin)
// Re-exports the Finance payment cycle section since Admin has same permissions
// ============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Plus,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCcw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  CreatePaymentCycleDialog,
  RecordPaymentDialog,
} from '@/components/subscription'
import {
  createNewPaymentCycle,
  recordPaymentAction,
  cancelPaymentCycleAction,
} from '@/app/finance/actions/payment-cycles'
import type { SubscriptionPaymentWithRelations } from '@/lib/types'
import type { BillingFrequency } from '@/lib/constants'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface PaymentCycleSectionProps {
  subscriptionId: string
  subscriptionStatus: string
  billingFrequency: string
  cycleEndDate: string | null
  initialPaymentCycles: SubscriptionPaymentWithRelations[]
}

export function PaymentCycleSection({
  subscriptionId,
  subscriptionStatus,
  billingFrequency,
  initialPaymentCycles,
}: PaymentCycleSectionProps) {
  const router = useRouter()
  const [paymentCycles] = useState(initialPaymentCycles)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedCycleForPayment, setSelectedCycleForPayment] = useState<SubscriptionPaymentWithRelations | null>(null)
  const [cycleToCancel, setCycleToCancel] = useState<SubscriptionPaymentWithRelations | null>(null)
  const [isCancelling, setIsCancelling] = useState(false)
  const [showAllCycles, setShowAllCycles] = useState(false)

  // Check if new cycle can be created
  const canCreateNewCycle = subscriptionStatus === 'ACTIVE'
  const latestCycle = paymentCycles[0]
  // A cycle is "active" (in progress) if it's not in a terminal state (PAID or DECLINED)
  const hasActiveCycle = latestCycle && !['PAID', 'DECLINED'].includes(latestCycle.cycle_status)

  // Handle create new cycle
  const handleCreateCycle = async (startDate: Date, endDate: Date): Promise<{ success: boolean; error?: string }> => {
    const result = await createNewPaymentCycle(subscriptionId, startDate, endDate)

    if (result.success) {
      router.refresh()
    }
    return result
  }

  // Handle record payment
  const handleRecordPayment = async (data: {
    payment_utr: string
    payment_status: 'PAID' | 'IN_PROGRESS' | 'DECLINED'
    accounting_status: 'PENDING' | 'DONE'
    mandate_id?: string
  }): Promise<{ success: boolean; error?: string }> => {
    if (!selectedCycleForPayment) return { success: false, error: 'No cycle selected' }

    const result = await recordPaymentAction(selectedCycleForPayment.id, {
      payment_utr: data.payment_utr,
      payment_status: data.payment_status,
      accounting_status: data.accounting_status,
      mandate_id: data.mandate_id,
    })

    if (result.success) {
      setSelectedCycleForPayment(null)
      router.refresh()
    }
    return result
  }

  // Handle cancel cycle
  const handleCancelCycle = async () => {
    if (!cycleToCancel) return

    setIsCancelling(true)
    try {
      const result = await cancelPaymentCycleAction(cycleToCancel.id, 'Cancelled by Admin')

      if (result.success) {
        toast.success('Payment cycle cancelled')
        setCycleToCancel(null)
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to cancel cycle')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsCancelling(false)
    }
  }

  // Format helpers
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  // Get status display info
  const getStatusInfo = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
      PENDING: { label: 'Pending Approval', variant: 'secondary', icon: <Clock className="h-3 w-3" /> },
      APPROVED: { label: 'Approved', variant: 'default', icon: <CheckCircle2 className="h-3 w-3" /> },
      DECLINED: { label: 'Declined', variant: 'destructive', icon: <XCircle className="h-3 w-3" /> },
      PAID: { label: 'Paid', variant: 'default', icon: <CreditCard className="h-3 w-3" /> },
    }
    return statusMap[status] || { label: status, variant: 'outline' as const, icon: null }
  }

  // Cycles to display
  const displayedCycles = showAllCycles ? paymentCycles : paymentCycles.slice(0, 3)

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCcw className="h-5 w-5" />
              Payment Cycles
            </CardTitle>
            <CardDescription>
              Recurring payment tracking for this subscription
            </CardDescription>
          </div>
          {canCreateNewCycle && (
            <Button
              onClick={() => setIsCreateDialogOpen(true)}
              disabled={hasActiveCycle}
              size="sm"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Cycle
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {paymentCycles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <RefreshCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No payment cycles yet</p>
              <p className="text-sm">Create the first payment cycle to track recurring payments.</p>
              {canCreateNewCycle && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Cycle
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {displayedCycles.map((cycle) => {
                const statusInfo = getStatusInfo(cycle.cycle_status)
                const isDeadlineNear = new Date(cycle.invoice_deadline) <= new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
                const isOverdue = new Date(cycle.invoice_deadline) < new Date() && cycle.cycle_status !== 'PAID' && cycle.cycle_status !== 'DECLINED'
                
                return (
                  <div
                    key={cycle.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    {/* Cycle Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                          {cycle.cycle_number}
                        </div>
                        <div>
                          <p className="font-medium">Cycle #{cycle.cycle_number}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(cycle.cycle_start_date)} — {formatDate(cycle.cycle_end_date)}
                          </p>
                        </div>
                      </div>
                      <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                        {statusInfo.icon}
                        {statusInfo.label}
                      </Badge>
                    </div>

                    {/* Cycle Details */}
                    <div className="grid gap-2 sm:grid-cols-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Payment Status</p>
                        <p className="font-medium">{cycle.payment_status}</p>
                        {cycle.payment_utr && (
                          <p className="text-xs text-muted-foreground font-mono">UTR: {cycle.payment_utr}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">POC Approval</p>
                        <p className="font-medium">{cycle.poc_approval_status}</p>
                        {cycle.poc_approver && (
                          <p className="text-xs text-muted-foreground">By: {cycle.poc_approver.name || cycle.poc_approver.email}</p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground flex items-center gap-1">
                          Invoice Deadline
                          {isOverdue && <AlertTriangle className="h-3 w-3 text-red-500" />}
                          {isDeadlineNear && !isOverdue && <AlertTriangle className="h-3 w-3 text-yellow-500" />}
                        </p>
                        <p className={`font-medium ${isOverdue ? 'text-red-600' : isDeadlineNear ? 'text-yellow-600' : ''}`}>
                          {formatDate(cycle.invoice_deadline)}
                        </p>
                      </div>
                    </div>

                    {/* Actions - only show for non-terminal states */}
                    {cycle.cycle_status !== 'PAID' && cycle.cycle_status !== 'DECLINED' && (
                      <div className="flex items-center gap-2 pt-2 border-t">
                        {cycle.cycle_status === 'APPROVED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedCycleForPayment(cycle)}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Record Payment
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setCycleToCancel(cycle)}
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          Cancel Cycle
                        </Button>
                      </div>
                    )}

                    {/* Rejection reason */}
                    {cycle.poc_rejection_reason && (
                      <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-md text-sm">
                        <p className="text-red-800 dark:text-red-200 font-medium">Rejection Reason:</p>
                        <p className="text-red-700 dark:text-red-300">{cycle.poc_rejection_reason}</p>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Show more/less toggle */}
              {paymentCycles.length > 3 && (
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setShowAllCycles(!showAllCycles)}
                >
                  {showAllCycles ? (
                    <>
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Show Less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Show {paymentCycles.length - 3} More Cycle{paymentCycles.length - 3 !== 1 ? 's' : ''}
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Cycle Dialog */}
      <CreatePaymentCycleDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        subscriptionId={subscriptionId}
        billingFrequency={billingFrequency as BillingFrequency}
        lastCycleEndDate={latestCycle?.cycle_end_date}
        onSubmit={handleCreateCycle}
      />

      {/* Record Payment Dialog */}
      {selectedCycleForPayment && (
        <RecordPaymentDialog
          open={!!selectedCycleForPayment}
          onOpenChange={(open) => !open && setSelectedCycleForPayment(null)}
          paymentCycleId={selectedCycleForPayment.id}
          cycleNumber={selectedCycleForPayment.cycle_number}
          onSubmit={handleRecordPayment}
        />
      )}

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={!!cycleToCancel}
        onOpenChange={(open) => !open && setCycleToCancel(null)}
        title="Cancel Payment Cycle"
        description={`Are you sure you want to cancel Cycle #${cycleToCancel?.cycle_number}? This action cannot be undone.`}
        confirmText="Cancel Cycle"
        variant="destructive"
        onConfirm={handleCancelCycle}
        loading={isCancelling}
      />
    </>
  )
}
