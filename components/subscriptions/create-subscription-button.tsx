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
import { createVendorAction, createProductAction } from '@/app/admin/actions/master-data'
import {
  REQUEST_TYPES,
  BILLING_FREQUENCY,
  CURRENCIES,
  PAYMENT_STATUS,
  ACCOUNTING_STATUS,
} from '@/lib/constants'
import type { RequestType, BillingFrequency, Currency, PaymentStatus, AccountingStatus } from '@/lib/constants'
import type { Vendor, Product } from '@/lib/types'

// Simplified types for dropdown data
interface SimpleDepartment {
  id: string
  name: string
}

interface CreateSubscriptionButtonProps {
  departments: SimpleDepartment[]
  vendors: Vendor[]
  products: Product[]
}

export function CreateSubscriptionButton({ departments, vendors: initialVendors, products: initialProducts }: CreateSubscriptionButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Local state for vendors and products (can be updated when new ones are created)
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors)
  const [products, setProducts] = useState<Product[]>(initialProducts)
  
  // New vendor/product creation state
  const [showNewVendorInput, setShowNewVendorInput] = useState(false)
  const [newVendorName, setNewVendorName] = useState('')
  const [isCreatingVendor, setIsCreatingVendor] = useState(false)
  const [showNewProductInput, setShowNewProductInput] = useState(false)
  const [newProductName, setNewProductName] = useState('')
  const [isCreatingProduct, setIsCreatingProduct] = useState(false)

  // Form state
  const [requestType, setRequestType] = useState<RequestType>('INVOICE')
  const [toolName, setToolName] = useState('')
  const [vendorName, setVendorName] = useState('')
  const [productId, setProductId] = useState('')
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
  const [budgetPeriod, setBudgetPeriod] = useState('')
  const [paymentUtr, setPaymentUtr] = useState('')
  const [requesterRemarks, setRequesterRemarks] = useState('')
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('IN_PROGRESS')
  const [accountingStatus, setAccountingStatus] = useState<AccountingStatus>('PENDING')
  
  // Update vendors/products when props change
  useEffect(() => {
    setVendors(initialVendors)
  }, [initialVendors])
  
  useEffect(() => {
    setProducts(initialProducts)
  }, [initialProducts])

  const resetForm = useCallback(() => {
    setRequestType('INVOICE')
    setToolName('')
    setVendorName('')
    setProductId('')
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
    setMandateId('')
    setBudgetPeriod('')
    setPaymentUtr('')
    setRequesterRemarks('')
    setPaymentStatus('IN_PROGRESS')
    setAccountingStatus('PENDING')
  }, [])
  
  // Handle product selection
  const handleProductChange = (value: string) => {
    if (value === 'CREATE_NEW') {
      setShowNewProductInput(true)
      setProductId('')
    } else {
      setShowNewProductInput(false)
      setProductId(value)
    }
  }
  
  // Handle creating a new product
  const handleCreateProduct = async () => {
    if (!newProductName.trim()) {
      toast.error('Please enter a product name')
      return
    }
    
    setIsCreatingProduct(true)
    const result = await createProductAction({ name: newProductName.trim() })
    setIsCreatingProduct(false)
    
    if (result.success && result.data) {
      toast.success('Product created successfully')
      setProducts(prev => [...prev, result.data!].sort((a, b) => a.name.localeCompare(b.name)))
      setProductId(result.data.id)
      setShowNewProductInput(false)
      setNewProductName('')
    } else {
      toast.error(result.error || 'Failed to create product')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!toolName || !vendorName || !departmentId || !amount || !startDate) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)

    const result = await createSubscription({
      request_type: requestType,
      tool_name: toolName,
      vendor_name: vendorName,
      product_id: productId || null,
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
      budget_period: budgetPeriod || null,
      payment_utr: paymentUtr || null,
      requester_remarks: requesterRemarks || null,
      payment_status: paymentStatus,
      accounting_status: accountingStatus,
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

  const paymentStatusLabels: Record<string, string> = {
    PAID: 'Paid',
    IN_PROGRESS: 'In Progress',
    DECLINED: 'Declined',
  }

  const accountingStatusLabels: Record<string, string> = {
    PENDING: 'Pending',
    DONE: 'Done',
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Subscription
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Create New Subscription
          </DialogTitle>
          <DialogDescription>
            Add a new software subscription. It will be sent for POC approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Request Type */}
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

          {/* Product */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="product">Product (Optional)</Label>
              {showNewProductInput ? (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter new product name"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    disabled={isCreatingProduct}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateProduct}
                    disabled={isCreatingProduct}
                  >
                    {isCreatingProduct ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Add'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowNewProductInput(false)
                      setNewProductName('')
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Select value={productId} onValueChange={handleProductChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select or create product" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CREATE_NEW">
                      <span className="flex items-center gap-2 text-primary">
                        <Plus className="h-4 w-4" />
                        Create New Product
                      </span>
                    </SelectItem>
                    {products.map((product) => (
                      <SelectItem key={product.id} value={product.id}>
                        {product.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
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

          {/* Department */}
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
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-4 gap-4">
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
            
            <div className="col-span-2 space-y-2">
              <Label htmlFor="equivalentInrAmount">Equivalent INR Amount</Label>
              <Input
                id="equivalentInrAmount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={equivalentInrAmount}
                onChange={(e) => setEquivalentInrAmount(e.target.value)}
              />
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
          
          {/* Subscription Email and POC Email */}
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="pocEmail">POC Email for Subscription</Label>
              <Input
                id="pocEmail"
                type="email"
                placeholder="poc@company.com"
                value={pocEmail}
                onChange={(e) => setPocEmail(e.target.value)}
              />
            </div>
          </div>
          
          {/* Mandate ID and Budget Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mandateId">Mandate ID</Label>
              <Input
                id="mandateId"
                placeholder="Enter mandate ID"
                value={mandateId}
                onChange={(e) => setMandateId(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="budgetPeriod">Budget Period</Label>
              <Input
                id="budgetPeriod"
                placeholder="e.g., FY24-25"
                value={budgetPeriod}
                onChange={(e) => setBudgetPeriod(e.target.value)}
              />
            </div>
          </div>
          
          {/* Payment UTR */}
          <div className="space-y-2">
            <Label htmlFor="paymentUtr">Payment UTR</Label>
            <Input
              id="paymentUtr"
              placeholder="Enter payment UTR"
              value={paymentUtr}
              onChange={(e) => setPaymentUtr(e.target.value)}
            />
          </div>
          
          {/* Requester Remarks */}
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Subscription
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
