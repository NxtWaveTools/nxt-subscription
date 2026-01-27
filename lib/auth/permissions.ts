// ============================================================================
// Centralized Permission Helpers
// ============================================================================
// Reusable permission checks for server actions
// All permission logic should go through these helpers

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, hasRole, hasAnyRole, isUserActive } from './user'
import type { UserWithRoles, RoleName } from '@/lib/types'

// ============================================================================
// Error Types
// ============================================================================

export class AuthenticationError extends Error {
  constructor(message = 'Authentication required') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'You do not have permission to perform this action') {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class InactiveUserError extends Error {
  constructor(message = 'Your account is inactive') {
    super(message)
    this.name = 'InactiveUserError'
  }
}

// ============================================================================
// Base Permission Checks
// ============================================================================

/**
 * Require an authenticated and active user
 */
export async function requireAuth(): Promise<UserWithRoles> {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new AuthenticationError()
  }
  
  if (!isUserActive(user)) {
    throw new InactiveUserError()
  }
  
  return user
}

/**
 * Require a specific role
 */
export async function requireRole(roleName: RoleName): Promise<UserWithRoles> {
  const user = await requireAuth()
  
  if (!hasRole(user, roleName)) {
    throw new AuthorizationError(`${roleName} role required`)
  }
  
  return user
}

/**
 * Require any of the specified roles
 */
export async function requireAnyRole(roleNames: RoleName[]): Promise<UserWithRoles> {
  const user = await requireAuth()
  
  if (!hasAnyRole(user, roleNames)) {
    throw new AuthorizationError(`One of these roles required: ${roleNames.join(', ')}`)
  }
  
  return user
}

// ============================================================================
// Department-Scoped Permission Checks
// ============================================================================

/**
 * Require POC access to a specific department
 * Used for POC-only actions on department subscriptions
 */
export async function requirePOCForDepartment(departmentId: string): Promise<UserWithRoles> {
  const user = await requireAuth()
  
  if (!hasRole(user, 'POC')) {
    throw new AuthorizationError('Only POC can perform this action')
  }
  
  const supabase = await createClient()
  const { data: pocAccess } = await supabase
    .from('poc_department_access')
    .select('department_id')
    .eq('poc_id', user.id)
    .eq('department_id', departmentId)
    .maybeSingle()
  
  if (!pocAccess) {
    throw new AuthorizationError('You are not the POC for this department')
  }
  
  return user
}

/**
 * Require HOD access to a specific department
 * Used for HOD-only actions on department subscriptions
 */
export async function requireHODForDepartment(departmentId: string): Promise<UserWithRoles> {
  const user = await requireAuth()
  
  if (!hasRole(user, 'HOD')) {
    throw new AuthorizationError('Only HOD can perform this action')
  }
  
  const supabase = await createClient()
  const { data: hodAccess } = await supabase
    .from('hod_departments')
    .select('department_id')
    .eq('hod_id', user.id)
    .eq('department_id', departmentId)
    .maybeSingle()
  
  if (!hodAccess) {
    throw new AuthorizationError('You are not the HOD for this department')
  }
  
  return user
}

/**
 * Get all department IDs a POC has access to
 */
export async function getPOCDepartmentIds(userId: string): Promise<string[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('poc_department_access')
    .select('department_id')
    .eq('poc_id', userId)
  
  if (error) {
    throw new Error(`Failed to fetch POC departments: ${error.message}`)
  }
  
  return data?.map(d => d.department_id) || []
}

/**
 * Get all department IDs an HOD manages
 */
export async function getHODDepartmentIds(userId: string): Promise<string[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('hod_departments')
    .select('department_id')
    .eq('hod_id', userId)
  
  if (error) {
    throw new Error(`Failed to fetch HOD departments: ${error.message}`)
  }
  
  return data?.map(d => d.department_id) || []
}

// ============================================================================
// Subscription-Scoped Permission Checks
// ============================================================================

/**
 * Require access to a subscription based on user's role and department
 * - ADMIN/FINANCE: Access to all subscriptions
 * - POC: Access to subscriptions in their departments
 * - HOD: Access to subscriptions in their departments
 */
export async function requireSubscriptionAccess(subscriptionId: string): Promise<{
  user: UserWithRoles
  subscription: { id: string; department_id: string; status: string }
}> {
  const user = await requireAuth()
  const roleName = user.user_roles?.roles?.name as RoleName | undefined
  
  const supabase = await createClient()
  
  // Fetch subscription
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('id, department_id, status')
    .eq('id', subscriptionId)
    .single()
  
  if (error || !subscription) {
    throw new Error('Subscription not found')
  }
  
  // Admin and Finance have full access
  if (roleName === 'ADMIN' || roleName === 'FINANCE') {
    return { user, subscription }
  }
  
  // POC: Check department access
  if (roleName === 'POC') {
    const pocDeptIds = await getPOCDepartmentIds(user.id)
    if (!pocDeptIds.includes(subscription.department_id)) {
      throw new AuthorizationError('You do not have access to this subscription')
    }
    return { user, subscription }
  }
  
  // HOD: Check department access
  if (roleName === 'HOD') {
    const hodDeptIds = await getHODDepartmentIds(user.id)
    if (!hodDeptIds.includes(subscription.department_id)) {
      throw new AuthorizationError('You do not have access to this subscription')
    }
    return { user, subscription }
  }
  
  throw new AuthorizationError('You do not have permission to access this subscription')
}

/**
 * Require POC access to approve/reject a subscription
 * Validates the POC has department access and subscription is in correct state
 */
export async function requirePOCApprovalAccess(
  subscriptionId: string,
  requiredStatus: string = 'PENDING'
): Promise<{
  user: UserWithRoles
  subscription: { id: string; department_id: string; status: string; version: number }
}> {
  const user = await requireAuth()
  
  if (!hasRole(user, 'POC')) {
    throw new AuthorizationError('Only POC can approve or reject subscriptions')
  }
  
  const supabase = await createClient()
  
  // Fetch subscription with version for optimistic locking
  const { data: subscription, error } = await supabase
    .from('subscriptions')
    .select('id, department_id, status, version')
    .eq('id', subscriptionId)
    .single()
  
  if (error || !subscription) {
    throw new Error('Subscription not found')
  }
  
  // Check status
  if (subscription.status !== requiredStatus) {
    throw new AuthorizationError(
      `Subscription cannot be modified. Current status: ${subscription.status}`
    )
  }
  
  // Check POC has access to this department
  const { data: pocAccess } = await supabase
    .from('poc_department_access')
    .select('department_id')
    .eq('poc_id', user.id)
    .eq('department_id', subscription.department_id)
    .maybeSingle()
  
  if (!pocAccess) {
    throw new AuthorizationError('You are not the POC for this subscription\'s department')
  }
  
  return { user, subscription }
}

// ============================================================================
// Finance Permission Checks
// ============================================================================

/**
 * Require Finance role for payment operations
 */
export async function requireFinanceAccess(): Promise<UserWithRoles> {
  return requireAnyRole(['ADMIN', 'FINANCE'])
}

// ============================================================================
// Admin Permission Checks
// ============================================================================

/**
 * Require Admin role for admin-only operations
 */
export async function requireAdminAccess(): Promise<UserWithRoles> {
  return requireRole('ADMIN')
}

/**
 * Require Admin or Finance role (legacy alias for requireAdmin)
 */
export async function requireAdminOrFinance(): Promise<UserWithRoles> {
  return requireAnyRole(['ADMIN', 'FINANCE'])
}
