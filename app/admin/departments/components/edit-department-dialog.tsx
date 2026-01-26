// ============================================================================
// Edit Department Dialog Component
// Edit department name
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
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { updateDepartment } from '../../actions/departments'

interface EditDepartmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  department: {
    id: string
    name: string
  }
}

export function EditDepartmentDialog({
  open,
  onOpenChange,
  department,
}: EditDepartmentDialogProps) {
  const router = useRouter()
  const [name, setName] = useState(department.name)
  const [isLoading, setIsLoading] = useState(false)

  // Reset name when department changes
  useEffect(() => {
    setName(department.name)
  }, [department.name])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Department name is required')
      return
    }

    if (name.trim() === department.name) {
      toast.info('No changes to save')
      onOpenChange(false)
      return
    }

    setIsLoading(true)
    const result = await updateDepartment(department.id, { name: name.trim() })
    setIsLoading(false)

    if (result.success) {
      toast.success('Department updated successfully')
      onOpenChange(false)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update department')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Department</DialogTitle>
            <DialogDescription>
              Update the department name.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Department Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Engineering, Sales, Marketing"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
