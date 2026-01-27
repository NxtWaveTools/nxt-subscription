// ============================================================================
// User Role Normalization Utility
// ============================================================================
// Centralizes the logic for normalizing Supabase user_roles join results
// Supabase returns arrays for joins, but our schema is one-to-one

import type { UserWithRoles, UserRoleData } from '@/lib/types'

/**
 * Raw user data from Supabase with user_roles as array
 */
interface UserWithRolesRaw {
  id: string
  email: string
  name: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  user_roles: UserRoleData[] | UserRoleData | null
}

/**
 * Normalize a single user's role data from Supabase response
 * Supabase returns arrays for joins even for one-to-one relationships
 * This converts the array to a single object or null
 */
export function normalizeUserRole<T extends { user_roles: UserRoleData[] | UserRoleData | null }>(
  user: T
): Omit<T, 'user_roles'> & { user_roles: UserRoleData | null } {
  const { user_roles, ...rest } = user
  
  return {
    ...rest,
    user_roles: Array.isArray(user_roles) && user_roles.length > 0
      ? user_roles[0]
      : user_roles && !Array.isArray(user_roles)
        ? user_roles
        : null,
  } as Omit<T, 'user_roles'> & { user_roles: UserRoleData | null }
}

/**
 * Normalize an array of users' role data from Supabase response
 */
export function normalizeUserRoles<T extends { user_roles: UserRoleData[] | UserRoleData | null }>(
  users: T[]
): Array<Omit<T, 'user_roles'> & { user_roles: UserRoleData | null }> {
  return users.map(normalizeUserRole)
}

/**
 * Type guard to check if user has a role assigned
 */
export function hasUserRole(user: { user_roles: UserRoleData | null } | null): user is { user_roles: UserRoleData } {
  return user !== null && user.user_roles !== null
}

/**
 * Get role name from normalized user
 */
export function getUserRoleName(user: { user_roles: UserRoleData | null } | null): string | null {
  if (!user?.user_roles?.roles) return null
  return user.user_roles.roles.name
}
