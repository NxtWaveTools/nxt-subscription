// ============================================================================
// Finance Payment Cycle Actions
// Server actions for Finance role to manage payment cycles
// ============================================================================

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, hasAnyRole } from '@/lib/auth/user'
import { subscriptionSchemas } from '@/lib/validation/schemas'
import { FINANCE_ROUTES } from '@/lib/constants'
import {
  calculateNextCycleDates,
  calculateInvoiceDeadline,
  formatDateForDB,
} from '@/lib/utils/cycle-calculator'
import { fetchLatestPaymentCycle } from '@/lib/data-access/subscription-payments'
import type { BillingFrequency } from '@/lib/constants'

// ============================================================================
// Types
// ============================================================================

type ActionResponse<T = unknown> = {
  success: boolean
  error?: string
  data?: T
}

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Require FINANCE or ADMIN role
 */
async function requireFinanceOrAdmin() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  if (!hasAnyRole(user, ['ADMIN', 'FINANCE'])) {
    throw new Error('Only FINANCE or ADMIN can manage payment cycles')
  }
  return user
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Create a new payment cycle for a subscription
 * Automatically calculates dates based on last cycle and billing frequency
 */
export async function createNewPaymentCycle(
  subscriptionId: string,
  startDate: Date,
  endDate: Date
): Promise<ActionResponse> {
  try {
    const currentUser = await requireFinanceOrAdmin()

    // Validate subscription ID
    subscriptionSchemas.subscriptionId.parse(subscriptionId)

    const supabase = await createClient()

    // Fetch subscription to verify it exists and get billing info
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id, subscription_id, billing_frequency, status')
      .eq('id', subscriptionId)
      .single()

    if (subError || !subscription) {
      return {
        success: false,
        error: 'Subscription not found',
      }
    }

    if (subscription.status !== 'ACTIVE') {
      return {
        success: false,
        error: 'Can only create cycles for active subscriptions',
      }
    }

    // Get the latest payment cycle to determine next cycle number
    const latestCycle = await fetchLatestPaymentCycle(subscriptionId)
    const nextCycleNumber = latestCycle ? latestCycle.cycle_number + 1 : 1

    // Calculate invoice deadline (same as cycle end date)
    const invoiceDeadline = calculateInvoiceDeadline(endDate)

    // Create the payment cycle
    // First cycle: PAID (already paid when subscription created)
    // Renewal cycles (2+): PENDING (waiting for POC approval)
    const { data: newCycle, error: cycleError } = await supabase
      .from('subscription_payments')
      .insert({
        subscription_id: subscriptionId,
        cycle_number: nextCycleNumber,
        cycle_start_date: formatDateForDB(startDate),
        cycle_end_date: formatDateForDB(endDate),
        invoice_deadline: formatDateForDB(invoiceDeadline),
        poc_approval_status: nextCycleNumber === 1 ? 'APPROVED' : 'PENDING',
        cycle_status: nextCycleNumber === 1 ? 'PAID' : 'PENDING',
        payment_status: nextCycleNumber === 1 ? 'PAID' : 'IN_PROGRESS',
        accounting_status: 'PENDING',
      })
      .select()
      .single()

    if (cycleError) {
      console.error('Create payment cycle error:', cycleError)
      return {
        success: false,
        error: 'Failed to create payment cycle',
      }
    }

    revalidatePath(FINANCE_ROUTES.SUBSCRIPTIONS)
    revalidatePath(`/finance/subscriptions/${subscriptionId}`)

    return {
      success: true,
      data: newCycle,
    }
  } catch (error) {
    console.error('Create payment cycle error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Record payment for a payment cycle
 * Finance team action to mark payment as recorded
 */
export async function recordPaymentAction(
  paymentCycleId: string,
  data: {
    payment_utr: string
    payment_status: 'PAID' | 'IN_PROGRESS' | 'DECLINED'
    accounting_status: 'PENDING' | 'DONE'
    mandate_id?: string
    remarks?: string
  }
): Promise<ActionResponse> {
  try {
    const currentUser = await requireFinanceOrAdmin()

    const supabase = await createClient()

    // Fetch the payment cycle
    const { data: cycle, error: fetchError } = await supabase
      .from('subscription_payments')
      .select('id, subscription_id, cycle_number, cycle_status')
      .eq('id', paymentCycleId)
      .single()

    if (fetchError || !cycle) {
      return {
        success: false,
        error: 'Payment cycle not found',
      }
    }

    // Update the payment cycle - status becomes PAID after recording payment
    const { error: updateError } = await supabase
      .from('subscription_payments')
      .update({
        payment_utr: data.payment_utr,
        payment_status: data.payment_status,
        accounting_status: data.accounting_status,
        mandate_id: data.mandate_id || null,
        remarks: data.remarks || null,
        payment_recorded_by: currentUser.id,
        payment_recorded_at: new Date().toISOString(),
        cycle_status: 'PAID',
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentCycleId)

    if (updateError) {
      console.error('Record payment error:', updateError)
      return {
        success: false,
        error: 'Failed to record payment',
      }
    }

    revalidatePath(FINANCE_ROUTES.SUBSCRIPTIONS)
    revalidatePath(`/finance/subscriptions/${cycle.subscription_id}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error('Record payment error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Cancel a payment cycle
 * Finance team can cancel a cycle if needed
 */
export async function cancelPaymentCycleAction(
  paymentCycleId: string,
  reason?: string
): Promise<ActionResponse> {
  try {
    const currentUser = await requireFinanceOrAdmin()

    const supabase = await createClient()

    // Fetch the payment cycle
    const { data: cycle, error: fetchError } = await supabase
      .from('subscription_payments')
      .select('id, subscription_id, cycle_number')
      .eq('id', paymentCycleId)
      .single()

    if (fetchError || !cycle) {
      return {
        success: false,
        error: 'Payment cycle not found',
      }
    }

    // Update the payment cycle to declined (cancelled by Finance)
    const { error: updateError } = await supabase
      .from('subscription_payments')
      .update({
        cycle_status: 'DECLINED',
        poc_rejection_reason: reason || 'Cancelled by Finance',
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentCycleId)

    if (updateError) {
      console.error('Cancel payment cycle error:', updateError)
      return {
        success: false,
        error: 'Failed to cancel payment cycle',
      }
    }

    revalidatePath(FINANCE_ROUTES.SUBSCRIPTIONS)
    revalidatePath(`/finance/subscriptions/${cycle.subscription_id}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error('Cancel payment cycle error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}
