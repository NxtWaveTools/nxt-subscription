// ============================================================================
// Pending Approvals List Component
// Client component for POC to approve/reject subscriptions
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
import { CheckCircle2, XCircle, Loader2, CreditCard, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import { approveSubscription, rejectSubscription } from '@/app/poc/actions/subscriptions'

interface PendingSubscription {
  id: string
  tool_name: string
  vendor_name: string
  amount: number
  currency: string
  billing_frequency: string
  status: string
  created_at: string
  departments: { id: string; name: string } | null
  creator: { id: string; name: string | null; email: string } | null
}

interface PendingApprovalsListProps {
  subscriptions: PendingSubscription[]
}

export function PendingApprovalsList({ subscriptions }: PendingApprovalsListProps) {
  const router = useRouter()
  const [selectedSubscription, setSelectedSubscription] = useState<PendingSubscription | null>(null)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [comments, setComments] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleApprove = async () => {
    if (!selectedSubscription) return

    setIsProcessing(true)
    const result = await approveSubscription(selectedSubscription.id, comments || undefined)
    setIsProcessing(false)

    if (result.success) {
      toast.success('Subscription approved successfully')
      setSelectedSubscription(null)
      setAction(null)
      setComments('')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to approve subscription')
    }
  }

  const handleReject = async () => {
    if (!selectedSubscription) return

    if (!comments || comments.length < 10) {
      toast.error('Please provide a reason for rejection (at least 10 characters)')
      return
    }

    setIsProcessing(true)
    const result = await rejectSubscription(selectedSubscription.id, comments)
    setIsProcessing(false)

    if (result.success) {
      toast.success('Subscription rejected')
      setSelectedSubscription(null)
      setAction(null)
      setComments('')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to reject subscription')
    }
  }

  const handleClose = () => {
    setSelectedSubscription(null)
    setAction(null)
    setComments('')
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const billingLabels: Record<string, string> = {
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly',
    USAGE_BASED: 'Usage Based',
  }

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500 mb-4" />
        <p className="text-lg font-medium">All Caught Up!</p>
        <p className="text-sm text-muted-foreground mt-1">
          No subscriptions are waiting for your approval.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {subscriptions.map((sub) => (
          <div
            key={sub.id}
            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{sub.tool_name}</span>
                <Badge variant="secondary" className="text-xs">
                  {sub.tool_name}
                </Badge>
              </div>
              <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {sub.departments?.name}
                </span>
                <span>•</span>
                <span>{sub.vendor_name}</span>
                <span>•</span>
                <span>Requested {formatDate(sub.created_at)}</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="font-medium">
                  {formatCurrency(sub.amount, sub.currency)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {billingLabels[sub.billing_frequency] || sub.billing_frequency}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    setSelectedSubscription(sub)
                    setAction('approve')
                  }}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    setSelectedSubscription(sub)
                    setAction('reject')
                  }}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Approval/Rejection Dialog */}
      <Dialog open={!!selectedSubscription && !!action} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Approve Subscription' : 'Reject Subscription'}
            </DialogTitle>
            <DialogDescription>
              {action === 'approve'
                ? `You are about to approve "${selectedSubscription?.tool_name}".`
                : `You are about to reject "${selectedSubscription?.tool_name}". Please provide a reason.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Tool:</span>
                  <span className="ml-2 font-medium">{selectedSubscription?.tool_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Vendor:</span>
                  <span className="ml-2 font-medium">{selectedSubscription?.vendor_name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Amount:</span>
                  <span className="ml-2 font-medium">
                    {selectedSubscription &&
                      formatCurrency(selectedSubscription.amount, selectedSubscription.currency)}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Billing:</span>
                  <span className="ml-2 font-medium">
                    {selectedSubscription &&
                      (billingLabels[selectedSubscription.billing_frequency] ||
                        selectedSubscription.billing_frequency)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Comments {action === 'reject' ? '(required)' : '(optional)'}
              </label>
              <Textarea
                placeholder={
                  action === 'approve'
                    ? 'Add any comments...'
                    : 'Please explain why this subscription is being rejected...'
                }
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
              />
              {action === 'reject' && comments.length < 10 && comments.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {10 - comments.length} more characters required
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              Cancel
            </Button>
            {action === 'approve' ? (
              <Button
                onClick={handleApprove}
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Approve
              </Button>
            ) : (
              <Button
                onClick={handleReject}
                disabled={isProcessing || comments.length < 10}
                variant="destructive"
              >
                {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Reject
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
