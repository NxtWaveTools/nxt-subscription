// ============================================================================
// Locations Data Access Layer
// ============================================================================
// Centralizes all location-related database queries

import { createClient } from '@/lib/supabase/server'
import type { Location } from '@/lib/types'

/**
 * Location filter options
 */
export interface LocationFilters {
  search?: string
  locationType?: 'OFFICE' | 'NIAT' | 'OTHER'
  isActive?: boolean
}

/**
 * Location pagination options
 */
export interface LocationPaginationOptions {
  page: number
  limit: number
  offset: number
}

/**
 * Location list response
 */
export interface LocationListResponse {
  locations: Location[]
  totalCount: number
}

/**
 * Fetch locations with filters and pagination
 * All filtering happens at database level - no in-memory filtering
 */
export async function fetchLocations(
  filters: LocationFilters,
  pagination: LocationPaginationOptions
): Promise<LocationListResponse> {
  const supabase = await createClient()
  const { search, locationType, isActive } = filters
  const { limit, offset } = pagination

  // Build query with specific columns (no select *)
  let query = supabase
    .from('locations')
    .select(
      `
      id,
      name,
      location_type,
      address,
      is_active,
      created_at
    `,
      { count: 'exact' }
    )

  // Apply fuzzy search if search term provided (database-level filtering)
  if (search) {
    query = query.or(`name.ilike.%${search}%,address.ilike.%${search}%`)
  }

  // Apply location type filter
  if (locationType) {
    query = query.eq('location_type', locationType)
  }

  // Apply active status filter
  if (isActive !== undefined) {
    query = query.eq('is_active', isActive)
  }

  // Apply pagination and ordering
  query = query
    .range(offset, offset + limit - 1)
    .order('name', { ascending: true })

  const { data, error, count } = await query

  if (error) {
    throw new Error(`Failed to fetch locations: ${error.message}`)
  }

  return {
    locations: (data || []) as Location[],
    totalCount: count || 0,
  }
}

/**
 * Fetch a single location by ID
 */
export async function fetchLocationById(id: string): Promise<Location | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('locations')
    .select(
      `
      id,
      name,
      location_type,
      address,
      is_active,
      created_at
    `
    )
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    throw new Error(`Failed to fetch location: ${error.message}`)
  }

  return data as Location
}

/**
 * Search locations for dropdown autocomplete
 * Returns top 20 active locations matching the query
 */
export async function searchLocations(query: string, limit: number = 20): Promise<Location[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('locations')
    .select(
      `
      id,
      name,
      location_type,
      address,
      is_active,
      created_at
    `
    )
    .eq('is_active', true)
    .or(`name.ilike.%${query}%`)
    .order('name', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error(`Failed to search locations: ${error.message}`)
  }

  return (data || []) as Location[]
}

/**
 * Fetch all active locations (for dropdowns)
 */
export async function fetchActiveLocations(): Promise<Location[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('locations')
    .select(
      `
      id,
      name,
      location_type,
      address,
      is_active,
      created_at
    `
    )
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(`Failed to fetch active locations: ${error.message}`)
  }

  return (data || []) as Location[]
}

/**
 * Check if a location is used in any subscription
 */
export async function isLocationUsedInSubscriptions(locationId: string): Promise<boolean> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('location_id', locationId)

  if (error) {
    throw new Error(`Failed to check location usage: ${error.message}`)
  }

  return (count || 0) > 0
}

/**
 * Fetch locations for export (streaming with batches)
 */
export async function* fetchLocationsForExport(batchSize: number = 1000) {
  const supabase = await createClient()
  
  let offset = 0
  let hasMore = true

  while (hasMore) {
    const { data, error } = await supabase
      .from('locations')
      .select(
        `
        id,
        name,
        location_type,
        address,
        is_active,
        created_at
      `
      )
      .range(offset, offset + batchSize - 1)
      .order('name', { ascending: true })

    if (error) {
      throw new Error(`Export failed: ${error.message}`)
    }

    if (!data || data.length === 0) {
      hasMore = false
      break
    }

    yield data as Location[]
    offset += batchSize
    hasMore = data.length === batchSize
  }
}
