// ============================================================================
// Admin Root Page - Redirect to Dashboard
// ============================================================================

import { redirect } from 'next/navigation'
import { ADMIN_ROUTES } from '@/lib/constants'

export default async function AdminPage() {
  // Layout already checks for ADMIN role
  // Simply redirect to dashboard
  redirect(ADMIN_ROUTES.DASHBOARD)
}
