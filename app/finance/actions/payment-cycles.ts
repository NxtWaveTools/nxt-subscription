// ============================================================================
// Finance Payment Cycle Actions
// Server actions for FINANCE role to manage payment cycles
// ============================================================================

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, hasAnyRole } from '@/lib/auth/user'
import { paymentCycleSchemas } from '@/lib/validation/schemas'
import {
  PAYMENT_CYCLE_STATUS,
  FINANCE_ROUTES,
  PAYMENT_STATUS,
  ACCOUNTING_STATUS,
} from '@/lib/constants'
import { createAuditLog, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '@/lib/utils/audit-log'
import type { SubscriptionPayment, SubscriptionPaymentWithRelations } from '@/lib/types'
import {
  createPaymentCycle,
  recordPayment as recordPaymentDA,
  fetchSubscriptionPayments,
  fetchPaymentById,
  fetchLatestPaymentCycle,
  calculateInvoiceDeadline,
} from '@/lib/data-access/subscription-payments'

// ============================================================================
// Types
// ============================================================================

type ActionResponse<T = unknown> = {
  success: boolean
  error?: string
  data?: T
}

// ============================================================================
// Permission Helper
// ============================================================================

async function requireFinance() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  if (!hasAnyRole(user, ['FINANCE'])) {
    throw new Error('Only FINANCE can perform this action')
  }
  return user
}

// ============================================================================
// Payment Cycle CRUD Operations
// ============================================================================

/**
 * Create a new payment cycle for a subscription (Finance action)
 * This is called when Finance records a payment for a billing cycle
 */
