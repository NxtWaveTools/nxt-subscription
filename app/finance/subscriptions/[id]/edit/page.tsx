// ============================================================================
// Finance Edit Subscription Page
// Form for editing existing subscriptions with all editable fields
// ============================================================================

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Pencil, CreditCard } from 'lucide-react'
import { fetchSubscriptionById, fetchActiveDepartments, fetchSubscriptionPayments } from '@/lib/data-access'
import { FINANCE_ROUTES } from '@/lib/constants'
import { EditSubscriptionForm } from './components/edit-subscription-form'
import { EditPaymentCyclesTable } from './components/edit-payment-cycles-table'

interface EditSubscriptionPageProps {
  params: Promise<{ id: string }>
}

export default async function EditSubscriptionPage({ params }: EditSubscriptionPageProps) {
  const { id } = await params

  // Fetch subscription, departments, and payment cycles
  const [subscription, departments, paymentCycles] = await Promise.all([
    fetchSubscriptionById(id),
    fetchActiveDepartments(),
    fetchSubscriptionPayments(id),
  ])

  if (!subscription) {
    notFound()
  }

  // Map to simpler format for dropdowns
  const simpleDepartments = departments.map((d) => ({ id: d.id, name: d.name }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={FINANCE_ROUTES.SUBSCRIPTIONS}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Subscription</h1>
          <p className="text-muted-foreground">
            {subscription.subscription_id} - {subscription.tool_name}
          </p>
        </div>
      </div>

      {/* Edit Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Subscription Details
          </CardTitle>
          <CardDescription>
            Update the subscription information.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditSubscriptionForm
            subscription={subscription}
            departments={simpleDepartments}
          />
        </CardContent>
      </Card>

      {/* Payment Cycles */}
      {paymentCycles && paymentCycles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Payment Cycles
            </CardTitle>
            <CardDescription>
              Edit payment cycle details including payment status, UTR, and invoice information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EditPaymentCyclesTable 
              paymentCycles={paymentCycles} 
              subscription={subscription}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
