// ============================================================================
// Departments Data Access Layer
// ============================================================================
// Centralizes all department-related database queries

import { createClient } from '@/lib/supabase/server'
import type { DepartmentWithRelations } from '@/lib/types'

/**
 * Department filter options
 */
export interface DepartmentFilters {
  search?: string
  isActive?: boolean
}

/**
 * Department pagination options
 */
export interface DepartmentPaginationOptions {
  page: number
  limit: number
  offset: number
}

/**
 * Department list response
 */
export interface DepartmentListResponse {
  departments: DepartmentWithRelations[]
  totalCount: number
}

/**
 * Fetch departments with filters and pagination
 * All filtering happens at database level - no in-memory filtering
 */
export async function fetchDepartments(
  filters: DepartmentFilters,
  pagination: DepartmentPaginationOptions
): Promise<DepartmentListResponse> {
  const supabase = await createClient()
  const { search, isActive } = filters
  const { limit, offset } = pagination

  // Build query with specific columns (no select *)
  let query = supabase
    .from('departments')
    .select(
      `
      id,
      name,
      is_active,
      created_at,
      updated_at,
      hod_departments(
        hod_id,
        users!hod_id(
          id,
          name,
          email
        )
      ),
      poc_department_access(
        poc_id,
        users!poc_id(
          id,
          name,
          email
        )
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
    query = query.or(`name.ilike.%${sanitizedSearch}%`)
  }

  // Apply active status filter
  if (isActive !== undefined) {
    query = query.eq('is_active', isActive)
  }

  // Apply pagination and ordering
  query = query
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: false })

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch departments: ${error.message}`)
  }

  return {
    departments: (data || []) as DepartmentWithRelations[],
    totalCount: count || 0,
  }
}

/**
 * Fetch a single department by ID
 */
export async function fetchDepartmentById(departmentId: string): Promise<DepartmentWithRelations | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('departments')
    .select(
      `
      id,
      name,
      is_active,
      created_at,
      updated_at,
      hod_departments(
        hod_id,
        users!hod_id(
          id,
          name,
          email
        )
      ),
      poc_department_access(
        poc_id,
        users!poc_id(
          id,
          name,
          email
        )
      )
    `
    )
    .eq('id', departmentId)
    .single()

  if (error || !data) {
    return null
  }

  return data as DepartmentWithRelations
}

/**
 * Fetch departments for export (batched streaming)
 */
export async function* fetchDepartmentsForExport(batchSize: number = 1000) {
  const supabase = await createClient()
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('departments')
      .select(
        `
        id,
        name,
        is_active,
        created_at,
        hod_departments(
          users!hod_id(
            name,
            email
          )
        )
      `
      )
      .range(offset, offset + batchSize - 1)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to fetch departments for export: ${error.message}`)
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

// NOTE: fetchDepartmentAnalytics removed - department_analytics view was dropped
// as part of workflow simplification

/**
 * Fetch POCs for a specific department
 */
export async function fetchPOCsForDepartment(departmentId: string): Promise<{ id: string; name: string; email: string }[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('poc_department_access')
    .select(`
      poc_id,
      users!poc_id(
        id,
        name,
        email
      )
    `)
    .eq('department_id', departmentId)

  if (error) {
    throw new Error(`Failed to fetch POCs for department: ${error.message}`)
  }

  // Extract user info from the nested structure
  return (data || []).map((item: { poc_id: string; users: { id: string; name: string; email: string } | null }) => ({
    id: item.users?.id || item.poc_id,
    name: item.users?.name || '',
    email: item.users?.email || '',
  })).filter((poc: { id: string; name: string; email: string }) => poc.email)
}
