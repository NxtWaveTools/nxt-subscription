// ============================================================================
// Location Server Actions
// Admin operations for location management
// ============================================================================

'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin, getCurrentUser, hasAnyRole } from '@/lib/auth/user'
import { locationSchemas } from '@/lib/validation/schemas'
import { BULK_BATCH_SIZE, SUBSCRIPTION_ROUTES } from '@/lib/constants'
import { createAuditLog, AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '@/lib/utils/audit-log'
import { isLocationUsedInSubscriptions } from '@/lib/data-access/locations'
import type { Location, LocationInsert, LocationUpdate } from '@/lib/types'

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
// Permission Helper
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
    throw new Error('You do not have permission to perform this action')
  }
  return user
}

// ============================================================================
// Location CRUD Operations
// ============================================================================

/**
 * Create a new location
 */
export async function createLocation(
  data: LocationInsert
): Promise<ActionResponse<Location>> {
  try {
    const currentUser = await requireFinanceOrAdmin()

    // Validate input
    const validated = locationSchemas.create.parse(data)

    const supabase = await createClient()

    // Check for duplicate name
    const { data: existing } = await supabase
      .from('locations')
      .select('id')
      .eq('name', validated.name)
      .maybeSingle()

    if (existing) {
      return {
        success: false,
        error: 'A location with this name already exists',
      }
    }

    // Create location
    const { data: location, error } = await supabase
      .from('locations')
      .insert({
        name: validated.name,
        location_type: validated.location_type,
        address: validated.address || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) {
      console.error('Create location error:', error)
      return {
        success: false,
        error: 'Failed to create location',
      }
    }

    revalidatePath(SUBSCRIPTION_ROUTES.LOCATIONS)
    revalidatePath('/admin')
    
    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.LOCATION_CREATE,
      entityType: AUDIT_ENTITY_TYPES.LOCATION,
      entityId: location.id,
      changes: { 
        name: validated.name,
        location_type: validated.location_type,
        address: validated.address,
      },
    }).catch(console.error)

    return {
      success: true,
      data: location as Location,
    }
  } catch (error) {
    console.error('Create location error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Update an existing location
 */
export async function updateLocation(
  locationId: string,
  updates: LocationUpdate
): Promise<ActionResponse<Location>> {
  try {
    const currentUser = await requireFinanceOrAdmin()

    // Validate ID
    locationSchemas.locationId.parse(locationId)
    
    // Validate updates
    const validated = locationSchemas.update.parse(updates)

    const supabase = await createClient()

    // Check if location exists
    const { data: existing } = await supabase
      .from('locations')
      .select('id, name')
      .eq('id', locationId)
      .maybeSingle()

    if (!existing) {
      return {
        success: false,
        error: 'Location not found',
      }
    }

    // If updating name, check for duplicates
    if (validated.name && validated.name !== existing.name) {
      const { data: duplicate } = await supabase
        .from('locations')
        .select('id')
        .eq('name', validated.name)
        .neq('id', locationId)
        .maybeSingle()

      if (duplicate) {
        return {
          success: false,
          error: 'A location with this name already exists',
        }
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {}
    if (validated.name !== undefined) updateData.name = validated.name
    if (validated.location_type !== undefined) updateData.location_type = validated.location_type
    if (validated.address !== undefined) updateData.address = validated.address
    if (validated.is_active !== undefined) updateData.is_active = validated.is_active

    // Update location
    const { data: location, error } = await supabase
      .from('locations')
      .update(updateData)
      .eq('id', locationId)
      .select()
      .single()

    if (error) {
      console.error('Update location error:', error)
      return {
        success: false,
        error: 'Failed to update location',
      }
    }

    revalidatePath(SUBSCRIPTION_ROUTES.LOCATIONS)
    revalidatePath('/admin')
    
    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.LOCATION_UPDATE,
      entityType: AUDIT_ENTITY_TYPES.LOCATION,
      entityId: locationId,
      changes: validated,
    }).catch(console.error)

    return {
      success: true,
      data: location as Location,
    }
  } catch (error) {
    console.error('Update location error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Toggle location active status
 */
export async function toggleLocationActive(
  locationId: string,
  isActive: boolean
): Promise<ActionResponse<Location>> {
  try {
    const currentUser = await requireFinanceOrAdmin()

    // Validate ID
    locationSchemas.locationId.parse(locationId)

    const supabase = await createClient()

    // Check if location exists
    const { data: existing } = await supabase
      .from('locations')
      .select('id, name, is_active')
      .eq('id', locationId)
      .maybeSingle()

    if (!existing) {
      return {
        success: false,
        error: 'Location not found',
      }
    }

    // Update status
    const { data: location, error } = await supabase
      .from('locations')
      .update({ is_active: isActive })
      .eq('id', locationId)
      .select()
      .single()

    if (error) {
      console.error('Toggle location error:', error)
      return {
        success: false,
        error: 'Failed to update location status',
      }
    }

    revalidatePath(SUBSCRIPTION_ROUTES.LOCATIONS)
    revalidatePath('/admin')
    
    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: isActive ? AUDIT_ACTIONS.LOCATION_ACTIVATE : AUDIT_ACTIONS.LOCATION_DEACTIVATE,
      entityType: AUDIT_ENTITY_TYPES.LOCATION,
      entityId: locationId,
      changes: { is_active: isActive, previous_status: existing.is_active },
    }).catch(console.error)

    return {
      success: true,
      data: location as Location,
    }
  } catch (error) {
    console.error('Toggle location error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Delete a location (only if not used in subscriptions)
 */
export async function deleteLocation(
  locationId: string
): Promise<ActionResponse> {
  try {
    const currentUser = await requireAdmin()

    // Validate ID
    locationSchemas.locationId.parse(locationId)

    const supabase = await createClient()

    // Check if location exists
    const { data: existing } = await supabase
      .from('locations')
      .select('id, name')
      .eq('id', locationId)
      .maybeSingle()

    if (!existing) {
      return {
        success: false,
        error: 'Location not found',
      }
    }

    // Check if location is used in any subscription
    const isUsed = await isLocationUsedInSubscriptions(locationId)
    if (isUsed) {
      return {
        success: false,
        error: 'Cannot delete location that is used in subscriptions. Deactivate it instead.',
      }
    }

    // Delete location
    const { error } = await supabase
      .from('locations')
      .delete()
      .eq('id', locationId)

    if (error) {
      console.error('Delete location error:', error)
      return {
        success: false,
        error: 'Failed to delete location',
      }
    }

    revalidatePath(SUBSCRIPTION_ROUTES.LOCATIONS)
    revalidatePath('/admin')
    
    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: AUDIT_ACTIONS.LOCATION_DELETE,
      entityType: AUDIT_ENTITY_TYPES.LOCATION,
      entityId: locationId,
      changes: { name: existing.name },
    }).catch(console.error)

    return {
      success: true,
    }
  } catch (error) {
    console.error('Delete location error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}

/**
 * Bulk toggle locations active status
 */
export async function bulkToggleLocationsActive(
  locationIds: string[],
  isActive: boolean
): Promise<ActionResponse<{ successful: number; failed: number; errors: Array<{ id: string; message: string }> }>> {
  try {
    const currentUser = await requireFinanceOrAdmin()

    // Validate input
    const validated = locationSchemas.bulkToggle.parse({
      location_ids: locationIds,
      is_active: isActive,
    })

    const supabase = await createClient()

    const results = {
      successful: 0,
      failed: 0,
      errors: [] as Array<{ id: string; message: string }>,
    }

    // Process in batches
    for (let i = 0; i < validated.location_ids.length; i += BULK_BATCH_SIZE) {
      const batch = validated.location_ids.slice(i, i + BULK_BATCH_SIZE)

      const { error } = await supabase
        .from('locations')
        .update({ is_active: validated.is_active })
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

    revalidatePath(SUBSCRIPTION_ROUTES.LOCATIONS)
    revalidatePath('/admin')

    // Audit log
    createAuditLog({
      userId: currentUser.id,
      action: isActive ? AUDIT_ACTIONS.LOCATION_ACTIVATE : AUDIT_ACTIONS.LOCATION_DEACTIVATE,
      entityType: AUDIT_ENTITY_TYPES.LOCATION,
      changes: {
        bulk_operation: true,
        location_ids: validated.location_ids,
        is_active: validated.is_active,
        successful: results.successful,
        failed: results.failed,
      },
    }).catch(console.error)

    return {
      success: results.failed === 0,
      data: results,
      warning: results.failed > 0 ? `${results.failed} location(s) failed to update` : undefined,
    }
  } catch (error) {
    console.error('Bulk toggle locations error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An error occurred',
    }
  }
}
