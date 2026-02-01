// ============================================================================
// Admin Layout
// Handles authentication and role-based access for ADMIN role only
// ============================================================================

import { redirect } from 'next/navigation'
import { getCurrentUser, hasAnyRole } from '@/lib/auth/user'
import { ROUTES } from '@/lib/constants'
import { AdminNav } from './components/admin-nav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verify user is authenticated
  const user = await getCurrentUser()

  // Must be authenticated
  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  // Must be active
  if (!user.is_active) {
    redirect(ROUTES.UNAUTHORIZED)
  }

  // Must have ADMIN role only
  if (!hasAnyRole(user, ['ADMIN'])) {
    redirect(ROUTES.UNAUTHORIZED)
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      {/* Sidebar Navigation */}
      <AdminNav user={user} />

      {/* Main Content */}
      <main className="flex-1 p-8 min-w-0">
        <div className="max-w-full">{children}</div>
      </main>
    </div>
  )
}
