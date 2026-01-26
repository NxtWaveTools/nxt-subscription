import { redirect } from 'next/navigation'
import { DashboardContent } from './dashboard-content'
import { getCurrentUser, getUserRoles, isUserActive } from '@/lib/auth/user'
import { ROUTES } from '@/lib/constants'

export default async function DashboardPage() {
  const userProfile = await getCurrentUser()

  if (!userProfile) {
    redirect(ROUTES.LOGIN)
  }

  if (!isUserActive(userProfile)) {
    redirect(`${ROUTES.LOGIN}?error=account_inactive`)
  }

  const roles = getUserRoles(userProfile)

  return <DashboardContent user={userProfile} roles={roles} />
}
