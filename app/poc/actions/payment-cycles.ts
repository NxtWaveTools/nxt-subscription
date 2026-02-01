// ============================================================================
// POC Payment Cycle Actions
// Server actions for POC role to approve/decline payment cycles
// ============================================================================

'use server'

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getCurrentUser, hasAnyRole } from '@/lib/auth/user'
import { POC_ROUTES } from '@/lib/constants'

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
 * Require POC role and verify department access
 */
async function requirePOCWithDepartmentAccess(departmentId: string) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  
  // Admin can also perform POC actions
  if (hasAnyRole(user, ['ADMIN'])) {
    return user
  }
  
  if (!hasAnyRole(user, ['POC'])) {
    throw new Error('Only POC can perform this action')
  }

  // Verify POC has access to this department (use admin client to bypass RLS)
  const adminClient = createAdminClient()
  const { data: access } = await adminClient
    .from('poc_department_access')
    .select('poc_id, department_id')
    .eq('poc_id', user.id)
    .eq('department_id', departmentId)
    .single()

  if (!access) {
    throw new Error('You do not have access to this department')
  }

  return user
}

// ============================================================================
// Actions
// ============================================================================

/**
 * Approve a payment cycle (POC action)
 * Changes cycle status from PENDING to APPROVED
 */
export async function approveCycleAction(
  paymentCycleId: string
): Promise<ActionResponse> {
  try {
    // Use admin client to bypass RLS for this action
    const supabase = createAdminClient()

    // Fetch the payment cycle with subscription to verify department access
    const { data: cycle, error: fetchError } = await supabase
      .from('subscription_payments')
      .select(`
        id, 
        subscription_id, 
        cycle_number, 
        cycle_status,
        subscriptions!inner(department_id)
      `)
      .eq('id', paymentCycleId)
      .single()

    if (fetchError || !cycle) {
      return {
        success: false,
        error: 'Payment cycle not found',
      }
    }

    // Verify POC has access to this department
    const departmentId = (cycle.subscriptions as { department_id: string }).department_id
    const currentUser = await requirePOCWithDepartmentAccess(departmentId)

    // Verify cycle is in PENDING status
    if (cycle.cycle_status !== 'PENDING') {
      return {
        success: false,
        error: `Cannot approve cycle in ${cycle.cycle_status} status. Only PENDING cycles can be approved.`,
      }
    }

    // Update the payment cycle
    const { error: updateError } = await supabase
      .from('subscription_payments')
      .update({
        cycle_status: 'APPROVED',
        poc_approval_status: 'APPROVED',
        poc_approved_by: currentUser.id,
        poc_approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentCycleId)

    if (updateError) {
      console.error('Approve cycle error:', updateError)
      return {
        success: false,
        error: 'Failed to approve cycle',
      }
    }

    revalidatePath(POC_ROUTES.SUBSCRIPTIONS)
    revalidatePath(`/poc/subscriptions/${cycle.subscription_id}`)
    revalidatePath(`/finance/subscriptions/${cycle.subscription_id}`)
    revalidatePath(`/admin/subscriptions/${cycle.subscription_id}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error('Approve cycle error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Decline a payment cycle (POC action)
 * Changes cycle status from PENDING to DECLINED
 */
export async function declineCycleAction(
  paymentCycleId: string,
  reason: string
): Promise<ActionResponse> {
  try {
    if (!reason || reason.trim().length === 0) {
      return {
        success: false,
        error: 'Rejection reason is required',
      }
    }

    // Use admin client to bypass RLS for this action
    const supabase = createAdminClient()

    // Fetch the payment cycle with subscription to verify department access
    const { data: cycle, error: fetchError } = await supabase
      .from('subscription_payments')
      .select(`
        id, 
        subscription_id, 
        cycle_number, 
        cycle_status,
        subscriptions!inner(department_id)
      `)
      .eq('id', paymentCycleId)
      .single()

    if (fetchError || !cycle) {
      return {
        success: false,
        error: 'Payment cycle not found',
      }
    }

    // Verify POC has access to this department
    const departmentId = (cycle.subscriptions as { department_id: string }).department_id
    const currentUser = await requirePOCWithDepartmentAccess(departmentId)

    // Verify cycle is in PENDING status
    if (cycle.cycle_status !== 'PENDING') {
      return {
        success: false,
        error: `Cannot decline cycle in ${cycle.cycle_status} status. Only PENDING cycles can be declined.`,
      }
    }

    // Update the payment cycle
    const { error: updateError } = await supabase
      .from('subscription_payments')
      .update({
        cycle_status: 'DECLINED',
        poc_approval_status: 'REJECTED',
        poc_approved_by: currentUser.id,
        poc_approved_at: new Date().toISOString(),
        poc_rejection_reason: reason.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentCycleId)

    if (updateError) {
      console.error('Decline cycle error:', updateError)
      return {
        success: false,
        error: 'Failed to decline cycle',
      }
    }

    revalidatePath(POC_ROUTES.SUBSCRIPTIONS)
    revalidatePath(`/poc/subscriptions/${cycle.subscription_id}`)
    revalidatePath(`/finance/subscriptions/${cycle.subscription_id}`)
    revalidatePath(`/admin/subscriptions/${cycle.subscription_id}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error('Decline cycle error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Upload invoice for a payment cycle (POC action)
 * Can upload invoice when cycle is APPROVED
 */
export async function uploadCycleInvoiceAction(
  paymentCycleId: string,
  fileId: string
): Promise<ActionResponse> {
  try {
    // Use admin client to bypass RLS for this action
    const supabase = createAdminClient()

    // Fetch the payment cycle with subscription to verify department access
    const { data: cycle, error: fetchError } = await supabase
      .from('subscription_payments')
      .select(`
        id, 
        subscription_id, 
        cycle_number, 
        cycle_status,
        subscriptions!inner(department_id)
      `)
      .eq('id', paymentCycleId)
      .single()

    if (fetchError || !cycle) {
      return {
        success: false,
        error: 'Payment cycle not found',
      }
    }

    // Verify POC has access to this department
    const departmentId = (cycle.subscriptions as { department_id: string }).department_id
    await requirePOCWithDepartmentAccess(departmentId)

    // Verify cycle is in APPROVED status (can upload invoice after approval)
    if (cycle.cycle_status !== 'APPROVED') {
      return {
        success: false,
        error: `Cannot upload invoice for cycle in ${cycle.cycle_status} status. Only APPROVED cycles can have invoices.`,
      }
    }

    // Update the payment cycle with invoice
    const { error: updateError } = await supabase
      .from('subscription_payments')
      .update({
        invoice_file_id: fileId,
        invoice_uploaded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentCycleId)

    if (updateError) {
      console.error('Upload invoice error:', updateError)
      return {
        success: false,
        error: 'Failed to upload invoice',
      }
    }

    revalidatePath(POC_ROUTES.SUBSCRIPTIONS)
    revalidatePath(`/poc/subscriptions/${cycle.subscription_id}`)
    revalidatePath(`/finance/subscriptions/${cycle.subscription_id}`)
    revalidatePath(`/admin/subscriptions/${cycle.subscription_id}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error('Upload invoice error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}
