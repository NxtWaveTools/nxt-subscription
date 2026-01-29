// ============================================================================
// HOD Root - Redirect to Subscriptions
// ============================================================================

import { redirect } from 'next/navigation'
import { HOD_ROUTES } from '@/lib/constants'

export default function HODPage() {
  redirect(HOD_ROUTES.SUBSCRIPTIONS)
}
