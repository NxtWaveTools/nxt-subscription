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

export interface UserWithRoles extends User {
  user_roles?: Array<{
    role_id: string
    roles: Pick<Role, 'name' | 'id'>
  }>
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
