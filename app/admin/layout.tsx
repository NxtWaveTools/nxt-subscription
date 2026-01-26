// ============================================================================
// Admin Layout
// ============================================================================

import { redirect } from 'next/navigation'
import { getCurrentUser, hasRole } from '@/lib/auth/user'
import { ROUTES, ADMIN_ROUTES } from '@/lib/constants'
import { AdminNav } from './components/admin-nav'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Verify user is authenticated and has ADMIN or FINANCE role
  const user = await getCurrentUser()

  if (!user) {
    redirect(ROUTES.LOGIN)
  }

  if (!hasRole(user, 'ADMIN') && !hasRole(user, 'FINANCE')) {
    // Non-admin users are redirected to login (they shouldn't access admin)
    redirect(ROUTES.LOGIN)
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar Navigation */}
      <AdminNav user={user} />

      {/* Main Content */}
      <main className="flex-1 p-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  )
}
