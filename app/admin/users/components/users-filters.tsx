'use client'

// ============================================================================
// Users Filters Component
// ============================================================================

import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X, Search } from 'lucide-react'
import { useState, useTransition, useEffect, useCallback } from 'react'
import type { Role, Department } from '@/lib/types'

interface UsersFiltersProps {
  roles: Array<Pick<Role, 'id' | 'name'>>
  departments: Array<Pick<Department, 'id' | 'name'>>
  defaultValues?: {
    search?: string
    role_id?: string
    department_id?: string
    is_active?: string
  }
}

export function UsersFilters({ roles, departments, defaultValues }: UsersFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  const [filters, setFilters] = useState({
    search: defaultValues?.search || '',
    role_id: defaultValues?.role_id || '',
    department_id: defaultValues?.department_id || '',
    is_active: defaultValues?.is_active || '',
  })

  // Local search state for debouncing
  const [searchInput, setSearchInput] = useState(defaultValues?.search || '')

  // Apply filters to URL (excluding search which is debounced separately)
  const applyFiltersToURL = useCallback((newFilters: typeof filters) => {
    const params = new URLSearchParams(searchParams.toString())
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value.trim()) {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    
    // Reset to page 1 when filters change
    params.delete('page')

    startTransition(() => {
      router.push(`?${params.toString()}`)
    })
  }, [router, searchParams])

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== filters.search) {
        const newFilters = { ...filters, search: searchInput }
        setFilters(newFilters)
        applyFiltersToURL(newFilters)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchInput, filters, applyFiltersToURL])

  const updateFilters = (updates: Partial<typeof filters>) => {
    const newFilters = { ...filters, ...updates }
    setFilters(newFilters)
    applyFiltersToURL(newFilters)
  }

  const clearFilters = () => {
    setSearchInput('')
    setFilters({
      search: '',
      role_id: '',
      department_id: '',
      is_active: '',
    })
    router.push('/admin/users')
  }

  const hasActiveFilters =
    searchInput || filters.role_id || filters.department_id || filters.is_active

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>

        {/* Role Filter */}
        <Select
          value={filters.role_id}
          onValueChange={(value) => updateFilters({ role_id: value })}
        >
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">All Roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>
                {role.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select
          value={filters.is_active}
          onValueChange={(value) => updateFilters({ is_active: value })}
        >
          <SelectTrigger className="w-full md:w-40">
            <SelectValue placeholder="All Users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value=" ">All Users</SelectItem>
            <SelectItem value="true">Active Only</SelectItem>
            <SelectItem value="false">Inactive Only</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear Filters */}
        {hasActiveFilters && (
          <Button variant="outline" onClick={clearFilters}>
            <X className="mr-2 h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  )
}
