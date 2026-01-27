// ============================================================================
// POC Subscription Actions
// Server actions for POC to approve/reject subscriptions
// ============================================================================

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requirePOCForDepartment } from '@/lib/auth/permissions'
import { subscriptionSchemas } from '@/lib/validation/schemas'
import {
  SUBSCRIPTION_STATUS,
  APPROVAL_ACTIONS,
  POC_ROUTES,
} from '@/lib/constants'
import { createAuditLog, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '@/lib/utils/audit-log'
import type { Subscription } from '@/lib/types'

// ============================================================================
// Types
// ============================================================================

type ActionResponse<T = unknown> = {
  success: boolean
  error?: string
  data?: T
}

// ============================================================================
// Approval Actions
// ============================================================================

/**
 * Approve a subscription (POC action)
 */
export async function approveSubscription(
  subscriptionId: string,
  comments?: string
): Promise<ActionResponse<Subscription>> {
  try {
    subscriptionSchemas.subscriptionId.parse(subscriptionId)
    const validated = subscriptionSchemas.approve.parse({ comments })

    const supabase = await createClient()

    // Get subscription
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, status, department_id, tool_name, created_by, version')
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

    // Update subscription status to ACTIVE with optimistic locking
    const { data: updated, error: updateError } = await supabase
      .from('subscriptions')
      .update({ 
        status: SUBSCRIPTION_STATUS.ACTIVE,
        version: subscription.version + 1,
      })
      .eq('id', subscriptionId)
      .eq('version', subscription.version) // Optimistic locking
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return {
          success: false,
          error: 'This subscription was modified by another user. Please refresh and try again.',
        }
      }
      console.error('Approve subscription error:', updateError)
      return {
        success: false,
        error: 'Failed to approve subscription',
      }
    }

    if (!updated) {
      return {
        success: false,
        error: 'This subscription was modified by another user. Please refresh and try again.',
      }
    }

    // Record approval
    await supabase.from('subscription_approvals').insert({
      subscription_id: subscriptionId,
      approver_id: currentUser.id,
      action: APPROVAL_ACTIONS.APPROVED,
      comments: validated.comments || null,
    })

    revalidatePath(POC_ROUTES.DASHBOARD)
    revalidatePath(POC_ROUTES.APPROVALS)

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
    subscriptionSchemas.subscriptionId.parse(subscriptionId)
    const validated = subscriptionSchemas.reject.parse({ comments })

    const supabase = await createClient()

    // Get subscription
    const { data: subscription, error: fetchError } = await supabase
      .from('subscriptions')
      .select('id, status, department_id, tool_name, created_by, version')
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

    // Update subscription status to REJECTED with optimistic locking
    const { data: updated, error: updateError } = await supabase
      .from('subscriptions')
      .update({ 
        status: SUBSCRIPTION_STATUS.REJECTED,
        version: subscription.version + 1,
      })
      .eq('id', subscriptionId)
      .eq('version', subscription.version) // Optimistic locking
      .select()
      .single()

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return {
          success: false,
          error: 'This subscription was modified by another user. Please refresh and try again.',
        }
      }
      console.error('Reject subscription error:', updateError)
      return {
        success: false,
        error: 'Failed to reject subscription',
      }
    }

    if (!updated) {
      return {
        success: false,
        error: 'This subscription was modified by another user. Please refresh and try again.',
      }
    }

    // Record rejection
    await supabase.from('subscription_approvals').insert({
      subscription_id: subscriptionId,
      approver_id: currentUser.id,
      action: APPROVAL_ACTIONS.REJECTED,
      comments: validated.comments,
    })

    revalidatePath(POC_ROUTES.DASHBOARD)
    revalidatePath(POC_ROUTES.APPROVALS)

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
