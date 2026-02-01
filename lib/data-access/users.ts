// ============================================================================
// Users Data Access Layer
// ============================================================================
// Centralizes all user-related database queries

import { createClient } from '@/lib/supabase/server'
import { normalizeUserRoles } from '@/lib/utils/normalize-user-roles'
import type { UserWithRoles } from '@/lib/types'

/**
 * User filter options
 */
export interface UserFilters {
  search?: string
  roleId?: string
  departmentId?: string
  isActive?: boolean
}

/**
 * User pagination options
 */
export interface UserPaginationOptions {
  page: number
  limit: number
  offset: number
}

/**
 * User list response
 */
export interface UserListResponse {
  users: UserWithRoles[]
  totalCount: number
}

/**
 * Fetch users with filters and pagination
 * All filtering happens at database level - no in-memory filtering
 */
export async function fetchUsers(
  filters: UserFilters,
  pagination: UserPaginationOptions
): Promise<UserListResponse> {
  const supabase = await createClient()
  const { search, roleId, isActive } = filters
  const { limit, offset } = pagination

  // Build query with specific columns (no select *)
  let query = supabase
    .from('users')
    .select(
      `
      id,
      email,
      name,
      is_active,
      created_at,
      updated_at,
      user_roles!inner(
        role_id,
        roles(id, name)
      )
    `,
      { count: 'exact' }
    )

  // Apply fuzzy search if search term provided (database-level filtering)
  // Sanitize to prevent SQL injection via special LIKE characters
  if (search) {
    const sanitizedSearch = search
      .replace(/[%_\\]/g, '\\$&') // Escape %, _, and \ for LIKE patterns
      .slice(0, 100) // Limit search length
    query = query.or(`name.ilike.%${sanitizedSearch}%,email.ilike.%${sanitizedSearch}%`)
  }

  // Apply active status filter
  if (isActive !== undefined) {
    query = query.eq('is_active', isActive)
  }

  // Filter by role at database level
  if (roleId) {
    query = query.eq('user_roles.role_id', roleId)
  }

  // Apply pagination and ordering
  query = query
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch users: ${error.message}`)
  }

  // Normalize user roles (array to single object)
  const normalizedUsers = normalizeUserRoles(data || []) as UserWithRoles[]

  return {
    users: normalizedUsers,
    totalCount: count || 0,
  }
}

/**
 * Fetch a single user by ID
 */
export async function fetchUserById(userId: string): Promise<UserWithRoles | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select(
      `
      id,
      email,
      name,
      is_active,
      created_at,
      updated_at,
      user_roles(
        role_id,
        roles(id, name)
      )
    `
    )
    .eq('id', userId)
    .single()

  if (error || !data) {
    return null
  }

  const [normalized] = normalizeUserRoles([data])
  return normalized as UserWithRoles
}

/**
 * Fetch all roles for dropdowns
 */
export async function fetchRoles() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('roles')
    .select('id, name')
    .order('name')

  if (error) {
    throw new Error(`Failed to fetch roles: ${error.message}`)
  }

  return data || []
}

/**
 * Fetch active departments for dropdowns
 */
export async function fetchActiveDepartments() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('departments')
    .select('id, name')
    .eq('is_active', true)
    .order('name')

  if (error) {
    throw new Error(`Failed to fetch departments: ${error.message}`)
  }

  return data || []
}

/**
 * Fetch users for export (batched streaming)
 */
export async function* fetchUsersForExport(batchSize: number = 1000) {
  const supabase = await createClient()
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('users')
      .select(
        `
        id,
        email,
        name,
        is_active,
        created_at,
        user_roles(
          roles(name)
        )
      `
      )
      .range(offset, offset + batchSize - 1)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch users for export: ${error.message}`)
    }

    if (!data || data.length === 0) {
      hasMore = false
    } else {
      yield data
      offset += batchSize
      hasMore = data.length === batchSize
    }
  }
}