export async function createNewPaymentCycle(
  subscriptionId: string,
  cycleStartDate: Date,
  cycleEndDate: Date
): Promise<ActionResponse<SubscriptionPayment>> {
  try {
    const currentUser = await requireFinance()

    const validated = paymentCycleSchemas.createCycle.parse({
      subscription_id: subscriptionId,
      cycle_start_date: cycleStartDate,
      cycle_end_date: cycleEndDate,
    })

    const supabase = await createClient()

    // Verify subscription exists and is ACTIVE
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, subscription_id, status, billing_frequency')
      .eq('id', validated.subscription_id)
      .single()

    if (fetchError || !subscription) {
      return {
        success: false,
        error: 'Subscription not found',
      }
    }

    if (subscription.status !== 'ACTIVE') {
      return {
        success: false,
        error: `Cannot create payment cycle for subscription with status: ${subscription.status}`,
      }
    }

    // Get the latest payment cycle to determine cycle number
    const latestCycle = await fetchLatestPaymentCycle(validated.subscription_id)
    const cycleNumber = latestCycle ? latestCycle.cycle_number + 1 : 1

    // Calculate invoice deadline (end of month)
    const invoiceDeadline = calculateInvoiceDeadline(validated.cycle_end_date)

    // Create the payment cycle
    const paymentCycle = await createPaymentCycle({
      subscription_id: validated.subscription_id,
      cycle_number: cycleNumber,
      cycle_start_date: validated.cycle_start_date.toISOString().split('T')[0],
      cycle_end_date: validated.cycle_end_date.toISOString().split('T')[0],
      invoice_deadline: invoiceDeadline,
      cycle_status: PAYMENT_CYCLE_STATUS.PENDING_PAYMENT,
    })

    revalidatePath(FINANCE_ROUTES.SUBSCRIPTIONS)
    revalidatePath(FINANCE_ROUTES.DASHBOARD)
    revalidatePath(`/finance/subscriptions/${subscriptionId}`)

    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.PAYMENT_CYCLE_CREATE,
      entityType: AUDIT_ENTITY_TYPES.PAYMENT_CYCLE,
      entityId: paymentCycle.id,
      changes: {
        subscription_id: subscriptionId,
        cycle_number: cycleNumber,
        cycle_start_date: validated.cycle_start_date.toISOString().split('T')[0],
        cycle_end_date: validated.cycle_end_date.toISOString().split('T')[0],
      },
    }).catch(console.error)

    return {
      success: true,
      data: paymentCycle,
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
 * Record payment for a payment cycle (Finance action)
 * Called after Finance makes the payment
 */
export async function recordPaymentAction(
  paymentCycleId: string,
  paymentData: {
    payment_utr: string
    payment_status: 'PAID' | 'IN_PROGRESS' | 'DECLINED'
    accounting_status: 'PENDING' | 'DONE'
    mandate_id?: string | null
  }
): Promise<ActionResponse<SubscriptionPayment>> {
  try {
    const currentUser = await requireFinance()

    paymentCycleSchemas.paymentCycleId.parse(paymentCycleId)
    const validated = paymentCycleSchemas.recordPayment.parse(paymentData)

    // Get the payment cycle
    const paymentCycle = await fetchPaymentById(paymentCycleId)
    if (!paymentCycle) {
      return {
        success: false,
        error: 'Payment cycle not found',
      }
    }

    // Verify cycle is in correct status
    if (paymentCycle.cycle_status !== PAYMENT_CYCLE_STATUS.PENDING_PAYMENT) {
      return {
        success: false,
        error: `Cannot record payment for cycle with status: ${paymentCycle.cycle_status}`,
      }
    }

    // Record the payment
    const updated = await recordPaymentDA(paymentCycleId, {
      payment_utr: validated.payment_utr,
      payment_status: validated.payment_status,
      accounting_status: validated.accounting_status,
      mandate_id: validated.mandate_id || null,
      payment_recorded_by: currentUser.id,
      payment_recorded_at: new Date().toISOString(),
      // Move to next status - POC now needs to upload invoice
      cycle_status: PAYMENT_CYCLE_STATUS.PAYMENT_RECORDED,
    })

    revalidatePath(FINANCE_ROUTES.SUBSCRIPTIONS)
    revalidatePath(FINANCE_ROUTES.DASHBOARD)
    revalidatePath(`/finance/subscriptions/${paymentCycle.subscription_id}`)

    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.PAYMENT_RECORD,
      entityType: AUDIT_ENTITY_TYPES.PAYMENT_CYCLE,
      entityId: paymentCycleId,
      changes: {
        payment_utr: validated.payment_utr,
        payment_status: validated.payment_status,
        accounting_status: validated.accounting_status,
      },
    }).catch(console.error)

    return {
      success: true,
      data: updated,
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
 * Update payment status for an existing payment cycle (Finance action)
 */
export async function updatePaymentStatusAction(
  paymentCycleId: string,
  paymentData: {
    payment_status: 'PAID' | 'IN_PROGRESS' | 'DECLINED'
    accounting_status?: 'PENDING' | 'DONE'
  }
): Promise<ActionResponse<SubscriptionPayment>> {
  try {
    const currentUser = await requireFinance()

    paymentCycleSchemas.paymentCycleId.parse(paymentCycleId)
    const validated = paymentCycleSchemas.updatePaymentStatus.parse(paymentData)

    const supabase = await createClient()

    // Get the payment cycle
    const { data: paymentCycle, error: fetchError } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('id', paymentCycleId)
      .single()

    if (fetchError || !paymentCycle) {
      return {
        success: false,
        error: 'Payment cycle not found',
      }
    }

    // Update the payment status
    const updateData: Record<string, unknown> = {
      payment_status: validated.payment_status,
      updated_at: new Date().toISOString(),
    }

    if (validated.accounting_status) {
      updateData.accounting_status = validated.accounting_status
    }

    const { data: updated, error: updateError } = await supabase
      .from('subscription_payments')
      .update(updateData)
      .eq('id', paymentCycleId)
      .select()
      .single()

    if (updateError) {
      console.error('Update payment status error:', updateError)
      return {
        success: false,
        error: 'Failed to update payment status',
      }
    }

    revalidatePath(FINANCE_ROUTES.SUBSCRIPTIONS)
    revalidatePath(FINANCE_ROUTES.DASHBOARD)
    revalidatePath(`/finance/subscriptions/${paymentCycle.subscription_id}`)

    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.PAYMENT_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.PAYMENT_CYCLE,
      entityId: paymentCycleId,
      changes: {
        payment_status: validated.payment_status,
        accounting_status: validated.accounting_status,
      },
    }).catch(console.error)

    return {
      success: true,
      data: updated as SubscriptionPayment,
    }
  } catch (error) {
    console.error('Update payment status error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Get all payment cycles for a subscription (Finance view)
 */
export async function getSubscriptionPaymentCycles(
  subscriptionId: string
): Promise<ActionResponse<SubscriptionPaymentWithRelations[]>> {
  try {
    await requireFinance()

    const payments = await fetchSubscriptionPayments(subscriptionId)

    return {
      success: true,
      data: payments,
    }
  } catch (error) {
    console.error('Get payment cycles error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Get a single payment cycle by ID (Finance view)
 */
export async function getPaymentCycleById(
  paymentCycleId: string
): Promise<ActionResponse<SubscriptionPaymentWithRelations | null>> {
  try {
    await requireFinance()

    paymentCycleSchemas.paymentCycleId.parse(paymentCycleId)

    const payment = await fetchPaymentById(paymentCycleId)

    return {
      success: true,
      data: payment,
    }
  } catch (error) {
    console.error('Get payment cycle error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Cancel a payment cycle (Finance action)
 * This is used when a subscription is cancelled or payment cycle needs to be voided
 */
export async function cancelPaymentCycleAction(
  paymentCycleId: string,
  reason: string
): Promise<ActionResponse<SubscriptionPayment>> {
  try {
    const currentUser = await requireFinance()

    paymentCycleSchemas.paymentCycleId.parse(paymentCycleId)

    const supabase = await createClient()

    // Get the payment cycle
    const { data: paymentCycle, error: fetchError } = await supabase
      .from('subscription_payments')
      .select('*')
      .eq('id', paymentCycleId)
      .single()

    if (fetchError || !paymentCycle) {
      return {
        success: false,
        error: 'Payment cycle not found',
      }
    }

    // Only allow cancelling certain statuses
    const cancellableStatuses: string[] = [
      PAYMENT_CYCLE_STATUS.PENDING_PAYMENT,
      PAYMENT_CYCLE_STATUS.PAYMENT_RECORDED,
      PAYMENT_CYCLE_STATUS.PENDING_APPROVAL,
    ]

    if (!cancellableStatuses.includes(paymentCycle.cycle_status)) {
      return {
        success: false,
        error: `Cannot cancel payment cycle with status: ${paymentCycle.cycle_status}`,
      }
    }

    // Cancel the payment cycle
    const { data: updated, error: updateError } = await supabase
      .from('subscription_payments')
      .update({
        cycle_status: PAYMENT_CYCLE_STATUS.CANCELLED,
        poc_rejection_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentCycleId)
      .select()
      .single()

    if (updateError) {
      console.error('Cancel payment cycle error:', updateError)
      return {
        success: false,
        error: 'Failed to cancel payment cycle',
      }
    }

    revalidatePath(FINANCE_ROUTES.SUBSCRIPTIONS)
    revalidatePath(FINANCE_ROUTES.DASHBOARD)
    revalidatePath(`/finance/subscriptions/${paymentCycle.subscription_id}`)

    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.PAYMENT_CYCLE_CANCEL,
      entityType: AUDIT_ENTITY_TYPES.PAYMENT_CYCLE,
      entityId: paymentCycleId,
      changes: {
        status: PAYMENT_CYCLE_STATUS.CANCELLED,
        reason,
      },
    }).catch(console.error)

    return {
      success: true,
      data: updated as SubscriptionPayment,
    }
  } catch (error) {
    console.error('Cancel payment cycle error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}
