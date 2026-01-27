// ============================================================================
// Master Data Server Actions (Vendors and Products)
// ============================================================================

'use server'

import { createClient } from '@/lib/supabase/server'
import { getCurrentUser, hasAnyRole } from '@/lib/auth/user'
import { createVendor, vendorNameExists, createProduct, productNameExists } from '@/lib/data-access'
import type { Vendor, VendorInsert, Product, ProductInsert } from '@/lib/types'

// ============================================================================
// Vendor Actions
// ============================================================================

/**
 * Create a new vendor
 */
export async function createVendorAction(data: VendorInsert): Promise<{
  success: boolean
  data?: Vendor
  error?: string
}> {
  // Check authentication
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }
  
  // Check permission - admins and finance can create vendors
  if (!hasAnyRole(user, ['ADMIN', 'FINANCE'])) {
    return { success: false, error: 'Insufficient permissions' }
  }
  
  // Validate name
  const name = data.name?.trim()
  if (!name || name.length < 1) {
    return { success: false, error: 'Vendor name is required' }
  }
  
  if (name.length > 200) {
    return { success: false, error: 'Vendor name is too long (max 200 characters)' }
  }
  
  // Check for duplicate
  const exists = await vendorNameExists(name)
  if (exists) {
    return { success: false, error: 'A vendor with this name already exists' }
  }
  
  try {
    const vendor = await createVendor({ name, is_active: true })
    return { success: true, data: vendor }
  } catch (error) {
    console.error('Failed to create vendor:', error)
    return { success: false, error: 'Failed to create vendor' }
  }
}

// ============================================================================
// Product Actions
// ============================================================================

/**
 * Create a new product
 */
export async function createProductAction(data: ProductInsert): Promise<{
  success: boolean
  data?: Product
  error?: string
}> {
  // Check authentication
  const user = await getCurrentUser()
  if (!user) {
    return { success: false, error: 'Unauthorized' }
  }
  
  // Check permission - admins and finance can create products
  if (!hasAnyRole(user, ['ADMIN', 'FINANCE'])) {
    return { success: false, error: 'Insufficient permissions' }
  }
  
  // Validate name
  const name = data.name?.trim()
  if (!name || name.length < 1) {
    return { success: false, error: 'Product name is required' }
  }
  
  if (name.length > 200) {
    return { success: false, error: 'Product name is too long (max 200 characters)' }
  }
  
  // Check for duplicate
  const exists = await productNameExists(name)
  if (exists) {
    return { success: false, error: 'A product with this name already exists' }
  }
  
  try {
    const product = await createProduct({ name, is_active: true })
    return { success: true, data: product }
  } catch (error) {
    console.error('Failed to create product:', error)
    return { success: false, error: 'Failed to create product' }
  }
}
