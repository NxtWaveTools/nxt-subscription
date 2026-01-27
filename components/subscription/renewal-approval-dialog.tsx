// ============================================================================
// Renewal Approval Dialog Component
// Dialog for POC to approve or reject a renewal
// ============================================================================

'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

// ============================================================================
// Types & Schema
// ============================================================================

const approveSchema = z.object({
  comments: z.string().max(500, 'Comments too long').optional(),
})

const rejectSchema = z.object({
  reason: z
    .string()
    .min(10, 'Please provide a reason for rejection (min 10 characters)')
    .max(500, 'Reason is too long'),
})

type ApproveFormData = z.infer<typeof approveSchema>
type RejectFormData = z.infer<typeof rejectSchema>

interface RenewalApprovalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'approve' | 'reject'
  paymentCycleId: string
  subscriptionName?: string
  cycleNumber?: number
  cycleEndDate?: string
  onApprove?: (data: ApproveFormData) => Promise<{ success: boolean; error?: string }>
  onReject?: (data: RejectFormData) => Promise<{ success: boolean; error?: string }>
}

// ============================================================================
// Component
// ============================================================================

export function RenewalApprovalDialog({
  open,
  onOpenChange,
  mode,
  paymentCycleId,
  subscriptionName,
  cycleNumber,
  cycleEndDate,
  onApprove,
  onReject,
}: RenewalApprovalDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const approveForm = useForm<ApproveFormData>({
    resolver: zodResolver(approveSchema),
    defaultValues: {
      comments: '',
    },
  })

  const rejectForm = useForm<RejectFormData>({
    resolver: zodResolver(rejectSchema),
    defaultValues: {
      reason: '',
    },
  })

  const handleApprove = async (data: ApproveFormData) => {
    if (!onApprove) return

    setIsSubmitting(true)
    try {
      const result = await onApprove(data)
      
      if (result.success) {
        toast.success('Renewal approved successfully')
        approveForm.reset()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to approve renewal')
      }
    } catch (error) {
      console.error('Approve renewal error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleReject = async (data: RejectFormData) => {
    if (!onReject) return

    setIsSubmitting(true)
    try {
      const result = await onReject(data)
      
      if (result.success) {
        toast.success('Renewal rejected')
        rejectForm.reset()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to reject renewal')
      }
    } catch (error) {
      console.error('Reject renewal error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  if (mode === 'approve') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Approve Renewal
            </DialogTitle>
            <DialogDescription>
              {subscriptionName && cycleNumber 
                ? `Approving renewal for ${subscriptionName} - Cycle #${cycleNumber}`
                : 'Approve this subscription renewal'}
            </DialogDescription>
          </DialogHeader>

          {cycleEndDate && (
            <div className="bg-muted p-3 rounded-md text-sm">
              <p className="text-muted-foreground">
                Cycle ends on: <strong>{formatDate(cycleEndDate)}</strong>
              </p>
              <p className="text-muted-foreground mt-1">
                By approving, you confirm the subscription should continue for the next billing cycle.
              </p>
            </div>
          )}

          <Form {...approveForm}>
            <form onSubmit={approveForm.handleSubmit(handleApprove)} className="space-y-4">
              <FormField
                control={approveForm.control}
                name="comments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comments (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any comments about this approval..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                  Approve Renewal
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <XCircle className="h-5 w-5" />
            Reject Renewal
          </DialogTitle>
          <DialogDescription>
            {subscriptionName && cycleNumber 
              ? `Rejecting renewal for ${subscriptionName} - Cycle #${cycleNumber}`
              : 'Reject this subscription renewal'}
          </DialogDescription>
        </DialogHeader>

        <div className="bg-destructive/10 p-3 rounded-md">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-destructive">Warning: This action will cancel the subscription</p>
              <p className="text-muted-foreground mt-1">
                Rejecting the renewal will mark the subscription as cancelled. This cannot be undone.
              </p>
            </div>
          </div>
        </div>

        <Form {...rejectForm}>
          <form onSubmit={rejectForm.handleSubmit(handleReject)} className="space-y-4">
            <FormField
              control={rejectForm.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rejection Reason *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Please provide a reason for rejecting this renewal..."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This will be recorded and visible to Finance team
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                Reject Renewal
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
