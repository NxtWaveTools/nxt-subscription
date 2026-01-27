// ============================================================================
// Approval Actions Component
// Client component for POC to approve/reject subscriptions
// ============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { approveSubscription, rejectSubscription } from '@/app/admin/actions/subscriptions'

interface ApprovalActionsProps {
  subscriptionId: string
}

export function ApprovalActions({ subscriptionId }: ApprovalActionsProps) {
  const router = useRouter()
  const [mode, setMode] = useState<'idle' | 'approve' | 'reject'>('idle')
  const [comments, setComments] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  const handleApprove = async () => {
    setIsProcessing(true)
    const result = await approveSubscription(subscriptionId, comments || undefined)
    setIsProcessing(false)

    if (result.success) {
      toast.success('Subscription approved successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to approve subscription')
    }
  }

  const handleReject = async () => {
    if (!comments || comments.length < 10) {
      toast.error('Please provide a reason for rejection (at least 10 characters)')
      return
    }

    setIsProcessing(true)
    const result = await rejectSubscription(subscriptionId, comments)
    setIsProcessing(false)

    if (result.success) {
      toast.success('Subscription rejected')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to reject subscription')
    }
  }

  const handleCancel = () => {
    setMode('idle')
    setComments('')
  }

  return (
    <Card className="border-yellow-500/30 bg-yellow-50/30 dark:bg-yellow-950/10">
      <CardHeader>
        <CardTitle className="text-lg">Pending Approval</CardTitle>
        <CardDescription>
          This subscription is waiting for POC approval
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {mode === 'idle' ? (
          <div className="flex gap-2">
            <Button
              onClick={() => setMode('approve')}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={() => setMode('reject')}
              variant="destructive"
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="comments">
                {mode === 'approve' ? 'Comments (optional)' : 'Reason for rejection *'}
              </Label>
              <Textarea
                id="comments"
                placeholder={
                  mode === 'approve'
                    ? 'Add any comments...'
                    : 'Please explain why this subscription is being rejected...'
                }
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                rows={3}
              />
              {mode === 'reject' && comments.length < 10 && (
                <p className="text-xs text-muted-foreground">
                  Minimum 10 characters required
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                disabled={isProcessing}
                className="flex-1"
              >
                Cancel
              </Button>
              {mode === 'approve' ? (
                <Button
                  onClick={handleApprove}
                  disabled={isProcessing}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirm Approval
                </Button>
              ) : (
                <Button
                  onClick={handleReject}
                  disabled={isProcessing || comments.length < 10}
                  variant="destructive"
                  className="flex-1"
                >
                  {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Confirm Rejection
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
