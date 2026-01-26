import { describe, it, expect } from 'vitest'
import { hasRole, hasAnyRole, getUserRole, isUserActive } from './user'
import type { UserWithRoles } from '@/lib/types'

describe('Auth Helper Functions', () => {
  describe('hasRole', () => {
    it('should return true when user has the specified role', () => {
      const user: UserWithRoles = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_roles: {
          role_id: '1',
          roles: { id: '1', name: 'ADMIN' },
        },
      }

      expect(hasRole(user, 'ADMIN')).toBe(true)
    })

    it('should return false when user does not have the specified role', () => {
      const user: UserWithRoles = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_roles: {
          role_id: '2',
          roles: { id: '2', name: 'HOD' },
        },
      }

      expect(hasRole(user, 'ADMIN')).toBe(false)
    })

    it('should return false when user is null', () => {
      expect(hasRole(null, 'ADMIN')).toBe(false)
    })

    it('should return false when user has no roles', () => {
      const user: UserWithRoles = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_roles: null,
      }

      expect(hasRole(user, 'ADMIN')).toBe(false)
    })
  })

  describe('hasAnyRole', () => {
    it('should return true when user has at least one of the specified roles', () => {
      const user: UserWithRoles = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_roles: {
          role_id: '2',
          roles: { id: '2', name: 'FINANCE' },
        },
      }

      expect(hasAnyRole(user, ['ADMIN', 'FINANCE'])).toBe(true)
    })

    it('should return false when user has none of the specified roles', () => {
      const user: UserWithRoles = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_roles: {
          role_id: '3',
          roles: { id: '3', name: 'HOD' },
        },
      }

      expect(hasAnyRole(user, ['ADMIN', 'FINANCE'])).toBe(false)
    })

    it('should return false when user is null', () => {
      expect(hasAnyRole(null, ['ADMIN', 'FINANCE'])).toBe(false)
    })
  })

  describe('getUserRole', () => {
    it('should return role name', () => {
      const user: UserWithRoles = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_roles: {
          role_id: '1',
          roles: { id: '1', name: 'ADMIN' },
        },
      }

      expect(getUserRole(user)).toBe('ADMIN')
    })

    it('should return null when user is null', () => {
      expect(getUserRole(null)).toBeNull()
    })

    it('should return null when user has no roles', () => {
      const user: UserWithRoles = {
        id: '123',
        email: 'test@example.com',
        name: 'Test User',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_roles: null,
      }

      expect(getUserRole(user)).toBeNull()
    })
  })

  describe('isUserActive', () => {
    it('should return true when user is active', () => {
      const user = { is_active: true }
      expect(isUserActive(user)).toBe(true)
    })

    it('should return false when user is inactive', () => {
      const user = { is_active: false }
      expect(isUserActive(user)).toBe(false)
    })

    it('should return false when user is null', () => {
      expect(isUserActive(null)).toBe(false)
    })

    it('should return false when is_active is undefined', () => {
      const user = {} as Partial<UserWithRoles>
      expect(isUserActive(user as UserWithRoles)).toBe(false)
    })
  })
})
