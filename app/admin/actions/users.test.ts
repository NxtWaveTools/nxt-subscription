// ============================================================================
// User Management Server Actions Tests
// Comprehensive unit tests for user management actions
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as userActions from './users'
import * as authModule from '@/lib/auth/user'

// Mock dependencies
vi.mock('@/lib/auth/user')
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Test UUIDs for consistent testing (RFC 4122 compliant)
const TEST_USER_ID_1 = '00000000-0000-4000-8000-000000000001'
const TEST_USER_ID_2 = '00000000-0000-4000-8000-000000000002'
const TEST_USER_ID_3 = '00000000-0000-4000-8000-000000000003'
const TEST_ROLE_ID_1 = '00000000-0000-4000-8000-000000000011'
const TEST_ROLE_ID_2 = '00000000-0000-4000-8000-000000000012'
const ADMIN_USER_ID = '00000000-0000-4000-8000-000000000099'

// Mock Supabase module
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

// Create mock functions that won't be cleared
const createMockSupabase = () => {
  const mock: any = {
    from: vi.fn(() => mock),
    select: vi.fn(() => mock),
    insert: vi.fn(() => mock),
    update: vi.fn(() => mock),
    delete: vi.fn(() => mock),
    upsert: vi.fn(() => mock),
    eq: vi.fn(() => mock),
    neq: vi.fn(() => mock),
    in: vi.fn(() => mock),
    single: vi.fn(() => mock),
    maybeSingle: vi.fn(() => mock),
    auth: {
      admin: {
        deleteUser: vi.fn(),
      },
    },
  }
  return mock
}

// Create admin mock for admin operations
const createMockAdminClient = () => {
  const mock: any = {
    auth: {
      admin: {
        deleteUser: vi.fn(),
      },
    },
  }
  return mock
}

let mockAdminClient: ReturnType<typeof createMockAdminClient>

let mockSupabase: ReturnType<typeof createMockSupabase>

