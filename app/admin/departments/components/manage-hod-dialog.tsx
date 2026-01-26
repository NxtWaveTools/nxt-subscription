// ============================================================================
// Manage HOD Dialog Component
// Assign/remove HODs from departments with search-based user fetching
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
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
import { assignHODToDepartment, removeHODFromDepartment, searchHODUsers } from '../../actions/departments'

interface HODUser {
  hod_id: string
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

interface ManageHODDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  department: {
    id: string
    name: string
    hod_departments: Array<HODUser>
  }
}

export function ManageHODDialog({
  open,
  onOpenChange,
  department,
}: ManageHODDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  
  // Local state for immediate UI updates
  const [localHODs, setLocalHODs] = useState<HODUser[]>(department.hod_departments || [])

  // Sync local state when department prop changes
  useEffect(() => {
    setLocalHODs(department.hod_departments || [])
  }, [department.hod_departments])

  // Reset search when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('')
      setSearchResults([])
    }
  }, [open])

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      const excludeIds = localHODs.map(h => h.hod_id)
      const result = await searchHODUsers(searchQuery, excludeIds)
      if (result.success) {
        setSearchResults(result.data)
      }
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, localHODs])

  const handleAssignHOD = async (hodId: string) => {
    const hodToAdd = searchResults.find(h => h.id === hodId)
    if (!hodToAdd) return

    setIsLoading(true)
    
    // Optimistic update
    const newHOD: HODUser = {
      hod_id: hodToAdd.id,
      users: {
        id: hodToAdd.id,
        name: hodToAdd.name,
        email: hodToAdd.email,
      }
    }
    setLocalHODs(prev => [...prev, newHOD])
    setSearchQuery('')
    setSearchResults([])

    const result = await assignHODToDepartment(department.id, hodId)
    setIsLoading(false)

    if (result.success) {
      toast.success('HOD assigned successfully')
      router.refresh()
    } else {
      // Revert optimistic update
      setLocalHODs(prev => prev.filter(h => h.hod_id !== hodToAdd.id))
      toast.error(result.error || 'Failed to assign HOD')
    }
  }

  const handleRemoveHOD = async (hodId: string) => {
    const removedHOD = localHODs.find(h => h.hod_id === hodId)
    if (!removedHOD) return

    setIsLoading(true)
    
    // Optimistic update
    setLocalHODs(prev => prev.filter(h => h.hod_id !== hodId))

    const result = await removeHODFromDepartment(department.id, hodId)
    setIsLoading(false)

    if (result.success) {
      toast.success('HOD removed successfully')
      router.refresh()
    } else {
      // Revert optimistic update
      setLocalHODs(prev => [...prev, removedHOD])
      toast.error(result.error || 'Failed to remove HOD')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage HODs</DialogTitle>
          <DialogDescription>
            Assign or remove Heads of Department for {department.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current HODs */}
          <div>
            <label className="text-sm font-medium mb-2 block">Current HODs</label>
            {localHODs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No HODs assigned</p>
            ) : (
              <div className="space-y-2">
                {localHODs.map((hod) => (
                  <div
                    key={hod.hod_id}
                    className="flex items-center justify-between p-2 border rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium">{hod.users.name || 'No name'}</p>
                      <p className="text-xs text-muted-foreground">{hod.users.email}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveHOD(hod.hod_id)}
                      disabled={isLoading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add HOD with Search */}
          <div>
            <label className="text-sm font-medium mb-2 block">Add HOD</label>
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
                    No matching HODs found
                  </div>
                ) : (
                  searchResults.map((hod) => (
                    <div
                      key={hod.id}
                      className="flex items-center justify-between p-2 hover:bg-muted/50 cursor-pointer border-b last:border-b-0"
                      onClick={() => !isLoading && handleAssignHOD(hod.id)}
                    >
                      <div>
                        <p className="text-sm font-medium">{hod.name || 'No name'}</p>
                        <p className="text-xs text-muted-foreground">{hod.email}</p>
                      </div>
                      <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ))
                )}
              </div>
            )}

            {!searchQuery.trim() && (
              <p className="text-xs text-muted-foreground">
                Type to search for users with HOD role
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
