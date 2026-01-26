// ============================================================================
// Department Server Actions
// Admin operations for department management
// ============================================================================

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/user'
import { adminSchemas } from '@/lib/validation/schemas'
import { BULK_BATCH_SIZE, ROLE_IDS } from '@/lib/constants'
import type { Database } from '@/lib/supabase/database.types'
import type { UserRoleQueryResult, SimpleUser } from '@/lib/types'

// ============================================================================
// Department CRUD Operations
// ============================================================================

/**
 * Create a new department
 */
export async function createDepartment(name: string) {
  try {
    await requireAdmin()

    // Validate input
    const validated = adminSchemas.createDepartment.parse({ name })

    const supabase = await createClient()

    // Check for duplicate name
    const { data: existing } = await supabase
      .from('departments')
      .select('id')
      .eq('name', validated.name)
      .maybeSingle()

    if (existing) {
      return {
        success: false,
        error: 'A department with this name already exists',
      }
    }

    // Create department
    const { data, error } = await supabase
      .from('departments')
      .insert({
        name: validated.name,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Create department error:', error)
      return {
        success: false,
        error: 'Failed to create department',
      }
    }

    revalidatePath('/admin/departments')
    revalidatePath('/admin')

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('Create department error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Update an existing department
 */
export async function updateDepartment(
  departmentId: string,
  updates: { name?: string; is_active?: boolean }
) {
  try {
    await requireAdmin()

    // Validate input
    const validated = adminSchemas.updateDepartment.parse({
      department_id: departmentId,
      ...updates,
    })

    const supabase = await createClient()

    // Check if department exists
    const { data: existing } = await supabase
      .from('departments')
      .select('id')
      .eq('id', validated.department_id)
      .maybeSingle()

    if (!existing) {
      return {
        success: false,
        error: 'Department not found',
      }
    }

    // If updating name, check for duplicates
    if (validated.name) {
      const { data: duplicate } = await supabase
        .from('departments')
        .select('id')
        .eq('name', validated.name)
        .neq('id', validated.department_id)
        .maybeSingle()

      if (duplicate) {
        return {
          success: false,
          error: 'A department with this name already exists',
        }
      }
    }

    // Update department
    const updateData: Database['public']['Tables']['departments']['Update'] = {
      updated_at: new Date().toISOString(),
    }
    if (validated.name) updateData.name = validated.name
    if (validated.is_active !== undefined) updateData.is_active = validated.is_active

    const { data, error } = await supabase
      .from('departments')
      .update(updateData)
      .eq('id', validated.department_id)
      .select()
      .single()

    if (error) {
      console.error('Update department error:', error)
      return {
        success: false,
        error: 'Failed to update department',
      }
    }

    revalidatePath('/admin/departments')
    revalidatePath('/admin')

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('Update department error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Toggle department active status
 */
export async function toggleDepartmentActive(departmentId: string, isActive: boolean) {
  return updateDepartment(departmentId, { is_active: isActive })
}

// ============================================================================
// Bulk Operations
// ============================================================================

/**
 * Bulk toggle departments active status (batched)
 */
export async function bulkToggleDepartmentsActive(
  departmentIds: string[],
  isActive: boolean
) {
  try {
    await requireAdmin()

    // Validate input
    const validated = adminSchemas.bulkToggleDepartments.parse({
      department_ids: departmentIds,
      is_active: isActive,
    })

    const supabase = await createClient()

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ id: string; message: string }>,
    }

    // Process in batches
    for (let i = 0; i < validated.department_ids.length; i += BULK_BATCH_SIZE) {
      const batch = validated.department_ids.slice(i, i + BULK_BATCH_SIZE)

      const { error } = await supabase
        .from('departments')
        .update({
          is_active: validated.is_active,
          updated_at: new Date().toISOString(),
        })
        .in('id', batch)

      if (error) {
        results.failed += batch.length
        batch.forEach((id) => {
          results.errors.push({ id, message: error.message })
        })
      } else {
        results.successful += batch.length
      }
    }

    revalidatePath('/admin/departments')
    revalidatePath('/admin')

    return {
      success: true,
      ...results,
    }
  } catch (error) {
    console.error('Bulk toggle departments error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Bulk soft-delete departments (batched)
 */
export async function bulkDeleteDepartments(departmentIds: string[]) {
  return bulkToggleDepartmentsActive(departmentIds, false)
}

/**
 * Delete a department (hard delete)
 * This will also remove all HOD and POC assignments
 */
export async function deleteDepartment(departmentId: string) {
  try {
    await requireAdmin()

    // Validate input
    const validated = adminSchemas.deleteDepartment.parse({
      department_id: departmentId,
    })

    const supabase = await createClient()

    // Check if department exists
    const { data: existing } = await supabase
      .from('departments')
      .select('id, name')
      .eq('id', validated.department_id)
      .maybeSingle()

    if (!existing) {
      return {
        success: false,
        error: 'Department not found',
      }
    }

    // Delete HOD assignments first (cascade may not be set)
    await supabase
      .from('hod_departments')
      .delete()
      .eq('department_id', validated.department_id)

    // Delete POC assignments
    await supabase
      .from('poc_department_access')
      .delete()
      .eq('department_id', validated.department_id)

    // Delete the department
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', validated.department_id)

    if (error) {
      console.error('Delete department error:', error)
      return {
        success: false,
        error: 'Failed to delete department',
      }
    }

    revalidatePath('/admin/departments')
    revalidatePath('/admin')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Delete department error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

// ============================================================================
// HOD Assignment Operations
// ============================================================================

/**
 * Assign HOD to department
 */
export async function assignHODToDepartment(departmentId: string, hodId: string) {
  try {
    await requireAdmin()

    // Validate input
    const validated = adminSchemas.assignHOD.parse({
      department_id: departmentId,
      hod_id: hodId,
    })

    const supabase = await createClient()

    // Verify user has HOD role
    const { data: hasRole } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', validated.hod_id)
      .eq('role_id', ROLE_IDS.HOD)
      .maybeSingle()

    if (!hasRole) {
      return {
        success: false,
        error: 'User does not have HOD role',
      }
    }

    // Check if assignment already exists
    const { data: existing } = await supabase
      .from('hod_departments')
      .select('*')
      .eq('department_id', validated.department_id)
      .eq('hod_id', validated.hod_id)
      .maybeSingle()

    if (existing) {
      return {
        success: false,
        error: 'HOD is already assigned to this department',
      }
    }

    // Create assignment
    const { data, error } = await supabase
      .from('hod_departments')
      .insert({
        department_id: validated.department_id,
        hod_id: validated.hod_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Assign HOD error:', error)
      return {
        success: false,
        error: 'Failed to assign HOD to department',
      }
    }

    revalidatePath('/admin/departments')
    revalidatePath('/admin')

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('Assign HOD error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Remove HOD from department
 */
export async function removeHODFromDepartment(departmentId: string, hodId: string) {
  try {
    await requireAdmin()

    // Validate input
    const validated = adminSchemas.removeHOD.parse({
      department_id: departmentId,
      hod_id: hodId,
    })

    const supabase = await createClient()

    const { error } = await supabase
      .from('hod_departments')
      .delete()
      .eq('department_id', validated.department_id)
      .eq('hod_id', validated.hod_id)

    if (error) {
      console.error('Remove HOD error:', error)
      return {
        success: false,
        error: 'Failed to remove HOD from department',
      }
    }

    revalidatePath('/admin/departments')
    revalidatePath('/admin')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Remove HOD error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

// ============================================================================
// POC Assignment Operations
// ============================================================================

/**
 * Assign POC to HOD (one-to-one relationship)
 */
export async function assignPOCToHOD(hodId: string, pocId: string) {
  try {
    await requireAdmin()

    // Validate input
    const validated = adminSchemas.assignPOC.parse({
      hod_id: hodId,
      poc_id: pocId,
    })

    const supabase = await createClient()

    // Verify POC has POC role
    const { data: hasRole } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', validated.poc_id)
      .eq('role_id', ROLE_IDS.POC)
      .maybeSingle()

    if (!hasRole) {
      return {
        success: false,
        error: 'User does not have POC role',
      }
    }

    // Check if HOD already has a POC
    const { data: existing } = await supabase
      .from('hod_poc_mapping')
      .select('*')
      .eq('hod_id', validated.hod_id)
      .maybeSingle()

    if (existing) {
      return {
        success: false,
        error: 'HOD already has a POC assigned. Remove existing POC first.',
      }
    }

    // Create mapping
    const { data, error } = await supabase
      .from('hod_poc_mapping')
      .insert({
        hod_id: validated.hod_id,
        poc_id: validated.poc_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Assign POC error:', error)
      return {
        success: false,
        error: 'Failed to assign POC to HOD',
      }
    }

    revalidatePath('/admin/departments')
    revalidatePath('/admin')

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('Assign POC error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Remove POC from HOD
 */
export async function removePOCFromHOD(hodId: string) {
  try {
    await requireAdmin()

    // Validate input
    const validated = adminSchemas.removePOC.parse({
      hod_id: hodId,
    })

    const supabase = await createClient()

    const { error } = await supabase
      .from('hod_poc_mapping')
      .delete()
      .eq('hod_id', validated.hod_id)

    if (error) {
      console.error('Remove POC error:', error)
      return {
        success: false,
        error: 'Failed to remove POC from HOD',
      }
    }

    revalidatePath('/admin/departments')
    revalidatePath('/admin')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Remove POC error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Grant POC access to department
 */
export async function grantPOCAccessToDepartment(pocId: string, departmentId: string) {
  try {
    await requireAdmin()

    // Validate input
    const validated = adminSchemas.grantPOCAccess.parse({
      poc_id: pocId,
      department_id: departmentId,
    })

    const supabase = await createClient()

    // Verify POC has POC role
    const { data: hasRole } = await supabase
      .from('user_roles')
      .select('role_id')
      .eq('user_id', validated.poc_id)
      .eq('role_id', ROLE_IDS.POC)
      .maybeSingle()

    if (!hasRole) {
      return {
        success: false,
        error: 'User does not have POC role',
      }
    }

    // Check if access already exists
    const { data: existing } = await supabase
      .from('poc_department_access')
      .select('*')
      .eq('poc_id', validated.poc_id)
      .eq('department_id', validated.department_id)
      .maybeSingle()

    if (existing) {
      return {
        success: false,
        error: 'POC already has access to this department',
      }
    }

    // Grant access
    const { data, error } = await supabase
      .from('poc_department_access')
      .insert({
        poc_id: validated.poc_id,
        department_id: validated.department_id,
      })
      .select()
      .single()

    if (error) {
      console.error('Grant POC access error:', error)
      return {
        success: false,
        error: 'Failed to grant POC access to department',
      }
    }

    revalidatePath('/admin/departments')
    revalidatePath('/admin')

    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('Grant POC access error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Revoke POC access from department
 */
export async function revokePOCAccessFromDepartment(pocId: string, departmentId: string) {
  try {
    await requireAdmin()

    // Validate input
    const validated = adminSchemas.revokePOCAccess.parse({
      poc_id: pocId,
      department_id: departmentId,
    })

    const supabase = await createClient()

    const { error } = await supabase
      .from('poc_department_access')
      .delete()
      .eq('poc_id', validated.poc_id)
      .eq('department_id', validated.department_id)

    if (error) {
      console.error('Revoke POC access error:', error)
      return {
        success: false,
        error: 'Failed to revoke POC access from department',
      }
    }

    revalidatePath('/admin/departments')
    revalidatePath('/admin')

    return {
      success: true,
    }
  } catch (error) {
    console.error('Revoke POC access error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

// ============================================================================
// Search Operations for HOD/POC Assignment
// ============================================================================

/**
 * Search for users with HOD role
 * Returns top 10 matching users for assignment dropdown
 */
export async function searchHODUsers(query: string, excludeIds: string[] = []) {
  try {
    await requireAdmin()

    const supabase = await createClient()

    // Search users with HOD role
    const dbQuery = supabase
      .from('user_roles')
      .select(`
        user_id,
        users!user_id (
          id,
          name,
          email,
          is_active
        )
      `)
      .eq('role_id', ROLE_IDS.HOD)

    const { data: hodUsers, error } = await dbQuery

    if (error) {
      console.error('Search HOD users error:', error)
      return { success: false, error: 'Failed to search users', data: [] }
    }

    // Filter results in memory (Supabase doesn't support nested OR on joined tables easily)
    const searchLower = query.toLowerCase().trim()
    const excludeSet = new Set(excludeIds)

    const filtered = (hodUsers || [])
      .filter((ur): ur is UserRoleQueryResult & { users: NonNullable<UserRoleQueryResult['users']> } => 
        ur.users !== null && ur.users.is_active
      )
      .filter((ur) => !excludeSet.has(ur.users.id))
      .filter((ur) => {
        if (!searchLower) return true
        const name = ur.users.name?.toLowerCase() || ''
        const email = ur.users.email.toLowerCase()
        return name.includes(searchLower) || email.includes(searchLower)
      })
      .slice(0, 10)
      .map((ur): SimpleUser => ({
        id: ur.users.id,
        name: ur.users.name,
        email: ur.users.email,
      }))

    return { success: true, data: filtered }
  } catch (error) {
    console.error('Search HOD users error:', error)
    return { success: false, error: 'An error occurred', data: [] }
  }
}

/**
 * Search for users with POC role
 * Returns top 10 matching users for assignment dropdown
 */
export async function searchPOCUsers(query: string, excludeIds: string[] = []) {
  try {
    await requireAdmin()

    const supabase = await createClient()

    // Search users with POC role
    const dbQuery = supabase
      .from('user_roles')
      .select(`
        user_id,
        users!user_id (
          id,
          name,
          email,
          is_active
        )
      `)
      .eq('role_id', ROLE_IDS.POC)

    const { data: pocUsers, error } = await dbQuery

    if (error) {
      console.error('Search POC users error:', error)
      return { success: false, error: 'Failed to search users', data: [] }
    }

    // Filter results in memory
    const searchLower = query.toLowerCase().trim()
    const excludeSet = new Set(excludeIds)

    const filtered = (pocUsers || [])
      .filter((ur): ur is UserRoleQueryResult & { users: NonNullable<UserRoleQueryResult['users']> } => 
        ur.users !== null && ur.users.is_active
      )
      .filter((ur) => !excludeSet.has(ur.users.id))
      .filter((ur) => {
        if (!searchLower) return true
        const name = ur.users.name?.toLowerCase() || ''
        const email = ur.users.email.toLowerCase()
        return name.includes(searchLower) || email.includes(searchLower)
      })
      .slice(0, 10)
      .map((ur): SimpleUser => ({
        id: ur.users.id,
        name: ur.users.name,
        email: ur.users.email,
      }))

    return { success: true, data: filtered }
  } catch (error) {
    console.error('Search POC users error:', error)
    return { success: false, error: 'An error occurred', data: [] }
  }
}
