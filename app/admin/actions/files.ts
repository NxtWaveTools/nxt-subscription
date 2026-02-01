// ============================================================================
// Subscription Files Server Actions
// Server actions for uploading and managing subscription file attachments
// ============================================================================

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, hasAnyRole } from '@/lib/auth/user'
import { fileSchemas } from '@/lib/validation/schemas'
import { FILE_SIZE_LIMITS, FILE_TYPES, SUBSCRIPTION_ROUTES } from '@/lib/constants'
import type { SubscriptionFile } from '@/lib/types'
import type { FileType } from '@/lib/constants'

// ============================================================================
// Types
// ============================================================================

type ActionResponse<T = unknown> = {
  success: boolean
  error?: string
  data?: T
}

export interface UploadFileInput {
  subscriptionId: string
  fileType: FileType
  fileName: string
  fileSize: number
  mimeType: string
  fileData: string // Base64 encoded file data
}

export interface FileUploadResult {
  file: SubscriptionFile
  uploadUrl?: string
}

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Check if user can upload files to a subscription
 * ADMIN/FINANCE can upload to any subscription
 * POC can upload to subscriptions in their departments
 */
async function canUploadToSubscription(subscriptionId: string) {
  const user = await getCurrentUser()
  if (!user) {
    throw new Error('Authentication required')
  }

  // ADMIN and FINANCE can upload to any subscription
  if (hasAnyRole(user, ['ADMIN', 'FINANCE'])) {
    return { user, subscription: null }
  }

  // POC can only upload to their department's subscriptions
  if (hasAnyRole(user, ['POC'])) {
    const supabase = await createClient()
    
    // Get the subscription
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('id, department_id')
      .eq('id', subscriptionId)
      .single()

    if (error || !subscription) {
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
      throw new Error('You do not have permission to upload files to this subscription')
    }

    return { user, subscription }
  }

  throw new Error('You do not have permission to upload files')
}

// ============================================================================
// File Upload Operations
// ============================================================================

/**
 * Upload a file to a subscription
 */
export async function uploadSubscriptionFile(
  input: UploadFileInput
): Promise<ActionResponse<SubscriptionFile>> {
  try {
    const { user } = await canUploadToSubscription(input.subscriptionId)

    // Validate input
    const validated = fileSchemas.upload.parse({
      subscription_id: input.subscriptionId,
      file_type: input.fileType,
      original_filename: input.fileName,
      file_size: input.fileSize,
    })

    // Check file size limits
    const sizeLimit = FILE_SIZE_LIMITS[input.fileType as keyof typeof FILE_SIZE_LIMITS]
    if (input.fileSize > sizeLimit) {
      const limitMB = sizeLimit / (1024 * 1024)
      return {
        success: false,
        error: `File size exceeds the limit of ${limitMB}MB for ${input.fileType}`,
      }
    }

    const supabase = await createClient()

    // Create storage path: {subscriptionId}/{fileType}/{timestamp}_{filename}
    const timestamp = Date.now()
    const sanitizedFilename = input.fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
    const storagePath = `${input.subscriptionId}/${input.fileType}/${timestamp}_${sanitizedFilename}`

    // Convert base64 to Uint8Array
    const base64Data = input.fileData.split(',')[1] || input.fileData
    const binaryString = atob(base64Data)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('subscription-attachments')
      .upload(storagePath, bytes, {
        contentType: input.mimeType,
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
        subscription_id: validated.subscription_id,
        file_type: validated.file_type,
        file_name: validated.original_filename,
        file_path: storagePath,
        storage_path: storagePath,
        original_filename: validated.original_filename,
        file_size: input.fileSize,
        mime_type: input.mimeType,
        uploaded_by: user.id,
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

    revalidatePath(`${SUBSCRIPTION_ROUTES.SUBSCRIPTIONS}/${input.subscriptionId}`)

    return {
      success: true,
      data: fileRecord as SubscriptionFile,
    }
  } catch (error) {
    console.error('Upload file error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Delete a file from a subscription
 */
export async function deleteSubscriptionFile(
  fileId: string,
  subscriptionId: string
): Promise<ActionResponse> {
  try {
    const { user } = await canUploadToSubscription(subscriptionId)

    // Validate input
    fileSchemas.fileId.parse(fileId)

    const supabase = await createClient()

    // Get file record
    const { data: file, error: fetchError } = await supabase
      .from('subscription_files')
      .select('id, storage_path, original_filename')
      .eq('id', fileId)
      .eq('subscription_id', subscriptionId)
      .single()

    if (fetchError || !file) {
      return {
        success: false,
        error: 'File not found',
      }
    }

    // Delete from storage (handle null storage_path)
    if (file.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('subscription-attachments')
        .remove([file.storage_path])

      if (storageError) {
        console.error('Storage delete error:', storageError)
        // Continue to delete DB record anyway
      }
    }

    // Delete database record
    const { error: dbError } = await supabase
      .from('subscription_files')
      .delete()
      .eq('id', fileId)

    if (dbError) {
      console.error('Database delete error:', dbError)
      return {
        success: false,
        error: 'Failed to delete file record',
      }
    }

    revalidatePath(`${SUBSCRIPTION_ROUTES.SUBSCRIPTIONS}/${subscriptionId}`)

    return {
      success: true,
    }
  } catch (error) {
    console.error('Delete file error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Get a signed download URL for a file
 */
export async function getFileDownloadUrl(
  fileId: string,
  subscriptionId: string
): Promise<ActionResponse<{ url: string; filename: string }>> {
  try {
    await canUploadToSubscription(subscriptionId)

    // Validate input
    fileSchemas.fileId.parse(fileId)

    const supabase = await createClient()

    // Get file record
    const { data: file, error: fetchError } = await supabase
      .from('subscription_files')
      .select('id, storage_path, original_filename, file_name')
      .eq('id', fileId)
      .eq('subscription_id', subscriptionId)
      .single()

    if (fetchError || !file) {
      return {
        success: false,
        error: 'File not found',
      }
    }

    // Ensure storage_path exists
    if (!file.storage_path) {
      return {
        success: false,
        error: 'File storage path not found',
      }
    }

    // Generate signed URL (valid for 60 minutes)
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('subscription-attachments')
      .createSignedUrl(file.storage_path, 3600)

    if (urlError || !signedUrl) {
      console.error('Signed URL error:', urlError)
      return {
        success: false,
        error: 'Failed to generate download URL',
      }
    }

    return {
      success: true,
      data: {
        url: signedUrl.signedUrl,
        filename: file.original_filename || file.file_name,
      },
    }
  } catch (error) {
    console.error('Get download URL error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * List files for a subscription
 */
export async function listSubscriptionFiles(
  subscriptionId: string
): Promise<ActionResponse<SubscriptionFile[]>> {
  try {
    await canUploadToSubscription(subscriptionId)

    const supabase = await createClient()

    const { data: files, error } = await supabase
      .from('subscription_files')
      .select(
        `
        id,
        subscription_id,
        file_type,
        storage_path,
        original_filename,
        file_size,
        mime_type,
        uploaded_by,
        created_at
      `
      )
      .eq('subscription_id', subscriptionId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('List files error:', error)
      return {
        success: false,
        error: 'Failed to list files',
      }
    }

    return {
      success: true,
      data: (files || []) as SubscriptionFile[],
    }
  } catch (error) {
    console.error('List files error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}
