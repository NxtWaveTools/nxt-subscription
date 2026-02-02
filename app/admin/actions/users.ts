'use server'

// ============================================================================
// User Management Server Actions
// ============================================================================

import { revalidatePath } from 'next/cache'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/user'
import { adminSchemas } from '@/lib/validation/schemas'
import { ADMIN_ROUTES, BULK_BATCH_SIZE, ROLE_IDS } from '@/lib/constants'

type ActionResponse<T = unknown> = {
  success: boolean
  error?: string
  data?: T
  warning?: string
}

/**
 * Create a new user manually
 */
export async function createUser(data: {
  email: string
  name: string
  isActive: boolean
  roleIds: string[]
}): Promise<ActionResponse> {
  try {
    // Permission check
    await requireAdmin()

    // Validate input
    if (!data.name || data.name.trim() === '') {
      return { success: false, error: 'Name is required' }
    }

    // Enforce single role per user
    if (data.roleIds.length > 1) {
      return { success: false, error: 'Users can only have one role' }
    }

    const adminClient = createAdminClient()

    // Normalize email to lowercase for comparison
    const normalizedEmail = data.email.toLowerCase().trim()

    // Check if user already exists in auth (case-insensitive)
    const { data: existingAuthUser } = await adminClient.auth.admin.listUsers()
    const userExists = existingAuthUser.users.some(
      u => u.email?.toLowerCase() === normalizedEmail
    )

    if (userExists) {
      return { success: false, error: 'User with this email already exists' }
    }

    // Create user in auth.users (will auto-sync to public.users via trigger)
    const { data: authUser, error: authError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: data.name,
      },
    })

    if (authError || !authUser.user) {
      return { success: false, error: authError?.message || 'Failed to create user' }
    }

    // Update is_active status in public.users (trigger creates with is_active=false)
    if (data.isActive) {
      const { error: updateError } = await adminClient
        .from('users')
        .update({ is_active: true })
        .eq('id', authUser.user.id)

      if (updateError) {
        return {
          success: true,
          warning: 'User created but failed to activate: ' + updateError.message,
        }
      }
    }

    // Assign role if provided (only one role allowed)
    if (data.roleIds.length === 1) {
      const { error: roleError } = await adminClient
        .from('user_roles')
        .insert({
          user_id: authUser.user.id,
          role_id: data.roleIds[0],
        })

      if (roleError) {
        // User created but role failed - return warning
        return {
          success: true,
          warning: 'User created but failed to assign role: ' + roleError.message,
        }
      }
    }

    revalidatePath(ADMIN_ROUTES.USERS)
    
    return { success: true, data: { id: authUser.user.id } }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user',
    }
  }
}

/**
 * Activate or deactivate a user
 */
export async function toggleUserActive(
  userId: string,
  isActive: boolean
): Promise<ActionResponse> {
  try {
    // Permission check
    const currentUser = await requireAdmin()

    // Prevent self-deactivation
    if (currentUser.id === userId && !isActive) {
      return { success: false, error: 'You cannot deactivate your own account' }
    }

    // Validate input
    const validation = adminSchemas.activateUser.safeParse({ user_id: userId, is_active: isActive })
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message).join(', ')
      return { success: false, error: errors }
    }
    const validated = validation.data

    // Update user
    const supabase = await createClient()
    const { error } = await supabase
      .from('users')
      .update({ is_active: validated.is_active })
      .eq('id', validated.user_id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath(ADMIN_ROUTES.USERS)
    
    return {
      success: true,
      data: { userId, isActive },
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user status',
    }
  }
}

/**
 * Bulk activate or deactivate users (batched processing)
 */
export async function bulkToggleUsersActive(
  userIds: string[],
  isActive: boolean
): Promise<ActionResponse<{ processed: number; failed: number }>> {
  try {
    // Permission check
    const currentUser = await requireAdmin()

    // Prevent self-deactivation in bulk operations
    if (!isActive && userIds.includes(currentUser.id)) {
      return { success: false, error: 'You cannot deactivate your own account' }
    }

    // Validate input
    const validation = adminSchemas.bulkActivateUsers.safeParse({
      user_ids: userIds,
      is_active: isActive,
    })
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message).join(', ')
      return { success: false, error: errors }
    }
    const validated = validation.data

    const supabase = await createClient()
    let processed = 0
    let failed = 0

    // Process in batches
    for (let i = 0; i < validated.user_ids.length; i += BULK_BATCH_SIZE) {
      const batch = validated.user_ids.slice(i, i + BULK_BATCH_SIZE)

      const { error } = await supabase
        .from('users')
        .update({ is_active: validated.is_active })
        .in('id', batch)

      if (error) {
        failed += batch.length
      } else {
        processed += batch.length
      }
    }

    revalidatePath(ADMIN_ROUTES.USERS)
    
    return {
      success: failed === 0,
      data: { processed, failed },
      warning: failed > 0 ? `${failed} users failed to update` : undefined,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bulk update users',
    }
  }
}

/**
 * Assign a role to a user (replaces existing role)
 */
