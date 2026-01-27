// ============================================================================
// Edit Location Dialog Component
// Client component for editing existing locations
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { updateLocation } from '../../actions/locations'
import { LOCATION_TYPES } from '@/lib/constants'
import type { Location } from '@/lib/types'
import type { LocationType } from '@/lib/constants'

interface EditLocationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  location: Location
}

export function EditLocationDialog({
  open,
  onOpenChange,
  location,
}: EditLocationDialogProps) {
  const router = useRouter()
  const [name, setName] = useState(location.name)
  const [locationType, setLocationType] = useState<LocationType>(
    location.location_type as LocationType
  )
  const [address, setAddress] = useState(location.address || '')
  const [isLoading, setIsLoading] = useState(false)

  // Reset form when location changes
  useEffect(() => {
    setName(location.name)
    setLocationType(location.location_type as LocationType)
    setAddress(location.address || '')
  }, [location])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('Location name is required')
      return
    }

    if (!locationType) {
      toast.error('Location type is required')
      return
    }

    setIsLoading(true)

    const result = await updateLocation(location.id, {
      name: name.trim(),
      location_type: locationType,
      address: address.trim() || null,
    })

    setIsLoading(false)

    if (result.success) {
      toast.success('Location updated successfully')
      onOpenChange(false)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update location')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Location</DialogTitle>
            <DialogDescription>
              Update location details. Changes will affect all subscriptions
              using this location.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Location Name</Label>
              <Input
                id="edit-name"
                placeholder="e.g., Office Hyderabad Brigade"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-location_type">Location Type</Label>
              <Select
                value={locationType}
                onValueChange={(value) => setLocationType(value as LocationType)}
                disabled={isLoading}
              >
                <SelectTrigger id="edit-location_type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LOCATION_TYPES).map(([key, value]) => (
                    <SelectItem key={key} value={value}>
                      {value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-address">
                Address <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="edit-address"
                placeholder="Enter the full address..."
                value={address}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAddress(e.target.value)}
                disabled={isLoading}
                rows={3}
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
