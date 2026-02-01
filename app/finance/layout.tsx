// ============================================================================
// Finance Layout
// Layout for FINANCE role pages
// ============================================================================

import { redirect } from 'next/navigation'
import { getCurrentUser, hasAnyRole } from '@/lib/auth/user'
import { ROUTES } from '@/lib/constants'
import { FinanceNav } from './components/finance-nav'

export default async function FinanceLayout({
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

  // Must have FINANCE role only
  if (!hasAnyRole(user, ['FINANCE'])) {
    redirect(ROUTES.UNAUTHORIZED)
  }

  return (
    <div className="flex h-screen overflow-x-hidden">
      <FinanceNav user={user} />
      <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 lg:p-8 min-w-0">{children}</main>
    </div>
  )
}
