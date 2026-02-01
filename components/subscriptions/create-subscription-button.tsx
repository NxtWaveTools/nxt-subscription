// ============================================================================
// Create Subscription Button Component
// Client component for creating new subscriptions
// ============================================================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Plus, CreditCard, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createSubscription } from '@/app/admin/actions/subscriptions'
import {
  REQUEST_TYPES,
  BILLING_FREQUENCY,
  CURRENCIES,
} from '@/lib/constants'
import type { RequestType, BillingFrequency, Currency } from '@/lib/constants'

// Fixed conversion rate: 1 USD = 85 INR
const USD_TO_INR_RATE = 85

// Simplified types for dropdown data
interface SimpleDepartment {
  id: string
  name: string
  poc_email?: string | null
}

interface CreateSubscriptionButtonProps {
  departments: SimpleDepartment[]
}

export function CreateSubscriptionButton({ departments }: CreateSubscriptionButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Form state
  const [requestType, setRequestType] = useState<RequestType>('INVOICE')
  const [toolName, setToolName] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [prId, setPrId] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [amount, setAmount] = useState('')
  const [equivalentInrAmount, setEquivalentInrAmount] = useState('')
  const [currency, setCurrency] = useState<Currency>('INR')
  const [billingFrequency, setBillingFrequency] = useState<BillingFrequency>('MONTHLY')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [loginUrl, setLoginUrl] = useState('')
  const [subscriptionEmail, setSubscriptionEmail] = useState('')
  const [pocEmail, setPocEmail] = useState('')
  const [mandateId, setMandateId] = useState('')
  const [requesterRemarks, setRequesterRemarks] = useState('')

  // POCs state for the selected department
  const [departmentPOCs, setDepartmentPOCs] = useState<{ id: string; name: string; email: string }[]>([])
  const [isLoadingPOCs, setIsLoadingPOCs] = useState(false)

  // Fetch POCs when department changes
  useEffect(() => {
    if (!departmentId) {
      setDepartmentPOCs([])
      setPocEmail('')
      return
    }

    const fetchPOCs = async () => {
      setIsLoadingPOCs(true)
      try {
        const response = await fetch(`/api/departments/${departmentId}/pocs`)
        if (response.ok) {
          const data = await response.json()
          setDepartmentPOCs(data.pocs || [])
          // Auto-select first POC if available
          if (data.pocs && data.pocs.length > 0) {
            setPocEmail(data.pocs[0].email)
          } else {
            setPocEmail('')
          }
        }
      } catch (error) {
        console.error('Failed to fetch POCs:', error)
        setDepartmentPOCs([])
      } finally {
        setIsLoadingPOCs(false)
      }
    }

    fetchPOCs()
  }, [departmentId])

  // Auto-convert currency amounts
  useEffect(() => {
    if (!amount) {
      setEquivalentInrAmount('')
      return
    }

    const numAmount = parseFloat(amount)
    if (isNaN(numAmount)) return

    if (currency === 'USD') {
      // Convert USD to INR
      setEquivalentInrAmount((numAmount * USD_TO_INR_RATE).toFixed(2))
    } else if (currency === 'INR') {
      // INR = INR, no conversion
      setEquivalentInrAmount(amount)
    } else {
      // Other currencies, clear conversion
      setEquivalentInrAmount('')
    }
  }, [amount, currency])

  const resetForm = useCallback(() => {
    setRequestType('INVOICE')
    setToolName('')
    setVendorName('')
    setPrId('')
    setDepartmentId('')
    setAmount('')
    setEquivalentInrAmount('')
    setCurrency('INR')
    setBillingFrequency('MONTHLY')
    setStartDate('')
    setEndDate('')
    setLoginUrl('')
    setSubscriptionEmail('')
    setPocEmail('')
    setDepartmentPOCs([])
    setMandateId('')
    setRequesterRemarks('')
  }, [])
  
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

    const result = await createSubscription({
      request_type: requestType,
      tool_name: toolName,
      vendor_name: vendorName,
      pr_id: prId,
      department_id: departmentId,
      amount: parseFloat(amount),
      equivalent_inr_amount: equivalentInrAmount ? parseFloat(equivalentInrAmount) : null,
      currency,
      billing_frequency: billingFrequency,
      start_date: startDate,
      end_date: endDate,
      login_url: loginUrl || null,
      subscription_email: subscriptionEmail || null,
      poc_email: pocEmail || null,
      mandate_id: mandateId || null,
      requester_remarks: requesterRemarks || null,
    })

    setIsSubmitting(false)

    if (result.success) {
      toast.success('Subscription created successfully')
      resetForm()
      setOpen(false)
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to create subscription')
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Subscription
        </Button>
      </DialogTrigger>
      <DialogContent className="!fixed !inset-0 !translate-x-0 !translate-y-0 !top-0 !left-0 !w-screen !h-screen !max-w-none !rounded-none">
        <div className="h-full flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Create New Subscription
          </DialogTitle>
          <DialogDescription>
            Add a new software subscription. It will be sent for POC approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-6 px-2">
          <div className="max-w-6xl mx-auto space-y-6">
          {/* Row 1: Request Type, Tool Name, Vendor Name */}
          <div className="grid grid-cols-3 gap-6">
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
          <div className="grid grid-cols-3 gap-6">
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
          <div className="grid grid-cols-3 gap-6">
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
              <Label htmlFor="equivalentInrAmount">Equivalent INR Amount</Label>
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
          <div className="grid grid-cols-3 gap-6">
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
          <div className="grid grid-cols-3 gap-6">
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
              <Label htmlFor="pocEmail">POC for Subscription *</Label>
              <Select 
                value={pocEmail} 
                onValueChange={setPocEmail}
                disabled={!departmentId || isLoadingPOCs}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !departmentId 
                      ? "Select department first" 
                      : isLoadingPOCs 
                        ? "Loading POCs..." 
                        : departmentPOCs.length === 0 
                          ? "No POCs assigned" 
                          : "Select POC"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {departmentPOCs.map((poc) => (
                    <SelectItem key={poc.id} value={poc.email}>
                      {poc.name} ({poc.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          
          {/* Row 6: Requester Remarks */}
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
          </div>
        </form>

        <DialogFooter className="shrink-0 pt-4 border-t">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" form="create-subscription-form" disabled={isSubmitting} onClick={handleSubmit}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Subscription
          </Button>
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  )
}
