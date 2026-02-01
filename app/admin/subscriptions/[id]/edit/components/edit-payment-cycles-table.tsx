// ============================================================================
// Edit Payment Cycles Table Component
// Client component for editing payment cycle details
// ============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { updatePaymentCycle } from '@/app/admin/actions/payment-cycles'
import type { SubscriptionPaymentWithRelations, SubscriptionWithRelations } from '@/lib/types'

interface EditPaymentCyclesTableProps {
  paymentCycles: SubscriptionPaymentWithRelations[]
  subscription: SubscriptionWithRelations
}

type PaymentStatus = 'PAID' | 'IN_PROGRESS' | 'DECLINED'
type PocApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface CycleEditState {
  paymentStatus: PaymentStatus
  pocApprovalStatus: PocApprovalStatus
  paymentUtr: string
  isEditing: boolean
  isSaving: boolean
}

export function EditPaymentCyclesTable({ paymentCycles, subscription }: EditPaymentCyclesTableProps) {
  const router = useRouter()
  
  // Initialize edit state for each cycle
  const [cycleStates, setCycleStates] = useState<Record<string, CycleEditState>>(() => {
    const initial: Record<string, CycleEditState> = {}
    paymentCycles.forEach(cycle => {
      initial[cycle.id] = {
        paymentStatus: cycle.payment_status as PaymentStatus,
        pocApprovalStatus: cycle.poc_approval_status as PocApprovalStatus,
        paymentUtr: cycle.payment_utr || '',
        isEditing: false,
        isSaving: false,
      }
    })
    return initial
  })

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount)
  }

  const handleSaveCycle = async (cycleId: string) => {
    const state = cycleStates[cycleId]
    if (!state) return

    setCycleStates(prev => ({
      ...prev,
      [cycleId]: { ...prev[cycleId], isSaving: true }
    }))

    const result = await updatePaymentCycle(cycleId, {
      payment_status: state.paymentStatus,
      poc_approval_status: state.pocApprovalStatus,
      payment_utr: state.paymentUtr || null,
    })

    setCycleStates(prev => ({
      ...prev,
      [cycleId]: { ...prev[cycleId], isSaving: false, isEditing: false }
    }))

    if (result.success) {
      toast.success('Payment cycle updated successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update payment cycle')
    }
  }

  const updateCycleState = (cycleId: string, updates: Partial<CycleEditState>) => {
    setCycleStates(prev => ({
      ...prev,
      [cycleId]: { ...prev[cycleId], ...updates, isEditing: true }
    }))
  }

  const paymentStatusLabels: Record<string, string> = {
    PAID: 'Paid',
    IN_PROGRESS: 'In Progress',
    DECLINED: 'Declined',
  }

  const pocApprovalLabels: Record<string, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">Cycle</TableHead>
            <TableHead className="min-w-[200px]">Period</TableHead>
            <TableHead className="min-w-[150px]">Payment Status</TableHead>
            <TableHead className="min-w-[150px]">POC Approval</TableHead>
            <TableHead className="min-w-[120px]">Amount</TableHead>
            <TableHead className="min-w-[150px]">UTR</TableHead>
            <TableHead className="w-20">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {paymentCycles.map((cycle) => {
            const state = cycleStates[cycle.id]
            if (!state) return null

            return (
              <TableRow key={cycle.id}>
                <TableCell className="font-medium">#{cycle.cycle_number}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(cycle.cycle_start_date)} - {formatDate(cycle.cycle_end_date)}
                </TableCell>
                <TableCell>
                  <Select
                    value={state.paymentStatus}
                    onValueChange={(v) => updateCycleState(cycle.id, { paymentStatus: v as PaymentStatus })}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAID">{paymentStatusLabels.PAID}</SelectItem>
                      <SelectItem value="IN_PROGRESS">{paymentStatusLabels.IN_PROGRESS}</SelectItem>
                      <SelectItem value="DECLINED">{paymentStatusLabels.DECLINED}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select
                    value={state.pocApprovalStatus}
                    onValueChange={(v) => updateCycleState(cycle.id, { pocApprovalStatus: v as PocApprovalStatus })}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">{pocApprovalLabels.PENDING}</SelectItem>
                      <SelectItem value="APPROVED">{pocApprovalLabels.APPROVED}</SelectItem>
                      <SelectItem value="REJECTED">{pocApprovalLabels.REJECTED}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(subscription.amount, subscription.currency)}
                </TableCell>
                <TableCell>
                  <Input
                    value={state.paymentUtr}
                    onChange={(e) => updateCycleState(cycle.id, { paymentUtr: e.target.value })}
                    placeholder="Enter UTR"
                    className="w-[140px]"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant={state.isEditing ? "default" : "outline"}
                    onClick={() => handleSaveCycle(cycle.id)}
                    disabled={state.isSaving || !state.isEditing}
                  >
                    {state.isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
