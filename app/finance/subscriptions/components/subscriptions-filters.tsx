// ============================================================================
// Subscriptions Filters Component
// Client component for filtering subscriptions
// ============================================================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Search, X } from 'lucide-react'
import {
  SUBSCRIPTION_STATUS,
  PAYMENT_STATUS,
  BILLING_FREQUENCY,
  FINANCE_ROUTES,
} from '@/lib/constants'
// Simplified types for dropdown data
interface SimpleDepartment {
  id: string
  name: string
}

interface SimpleLocation {
  id: string
  name: string
}

interface SubscriptionsFiltersProps {
  departments: SimpleDepartment[]
  locations: SimpleLocation[]
}

export function SubscriptionsFilters({ departments, locations }: SubscriptionsFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // Get current filter values from URL
  const searchParam = searchParams.get('search') || ''
  const statusParam = searchParams.get('status') || ''
  const paymentStatusParam = searchParams.get('payment_status') || ''
  const billingFrequencyParam = searchParams.get('billing_frequency') || ''
  const departmentIdParam = searchParams.get('department_id') || ''
  const locationIdParam = searchParams.get('location_id') || ''

  // Local state for search input (for debouncing)
  const [searchValue, setSearchValue] = useState(searchParam)

  // Sync local state with URL param
  useEffect(() => {
    setSearchValue(searchParam)
  }, [searchParam])

  const updateURLParams = useCallback(
    (key: string, value: string) => {
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
    },
    [router, searchParams]
  )

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
    router.push(FINANCE_ROUTES.SUBSCRIPTIONS)
  }

  const hasFilters =
    searchParam ||
    statusParam ||
    paymentStatusParam ||
    billingFrequencyParam ||
    departmentIdParam ||
    locationIdParam

  // Human-readable labels for enums
  const statusLabels: Record<string, string> = {
    PENDING: 'Pending Approval',
    ACTIVE: 'Active',
    REJECTED: 'Rejected',
    EXPIRED: 'Expired',
    CANCELLED: 'Cancelled',
  }

  const paymentStatusLabels: Record<string, string> = {
    PENDING: 'Payment Pending',
    IN_PROGRESS: 'In Progress',
    PAID: 'Paid',
    DECLINED: 'Declined',
  }

  const billingFrequencyLabels: Record<string, string> = {
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly',
    USAGE_BASED: 'Usage Based',
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      {/* Search input */}
      <div className="flex-1 min-w-[250px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search subscriptions, tools, vendors..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Status filter */}
      <Select
        value={statusParam || 'all'}
        onValueChange={(value) => updateURLParams('status', value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {Object.entries(SUBSCRIPTION_STATUS).map(([key, value]) => (
            <SelectItem key={key} value={value}>
              {statusLabels[value] || value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Payment Status filter */}
      <Select
        value={paymentStatusParam || 'all'}
        onValueChange={(value) => updateURLParams('payment_status', value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Payment" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Payments</SelectItem>
          {Object.entries(PAYMENT_STATUS).map(([key, value]) => (
            <SelectItem key={key} value={value}>
              {paymentStatusLabels[value] || value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Billing Frequency filter */}
      <Select
        value={billingFrequencyParam || 'all'}
        onValueChange={(value) => updateURLParams('billing_frequency', value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Billing" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Frequencies</SelectItem>
          {Object.entries(BILLING_FREQUENCY).map(([key, value]) => (
            <SelectItem key={key} value={value}>
              {billingFrequencyLabels[value] || value}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Department filter */}
      <Select
        value={departmentIdParam || 'all'}
        onValueChange={(value) => updateURLParams('department_id', value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Department" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {departments.map((dept) => (
            <SelectItem key={dept.id} value={dept.id}>
              {dept.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Location filter */}
      <Select
        value={locationIdParam || 'all'}
        onValueChange={(value) => updateURLParams('location_id', value)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Location" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Locations</SelectItem>
          {locations.map((loc) => (
            <SelectItem key={loc.id} value={loc.id}>
              {loc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear filters button */}
      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={handleClearFilters}>
          <X className="h-4 w-4 mr-2" />
          Clear Filters
        </Button>
      )}
    </div>
  )
}
