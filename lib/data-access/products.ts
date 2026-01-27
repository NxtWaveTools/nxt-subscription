// ============================================================================
// Data Access - Products
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type { Product, ProductInsert, ProductUpdate } from '@/lib/types'

/**
 * Fetch all active products
 */
export async function fetchActiveProducts(): Promise<Product[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products')
    .select('id, name, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('name', { ascending: true })
  
  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`)
  }
  
  return data ?? []
}

/**
 * Fetch all products (including inactive)
 */
export async function fetchAllProducts(): Promise<Product[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products')
    .select('id, name, is_active, created_at, updated_at')
    .order('name', { ascending: true })
  
  if (error) {
    throw new Error(`Failed to fetch products: ${error.message}`)
  }
  
  return data ?? []
}

/**
 * Fetch a product by ID
 */
export async function fetchProductById(id: string): Promise<Product | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products')
    .select('id, name, is_active, created_at, updated_at')
    .eq('id', id)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch product: ${error.message}`)
  }
  
  return data
}

/**
 * Search products by name
 */
export async function searchProducts(searchTerm: string): Promise<Product[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products')
    .select('id, name, is_active, created_at, updated_at')
    .eq('is_active', true)
    .ilike('name', `%${searchTerm}%`)
    .order('name', { ascending: true })
    .limit(20)
  
  if (error) {
    throw new Error(`Failed to search products: ${error.message}`)
  }
  
  return data ?? []
}

/**
 * Create a new product
 */
export async function createProduct(product: ProductInsert): Promise<Product> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products')
    .insert({
      name: product.name.trim(),
      is_active: product.is_active ?? true,
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create product: ${error.message}`)
  }
  
  return data
}

/**
 * Update a product
 */
export async function updateProduct(id: string, product: ProductUpdate): Promise<Product> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('products')
    .update({
      ...product,
      name: product.name?.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update product: ${error.message}`)
  }
  
  return data
}

/**
 * Check if a product name already exists
 */
export async function productNameExists(name: string, excludeId?: string): Promise<boolean> {
  const supabase = await createClient()
  
  let query = supabase
    .from('products')
    .select('id')
    .ilike('name', name.trim())
  
  if (excludeId) {
    query = query.neq('id', excludeId)
  }
  
  const { data, error } = await query.limit(1)
  
  if (error) {
    throw new Error(`Failed to check product name: ${error.message}`)
  }
  
  return (data?.length ?? 0) > 0
}
