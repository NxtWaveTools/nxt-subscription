// ============================================================================
// Record Payment Dialog Component
// Dialog for Finance to record a payment for a cycle
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { PAYMENT_STATUS, ACCOUNTING_STATUS } from '@/lib/constants'

// ============================================================================
// Types & Schema
// ============================================================================

const recordPaymentSchema = z.object({
  payment_utr: z.string().min(1, 'Payment UTR is required').max(100, 'Payment UTR is too long'),
  payment_status: z.enum(['PAID', 'IN_PROGRESS', 'DECLINED']),
  accounting_status: z.enum(['PENDING', 'DONE']),
  mandate_id: z.string().max(100).optional(),
})

type RecordPaymentFormData = z.infer<typeof recordPaymentSchema>

interface RecordPaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  paymentCycleId: string
  subscriptionName?: string
  cycleNumber?: number
  onSubmit: (data: RecordPaymentFormData) => Promise<{ success: boolean; error?: string }>
}

// ============================================================================
// Component
// ============================================================================

export function RecordPaymentDialog({
  open,
  onOpenChange,
  paymentCycleId,
  subscriptionName,
  cycleNumber,
  onSubmit,
}: RecordPaymentDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<RecordPaymentFormData>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: {
      payment_utr: '',
      payment_status: 'PAID',
      accounting_status: 'PENDING',
      mandate_id: '',
    },
  })

  const handleSubmit = async (data: RecordPaymentFormData) => {
    setIsSubmitting(true)
    try {
      const result = await onSubmit(data)
      
      if (result.success) {
        toast.success('Payment recorded successfully')
        form.reset()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to record payment')
      }
    } catch (error) {
      console.error('Record payment error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription>
            {subscriptionName && cycleNumber 
              ? `Recording payment for ${subscriptionName} - Cycle #${cycleNumber}`
              : 'Record payment details for this billing cycle'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="payment_utr"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment UTR *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter payment UTR/reference number"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Unique transaction reference from bank/payment gateway
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="payment_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={PAYMENT_STATUS.PAID}>Paid</SelectItem>
                      <SelectItem value={PAYMENT_STATUS.IN_PROGRESS}>In Progress</SelectItem>
                      <SelectItem value={PAYMENT_STATUS.DECLINED}>Declined</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accounting_status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Accounting Status *</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select accounting status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={ACCOUNTING_STATUS.PENDING}>Pending</SelectItem>
                      <SelectItem value={ACCOUNTING_STATUS.DONE}>Done</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mandate_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mandate ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter mandate ID (optional)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    For recurring payment mandates
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
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Spinner className="mr-2 h-4 w-4" />}
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
