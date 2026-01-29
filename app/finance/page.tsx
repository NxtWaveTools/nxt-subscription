// ============================================================================
// Finance Root - Redirect to Subscriptions
// ============================================================================

import { redirect } from 'next/navigation'
import { FINANCE_ROUTES } from '@/lib/constants'

export default function FinancePage() {
  redirect(FINANCE_ROUTES.SUBSCRIPTIONS)
}
