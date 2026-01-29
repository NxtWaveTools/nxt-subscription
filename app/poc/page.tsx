// ============================================================================
// POC Root - Redirect to Subscriptions
// ============================================================================

import { redirect } from 'next/navigation'
import { POC_ROUTES } from '@/lib/constants'

export default function POCPage() {
  redirect(POC_ROUTES.SUBSCRIPTIONS)
}
