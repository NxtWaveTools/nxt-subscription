// ============================================================================
// Create User Button Component
// ============================================================================

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { UserPlus } from 'lucide-react'
import { CreateUserDialog } from './create-user-dialog'

interface CreateUserButtonProps {
  roles: Array<{ id: string; name: string }>
}

export function CreateUserButton({ roles }: CreateUserButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        Create User
      </Button>
      <CreateUserDialog open={open} onOpenChange={setOpen} roles={roles} />
    </>
  )
}