export async function assignRoleToUser(
  userId: string,
  roleId: string
): Promise<ActionResponse> {
  try {
    // Permission check
    const currentUser = await requireAdmin()

    // Prevent self-role-change to non-admin/finance roles (would lock out)
    const isAdminOrFinanceRole = roleId === ROLE_IDS.ADMIN || roleId === ROLE_IDS.FINANCE
    if (currentUser.id === userId && !isAdminOrFinanceRole) {
      return { success: false, error: 'You cannot change your own role to a non-admin role' }
    }

    // Validate input
    const validation = adminSchemas.assignRole.safeParse({ user_id: userId, role_id: roleId })
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message).join(', ')
      return { success: false, error: errors }
    }
    const validated = validation.data

    const supabase = await createClient()

    // Check current role
    const { data: currentRole } = await supabase
      .from('user_roles')
      .select('role_id, roles(name)')
      .eq('user_id', validated.user_id)
      .single()

    // Check if user already has this exact role
    if (currentRole?.role_id === validated.role_id) {
      return {
        success: false,
        error: 'User already has this role',
      }
    }

    const { data: targetRole } = await supabase
      .from('roles')
      .select('name')
      .eq('id', validated.role_id)
      .single()

    let warning: string | undefined

    if (currentRole?.roles?.name === 'ADMIN' && (targetRole?.name === 'HOD' || targetRole?.name === 'POC')) {
      warning = `Replacing ADMIN role with ${targetRole.name}. ADMIN has full access, consider keeping ADMIN role.`
    }

    // Upsert role (insert or update) - proper single role implementation
    const { error } = await supabase
      .from('user_roles')
      .upsert(
        { user_id: validated.user_id, role_id: validated.role_id },
        { onConflict: 'user_id' }
      )

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath(ADMIN_ROUTES.USERS)
    
    return {
      success: true,
      warning,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to assign role',
    }
  }
}

/**
 * Remove a role from a user
 */
export async function removeRoleFromUser(
  userId: string,
  roleId: string
): Promise<ActionResponse> {
  try {
    // Permission check
    await requireAdmin()

    // Validate input
    const validation = adminSchemas.removeRole.safeParse({ user_id: userId, role_id: roleId })
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message).join(', ')
      return { success: false, error: errors }
    }
    const validated = validation.data

    const supabase = await createClient()
    const { error } = await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', validated.user_id)
      .eq('role_id', validated.role_id)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath(ADMIN_ROUTES.USERS)
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to remove role',
    }
  }
}

/**
 * Bulk assign role to multiple users (batched processing)
 */
export async function bulkAssignRoleToUsers(
  userIds: string[],
  roleId: string
): Promise<ActionResponse<{ processed: number; failed: number; skipped: number }>> {
  try {
    // Permission check
    const currentUser = await requireAdmin()

    // Prevent self-role-change to non-admin/finance roles in bulk operations
    const isAdminOrFinanceRole = roleId === ROLE_IDS.ADMIN || roleId === ROLE_IDS.FINANCE
    if (userIds.includes(currentUser.id) && !isAdminOrFinanceRole) {
      return { success: false, error: 'You cannot change your own role to a non-admin role' }
    }

    // Validate input
    const validation = adminSchemas.bulkAssignRole.safeParse({
      user_ids: userIds,
      role_id: roleId,
    })
    if (!validation.success) {
      const errors = validation.error.issues.map((e) => e.message).join(', ')
      return { success: false, error: errors }
    }
    const validated = validation.data

    const supabase = await createClient()
    let processed = 0
    let failed = 0
    let skipped = 0

    // Process in batches
    for (let i = 0; i < validated.user_ids.length; i += BULK_BATCH_SIZE) {
      const batch = validated.user_ids.slice(i, i + BULK_BATCH_SIZE)

      // Get existing role assignments for this batch
      const { data: existing } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('user_id', batch)
        .eq('role_id', validated.role_id)

      const existingUserIds = new Set(existing?.map((e: { user_id: string }) => e.user_id) || [])
      const newAssignments = batch
        .filter((uid) => !existingUserIds.has(uid))
        .map((uid) => ({ user_id: uid, role_id: validated.role_id }))

      skipped += batch.length - newAssignments.length

      if (newAssignments.length > 0) {
        const { error } = await supabase.from('user_roles').insert(newAssignments)

        if (error) {
          failed += newAssignments.length
        } else {
          processed += newAssignments.length
        }
      }
    }

    revalidatePath(ADMIN_ROUTES.USERS)
    return {
      success: failed === 0,
      data: { processed, failed, skipped },
      warning:
        skipped > 0 || failed > 0
          ? `${skipped} already had role, ${failed} failed to assign`
          : undefined,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to bulk assign roles',
    }
  }
}

/**
 * Update user profile (name, email)
 */
export async function updateUserProfile(
  userId: string,
  data: { name?: string }
): Promise<ActionResponse> {
  try {
    // Permission check
    const currentUser = await requireAdmin()

    // Validate name is provided
    if (!data.name || data.name.trim() === '') {
      return { success: false, error: 'Name is required' }
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from('users')
      .update({ name: data.name.trim() })
      .eq('id', userId)

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath(ADMIN_ROUTES.USERS)
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update user',
    }
  }
}

/**
 * Delete a user
 */
export async function deleteUser(userId: string): Promise<ActionResponse> {
  try {
    // Permission check
    const currentUser = await requireAdmin()

    // Prevent self-deletion
    if (currentUser.id === userId) {
      return { success: false, error: 'You cannot delete your own account' }
    }

    // Use admin client for auth.admin operations
    const adminClient = createAdminClient()

    // Delete user from auth.users (will cascade to public.users via trigger)
    const { error } = await adminClient.auth.admin.deleteUser(userId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(ADMIN_ROUTES.USERS)
    
    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete user',
    }
  }
}
