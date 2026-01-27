// ============================================================================
// Subscription Server Actions
// Admin operations for subscription management with approval workflow
// ============================================================================

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin, getCurrentUser, hasAnyRole, hasRole } from '@/lib/auth/user'
import { subscriptionSchemas } from '@/lib/validation/schemas'
import {
  SUBSCRIPTION_STATUS,
  SUBSCRIPTION_ROUTES,
  NOTIFICATION_TYPES,
  APPROVAL_ACTIONS,
} from '@/lib/constants'
import { createAuditLog, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '@/lib/utils/audit-log'
import { getSubscriptionStatus } from '@/lib/data-access/subscriptions'
import type { Subscription, SubscriptionInsert, SubscriptionUpdate } from '@/lib/types'

// ============================================================================
// Types
// ============================================================================

type ActionResponse<T = unknown> = {
  success: boolean
  error?: string
  data?: T
  warning?: string
}

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Require FINANCE or ADMIN role for creating/editing subscriptions
 */
async function requireFinanceOrAdmin() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  if (!hasAnyRole(user, ['ADMIN', 'FINANCE'])) {
    throw new Error('Only FINANCE or ADMIN can create or edit subscriptions')
  }
  return user
}

/**
 * Require POC role for approving subscriptions
 */
async function requirePOCForDepartment(departmentId: string) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }

  // ADMIN can approve on behalf of POC
  if (hasRole(user, 'ADMIN')) {
    return user
  }

  if (!hasRole(user, 'POC')) {
    throw new Error('Only POC can approve or reject subscriptions')
  }

  // Check if POC has access to this department
  const supabase = await createClient()
  const { data: pocAccess } = await supabase
    .from('poc_department_access')
    .select('department_id')
    .eq('poc_id', user.id)
    .eq('department_id', departmentId)
    .maybeSingle()

  if (!pocAccess) {
    throw new Error('You are not the POC for this department')
  }

  return user
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create notifications for POCs when a subscription is created
 */
async function notifyPOCsOfNewSubscription(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subscriptionId: string,
  toolName: string,
  departmentId: string
) {
  // Get POCs for this department
  const { data: pocs } = await supabase
    .from('poc_department_access')
    .select('poc_id')
    .eq('department_id', departmentId)

  if (!pocs || pocs.length === 0) return

  // TODO: Implement notifications table
  // For now, notifications are not persisted - will be added when notifications feature is built
  console.log(`[NOTIFICATION] Approval request for subscription ${subscriptionId} sent to ${pocs.length} POCs`)
}

/**
 * Notify the creator of approval decision
 */
async function notifyCreatorOfDecision(
  supabase: Awaited<ReturnType<typeof createClient>>,
  subscriptionId: string,
  toolName: string,
  creatorId: string,
  action: 'APPROVED' | 'REJECTED',
  approverName: string
) {
  // TODO: Implement notifications table
  // For now, notifications are not persisted - will be added when notifications feature is built
  console.log(`[NOTIFICATION] Subscription ${subscriptionId} ${action} - notifying creator ${creatorId}`)
}

// ============================================================================
// Subscription CRUD Operations
// ============================================================================

/**
 * Create a new subscription (FINANCE creates for departments)
 */
