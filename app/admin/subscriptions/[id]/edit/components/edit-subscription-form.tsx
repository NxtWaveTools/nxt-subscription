// ============================================================================
// Edit Subscription Form Component
// Client form for editing subscription details
// ============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { updateSubscription } from '@/app/admin/actions/subscriptions'
import {
  REQUEST_TYPES,
  BILLING_FREQUENCY,
  CURRENCIES,
  PAYMENT_STATUS,
  ACCOUNTING_STATUS,
  ADMIN_ROUTES,
} from '@/lib/constants'
import type { 
  RequestType, 
  BillingFrequency, 
  Currency, 
  PaymentStatus, 
  AccountingStatus 
} from '@/lib/constants'
import type { SubscriptionWithRelations } from '@/lib/types'

interface SimpleDepartment {
  id: string
  name: string
}

interface SimpleLocation {
  id: string
  name: string
}

interface EditSubscriptionFormProps {
  subscription: SubscriptionWithRelations
  departments: SimpleDepartment[]
  locations: SimpleLocation[]
}

export function EditSubscriptionForm({ 
  subscription, 
  departments, 
  locations 
}: EditSubscriptionFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state - initialized with subscription values
  const [requestType, setRequestType] = useState<RequestType>(subscription.request_type as RequestType)
  const [toolName, setToolName] = useState(subscription.tool_name)
  const [vendorName, setVendorName] = useState(subscription.vendor_name)
  const [departmentId, setDepartmentId] = useState(subscription.department_id)
  const [locationId, setLocationId] = useState(subscription.location_id || '')
  const [amount, setAmount] = useState(subscription.amount.toString())
  const [equivalentInrAmount, setEquivalentInrAmount] = useState(subscription.equivalent_inr_amount?.toString() || '')
  const [currency, setCurrency] = useState<Currency>(subscription.currency as Currency)
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>(subscription.billing_frequency as BillingFrequency)
  const [startDate, setStartDate] = useState(subscription.start_date || '')
  const [endDate, setEndDate] = useState(subscription.end_date || '')
  const [loginUrl, setLoginUrl] = useState(subscription.login_url || '')
  const [subscriptionEmail, setSubscriptionEmail] = useState(subscription.subscription_email || '')
  const [pocEmail, setPocEmail] = useState(subscription.poc_email || '')
  const [mandateId, setMandateId] = useState(subscription.mandate_id || '')
  const [budgetPeriod, setBudgetPeriod] = useState(subscription.budget_period || '')
  const [paymentUtr, setPaymentUtr] = useState(subscription.payment_utr || '')
  const [requesterRemarks, setRequesterRemarks] = useState(subscription.requester_remarks || '')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(subscription.payment_status as PaymentStatus)
  const [accountingStatus, setAccountingStatus] = useState<AccountingStatus>(subscription.accounting_status as AccountingStatus)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!toolName || !vendorName || !departmentId || !amount || !startDate) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    const result = await updateSubscription(subscription.id, {
      request_type: requestType,
      tool_name: toolName,
      vendor_name: vendorName,
      department_id: departmentId,
      location_id: locationId || null,
      amount: parseFloat(amount),
      equivalent_inr_amount: equivalentInrAmount ? parseFloat(equivalentInrAmount) : null,
      currency,
      billing_frequency: billingFrequency,
      start_date: startDate,
      end_date: endDate || null,
      login_url: loginUrl || null,
      subscription_email: subscriptionEmail || null,
      poc_email: pocEmail || null,
      mandate_id: mandateId || null,
      budget_period: budgetPeriod || null,
      payment_utr: paymentUtr || null,
      requester_remarks: requesterRemarks || null,
      payment_status: paymentStatus,
      accounting_status: accountingStatus,
    })

    setIsSubmitting(false)

    if (result.success) {
      if (result.warning) {
        toast.warning(result.warning)
      } else {
        toast.success('Subscription updated successfully')
      }
      router.push(`${ADMIN_ROUTES.SUBSCRIPTIONS}/${subscription.id}`)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to update subscription')
    }
  }

  const requestTypeLabels: Record<string, string> = {
    INVOICE: 'Invoice',
    QUOTATION: 'Quotation',
  }

  const billingFrequencyLabels: Record<string, string> = {
    MONTHLY: 'Monthly',
    QUARTERLY: 'Quarterly',
    YEARLY: 'Yearly',
    USAGE_BASED: 'Usage Based',
  }

  const paymentStatusLabels: Record<string, string> = {
    PENDING: 'Pending',
    PAID: 'Paid',
    OVERDUE: 'Overdue',
    CANCELLED: 'Cancelled',
  }

  const accountingStatusLabels: Record<string, string> = {
    PENDING: 'Pending',
    DONE: 'Done',
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Subscription ID (Read-only) */}
      {subscription.subscription_id && (
        <div className="space-y-2">
          <Label>Subscription ID</Label>
          <Input 
            value={subscription.subscription_id} 
            disabled 
            className="font-mono bg-muted"
          />
          <p className="text-xs text-muted-foreground">
            Auto-generated subscription ID cannot be changed
          </p>
        </div>
      )}

      {/* Request Type and Basic Info */}
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="requestType">Request Type *</Label>
          <Select value={requestType} onValueChange={(v) => setRequestType(v as RequestType)}>
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(REQUEST_TYPES).map(([key, value]) => (
                <SelectItem key={key} value={value}>
                  {requestTypeLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="toolName">Tool Name *</Label>
          <Input
            id="toolName"
            placeholder="e.g., Slack"
            value={toolName}
            onChange={(e) => setToolName(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="vendorName">Vendor Name *</Label>
          <Input
            id="vendorName"
            placeholder="e.g., Salesforce"
            value={vendorName}
            onChange={(e) => setVendorName(e.target.value)}
          />
        </div>
      </div>

      {/* Department and Location */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="department">Department *</Label>
          <Select value={departmentId} onValueChange={setDepartmentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((dept) => (
                <SelectItem key={dept.id} value={dept.id}>
                  {dept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="location">Location (Optional)</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger>
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc.id} value={loc.id}>
                  {loc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payment Status and Accounting Status */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="paymentStatus">Payment Status</Label>
          <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as PaymentStatus)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PAYMENT_STATUS).map(([key, value]) => (
                <SelectItem key={key} value={value}>
                  {paymentStatusLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="accountingStatus">Accounting Status</Label>
          <Select value={accountingStatus} onValueChange={(v) => setAccountingStatus(v as AccountingStatus)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ACCOUNTING_STATUS).map(([key, value]) => (
                <SelectItem key={key} value={value}>
                  {accountingStatusLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pricing */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount *</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
            <SelectTrigger>
              <SelectValue placeholder="Select currency" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(CURRENCIES).map(([key, value]) => (
                <SelectItem key={key} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="billingFrequency">Billing Frequency *</Label>
          <Select value={billingFrequency} onValueChange={(v) => setBillingFrequency(v as BillingFrequency)}>
            <SelectTrigger>
              <SelectValue placeholder="Select frequency" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BILLING_FREQUENCY).map(([key, value]) => (
                <SelectItem key={key} value={value}>
                  {billingFrequencyLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="startDate">Start Date *</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="endDate">End Date (Optional)</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || undefined}
          />
        </div>
      </div>

      {/* Additional Info */}
      <div className="space-y-2">
        <Label htmlFor="loginUrl">Login URL (Optional)</Label>
        <Input
          id="loginUrl"
          type="url"
          placeholder="https://app.example.com/login"
          value={loginUrl}
          onChange={(e) => setLoginUrl(e.target.value)}
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4 pt-4">
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => router.push(`${ADMIN_ROUTES.SUBSCRIPTIONS}/${subscription.id}`)}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </form>
  )
}
