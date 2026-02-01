// ============================================================================
// HOD Layout
// Layout for HOD role pages (view-only access)
// ============================================================================

import { redirect } from 'next/navigation'
import { getCurrentUser, hasAnyRole } from '@/lib/auth/user'
import { ROUTES } from '@/lib/constants'
import { HODNav } from './components/hod-nav'

export default async function HODLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()

  // Must be authenticated
  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  // Must be active
  if (!user.is_active) {
    redirect(ROUTES.UNAUTHORIZED)
  }

  // Must have HOD role only
  if (!hasAnyRole(user, ['HOD'])) {
    redirect(ROUTES.UNAUTHORIZED)
  }

  return (
    <div className="flex h-screen overflow-x-hidden">
      <HODNav user={user} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8 min-w-0">{children}</main>
    </div>
  )
}
