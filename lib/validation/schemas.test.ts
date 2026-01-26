import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  userSchemas,
  departmentSchemas,
  roleSchemas,
  paginationSchemas,
  commonSchemas,
  validate,
  safeValidate,
  formatValidationErrors,
  validateRequestBody,
} from './schemas'

describe('Validation Schemas', () => {
  describe('userSchemas', () => {
    it('should validate valid user profile update', () => {
      const data = { name: 'John Doe', email: 'john@example.com' }
      const result = validate(userSchemas.updateProfile, data)
      expect(result).toEqual(data)
    })

    it('should reject invalid email', () => {
      const data = { email: 'invalid-email' }
      expect(() => validate(userSchemas.updateProfile, data)).toThrow('Invalid email address')
    })

    it('should reject name that is too long', () => {
      const data = { name: 'a'.repeat(101) }
      expect(() => validate(userSchemas.updateProfile, data)).toThrow('Name is too long')
    })

    it('should validate UUID', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000'
      expect(validate(userSchemas.userId, validUuid)).toBe(validUuid)
    })

    it('should reject invalid UUID', () => {
      expect(() => validate(userSchemas.userId, 'invalid-uuid')).toThrow('Invalid user ID')
    })
  })

  describe('departmentSchemas', () => {
    it('should validate department creation', () => {
      const data = { name: 'Engineering' }
      const result = validate(departmentSchemas.create, data)
      expect(result.name).toBe('Engineering')
      expect(result.is_active).toBe(true) // Default value
    })

    it('should reject empty department name', () => {
      const data = { name: '' }
      expect(() => validate(departmentSchemas.create, data)).toThrow(
        'Department name is required'
      )
    })

    it('should validate department update with optional fields', () => {
      const data = { is_active: false }
      const result = validate(departmentSchemas.update, data)
      expect(result.is_active).toBe(false)
    })
  })

  describe('roleSchemas', () => {
    it('should validate valid role names', () => {
      expect(validate(roleSchemas.roleName, 'ADMIN')).toBe('ADMIN')
      expect(validate(roleSchemas.roleName, 'FINANCE')).toBe('FINANCE')
      expect(validate(roleSchemas.roleName, 'HOD')).toBe('HOD')
      expect(validate(roleSchemas.roleName, 'POC')).toBe('POC')
    })

    it('should reject invalid role name', () => {
      expect(() => validate(roleSchemas.roleName, 'INVALID_ROLE')).toThrow()
    })

    it('should validate role assignment', () => {
      const data = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        role_id: '223e4567-e89b-12d3-a456-426614174000',
      }
      const result = validate(roleSchemas.assign, data)
      expect(result).toEqual(data)
    })
  })

  describe('paginationSchemas', () => {
    it('should use default values', () => {
      const result = validate(paginationSchemas.params, {})
      expect(result.limit).toBe(20)
      expect(result.sortBy).toBe('created_at')
      expect(result.sortOrder).toBe('desc')
    })

    it('should validate custom pagination params', () => {
      const data = { limit: 50, cursor: 'abc', sortBy: 'name', sortOrder: 'asc' as const }
      const result = validate(paginationSchemas.params, data)
      expect(result).toEqual(data)
    })

    it('should reject limit above maximum', () => {
      expect(() => validate(paginationSchemas.params, { limit: 200 })).toThrow(
        'Limit cannot exceed 100'
      )
    })

    it('should reject limit below minimum', () => {
      expect(() => validate(paginationSchemas.params, { limit: 0 })).toThrow(
        'Limit must be at least 1'
      )
    })

    it('should reject non-integer limit', () => {
      expect(() => validate(paginationSchemas.params, { limit: 10.5 })).toThrow(
        'Limit must be an integer'
      )
    })
  })

  describe('commonSchemas', () => {
    it('should validate UUID', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000'
      expect(validate(commonSchemas.uuid, uuid)).toBe(uuid)
    })

    it('should validate email', () => {
      const email = 'test@example.com'
      expect(validate(commonSchemas.email, email)).toBe(email)
    })

    it('should reject invalid email', () => {
      expect(() => validate(commonSchemas.email, 'invalid')).toThrow('Invalid email address')
    })

    it('should validate date', () => {
      const dateString = '2024-01-01'
      const result = validate(commonSchemas.date, dateString)
      expect(result).toBeInstanceOf(Date)
    })

    it('should validate boolean', () => {
      expect(validate(commonSchemas.boolean, true)).toBe(true)
      expect(validate(commonSchemas.boolean, false)).toBe(false)
    })

    it('should reject empty string', () => {
      expect(() => validate(commonSchemas.nonEmptyString, '')).toThrow('Value cannot be empty')
    })
  })

  describe('safeValidate', () => {
    it('should return success for valid data', () => {
      const schema = z.string()
      const result = safeValidate(schema, 'test')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toBe('test')
      }
    })

    it('should return errors for invalid data', () => {
      const schema = z.string()
      const result = safeValidate(schema, 123)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors).toBeInstanceOf(z.ZodError)
      }
    })
  })

  describe('formatValidationErrors', () => {
    it('should format Zod errors correctly', () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      })

      const result = schema.safeParse({ name: '', email: 'invalid' })
      
      if (!result.success) {
        const formatted = formatValidationErrors(result.error)
        expect(formatted).toHaveProperty('name')
        expect(formatted).toHaveProperty('email')
        expect(Array.isArray(formatted.name)).toBe(true)
        expect(Array.isArray(formatted.email)).toBe(true)
      }
    })
  })

  describe('validateRequestBody', () => {
    it('should return valid result for correct data', async () => {
      const schema = z.object({ name: z.string() })
      const result = await validateRequestBody(schema, { name: 'test' })

      expect(result.valid).toBe(true)
      if (result.valid) {
        expect(result.data).toEqual({ name: 'test' })
      }
    })

    it('should return errors for invalid data', async () => {
      const schema = z.object({ name: z.string() })
      const result = await validateRequestBody(schema, { name: 123 })

      expect(result.valid).toBe(false)
      if (!result.valid) {
        expect(Object.keys(result.errors).length).toBeGreaterThan(0)
      }
    })
  })
})
