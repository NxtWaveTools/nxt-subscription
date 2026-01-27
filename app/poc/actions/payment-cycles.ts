// ============================================================================
// POC Payment Cycle Actions
// Server actions for POC to approve/reject renewals and upload invoices
// ============================================================================

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, hasRole } from '@/lib/auth/user'
import { paymentCycleSchemas } from '@/lib/validation/schemas'
import {
  PAYMENT_CYCLE_STATUS,
  POC_APPROVAL_STATUS,
  POC_ROUTES,
  FINANCE_ROUTES,
} from '@/lib/constants'
import { createAuditLog, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '@/lib/utils/audit-log'
import type { SubscriptionPayment, SubscriptionPaymentWithRelations } from '@/lib/types'
import {
  approveRenewal as approveRenewalDA,
  rejectRenewal as rejectRenewalDA,
  uploadInvoice as uploadInvoiceDA,
  fetchPendingApprovalsForPOC,
  fetchPaymentById,
  fetchOverdueInvoices,
  fetchPendingInvoiceUploadsForPOC,
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
// Permission Helpers
// ============================================================================

async function requirePOC() {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }
  if (!hasRole(user, 'POC')) {
    throw new Error('Only POC can perform this action')
  }
  return user
}

async function requirePOCForSubscription(subscriptionId: string) {
  const user = await requirePOC()

  // Check if POC has access to the subscription's department
  const supabase = await createClient()

  // Get subscription's department
  const { data: subscription, error: fetchError } = await supabase
    .from('subscriptions')
    .select('department_id')
    .eq('id', subscriptionId)
    .single()

  if (fetchError || !subscription) {
    throw new Error('Subscription not found')
  }

  // Check if POC has access to this department
  const { data: pocAccess } = await supabase
    .from('poc_department_access')
    .select('department_id')
    .eq('poc_id', user.id)
    .eq('department_id', subscription.department_id)
    .maybeSingle()

  if (!pocAccess) {
    throw new Error('You are not the POC for this subscription\'s department')
  }

  return user
}

// ============================================================================
// Renewal Approval Actions
// ============================================================================

/**
 * Approve a renewal for a payment cycle (POC action)
 * Called 10 days before renewal when POC decides to continue subscription
 */
export async function approveRenewalAction(
  paymentCycleId: string,
  comments?: string
): Promise<ActionResponse<SubscriptionPayment>> {
  try {
    paymentCycleSchemas.paymentCycleId.parse(paymentCycleId)
    const validated = paymentCycleSchemas.approveRenewal.parse({ comments })

    // Get the payment cycle
    const paymentCycle = await fetchPaymentById(paymentCycleId)
    if (!paymentCycle) {
      return {
        success: false,
        error: 'Payment cycle not found',
      }
    }

    // Check POC permission for this subscription
    const currentUser = await requirePOCForSubscription(paymentCycle.subscription_id)

    // Verify cycle is in correct status for approval
    if (paymentCycle.cycle_status !== PAYMENT_CYCLE_STATUS.PENDING_APPROVAL) {
      return {
        success: false,
        error: `Cannot approve renewal for cycle with status: ${paymentCycle.cycle_status}`,
      }
    }

    // Approve the renewal
    const updated = await approveRenewalDA(paymentCycleId, {
      poc_approval_status: POC_APPROVAL_STATUS.APPROVED,
      poc_approved_by: currentUser.id,
      poc_approved_at: new Date().toISOString(),
      // Move to next status - waiting for invoice upload
      cycle_status: PAYMENT_CYCLE_STATUS.APPROVED,
    })

    revalidatePath(POC_ROUTES.DASHBOARD)
    revalidatePath(POC_ROUTES.APPROVALS)
    revalidatePath(`/poc/subscriptions/${paymentCycle.subscription_id}`)
    revalidatePath(FINANCE_ROUTES.SUBSCRIPTIONS)

    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.RENEWAL_APPROVE,
      entityType: AUDIT_ENTITY_TYPES.PAYMENT_CYCLE,
      entityId: paymentCycleId,
      changes: {
        action: 'APPROVED',
        comments: validated.comments,
      },
    }).catch(console.error)

    return {
      success: true,
      data: updated,
    }
  } catch (error) {
    console.error('Approve renewal error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Reject a renewal for a payment cycle (POC action)
 * Called when POC decides not to continue subscription
 */
export async function rejectRenewalAction(
  paymentCycleId: string,
  reason: string
): Promise<ActionResponse<SubscriptionPayment>> {
  try {
    paymentCycleSchemas.paymentCycleId.parse(paymentCycleId)
    const validated = paymentCycleSchemas.rejectRenewal.parse({ reason })

    // Get the payment cycle
    const paymentCycle = await fetchPaymentById(paymentCycleId)
    if (!paymentCycle) {
      return {
        success: false,
        error: 'Payment cycle not found',
      }
    }

    // Check POC permission for this subscription
    const currentUser = await requirePOCForSubscription(paymentCycle.subscription_id)

    // Verify cycle is in correct status for rejection
    if (paymentCycle.cycle_status !== PAYMENT_CYCLE_STATUS.PENDING_APPROVAL) {
      return {
        success: false,
        error: `Cannot reject renewal for cycle with status: ${paymentCycle.cycle_status}`,
      }
    }

    // Reject the renewal
    const updated = await rejectRenewalDA(paymentCycleId, {
      poc_approval_status: POC_APPROVAL_STATUS.REJECTED,
      poc_approved_by: currentUser.id,
      poc_approved_at: new Date().toISOString(),
      poc_rejection_reason: validated.reason,
      cycle_status: PAYMENT_CYCLE_STATUS.REJECTED,
    })

    // Also update subscription status to cancelled if this is a rejection
    const supabase = await createClient()
    await supabase
      .from('subscriptions')
      .update({
        status: 'CANCELLED',
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentCycle.subscription_id)

    revalidatePath(POC_ROUTES.DASHBOARD)
    revalidatePath(POC_ROUTES.APPROVALS)
    revalidatePath(`/poc/subscriptions/${paymentCycle.subscription_id}`)
    revalidatePath(FINANCE_ROUTES.SUBSCRIPTIONS)

    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.RENEWAL_REJECT,
      entityType: AUDIT_ENTITY_TYPES.PAYMENT_CYCLE,
      entityId: paymentCycleId,
      changes: {
        action: 'REJECTED',
        reason: validated.reason,
      },
    }).catch(console.error)

    return {
      success: true,
      data: updated,
    }
  } catch (error) {
    console.error('Reject renewal error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

// ============================================================================
// Invoice Upload Actions
// ============================================================================

/**
 * Upload invoice for a payment cycle (POC action)
 * Called after POC receives invoice from vendor
 */
export async function uploadInvoiceAction(
  paymentCycleId: string,
  fileId: string
): Promise<ActionResponse<SubscriptionPayment>> {
  try {
    paymentCycleSchemas.paymentCycleId.parse(paymentCycleId)
    const validated = paymentCycleSchemas.uploadInvoice.parse({ file_id: fileId })

    // Get the payment cycle
    const paymentCycle = await fetchPaymentById(paymentCycleId)
    if (!paymentCycle) {
      return {
        success: false,
        error: 'Payment cycle not found',
      }
    }

    // Check POC permission for this subscription
    const currentUser = await requirePOCForSubscription(paymentCycle.subscription_id)

    // Verify cycle is in correct status for invoice upload
    // Invoice can be uploaded after payment is recorded or after approval
    const allowedStatuses: string[] = [
      PAYMENT_CYCLE_STATUS.PAYMENT_RECORDED,
      PAYMENT_CYCLE_STATUS.APPROVED,
    ]

    if (!allowedStatuses.includes(paymentCycle.cycle_status)) {
      return {
        success: false,
        error: `Cannot upload invoice for cycle with status: ${paymentCycle.cycle_status}`,
      }
    }

    // Verify file exists
    const supabase = await createClient()
    const { data: file, error: fileError } = await supabase
      .from('subscription_files')
      .select('id, subscription_id')
      .eq('id', validated.file_id)
      .single()

    if (fileError || !file) {
      return {
        success: false,
        error: 'File not found',
      }
    }

    // Verify file belongs to the same subscription
    if (file.subscription_id !== paymentCycle.subscription_id) {
      return {
        success: false,
        error: 'File does not belong to this subscription',
      }
    }

    // Upload the invoice
    const updated = await uploadInvoiceDA(paymentCycleId, {
      invoice_file_id: validated.file_id,
      invoice_uploaded_at: new Date().toISOString(),
      cycle_status: PAYMENT_CYCLE_STATUS.INVOICE_UPLOADED,
    })

    revalidatePath(POC_ROUTES.DASHBOARD)
    revalidatePath(`/poc/subscriptions/${paymentCycle.subscription_id}`)
    revalidatePath(FINANCE_ROUTES.SUBSCRIPTIONS)

    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.INVOICE_UPLOAD,
      entityType: AUDIT_ENTITY_TYPES.PAYMENT_CYCLE,
      entityId: paymentCycleId,
      changes: {
        invoice_file_id: validated.file_id,
      },
    }).catch(console.error)

    return {
      success: true,
      data: updated,
    }
  } catch (error) {
    console.error('Upload invoice error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

// ============================================================================
// Query Actions
// ============================================================================

/**
 * Get pending renewal approvals for the current POC
 */
export async function getPendingApprovals(): Promise<ActionResponse<SubscriptionPaymentWithRelations[]>> {
  try {
    const currentUser = await requirePOC()

    const supabase = await createClient()

    // Get departments this POC has access to
    const { data: pocDepartments, error: deptError } = await supabase
      .from('poc_department_access')
      .select('department_id')
      .eq('poc_id', currentUser.id)

    if (deptError) {
      console.error('Error fetching POC departments:', deptError)
      return {
        success: false,
        error: 'Failed to fetch POC departments',
      }
    }

    const departmentIds = pocDepartments.map((d) => d.department_id)

    if (departmentIds.length === 0) {
      return {
        success: true,
        data: [],
      }
    }

    const pendingApprovals = await fetchPendingApprovalsForPOC(departmentIds)

    return {
      success: true,
      data: pendingApprovals,
    }
  } catch (error) {
    console.error('Get pending approvals error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Get pending invoice uploads for the current POC
 */
export async function getPendingInvoiceUploads(): Promise<ActionResponse<SubscriptionPaymentWithRelations[]>> {
  try {
    const currentUser = await requirePOC()

    const supabase = await createClient()

    // Get departments this POC has access to
    const { data: pocDepartments, error: deptError } = await supabase
      .from('poc_department_access')
      .select('department_id')
      .eq('poc_id', currentUser.id)

    if (deptError) {
      console.error('Error fetching POC departments:', deptError)
      return {
        success: false,
        error: 'Failed to fetch POC departments',
      }
    }

    const departmentIds = pocDepartments.map((d) => d.department_id)

    if (departmentIds.length === 0) {
      return {
        success: true,
        data: [],
      }
    }

    const pendingInvoices = await fetchPendingInvoiceUploadsForPOC(departmentIds)

    return {
      success: true,
      data: pendingInvoices,
    }
  } catch (error) {
    console.error('Get pending invoice uploads error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Get overdue invoices for the current POC
 */
export async function getOverdueInvoices(): Promise<ActionResponse<SubscriptionPaymentWithRelations[]>> {
  try {
    const currentUser = await requirePOC()

    const supabase = await createClient()

    // Get departments this POC has access to
    const { data: pocDepartments, error: deptError } = await supabase
      .from('poc_department_access')
      .select('department_id')
      .eq('poc_id', currentUser.id)

    if (deptError) {
      console.error('Error fetching POC departments:', deptError)
      return {
        success: false,
        error: 'Failed to fetch POC departments',
      }
    }

    const departmentIds = pocDepartments.map((d) => d.department_id)

    if (departmentIds.length === 0) {
      return {
        success: true,
        data: [],
      }
    }

    const overdueInvoices = await fetchOverdueInvoices(departmentIds)

    return {
      success: true,
      data: overdueInvoices,
    }
  } catch (error) {
    console.error('Get overdue invoices error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Get a single payment cycle by ID (POC view)
 */
export async function getPaymentCycleDetails(
  paymentCycleId: string
): Promise<ActionResponse<SubscriptionPaymentWithRelations | null>> {
  try {
    paymentCycleSchemas.paymentCycleId.parse(paymentCycleId)

    // Get the payment cycle
    const paymentCycle = await fetchPaymentById(paymentCycleId)
    if (!paymentCycle) {
      return {
        success: true,
        data: null,
      }
    }

    // Check POC permission for this subscription
    await requirePOCForSubscription(paymentCycle.subscription_id)

    return {
      success: true,
      data: paymentCycle,
    }
  } catch (error) {
    console.error('Get payment cycle details error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Upload invoice file and link to payment cycle (POC action)
 * Combined action that handles file upload to storage and database update
 */
export async function uploadInvoiceWithFile(
  formData: FormData
): Promise<ActionResponse<SubscriptionPayment>> {
  try {
    const file = formData.get('file') as File | null
    const paymentCycleId = formData.get('paymentCycleId') as string

    if (!file) {
      return {
        success: false,
        error: 'No file provided',
      }
    }

    if (!paymentCycleId) {
      return {
        success: false,
        error: 'Payment cycle ID is required',
      }
    }

    paymentCycleSchemas.paymentCycleId.parse(paymentCycleId)

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return {
        success: false,
        error: 'Invalid file type. Please upload a PDF or image file.',
      }
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      return {
        success: false,
        error: 'File size must be less than 10MB',
      }
    }

    // Get the payment cycle
    const paymentCycle = await fetchPaymentById(paymentCycleId)
    if (!paymentCycle) {
      return {
        success: false,
        error: 'Payment cycle not found',
      }
    }

    // Check POC permission for this subscription
    const currentUser = await requirePOCForSubscription(paymentCycle.subscription_id)

    // Verify cycle is in correct status for invoice upload
    const allowedStatuses: string[] = [
      PAYMENT_CYCLE_STATUS.PAYMENT_RECORDED,
      PAYMENT_CYCLE_STATUS.APPROVED,
    ]

    if (!allowedStatuses.includes(paymentCycle.cycle_status)) {
      return {
        success: false,
        error: `Cannot upload invoice for cycle with status: ${paymentCycle.cycle_status}`,
      }
    }

    const supabase = await createClient()

    // Create storage path
    const timestamp = Date.now()
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${paymentCycle.subscription_id}/INVOICE/${timestamp}_${sanitizedFilename}`

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('subscription-attachments')
      .upload(storagePath, bytes, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return {
        success: false,
        error: 'Failed to upload file to storage',
      }
    }

    // Create file record in database
    const { data: fileRecord, error: dbError } = await supabase
      .from('subscription_files')
      .insert({
        subscription_id: paymentCycle.subscription_id,
        file_type: 'INVOICE',
        file_name: file.name,
        file_path: storagePath,
        storage_path: storagePath,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type,
        uploaded_by: currentUser.id,
      })
      .select()
      .single()

    if (dbError) {
      // Try to delete the uploaded file on DB error
      await supabase.storage.from('subscription-attachments').remove([storagePath])
      console.error('Database insert error:', dbError)
      return {
        success: false,
        error: 'Failed to save file record',
      }
    }

    // Link invoice file to payment cycle
    const updated = await uploadInvoiceDA(paymentCycleId, {
      invoice_file_id: fileRecord.id,
      invoice_uploaded_at: new Date().toISOString(),
      cycle_status: PAYMENT_CYCLE_STATUS.INVOICE_UPLOADED,
    })

    revalidatePath(POC_ROUTES.DASHBOARD)
    revalidatePath(`/poc/subscriptions/${paymentCycle.subscription_id}`)
    revalidatePath(FINANCE_ROUTES.SUBSCRIPTIONS)

    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.INVOICE_UPLOAD,
      entityType: AUDIT_ENTITY_TYPES.PAYMENT_CYCLE,
      entityId: paymentCycleId,
      changes: {
        invoice_file_id: fileRecord.id,
        original_filename: file.name,
      },
    }).catch(console.error)

    return {
      success: true,
      data: updated,
    }
  } catch (error) {
    console.error('Upload invoice with file error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}
