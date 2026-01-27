// ============================================================================
// Data Access - Vendors
// ============================================================================

import { createClient } from '@/lib/supabase/server'
import type { Vendor, VendorInsert, VendorUpdate } from '@/lib/types'

/**
 * Fetch all active vendors
 */
export async function fetchActiveVendors(): Promise<Vendor[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, is_active, created_at, updated_at')
    .eq('is_active', true)
    .order('name', { ascending: true })
  
  if (error) {
    throw new Error(`Failed to fetch vendors: ${error.message}`)
  }
  
  return data ?? []
}

/**
 * Fetch all vendors (including inactive)
 */
export async function fetchAllVendors(): Promise<Vendor[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, is_active, created_at, updated_at')
    .order('name', { ascending: true })
  
  if (error) {
    throw new Error(`Failed to fetch vendors: ${error.message}`)
  }
  
  return data ?? []
}

/**
 * Fetch a vendor by ID
 */
export async function fetchVendorById(id: string): Promise<Vendor | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, is_active, created_at, updated_at')
    .eq('id', id)
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    throw new Error(`Failed to fetch vendor: ${error.message}`)
  }
  
  return data
}

/**
 * Search vendors by name
 */
export async function searchVendors(searchTerm: string): Promise<Vendor[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('vendors')
    .select('id, name, is_active, created_at, updated_at')
    .eq('is_active', true)
    .ilike('name', `%${searchTerm}%`)
    .order('name', { ascending: true })
    .limit(20)
  
  if (error) {
    throw new Error(`Failed to search vendors: ${error.message}`)
  }
  
  return data ?? []
}

/**
 * Create a new vendor
 */
export async function createVendor(vendor: VendorInsert): Promise<Vendor> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('vendors')
    .insert({
      name: vendor.name.trim(),
      is_active: vendor.is_active ?? true,
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create vendor: ${error.message}`)
  }
  
  return data
}

/**
 * Update a vendor
 */
export async function updateVendor(id: string, vendor: VendorUpdate): Promise<Vendor> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('vendors')
    .update({
      ...vendor,
      name: vendor.name?.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update vendor: ${error.message}`)
  }
  
  return data
}

/**
 * Check if a vendor name already exists
 */
export async function vendorNameExists(name: string, excludeId?: string): Promise<boolean> {
  const supabase = await createClient()
  
  let query = supabase
    .from('vendors')
    .select('id')
    .ilike('name', name.trim())
  
  if (excludeId) {
    query = query.neq('id', excludeId)
  }
  
  const { data, error } = await query.limit(1)
  
  if (error) {
    throw new Error(`Failed to check vendor name: ${error.message}`)
  }
  
  return (data?.length ?? 0) > 0
}
