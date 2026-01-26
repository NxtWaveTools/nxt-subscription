// ============================================================================
// Department Server Actions Tests
// Comprehensive unit tests for department management actions
// ============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as departmentActions from './departments'
import * as authModule from '@/lib/auth/user'

// Test UUIDs (RFC 4122 compliant)
const TEST_DEPT_ID_1 = '00000000-0000-4000-8000-000000000001'
const TEST_USER_ID_1 = '00000000-0000-4000-8000-000000000011'
const TEST_USER_ID_2 = '00000000-0000-4000-8000-000000000012'
const ADMIN_USER_ID = '00000000-0000-4000-8000-000000000099'

// Mock dependencies
vi.mock('@/lib/auth/user')
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  createAdminClient: vi.fn(),
}))

// Create mock functions
const createMockSupabase = () => {
  const mock: any = {
    from: vi.fn(() => mock),
    select: vi.fn(() => mock),
    insert: vi.fn(() => mock),
    update: vi.fn(() => mock),
    delete: vi.fn(() => mock),
    eq: vi.fn(() => mock),
    neq: vi.fn(() => mock),
    in: vi.fn(() => mock),
    single: vi.fn(() => mock),
    maybeSingle: vi.fn(() => mock),
  }
  return mock
}

let mockSupabase: ReturnType<typeof createMockSupabase>

