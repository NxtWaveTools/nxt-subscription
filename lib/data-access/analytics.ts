// ============================================================================
// Analytics Data Access Layer
// ============================================================================
// Centralizes all analytics-related database queries
// Uses database functions to avoid in-memory aggregation

import { createClient } from '@/lib/supabase/server'
import type { RoleCounts } from '@/lib/types'

/**
 * User activity statistics
 */
export interface UserActivityStats {
  totalUsers: number
  activeUsers: number
  inactiveUsers: number
  activePercentage: number
}

/**
 * Fetch role distribution using database aggregation
 * This avoids fetching all user_roles and aggregating in memory
 */
export async function fetchRoleDistribution(): Promise<RoleCounts> {
  const supabase = await createClient()

  // Use the database function for efficient aggregation
  const { data, error } = await supabase.rpc('get_role_distribution')

  if (error) {
    // Fallback to query-based aggregation if function doesn't exist
    console.warn('get_role_distribution function not found, using fallback query')
    return fetchRoleDistributionFallback()
  }

  // Convert array to RoleCounts object
  const roleCounts: RoleCounts = {}
  for (const row of data || []) {
    roleCounts[row.role_name] = Number(row.user_count)
  }

  return roleCounts
}

/**
 * Fallback role distribution using SQL aggregation (if RPC not available)
 */
async function fetchRoleDistributionFallback(): Promise<RoleCounts> {
  const supabase = await createClient()

  // Use Supabase's aggregation capabilities
  const { data: roles } = await supabase.from('roles').select('id, name')
  
  const roleCounts: RoleCounts = {}
  
  // Initialize all roles to 0
  for (const role of roles || []) {
    roleCounts[role.name] = 0
  }

  // Count users per role using individual count queries (more efficient than fetching all)
  for (const role of roles || []) {
    const { count } = await supabase
      .from('user_roles')
      .select('user_id', { count: 'exact', head: true })
      .eq('role_id', role.id)
    
    roleCounts[role.name] = count || 0
  }

  return roleCounts
}

/**
 * Fetch user activity statistics using database aggregation
 */
export async function fetchUserActivityStats(): Promise<UserActivityStats> {
  const supabase = await createClient()

  // Try using the database function first
  const { data, error } = await supabase.rpc('get_user_activity_stats')

  if (error || !data || data.length === 0) {
    // Fallback to count queries
    return fetchUserActivityStatsFallback()
  }

  const stats = data[0]
  return {
    totalUsers: Number(stats.total_users) || 0,
    activeUsers: Number(stats.active_users) || 0,
    inactiveUsers: Number(stats.inactive_users) || 0,
    activePercentage: Number(stats.active_percentage) || 0,
  }
}

/**
 * Fallback user activity stats using count queries
 */
async function fetchUserActivityStatsFallback(): Promise<UserActivityStats> {
  const supabase = await createClient()

  // Use head: true and count: 'exact' for efficient counting (no data returned)
  const [totalResult, activeResult] = await Promise.all([
    supabase.from('users').select('id', { count: 'exact', head: true }),
    supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])

  const totalUsers = totalResult.count || 0
  const activeUsers = activeResult.count || 0
  const inactiveUsers = totalUsers - activeUsers

  return {
    totalUsers,
    activeUsers,
    inactiveUsers,
    activePercentage: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0,
  }
}

/**
 * Fetch active department count
 */
export async function fetchActiveDepartmentCount(): Promise<number> {
  const supabase = await createClient()

  const { count, error } = await supabase
    .from('departments')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  if (error) {
    throw new Error(`Failed to fetch department count: ${error.message}`)
  }

  return count || 0
}
