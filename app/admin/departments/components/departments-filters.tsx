// ============================================================================
// Departments Filters Component
// Client component for filtering departments
// ============================================================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'

export function DepartmentsFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const searchParam = searchParams.get('search') || ''
  const isActive = searchParams.get('is_active') || ''

  // Local state for search input (for debouncing)
  const [searchValue, setSearchValue] = useState(searchParam)

  // Sync local state with URL param
  useEffect(() => {
    setSearchValue(searchParam)
  }, [searchParam])

  const updateURLParams = useCallback((key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Special case: "all" means clear the filter
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    
    // Reset to page 1 when filtering
    params.set('page', '1')
    
    router.push(`?${params.toString()}`)
  }, [router, searchParams])

  // Debounced search - only update URL after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchValue !== searchParam) {
        updateURLParams('search', searchValue)
      }
    }, 300) // 300ms debounce

    return () => clearTimeout(timer)
  }, [searchValue, searchParam, updateURLParams])

  const handleClearFilters = () => {
    setSearchValue('')
    router.push('/admin/departments')
  }

  const hasFilters = searchParam || isActive

  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex-1 min-w-[200px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search departments..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Select value={isActive || 'all'} onValueChange={(value) => updateURLParams('is_active', value)}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="true">Active</SelectItem>
          <SelectItem value="false">Inactive</SelectItem>
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters}>
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  )
}
