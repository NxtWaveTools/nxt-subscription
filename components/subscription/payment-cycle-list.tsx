// ============================================================================
// Payment Cycle List Component
// Displays a list of payment cycles for a subscription
// ============================================================================

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PaymentCycleCard } from './payment-cycle-card'
import { Plus, Filter, History } from 'lucide-react'
import { PAYMENT_CYCLE_STATUS } from '@/lib/constants'
import type { SubscriptionPaymentWithRelations, PaymentCycleStatus, RoleName } from '@/lib/types'

// ============================================================================
// Types
// ============================================================================

interface PaymentCycleListProps {
  payments: SubscriptionPaymentWithRelations[]
  userRole: RoleName
  isLoading?: boolean
  showCreateButton?: boolean
  onCreateCycle?: () => void
  onRecordPayment?: (paymentId: string) => void
  onApproveRenewal?: (paymentId: string) => void
  onRejectRenewal?: (paymentId: string) => void
  onUploadInvoice?: (paymentId: string) => void
  onViewInvoice?: (fileId: string) => void
  className?: string
}

// ============================================================================
// Component
// ============================================================================

export function PaymentCycleList({
  payments,
  userRole,
  isLoading = false,
  showCreateButton = false,
  onCreateCycle,
  onRecordPayment,
  onApproveRenewal,
  onRejectRenewal,
  onUploadInvoice,
  onViewInvoice,
  className,
}: PaymentCycleListProps) {
  const [statusFilter, setStatusFilter] = useState<PaymentCycleStatus | 'all'>('all')

  const filteredPayments = statusFilter === 'all'
    ? payments
    : payments.filter((p) => p.cycle_status === statusFilter)

  const statusCounts = payments.reduce((acc, p) => {
    acc[p.cycle_status] = (acc[p.cycle_status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-60" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Payment Cycles
            </CardTitle>
            <CardDescription>
              {payments.length} cycle{payments.length !== 1 ? 's' : ''} found
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as PaymentCycleStatus | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All ({payments.length})
                </SelectItem>
                {Object.entries(PAYMENT_CYCLE_STATUS).map(([key, value]) => (
                  <SelectItem key={value} value={value}>
                    {key.replace(/_/g, ' ')} ({statusCounts[value] || 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Create Button (Finance only) */}
            {showCreateButton && userRole === 'FINANCE' && (
              <Button onClick={onCreateCycle}>
                <Plus className="h-4 w-4 mr-1" />
                New Cycle
              </Button>
            )}
          </div>
        </div>

        {/* Status Summary */}
        <div className="flex flex-wrap gap-2 mt-4">
          {Object.entries(statusCounts).map(([status, count]) => (
            <Badge
              key={status}
              variant={statusFilter === status ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setStatusFilter(status as PaymentCycleStatus)}
            >
              {status.replace(/_/g, ' ')}: {count}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {filteredPayments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {payments.length === 0 
              ? 'No payment cycles yet. Create the first cycle to start tracking.'
              : 'No payment cycles match the selected filter.'}
          </div>
        ) : (
          filteredPayments.map((payment) => (
            <PaymentCycleCard
              key={payment.id}
              payment={payment}
              userRole={userRole}
              onRecordPayment={onRecordPayment}
              onApproveRenewal={onApproveRenewal}
              onRejectRenewal={onRejectRenewal}
              onUploadInvoice={onUploadInvoice}
              onViewInvoice={onViewInvoice}
              expandable={filteredPayments.length > 1}
              defaultExpanded={filteredPayments.length <= 2}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}
