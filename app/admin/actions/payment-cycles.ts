// ============================================================================
// Payment Cycles Server Actions
// Server actions for updating payment cycle details
// ============================================================================

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, hasAnyRole } from '@/lib/auth/user'
import { ADMIN_ROUTES } from '@/lib/constants'

interface UpdatePaymentCycleData {
  payment_status?: 'PAID' | 'IN_PROGRESS' | 'DECLINED'
  poc_approval_status?: 'PENDING' | 'APPROVED' | 'REJECTED'
  payment_utr?: string | null
}

export async function updatePaymentCycle(
  cycleId: string,
  data: UpdatePaymentCycleData
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { success: false, error: 'Unauthorized' }
    }

    // Only ADMIN and FINANCE can update payment cycles
    if (!hasAnyRole(currentUser, ['ADMIN', 'FINANCE'])) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const supabase = await createClient()

    // Fetch current cycle to get subscription_id for revalidation
    const { data: cycle, error: fetchError } = await supabase
      .from('subscription_payments')
      .select('id, subscription_id, payment_status, poc_approval_status, payment_utr')
      .eq('id', cycleId)
      .single()

    if (fetchError || !cycle) {
      return { success: false, error: 'Payment cycle not found' }
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    
    if (data.payment_status !== undefined) {
      updateData.payment_status = data.payment_status
    }
    
    if (data.poc_approval_status !== undefined) {
      updateData.poc_approval_status = data.poc_approval_status
      // Track who approved/rejected
      if (data.poc_approval_status === 'APPROVED' || data.poc_approval_status === 'REJECTED') {
        updateData.poc_approved_by = currentUser.id
        updateData.poc_approved_at = new Date().toISOString()
      }
    }
    
    if (data.payment_utr !== undefined) {
      updateData.payment_utr = data.payment_utr
    }

    // Update the cycle
    const { error: updateError } = await supabase
      .from('subscription_payments')
      .update(updateData)
      .eq('id', cycleId)

    if (updateError) {
      console.error('Update payment cycle error:', updateError)
      return { success: false, error: 'Failed to update payment cycle' }
    }

    // Revalidate paths
    revalidatePath(ADMIN_ROUTES.SUBSCRIPTIONS)
    revalidatePath(`${ADMIN_ROUTES.SUBSCRIPTIONS}/${cycle.subscription_id}`)
    revalidatePath(`${ADMIN_ROUTES.SUBSCRIPTIONS}/${cycle.subscription_id}/edit`)

    return { success: true }
  } catch (error) {
    console.error('Update payment cycle error:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}
