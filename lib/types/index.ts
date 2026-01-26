// ============================================================================
// Database Type Definitions
// ============================================================================

import { Database } from '../supabase/database.types'

// Table row types
export type User = Database['public']['Tables']['users']['Row']
export type Role = Database['public']['Tables']['roles']['Row']
export type Department = Database['public']['Tables']['departments']['Row']
export type UserRole = Database['public']['Tables']['user_roles']['Row']
export type HodDepartment = Database['public']['Tables']['hod_departments']['Row']
export type HodPocMapping = Database['public']['Tables']['hod_poc_mapping']['Row']
export type PocDepartmentAccess = Database['public']['Tables']['poc_department_access']['Row']

// Insert types
export type UserInsert = Database['public']['Tables']['users']['Insert']
export type RoleInsert = Database['public']['Tables']['roles']['Insert']
export type DepartmentInsert = Database['public']['Tables']['departments']['Insert']

// Update types
export type UserUpdate = Database['public']['Tables']['users']['Update']
export type DepartmentUpdate = Database['public']['Tables']['departments']['Update']

// ============================================================================
// Role Types
// ============================================================================

export type RoleName = 'ADMIN' | 'FINANCE' | 'HOD' | 'POC'

// User role from Supabase join (can be array or single object depending on query)
export interface UserRoleData {
  role_id: string
  roles: Pick<Role, 'name' | 'id'>
}

// Single role per user (normalized to single object)
export interface UserWithRoles extends User {
  user_roles?: UserRoleData | null
}

// Raw response from Supabase query (returns array for joins)
export interface UserWithRolesRaw extends User {
  user_roles: UserRoleData[]
}

// ============================================================================
// Auth Types
// ============================================================================

export type OAuthProvider = 'google' | 'azure'

export interface AuthError {
  message: string
  code?: string
}

export type AuthState = 'idle' | 'loading' | 'authenticated' | 'unauthenticated'

// ============================================================================
// API Response Types
// ============================================================================

export interface ApiResponse<T = unknown> {
  data?: T
  error?: AuthError
  success: boolean
}

// ============================================================================
// Query Result Types
// ============================================================================

/**
 * User role query result for searching HOD/POC users
 */
export interface UserRoleQueryResult {
  user_id: string
  users: {
    id: string
    name: string | null
    email: string
    is_active: boolean
  } | null
}

/**
 * Simple user info for dropdowns and selections
 */
export interface SimpleUser {
  id: string
  name: string | null
  email: string
}

/**
 * Department with related HODs and POCs
 */
export interface DepartmentWithRelations extends Department {
  hod_departments: Array<{
    hod_id: string
    users: SimpleUser
  }>
  poc_department_access: Array<{
    poc_id: string
    users: SimpleUser
  }>
}

/**
 * Role count aggregation for analytics
 */
export interface RoleCounts {
  [roleName: string]: number
}
