// ============================================================================
// Manage User Roles Dialog Component
// Assign/remove roles from users
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
import { toast } from 'sonner'
import { assignRoleToUser, removeRoleFromUser } from '../../actions/users'
import type { UserWithRoles, Role } from '@/lib/types'

interface ManageRolesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: UserWithRoles
  allRoles: Array<Pick<Role, 'id' | 'name'>>
}

export function ManageRolesDialog({
  open,
  onOpenChange,
  user,
  allRoles,
}: ManageRolesDialogProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  // Track local state for immediate UI update
  const [localRoleId, setLocalRoleId] = useState<string | null>(user.user_roles?.role_id || null)

  // Sync local state when user prop changes (after router.refresh())
  useEffect(() => {
    setLocalRoleId(user.user_roles?.role_id || null)
  }, [user.user_roles?.role_id])

  const handleSelectRole = async (roleId: string) => {
    if (roleId === localRoleId) return // Already selected
    
    setIsLoading(true)
    
    // Update local state immediately for responsive UI
    const previousRoleId = localRoleId
    setLocalRoleId(roleId)

    try {
      // If user has a current role, we assign the new one (server will handle replacement)
      const result = await assignRoleToUser(user.id, roleId)

      if (result.success) {
        toast.success(result.warning ? result.warning : 'Role updated successfully')
        router.refresh()
      } else {
        // Revert local state on error
        setLocalRoleId(previousRoleId)
        toast.error(result.error || 'Failed to update role')
      }
    } catch (error) {
      // Revert local state on error
      setLocalRoleId(previousRoleId)
      console.error('Error in handleSelectRole:', error)
      toast.error('An error occurred while updating the role')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveRole = async () => {
    if (!localRoleId) return
    
    setIsLoading(true)
    const previousRoleId = localRoleId
    setLocalRoleId(null)

    try {
      const result = await removeRoleFromUser(user.id, localRoleId)

      if (result.success) {
        toast.success('Role removed successfully')
        router.refresh()
      } else {
        setLocalRoleId(previousRoleId)
        toast.error(result.error || 'Failed to remove role')
      }
    } catch (error) {
      setLocalRoleId(previousRoleId)
      console.error('Error in handleRemoveRole:', error)
      toast.error('An error occurred while removing the role')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Manage Role</DialogTitle>
          <DialogDescription>
            Select a role for {user.name || user.email}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-4">
          {allRoles.map((role) => {
            const isSelected = localRoleId === role.id

            return (
              <div
                key={role.id}
                className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                  isSelected 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:bg-muted/50'
                } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                onClick={() => handleSelectRole(role.id)}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-primary' : 'border-muted-foreground'
                    }`}
                  >
                    {isSelected && (
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    )}
                  </div>
                  <span className="text-sm font-medium">{role.name}</span>
                </div>
              </div>
            )
          })}
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button
            variant="ghost"
            onClick={handleRemoveRole}
            disabled={isLoading || !localRoleId}
            className="text-destructive hover:text-destructive"
          >
            Remove Role
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
