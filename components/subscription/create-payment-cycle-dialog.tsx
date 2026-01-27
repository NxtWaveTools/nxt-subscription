// ============================================================================
// Create Payment Cycle Dialog Component
// Dialog for Finance to create a new payment cycle
// ============================================================================

'use client'

import { useState, useMemo } from 'react'
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
import { Spinner } from '@/components/ui/spinner'
import { Calendar, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { BillingFrequency } from '@/lib/constants'

// ============================================================================
// Types & Schema
// ============================================================================

const createCycleSchema = z.object({
  cycle_start_date: z.string().min(1, 'Start date is required'),
  cycle_end_date: z.string().min(1, 'End date is required'),
}).refine(
  (data) => new Date(data.cycle_end_date) > new Date(data.cycle_start_date),
  {
    message: 'End date must be after start date',
    path: ['cycle_end_date'],
  }
)

type CreateCycleFormData = z.infer<typeof createCycleSchema>

interface CreatePaymentCycleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subscriptionId: string
  subscriptionName?: string
  billingFrequency?: BillingFrequency
  lastCycleEndDate?: string
  onSubmit: (startDate: Date, endDate: Date) => Promise<{ success: boolean; error?: string }>
}

// ============================================================================
// Utility Functions
// ============================================================================

function calculateDefaultDates(
  billingFrequency?: BillingFrequency,
  lastCycleEndDate?: string
): { startDate: string; endDate: string } {
  const today = new Date()
  let startDate: Date
  let endDate: Date

  if (lastCycleEndDate) {
    // Start from the day after the last cycle ended
    startDate = new Date(lastCycleEndDate)
    startDate.setDate(startDate.getDate() + 1)
  } else {
    // First cycle - start from today
    startDate = today
  }

  // Calculate end date based on billing frequency
  endDate = new Date(startDate)
  switch (billingFrequency) {
    case 'MONTHLY':
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(endDate.getDate() - 1)
      break
    case 'QUARTERLY':
      endDate.setMonth(endDate.getMonth() + 3)
      endDate.setDate(endDate.getDate() - 1)
      break
    case 'YEARLY':
      endDate.setFullYear(endDate.getFullYear() + 1)
      endDate.setDate(endDate.getDate() - 1)
      break
    case 'USAGE_BASED':
    default:
      // Default to monthly for usage-based
      endDate.setMonth(endDate.getMonth() + 1)
      endDate.setDate(endDate.getDate() - 1)
      break
  }

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  }
}

function formatFrequencyLabel(frequency?: BillingFrequency): string {
  switch (frequency) {
    case 'MONTHLY':
      return 'Monthly'
    case 'QUARTERLY':
      return 'Quarterly'
    case 'YEARLY':
      return 'Yearly'
    case 'USAGE_BASED':
      return 'Usage-Based'
    default:
      return 'Monthly'
  }
}

// ============================================================================
// Component
// ============================================================================

export function CreatePaymentCycleDialog({
  open,
  onOpenChange,
  subscriptionId,
  subscriptionName,
  billingFrequency,
  lastCycleEndDate,
  onSubmit,
}: CreatePaymentCycleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultDates = useMemo(
    () => calculateDefaultDates(billingFrequency, lastCycleEndDate),
    [billingFrequency, lastCycleEndDate]
  )

  const form = useForm<CreateCycleFormData>({
    resolver: zodResolver(createCycleSchema),
    defaultValues: {
      cycle_start_date: defaultDates.startDate,
      cycle_end_date: defaultDates.endDate,
    },
  })

  const handleSubmit = async (data: CreateCycleFormData) => {
    setIsSubmitting(true)
    try {
      const result = await onSubmit(
        new Date(data.cycle_start_date),
        new Date(data.cycle_end_date)
      )
      
      if (result.success) {
        toast.success('Payment cycle created successfully')
        form.reset()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to create payment cycle')
      }
    } catch (error) {
      console.error('Create payment cycle error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Calculate invoice deadline preview
  const cycleEndDate = form.watch('cycle_end_date')
  const invoiceDeadline = useMemo(() => {
    if (!cycleEndDate) return null
    const date = new Date(cycleEndDate)
    const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0)
    return lastDay.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }, [cycleEndDate])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create Payment Cycle
          </DialogTitle>
          <DialogDescription>
            {subscriptionName 
              ? `Creating new payment cycle for ${subscriptionName}`
              : 'Create a new payment cycle for this subscription'}
          </DialogDescription>
        </DialogHeader>

        {billingFrequency && (
          <div className="bg-muted p-3 rounded-md text-sm">
            <p className="text-muted-foreground">
              Billing Frequency: <strong>{formatFrequencyLabel(billingFrequency)}</strong>
            </p>
            {lastCycleEndDate && (
              <p className="text-muted-foreground mt-1">
                Last cycle ended: <strong>{new Date(lastCycleEndDate).toLocaleDateString('en-IN')}</strong>
              </p>
            )}
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="cycle_start_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cycle Start Date *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cycle_end_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cycle End Date *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="date"
                        className="pl-10"
                        {...field}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    This determines the billing period for this cycle
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {invoiceDeadline && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="text-muted-foreground">
                  Invoice Upload Deadline: <strong>{invoiceDeadline}</strong>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  (End of month of cycle end date)
                </p>
              </div>
            )}

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
                Create Cycle
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
