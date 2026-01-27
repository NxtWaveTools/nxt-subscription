// ============================================================================
// POC Layout
// Layout for POC role pages
// ============================================================================

import { redirect } from 'next/navigation'
import { getCurrentUser, hasAnyRole } from '@/lib/auth/user'
import { ROUTES } from '@/lib/constants'
import { POCNav } from './components/poc-nav'

export default async function POCLayout({
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

  // Must have POC role only
  if (!hasAnyRole(user, ['POC'])) {
    redirect(ROUTES.UNAUTHORIZED)
  }

  return (
    <div className="flex h-screen">
      <POCNav user={user} />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">{children}</main>
    </div>
  )
}