export async function createSubscription(
  data: SubscriptionInsert
): Promise<ActionResponse<Subscription>> {
  try {
    const currentUser = await requireFinanceOrAdmin()

    // Validate input
    const validated = subscriptionSchemas.create.parse(data)

    const supabase = await createClient()

    // Verify department exists
    const { data: department, error: deptError } = await supabase
      .from('departments')
      .select('id, name')
      .eq('id', validated.department_id)
      .eq('is_active', true)
      .maybeSingle()

    if (deptError || !department) {
      return {
        success: false,
        error: 'Invalid or inactive department',
      }
    }

    // Verify location exists if provided
    if (validated.location_id) {
      const { data: location, error: locError } = await supabase
        .from('locations')
        .select('id, name')
        .eq('id', validated.location_id)
        .eq('is_active', true)
        .maybeSingle()

      if (locError || !location) {
        return {
          success: false,
          error: 'Invalid or inactive location',
        }
      }
    }

    // Create subscription with PENDING status
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        request_type: validated.request_type,
        tool_name: validated.tool_name,
        vendor_name: validated.vendor_name,
        product_id: validated.product_id || null,
        department_id: validated.department_id,
        location_id: validated.location_id || null,
        amount: validated.amount,
        equivalent_inr_amount: validated.equivalent_inr_amount || null,
        currency: validated.currency,
        billing_frequency: validated.billing_frequency,
        start_date: validated.start_date.toISOString().split('T')[0],
        end_date: validated.end_date ? validated.end_date.toISOString().split('T')[0] : null,
        login_url: validated.login_url || null,
        subscription_email: validated.subscription_email || null,
        poc_email: validated.poc_email || null,
        mandate_id: validated.mandate_id || null,
        budget_period: validated.budget_period || null,
        payment_utr: validated.payment_utr || null,
        requester_remarks: validated.requester_remarks || null,
        // subscription_id is auto-generated by database trigger
        status: SUBSCRIPTION_STATUS.PENDING,
        payment_status: validated.payment_status || 'IN_PROGRESS',
        accounting_status: validated.accounting_status || 'PENDING',
        created_by: currentUser.id,
        version: 1,
      })
      .select()
      .single()

    if (error) {
      console.error('Create subscription error:', error)
      return {
        success: false,
        error: 'Failed to create subscription',
      }
    }

    revalidatePath(SUBSCRIPTION_ROUTES.SUBSCRIPTIONS)
    revalidatePath(SUBSCRIPTION_ROUTES.APPROVALS)

    // Notify POCs of new subscription
    await notifyPOCsOfNewSubscription(
      supabase,
      subscription.id,
      subscription.tool_name,
      subscription.department_id
    )

    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.SUBSCRIPTION_CREATE,
      entityType: AUDIT_ENTITY_TYPES.SUBSCRIPTION,
      entityId: subscription.id,
      changes: validated,
    }).catch(console.error)

    return {
      success: true,
      data: subscription as Subscription,
    }
  } catch (error) {
    console.error('Create subscription error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Update a subscription
 * If status is ACTIVE, it will be set back to PENDING for re-approval
 */
export async function updateSubscription(
  subscriptionId: string,
  updates: SubscriptionUpdate
): Promise<ActionResponse<Subscription>> {
  try {
    const currentUser = await requireFinanceOrAdmin()

    // Validate ID
    subscriptionSchemas.subscriptionId.parse(subscriptionId)

    // Validate updates
    const validated = subscriptionSchemas.update.parse(updates)

    const supabase = await createClient()

    // Get current subscription
    const { data: existing, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, status, version, tool_name, department_id, created_by')
      .eq('id', subscriptionId)
      .single()

    if (fetchError || !existing) {
      return {
        success: false,
        error: 'Subscription not found',
      }
    }

    // Check if editing an ACTIVE subscription requires re-approval
    const requiresReApproval = existing.status === SUBSCRIPTION_STATUS.ACTIVE

    // Build update object
    const updateData: Record<string, unknown> = {
      ...validated,
      version: existing.version + 1,
    }

    // Set status back to PENDING if it was ACTIVE
    if (requiresReApproval) {
      updateData.status = SUBSCRIPTION_STATUS.PENDING
    }

    // Update subscription
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', subscriptionId)
      .select()
      .single()

    if (error) {
      console.error('Update subscription error:', error)
      return {
        success: false,
        error: 'Failed to update subscription',
      }
    }

    revalidatePath(SUBSCRIPTION_ROUTES.SUBSCRIPTIONS)
    revalidatePath(`${SUBSCRIPTION_ROUTES.SUBSCRIPTIONS}/${subscriptionId}`)
    revalidatePath(SUBSCRIPTION_ROUTES.APPROVALS)

    // If re-approval is required, notify POCs
    if (requiresReApproval) {
      await notifyPOCsOfNewSubscription(
        supabase,
        subscription.id,
        subscription.tool_name,
        subscription.department_id
      )
    }

    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.SUBSCRIPTION_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.SUBSCRIPTION,
      entityId: subscriptionId,
      changes: {
        ...validated,
        requires_re_approval: requiresReApproval,
      },
    }).catch(console.error)

    return {
      success: true,
      data: subscription as Subscription,
      warning: requiresReApproval
        ? 'Subscription requires re-approval due to changes'
        : undefined,
    }
  } catch (error) {
    console.error('Update subscription error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Approve a subscription (POC action)
 */
export async function approveSubscription(
  subscriptionId: string,
  comments?: string
): Promise<ActionResponse<Subscription>> {
  try {
    // Validate input
    subscriptionSchemas.subscriptionId.parse(subscriptionId)
    const validated = subscriptionSchemas.approve.parse({ comments })

    const supabase = await createClient()

    // Get subscription
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, status, department_id, tool_name, created_by')
      .eq('id', subscriptionId)
      .single()

    if (fetchError || !subscription) {
      return {
        success: false,
        error: 'Subscription not found',
      }
    }

    // Check POC permission
    const currentUser = await requirePOCForDepartment(subscription.department_id)

    // Verify subscription is PENDING
    if (subscription.status !== SUBSCRIPTION_STATUS.PENDING) {
      return {
        success: false,
        error: `Subscription cannot be approved. Current status: ${subscription.status}`,
      }
    }

    // Update subscription status to ACTIVE
    const { data: updated, error: updateError } = await supabase
      .from('subscriptions')
      .update({ status: SUBSCRIPTION_STATUS.ACTIVE })
      .eq('id', subscriptionId)
      .select()
      .single()

    if (updateError) {
      console.error('Approve subscription error:', updateError)
      return {
        success: false,
        error: 'Failed to approve subscription',
      }
    }

    // Record approval in history
    await supabase.from('subscription_approvals').insert({
      subscription_id: subscriptionId,
      approver_id: currentUser.id,
      action: APPROVAL_ACTIONS.APPROVED,
      comments: validated.comments || null,
    })

    revalidatePath(SUBSCRIPTION_ROUTES.SUBSCRIPTIONS)
    revalidatePath(`${SUBSCRIPTION_ROUTES.SUBSCRIPTIONS}/${subscriptionId}`)
    revalidatePath(SUBSCRIPTION_ROUTES.APPROVALS)

    // Notify creator
    await notifyCreatorOfDecision(
      supabase,
      subscriptionId,
      subscription.tool_name,
      subscription.created_by,
      'APPROVED',
      currentUser.name || currentUser.email
    )

    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.SUBSCRIPTION_APPROVE,
      entityType: AUDIT_ENTITY_TYPES.SUBSCRIPTION,
      entityId: subscriptionId,
      changes: { action: 'APPROVED', comments: validated.comments },
    }).catch(console.error)

    return {
      success: true,
      data: updated as Subscription,
    }
  } catch (error) {
    console.error('Approve subscription error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Reject a subscription (POC action)
 */
export async function rejectSubscription(
  subscriptionId: string,
  comments: string
): Promise<ActionResponse<Subscription>> {
  try {
    // Validate input
    subscriptionSchemas.subscriptionId.parse(subscriptionId)
    const validated = subscriptionSchemas.reject.parse({ comments })

    const supabase = await createClient()

    // Get subscription
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, status, department_id, tool_name, created_by')
      .eq('id', subscriptionId)
      .single()

    if (fetchError || !subscription) {
      return {
        success: false,
        error: 'Subscription not found',
      }
    }

    // Check POC permission
    const currentUser = await requirePOCForDepartment(subscription.department_id)

    // Verify subscription is PENDING
    if (subscription.status !== SUBSCRIPTION_STATUS.PENDING) {
      return {
        success: false,
        error: `Subscription cannot be rejected. Current status: ${subscription.status}`,
      }
    }

    // Update subscription status to REJECTED
    const { data: updated, error: updateError } = await supabase
      .from('subscriptions')
      .update({ status: SUBSCRIPTION_STATUS.REJECTED })
      .eq('id', subscriptionId)
      .select()
      .single()

    if (updateError) {
      console.error('Reject subscription error:', updateError)
      return {
        success: false,
        error: 'Failed to reject subscription',
      }
    }

    // Record rejection in history
    await supabase.from('subscription_approvals').insert({
      subscription_id: subscriptionId,
      approver_id: currentUser.id,
      action: APPROVAL_ACTIONS.REJECTED,
      comments: validated.comments,
    })

    revalidatePath(SUBSCRIPTION_ROUTES.SUBSCRIPTIONS)
    revalidatePath(`${SUBSCRIPTION_ROUTES.SUBSCRIPTIONS}/${subscriptionId}`)
    revalidatePath(SUBSCRIPTION_ROUTES.APPROVALS)

    // Notify creator
    await notifyCreatorOfDecision(
      supabase,
      subscriptionId,
      subscription.tool_name,
      subscription.created_by,
      'REJECTED',
      currentUser.name || currentUser.email
    )

    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.SUBSCRIPTION_REJECT,
      entityType: AUDIT_ENTITY_TYPES.SUBSCRIPTION,
      entityId: subscriptionId,
      changes: { action: 'REJECTED', comments: validated.comments },
    }).catch(console.error)

    return {
      success: true,
      data: updated as Subscription,
    }
  } catch (error) {
    console.error('Reject subscription error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Cancel a subscription (ADMIN/FINANCE action)
 */
export async function cancelSubscription(
  subscriptionId: string
): Promise<ActionResponse<Subscription>> {
  try {
    const currentUser = await requireFinanceOrAdmin()

    // Validate input
    subscriptionSchemas.subscriptionId.parse(subscriptionId)

    const supabase = await createClient()

    // Get subscription
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, status, tool_name')
      .eq('id', subscriptionId)
      .single()

    if (fetchError || !subscription) {
      return {
        success: false,
        error: 'Subscription not found',
      }
    }

    // Cannot cancel if already cancelled
    if (subscription.status === SUBSCRIPTION_STATUS.CANCELLED) {
      return {
        success: false,
        error: 'Subscription is already cancelled',
      }
    }

    // Update subscription status to CANCELLED
    const { data: updated, error: updateError } = await supabase
      .from('subscriptions')
      .update({ status: SUBSCRIPTION_STATUS.CANCELLED })
      .eq('id', subscriptionId)
      .select()
      .single()

    if (updateError) {
      console.error('Cancel subscription error:', updateError)
      return {
        success: false,
        error: 'Failed to cancel subscription',
      }
    }

    revalidatePath(SUBSCRIPTION_ROUTES.SUBSCRIPTIONS)
    revalidatePath(`${SUBSCRIPTION_ROUTES.SUBSCRIPTIONS}/${subscriptionId}`)

    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.SUBSCRIPTION_CANCEL,
      entityType: AUDIT_ENTITY_TYPES.SUBSCRIPTION,
      entityId: subscriptionId,
      changes: { previous_status: subscription.status },
    }).catch(console.error)

    return {
      success: true,
      data: updated as Subscription,
    }
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Update payment status (ADMIN/FINANCE action)
 */
export async function updatePaymentStatus(
  subscriptionId: string,
  paymentStatus: string
): Promise<ActionResponse<Subscription>> {
  try {
    const currentUser = await requireFinanceOrAdmin()

    // Validate input
    subscriptionSchemas.subscriptionId.parse(subscriptionId)
    const validated = subscriptionSchemas.updatePayment.parse({ payment_status: paymentStatus })

    const supabase = await createClient()

    // Check subscription exists
    const status = await getSubscriptionStatus(subscriptionId)
    if (!status.exists) {
      return {
        success: false,
        error: 'Subscription not found',
      }
    }

    // Update payment status
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update({ payment_status: validated.payment_status })
      .eq('id', subscriptionId)
      .select()
      .single()

    if (error) {
      console.error('Update payment status error:', error)
      return {
        success: false,
        error: 'Failed to update payment status',
      }
    }

    revalidatePath(SUBSCRIPTION_ROUTES.SUBSCRIPTIONS)
    revalidatePath(`${SUBSCRIPTION_ROUTES.SUBSCRIPTIONS}/${subscriptionId}`)

    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.SUBSCRIPTION_PAYMENT_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.SUBSCRIPTION,
      entityId: subscriptionId,
      changes: { payment_status: validated.payment_status },
    }).catch(console.error)

    return {
      success: true,
      data: subscription as Subscription,
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
 * Update accounting status (ADMIN/FINANCE action)
 */
export async function updateAccountingStatus(
  subscriptionId: string,
  accountingStatus: string
): Promise<ActionResponse<Subscription>> {
  try {
    const currentUser = await requireFinanceOrAdmin()

    // Validate input
    subscriptionSchemas.subscriptionId.parse(subscriptionId)
    const validated = subscriptionSchemas.updateAccounting.parse({
      accounting_status: accountingStatus,
    })

    const supabase = await createClient()

    // Check subscription exists
    const status = await getSubscriptionStatus(subscriptionId)
    if (!status.exists) {
      return {
        success: false,
        error: 'Subscription not found',
      }
    }

    // Update accounting status
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update({ accounting_status: validated.accounting_status })
      .eq('id', subscriptionId)
      .select()
      .single()

    if (error) {
      console.error('Update accounting status error:', error)
      return {
        success: false,
        error: 'Failed to update accounting status',
      }
    }

    revalidatePath(SUBSCRIPTION_ROUTES.SUBSCRIPTIONS)
    revalidatePath(`${SUBSCRIPTION_ROUTES.SUBSCRIPTIONS}/${subscriptionId}`)

    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.SUBSCRIPTION_ACCOUNTING_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.SUBSCRIPTION,
      entityId: subscriptionId,
      changes: { accounting_status: validated.accounting_status },
    }).catch(console.error)

    return {
      success: true,
      data: subscription as Subscription,
    }
  } catch (error) {
    console.error('Update accounting status error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Delete a subscription (ADMIN only)
 */
export async function deleteSubscription(
  subscriptionId: string
): Promise<ActionResponse> {
  try {
    const currentUser = await requireAdmin()

    // Validate input
    subscriptionSchemas.subscriptionId.parse(subscriptionId)

    const supabase = await createClient()

    // Get subscription
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, tool_name')
      .eq('id', subscriptionId)
      .single()

    if (fetchError || !subscription) {
      return {
        success: false,
        error: 'Subscription not found',
      }
    }

    // Delete subscription (files and approvals will be cascaded)
    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', subscriptionId)

    if (error) {
      console.error('Delete subscription error:', error)
      return {
        success: false,
        error: 'Failed to delete subscription',
      }
    }

    revalidatePath(SUBSCRIPTION_ROUTES.SUBSCRIPTIONS)

    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.SUBSCRIPTION_DELETE,
      entityType: AUDIT_ENTITY_TYPES.SUBSCRIPTION,
      entityId: subscriptionId,
      changes: { tool_name: subscription.tool_name },
    }).catch(console.error)

    return {
      success: true,
    }
  } catch (error) {
    console.error('Delete subscription error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}
