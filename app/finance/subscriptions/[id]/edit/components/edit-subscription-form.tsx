// ============================================================================
// Edit Subscription Form Component
// Client form for editing subscription details
// ============================================================================

'use client'

import { useState, useEffect } from 'react'
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
  FINANCE_ROUTES,
} from '@/lib/constants'
import type { 
  RequestType, 
  BillingFrequency, 
  Currency,
} from '@/lib/constants'
import type { SubscriptionWithRelations } from '@/lib/types'

// Fixed conversion rate: 1 USD = 85 INR
const USD_TO_INR_RATE = 85

interface SimpleDepartment {
  id: string
  name: string
  poc_email?: string | null
}

interface EditSubscriptionFormProps {
  subscription: SubscriptionWithRelations
  departments: SimpleDepartment[]
}

export function EditSubscriptionForm({ 
  subscription, 
  departments
}: EditSubscriptionFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state - initialized with subscription values
  const [requestType, setRequestType] = useState<RequestType>(subscription.request_type as RequestType)
  const [toolName, setToolName] = useState(subscription.tool_name)
  const [vendorName, setVendorName] = useState(subscription.vendor_name)
  const [prId, setPrId] = useState(subscription.pr_id || '')
  const [departmentId, setDepartmentId] = useState(subscription.department_id)
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
  const [requesterRemarks, setRequesterRemarks] = useState(subscription.requester_remarks || '')

  // Auto-populate POC Email when department changes
  useEffect(() => {
    const dept = departments.find(d => d.id === departmentId)
    if (dept?.poc_email) {
      setPocEmail(dept.poc_email)
    }
  }, [departmentId, departments])

  // Auto-convert currency amounts
  useEffect(() => {
    if (!amount) {
      setEquivalentInrAmount('')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount)) return

    if (currency === 'USD') {
      // USD to INR conversion
      const inrAmount = numAmount * USD_TO_INR_RATE
      setEquivalentInrAmount(inrAmount.toFixed(2))
    } else if (currency === 'INR') {
      // INR = INR, no conversion
      setEquivalentInrAmount(amount)
    } else {
      // Other currencies, clear conversion
      setEquivalentInrAmount('')
    }
  }, [amount, currency])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!toolName || !vendorName || !prId || !departmentId || !amount || !startDate || !endDate) {
      toast.error('Please fill in all required fields')
      return
    }

    // Validate dates
    if (new Date(endDate) <= new Date(startDate)) {
      toast.error('End date must be after start date')
      return
    }

    setIsSubmitting(true)

    const result = await updateSubscription(subscription.id, {
      request_type: requestType,
      tool_name: toolName,
      vendor_name: vendorName,
      department_id: departmentId,
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
      requester_remarks: requesterRemarks || null,
    })

    setIsSubmitting(false)

    if (result.success) {
      if (result.warning) {
        toast.warning(result.warning)
      } else {
        toast.success('Subscription updated successfully')
      }
      router.push(`${FINANCE_ROUTES.SUBSCRIPTIONS}/${subscription.id}`)
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

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Row 1: Request Type, Tool Name, Vendor Name */}
      <div className="grid grid-cols-3 gap-4">
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

      {/* Row 2: PR ID, Department, Billing Frequency */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="prId">PR ID *</Label>
          <Input
            id="prId"
            placeholder="e.g., PR-2024-001"
            value={prId}
            onChange={(e) => setPrId(e.target.value)}
          />
        </div>

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

      {/* Row 3: Amount, Currency, Equivalent INR Amount */}
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
          <Label htmlFor="currency">Currency *</Label>
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
          <Label htmlFor="equivalentInrAmount">
            Equivalent INR Amount 
            {currency === 'USD' && <span className="text-xs text-muted-foreground ml-1">(auto-converted)</span>}
          </Label>
          <Input
            id="equivalentInrAmount"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            value={equivalentInrAmount}
            onChange={(e) => setEquivalentInrAmount(e.target.value)}
            disabled={currency === 'USD' || currency === 'INR'}
          />
        </div>
      </div>

      {/* Row 4: Start Date, End Date, Tool Link/URL */}
      <div className="grid grid-cols-3 gap-4">
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
          <Label htmlFor="endDate">End Date *</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            min={startDate || undefined}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="loginUrl">Tool Link/URL</Label>
          <Input
            id="loginUrl"
            type="url"
            placeholder="https://app.example.com/login"
            value={loginUrl}
            onChange={(e) => setLoginUrl(e.target.value)}
          />
        </div>
      </div>

      {/* Row 5: Subscription Email, POC Email, Mandate ID */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subscriptionEmail">Mail ID/Username for Subscription</Label>
          <Input
            id="subscriptionEmail"
            type="email"
            placeholder="admin@company.com"
            value={subscriptionEmail}
            onChange={(e) => setSubscriptionEmail(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="pocEmail">
            POC Email for Subscription 
            <span className="text-xs text-muted-foreground ml-1">(auto-filled)</span>
          </Label>
          <Input
            id="pocEmail"
            type="email"
            placeholder="poc@company.com"
            value={pocEmail}
            onChange={(e) => setPocEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="mandateId">Mandate ID</Label>
          <Input
            id="mandateId"
            placeholder="Enter mandate ID"
            value={mandateId}
            onChange={(e) => setMandateId(e.target.value)}
          />
        </div>
      </div>
      
      {/* Requester Remarks - Full Width */}
      <div className="space-y-2">
        <Label htmlFor="requesterRemarks">Requester Remarks</Label>
        <Textarea
          id="requesterRemarks"
          placeholder="Enter any remarks for this request..."
          value={requesterRemarks}
          onChange={(e) => setRequesterRemarks(e.target.value)}
          rows={2}
        />
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
          onClick={() => router.push(`${FINANCE_ROUTES.SUBSCRIPTIONS}/${subscription.id}`)}
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
