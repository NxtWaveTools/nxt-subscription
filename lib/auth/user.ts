import { createClient } from '@/lib/supabase/server'
import type { User, UserWithRoles, RoleName } from '@/lib/types'

/**
 * Get the currently authenticated user with their roles
 */
export async function getCurrentUser(): Promise<UserWithRoles | null> {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) return null

  const { data: userProfile } = await supabase
    .from('users')
    .select(`
      id,
      email,
      name,
      is_active,
      created_at,
      updated_at,
      user_roles (
        role_id,
        roles (
          id,
          name
        )
      )
    `)
    .eq('id', authUser.id)
    .single()

  return userProfile
}

/**
 * Check if user has specific role
 */
export function hasRole(user: UserWithRoles | null, roleName: RoleName): boolean {
  if (!user?.user_roles) return false
  
  return user.user_roles.some((ur) => ur.roles.name === roleName)
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(user: UserWithRoles | null, roleNames: RoleName[]): boolean {
  if (!user?.user_roles) return false
  
  return user.user_roles.some((ur) => 
    roleNames.includes(ur.roles.name as RoleName)
  )
}

/**
 * Get user's role names
 */
export function getUserRoles(user: UserWithRoles | null): RoleName[] {
  if (!user?.user_roles) return []
  
  return user.user_roles.map((ur) => ur.roles.name as RoleName)
}

/**
 * Check if user is active
 */
export function isUserActive(user: { is_active: boolean } | User | UserWithRoles | null): boolean {
  return user?.is_active ?? false
}