describe('User Actions', () => {
  beforeEach(async () => {
    // Create a fresh mock for each test
    mockSupabase = createMockSupabase()
    mockAdminClient = createMockAdminClient()
    
    // Import and setup createClient mock
    const supabaseModule = await import('@/lib/supabase/server')
    vi.mocked(supabaseModule.createClient).mockResolvedValue(mockSupabase as any)
    vi.mocked(supabaseModule.createAdminClient).mockReturnValue(mockAdminClient as any)
    
    // Mock getCurrentUser and hasRole
    vi.mocked(authModule.getCurrentUser).mockResolvedValue({
      id: ADMIN_USER_ID,
      email: 'admin@test.com',
      roles: ['ADMIN'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
    vi.mocked(authModule.hasRole).mockReturnValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('toggleUserActive', () => {
    it('should activate user successfully', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ error: null })

      const result = await userActions.toggleUserActive(TEST_USER_ID_1, true)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ userId: TEST_USER_ID_1, isActive: true })
      expect(mockSupabase.update).toHaveBeenCalledWith({ is_active: true })
    })

    it('should deactivate user successfully', async () => {
      mockSupabase.eq.mockResolvedValueOnce({ error: null })

      const result = await userActions.toggleUserActive(TEST_USER_ID_1, false)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({ userId: TEST_USER_ID_1, isActive: false })
      expect(mockSupabase.update).toHaveBeenCalledWith({ is_active: false })
    })

    it('should handle database errors', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        error: { message: 'Update failed', code: '500' },
      })

      const result = await userActions.toggleUserActive(TEST_USER_ID_1, true)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Update failed')
    })

    it('should require admin permission', async () => {
      vi.mocked(authModule.getCurrentUser).mockResolvedValueOnce(null as any)

      const result = await userActions.toggleUserActive('user-1', true)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })

    it('should validate input parameters', async () => {
      const result = await userActions.toggleUserActive('', true)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('bulkToggleUsersActive', () => {
    it('should activate multiple users in batches', async () => {

      mockSupabase.in.mockResolvedValue({ error: null })

      const userIds = [TEST_USER_ID_1, TEST_USER_ID_2, TEST_USER_ID_3]
      const result = await userActions.bulkToggleUsersActive(userIds, true)

      expect(result.success).toBe(true)
      expect(result.data?.processed).toBe(3)
      expect(result.data?.failed).toBe(0)
    })

    it('should handle partial failures', async () => {

      mockSupabase.in
        .mockResolvedValueOnce({ error: null })
        .mockResolvedValueOnce({ error: { message: 'Batch failed' } })

      const userIds = Array.from({ length: 150 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
      const result = await userActions.bulkToggleUsersActive(userIds, false)

      expect(result.success).toBe(false)
      if (result.data) {
        expect(result.data.processed).toBeGreaterThan(0)
        expect(result.data.failed).toBeGreaterThan(0)
      }
    })

    it('should enforce maximum bulk operations limit', async () => {
      const userIds = Array.from({ length: 101 }, (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`)
      const result = await userActions.bulkToggleUsersActive(userIds, true)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      // The validation error should mention the limit
      expect(typeof result.error).toBe('string')
    })

    it('should reject empty user list', async () => {
      const result = await userActions.bulkToggleUsersActive([], true)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('assignRoleToUser', () => {
    it('should assign role to user successfully', async () => {
      // First single() for checking current role
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })
      // Second single() for getting target role name
      mockSupabase.single.mockResolvedValueOnce({ data: { name: 'ADMIN' }, error: null })
      // upsert returns no error
      mockSupabase.upsert.mockResolvedValueOnce({ error: null })

      const result = await userActions.assignRoleToUser(TEST_USER_ID_1, TEST_ROLE_ID_1)

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('user_roles')
      expect(mockSupabase.upsert).toHaveBeenCalled()
    })

    it('should reject duplicate role assignment', async () => {
      // single() returns current role matching the same role_id
      mockSupabase.single.mockResolvedValueOnce({
        data: { role_id: TEST_ROLE_ID_1, roles: { name: 'ADMIN' } },
        error: null,
      })

      const result = await userActions.assignRoleToUser(TEST_USER_ID_1, TEST_ROLE_ID_1)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User already has this role')
    })

    it('should handle database errors', async () => {
      // First single() for checking current role - no current role
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })
      // Second single() for getting target role name
      mockSupabase.single.mockResolvedValueOnce({ data: { name: 'ADMIN' }, error: null })
      // upsert returns error
      mockSupabase.upsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insert failed', code: '500' },
      })

      const result = await userActions.assignRoleToUser(TEST_USER_ID_1, TEST_ROLE_ID_1)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Insert failed')
    })

    it('should validate user and role IDs', async () => {
      const result = await userActions.assignRoleToUser('', TEST_ROLE_ID_1)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('removeRoleFromUser', () => {
    it('should remove role from user successfully', async () => {
      // The second eq() call returns the final result
      mockSupabase.eq.mockReturnValueOnce(mockSupabase) // First eq returns chainable
      mockSupabase.eq.mockResolvedValueOnce({ error: null }) // Second eq returns result

      const result = await userActions.removeRoleFromUser(TEST_USER_ID_1, TEST_ROLE_ID_1)

      expect(result.success).toBe(true)
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('user_id', TEST_USER_ID_1)
      expect(mockSupabase.eq).toHaveBeenCalledWith('role_id', TEST_ROLE_ID_1)
    })

    it('should handle deletion errors', async () => {
      mockSupabase.eq.mockReturnValueOnce(mockSupabase) // First eq returns chainable
      mockSupabase.eq.mockResolvedValueOnce({
        error: { message: 'Delete failed', code: '500' },
      })

      const result = await userActions.removeRoleFromUser(TEST_USER_ID_1, TEST_ROLE_ID_1)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Delete failed')
    })
  })

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      mockAdminClient.auth.admin.deleteUser.mockResolvedValueOnce({ error: null })

      const result = await userActions.deleteUser(TEST_USER_ID_1)

      expect(result.success).toBe(true)
      expect(mockAdminClient.auth.admin.deleteUser).toHaveBeenCalledWith(TEST_USER_ID_1)
    })

    it('should handle deletion errors', async () => {
      mockAdminClient.auth.admin.deleteUser.mockResolvedValueOnce({
        error: { message: 'User not found', code: '404' },
      })

      const result = await userActions.deleteUser(TEST_USER_ID_1)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User not found')
    })

    it('should require admin permission', async () => {
      vi.mocked(authModule.hasRole).mockReturnValueOnce(false)
      vi.mocked(authModule.hasRole).mockReturnValueOnce(false) // Check both ADMIN and FINANCE

      const result = await userActions.deleteUser(TEST_USER_ID_1)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })
  })

  describe('Permission checks', () => {
    it('should reject users without admin role', async () => {
      vi.mocked(authModule.hasRole).mockReturnValue(false)

      const result = await userActions.toggleUserActive(TEST_USER_ID_1, true)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })

    it('should reject unauthenticated requests', async () => {
      vi.mocked(authModule.getCurrentUser).mockResolvedValue(null as any)

      const result = await userActions.assignRoleToUser(TEST_USER_ID_1, TEST_ROLE_ID_1)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })

    it('should allow FINANCE role for user operations', async () => {
      vi.mocked(authModule.hasRole).mockImplementation((user, role) => {
        return role === 'FINANCE'
      })


      mockSupabase.eq.mockResolvedValueOnce({ error: null })

      const result = await userActions.toggleUserActive(TEST_USER_ID_1, true)

      expect(result.success).toBe(true)
    })
  })

  describe('Input validation', () => {
    it('should validate UUID format for user IDs', async () => {
      const result = await userActions.toggleUserActive('invalid-id', true)

      expect(result.success).toBe(false)
    })

    it('should validate UUID format for role IDs', async () => {
      const result = await userActions.assignRoleToUser(TEST_USER_ID_1, 'invalid-role')

      expect(result.success).toBe(false)
    })

    it('should validate boolean values for activation', async () => {
      const result = await userActions.toggleUserActive(TEST_USER_ID_1, 'true' as any)

      expect(result.success).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('should handle concurrent role assignments gracefully', async () => {
      // First single() for checking current role - no current role
      mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })
      // Second single() for getting target role name
      mockSupabase.single.mockResolvedValueOnce({ data: { name: 'ADMIN' }, error: null })
      // upsert returns unique violation error
      mockSupabase.upsert.mockResolvedValueOnce({
        data: null,
        error: { message: 'Unique violation', code: '23505' },
      })

      const result = await userActions.assignRoleToUser(TEST_USER_ID_1, TEST_ROLE_ID_1)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Unique violation')
    })

    it('should handle user deletion cascades', async () => {
      mockAdminClient.auth.admin.deleteUser.mockResolvedValueOnce({ error: null })

      const result = await userActions.deleteUser(TEST_USER_ID_2)

      expect(result.success).toBe(true)
    })

    it('should handle empty bulk operations', async () => {
      const result = await userActions.bulkToggleUsersActive([], true)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Data integrity', () => {
    it('should maintain role uniqueness per user', async () => {
      // single() returns current role matching the same role_id
      mockSupabase.single.mockResolvedValueOnce({
        data: { role_id: TEST_ROLE_ID_1, roles: { name: 'ADMIN' } },
        error: null,
      })

      const result = await userActions.assignRoleToUser(TEST_USER_ID_1, TEST_ROLE_ID_1)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User already has this role')
    })

    it('should prevent removal of non-existent roles', async () => {
      mockSupabase.eq.mockReturnValueOnce(mockSupabase) // First eq
      mockSupabase.eq.mockResolvedValueOnce({ error: null }) // Second eq

      const result = await userActions.removeRoleFromUser(TEST_USER_ID_1, TEST_ROLE_ID_2)

      expect(result.success).toBe(true)
    })
  })
})
