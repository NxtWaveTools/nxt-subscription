// ============================================================================
// Manage POC Dialog Component  
// Manage POC access to departments with search-based user fetching
// ============================================================================

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, UserPlus, Search, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { grantPOCAccessToDepartment, revokePOCAccessFromDepartment, searchPOCUsers } from '../../actions/departments'

interface POCUser {
  poc_id: string
  users: {
    id: string
    name: string | null
    email: string
  }
}

interface SearchResult {
  id: string
  name: string | null
  email: string
}

interface ManagePOCDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  department: {
    id: string
    name: string
    poc_department_access: Array<POCUser>
  }
}

// Inner form component that resets state via key prop on department change
function ManagePOCForm({
  department,
  onOpenChange,
}: {
  department: ManagePOCDialogProps['department']
  onOpenChange: (open: boolean) => void
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [rawSearchResults, setRawSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)

  // Local state for immediate UI updates - initialized from props
  const [localPOCs, setLocalPOCs] = useState<POCUser[]>(department.poc_department_access || [])

  // Derive search results - empty when no query (memoized for stable reference)
  const searchResults = useMemo(
    () => (searchQuery.trim() ? rawSearchResults : []),
    [searchQuery, rawSearchResults]
  )

  // Debounced search - fetches data from external API
  useEffect(() => {
    if (!searchQuery.trim()) {
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      const excludeIds = localPOCs.map(p => p.poc_id)
      const result = await searchPOCUsers(searchQuery, excludeIds)
      if (result.success) {
        setRawSearchResults(result.data)
      }
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, localPOCs])

  const handleGrantAccess = useCallback(async (pocId: string) => {
    const pocToAdd = searchResults.find(p => p.id === pocId)
    if (!pocToAdd) return

    setIsLoading(true)

    // Optimistic update
    const newPOC: POCUser = {
      poc_id: pocToAdd.id,
      users: {
        id: pocToAdd.id,
        name: pocToAdd.name,
        email: pocToAdd.email,
      }
    }
    setLocalPOCs(prev => [...prev, newPOC])
    setSearchQuery('')
    setRawSearchResults([])

    const result = await grantPOCAccessToDepartment(pocId, department.id)
    setIsLoading(false)

    if (result.success) {
      toast.success('POC access granted successfully')
      router.refresh()
    } else {
      // Revert optimistic update
      setLocalPOCs(prev => prev.filter(p => p.poc_id !== pocToAdd.id))
      toast.error(result.error || 'Failed to grant POC access')
    }
  }, [searchResults, department.id, router])

  const handleRevokeAccess = useCallback(async (pocId: string) => {
    const removedPOC = localPOCs.find(p => p.poc_id === pocId)
    if (!removedPOC) return

    setIsLoading(true)

    // Optimistic update
    setLocalPOCs(prev => prev.filter(p => p.poc_id !== pocId))

    const result = await revokePOCAccessFromDepartment(pocId, department.id)
    setIsLoading(false)

    if (result.success) {
      toast.success('POC access revoked successfully')
      router.refresh()
    } else {
      // Revert optimistic update
      setLocalPOCs(prev => [...prev, removedPOC])
      toast.error(result.error || 'Failed to revoke POC access')
    }
  }, [localPOCs, department.id, router])

  return (
    <>
      <DialogHeader>
        <DialogTitle>Manage POC Access</DialogTitle>
        <DialogDescription>
          Grant or revoke POC access for {department.name}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-4">
        {/* Current POCs with access */}
        <div>
          <label className="text-sm font-medium mb-2 block">POCs with Access</label>
          {localPOCs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No POCs have access to this department</p>
          ) : (
            <div className="space-y-2">
              {localPOCs.map((poc) => (
                <div
                  key={poc.poc_id}
                  className="flex items-center justify-between p-2 border rounded-lg"
                >
                  <div>
                    <p className="text-sm font-medium">{poc.users.name || 'No name'}</p>
                    <p className="text-xs text-muted-foreground">{poc.users.email}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRevokeAccess(poc.poc_id)}
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add POC with Search */}
        <div>
          <label className="text-sm font-medium mb-2 block">Add POC</label>
          {/* Search Input */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>
          
          {/* Search Results */}
          {searchQuery.trim() && (
            <div className="border rounded-lg max-h-48 overflow-y-auto">
              {isSearching ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  Searching...
                </div>
              ) : searchResults.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground text-center">
                  No matching POCs found
                </div>
              ) : (
                searchResults.map((poc) => (
                  <div
                    key={poc.id}
                    className="flex items-center justify-between p-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                    onClick={() => !isLoading && handleGrantAccess(poc.id)}
                  >
                    <div>
                      <p className="text-sm font-medium">{poc.name || 'No name'}</p>
                      <p className="text-xs text-muted-foreground">{poc.email}</p>
                    </div>
                    <UserPlus className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))
              )}
            </div>
          )}

          {!searchQuery.trim() && (
            <p className="text-xs text-muted-foreground">
              Type to search for users with POC role
            </p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
          Close
        </Button>
      </DialogFooter>
    </>
  )
}

// Wrapper component that uses key to reset form state when department changes
export function ManagePOCDialog({
  open,
  onOpenChange,
  department,
}: ManagePOCDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {/* Key prop causes form to remount and reset state when department changes */}
        <ManagePOCForm
          key={department.id}
          department={department}
          onOpenChange={onOpenChange}
        />
      </DialogContent>
    </Dialog>
  )
}