describe('Department Actions', () => {
  beforeEach(async () => {
    // Create a fresh mock for each test
    mockSupabase = createMockSupabase()
    
    // Import and setup createClient mock
    const supabaseModule = await import('@/lib/supabase/server')
    vi.mocked(supabaseModule.createClient).mockResolvedValue(mockSupabase as any)
    
    // Mock requireAdmin to pass by default
    vi.mocked(authModule.requireAdmin).mockResolvedValue({
      id: 'admin-user-id',
      email: 'admin@test.com',
      roles: ['ADMIN'],
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('createDepartment', () => {
    it('should create a department successfully', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: 'dept-1', name: 'Engineering', is_active: true },
        error: null,
      })

      const result = await departmentActions.createDepartment('Engineering')

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        id: 'dept-1',
        name: 'Engineering',
        is_active: true,
      })
      expect(mockSupabase.from).toHaveBeenCalledWith('departments')
    })

    it('should reject duplicate department names', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: 'existing-dept' },
        error: null,
      })

      const result = await departmentActions.createDepartment('Engineering')

      expect(result.success).toBe(false)
      expect(result.error).toBe('A department with this name already exists')
    })

    it('should require admin permission', async () => {
      vi.mocked(authModule.requireAdmin).mockRejectedValueOnce(
        new Error('Unauthorized: Admin or Finance role required')
      )

      const result = await departmentActions.createDepartment('Engineering')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unauthorized')
    })

    it('should validate department name', async () => {
      const result = await departmentActions.createDepartment('')

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should handle database errors', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', code: '500' },
      })

      const result = await departmentActions.createDepartment('Engineering')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to create department')
    })
  })

  describe('updateDepartment', () => {
    it('should update department name', async () => {
      const deptId = '123e4567-e89b-12d3-a456-426614174000'
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: deptId },
        error: null,
      })
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: deptId, name: 'Updated Dept', is_active: true },
        error: null,
      })

      const result = await departmentActions.updateDepartment(deptId, {
        name: 'Updated Dept',
      })

      expect(result.success).toBe(true)
      expect(result.data?.name).toBe('Updated Dept')
    })

    it('should update department active status', async () => {
      const deptId = '123e4567-e89b-12d3-a456-426614174001'
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: deptId },
        error: null,
      })
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: deptId, name: 'Engineering', is_active: false },
        error: null,
      })

      const result = await departmentActions.updateDepartment(deptId, {
        is_active: false,
      })

      expect(result.success).toBe(true)
      expect(result.data?.is_active).toBe(false)
    })

    it('should reject non-existent department', async () => {
      const deptId = '123e4567-e89b-12d3-a456-426614174002'
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

      const result = await departmentActions.updateDepartment(deptId, {
        name: 'New Name',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Department not found')
    })

    it('should reject duplicate names during update', async () => {
      const deptId1 = '123e4567-e89b-12d3-a456-426614174003'
      const deptId2 = '123e4567-e89b-12d3-a456-426614174004'
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: deptId1 },
        error: null,
      })
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: deptId2 },
        error: null,
      })

      const result = await departmentActions.updateDepartment(deptId1, {
        name: 'Existing Name',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('A department with this name already exists')
    })
  })

  describe('updateDepartment soft delete', () => {
    it('should soft delete department by setting is_active to false', async () => {
      const deptId = '123e4567-e89b-12d3-a456-426614174010'
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: deptId },
        error: null,
      })
      mockSupabase.single.mockResolvedValueOnce({
        data: { id: deptId, is_active: false },
        error: null,
      })

      const result = await departmentActions.updateDepartment(deptId, { is_active: false })

      expect(result.success).toBe(true)
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({ is_active: false })
      )
    })

    it('should handle database errors during soft delete', async () => {
      const deptId = '123e4567-e89b-12d3-a456-426614174011'
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { id: deptId },
        error: null,
      })
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed', code: '500' },
      })

      const result = await departmentActions.updateDepartment(deptId, { is_active: false })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to update department')
    })
  })

  describe('assignHODToDepartment', () => {
    it('should assign HOD to department successfully', async () => {
      const userId = '223e4567-e89b-12d3-a456-426614174020'
      const deptId = '323e4567-e89b-12d3-a456-426614174020'
      
      // Mock HOD role check
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { role_id: '00000000-0000-0000-0000-000000000003' },
        error: null,
      })
      // Mock existing assignment check
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      // Mock insert
      mockSupabase.single.mockResolvedValueOnce({
        data: { hod_id: userId, department_id: deptId },
        error: null,
      })

      const result = await departmentActions.assignHODToDepartment(userId, deptId)

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('hod_departments')
      expect(mockSupabase.insert).toHaveBeenCalled()
    })

    it('should handle assignment errors', async () => {
      const userId = '223e4567-e89b-12d3-a456-426614174021'
      const deptId = '323e4567-e89b-12d3-a456-426614174021'
      
      // Mock no HOD role
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

      const result = await departmentActions.assignHODToDepartment(deptId, userId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('User does not have HOD role')
    })
  })

  describe('removeHODFromDepartment', () => {
    it('should remove HOD from department successfully', async () => {
      const userId = '223e4567-e89b-12d3-a456-426614174030'
      const deptId = '323e4567-e89b-12d3-a456-426614174030'
      
      // Chain eq() calls properly
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockResolvedValueOnce({ error: null })

      const result = await departmentActions.removeHODFromDepartment(userId, deptId)

      expect(result.success).toBe(true)
      expect(mockSupabase.delete).toHaveBeenCalled()
    })
  })

  describe('assignPOCToHOD', () => {
    it('should assign POC to HOD successfully', async () => {
      const pocId = '423e4567-e89b-12d3-a456-426614174040'
      const hodId = '523e4567-e89b-12d3-a456-426614174040'
      
      // Mock POC role check
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { role_id: '00000000-0000-0000-0000-000000000004' },
        error: null,
      })
      // Mock existing POC check (none exists)
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      mockSupabase.single.mockResolvedValueOnce({
        data: { poc_id: pocId, hod_id: hodId },
        error: null,
      })

      const result = await departmentActions.assignPOCToHOD(pocId, hodId)

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('hod_poc_mapping')
    })

    it('should reject POC already assigned to another HOD', async () => {
      const pocId = '423e4567-e89b-12d3-a456-426614174041'
      const hodId = '523e4567-e89b-12d3-a456-426614174041'
      const otherHodId = '523e4567-e89b-12d3-a456-426614174042'
      
      // Mock POC role check
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { role_id: '00000000-0000-0000-0000-000000000004' },
        error: null,
      })
      // Mock existing POC assignment
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { poc_id: pocId, hod_id: otherHodId },
        error: null,
      })

      const result = await departmentActions.assignPOCToHOD(pocId, hodId)

      expect(result.success).toBe(false)
      expect(result.error).toBe('HOD already has a POC assigned. Remove existing POC first.')
    })
  })

  describe('removePOCFromHOD', () => {
    it('should remove POC from HOD successfully', async () => {
      const hodId = '523e4567-e89b-12d3-a456-426614174050'
      mockSupabase.eq.mockResolvedValueOnce({ error: null })

      const result = await departmentActions.removePOCFromHOD(hodId)

      expect(result.success).toBe(true)
      expect(mockSupabase.delete).toHaveBeenCalled()
    })
  })

  describe('grantPOCAccessToDepartment', () => {
    it('should grant POC access to department', async () => {
      const pocId = '423e4567-e89b-12d3-a456-426614174060'
      const deptId = '323e4567-e89b-12d3-a456-426614174060'
      
      // Mock POC role check
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: { role_id: '00000000-0000-0000-0000-000000000004' },
        error: null,
      })
      // Mock existing access check
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
      // Mock insert
      mockSupabase.single.mockResolvedValueOnce({
        data: { poc_id: pocId, department_id: deptId },
        error: null,
      })

      const result = await departmentActions.grantPOCAccessToDepartment(pocId, deptId)

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('poc_department_access')
    })
  })

  describe('revokePOCAccessFromDepartment', () => {
    it('should revoke POC access from department', async () => {
      const pocId = '423e4567-e89b-12d3-a456-426614174070'
      const deptId = '323e4567-e89b-12d3-a456-426614174070'
      
      // Chain eq() calls
      mockSupabase.eq.mockReturnValueOnce(mockSupabase)
      mockSupabase.eq.mockResolvedValueOnce({ error: null })

      const result = await departmentActions.revokePOCAccessFromDepartment(pocId, deptId)

      expect(result.success).toBe(true)
      expect(mockSupabase.delete).toHaveBeenCalled()
    })
  })

  describe('Permission checks', () => {
    it('should reject unauthorized users for all actions', async () => {
      vi.mocked(authModule.requireAdmin).mockRejectedValueOnce(
        new Error('Unauthorized: Admin or Finance role required')
      )

      const createResult = await departmentActions.createDepartment('Test')
      expect(createResult.success).toBe(false)
      expect(createResult.error).toContain('Unauthorized')
    })
  })

  describe('Input validation', () => {
    it('should validate department IDs', async () => {
      const result = await departmentActions.updateDepartment('', { name: 'Test' })
      expect(result.success).toBe(false)
    })

    it('should validate user IDs for HOD assignment', async () => {
      const deptId = '323e4567-e89b-12d3-a456-426614174080'
      const result = await departmentActions.assignHODToDepartment('', deptId)
      expect(result.success).toBe(false)
    })

    it('should validate POC assignment parameters', async () => {
      const hodId = '523e4567-e89b-12d3-a456-426614174090'
      const result = await departmentActions.assignPOCToHOD('', hodId)
      expect(result.success).toBe(false)
    })
  })
})
