// ============================================================================
// Pending Invoices List Component
// Client component for POC to upload invoices for payment cycles
// ============================================================================

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CheckCircle2, Upload, Loader2, Calendar, Clock, AlertTriangle, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { uploadInvoiceWithFile } from '@/app/poc/actions/payment-cycles'
import type { SubscriptionPaymentWithRelations } from '@/lib/types'

interface PendingInvoicesListProps {
  paymentCycles: SubscriptionPaymentWithRelations[]
}

export function PendingInvoicesList({ paymentCycles }: PendingInvoicesListProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [selectedCycle, setSelectedCycle] = useState<SubscriptionPaymentWithRelations | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select a PDF or image file')
        return
      }
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB')
        return
      }
      setSelectedFile(file)
    }
  }

  const handleUpload = async () => {
    if (!selectedCycle || !selectedFile) return

    setIsProcessing(true)
    try {
      // Create form data
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('paymentCycleId', selectedCycle.id)

      const result = await uploadInvoiceWithFile(formData)

      if (result.success) {
        toast.success('Invoice uploaded successfully')
        handleClose()
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to upload invoice')
      }
    } catch (error) {
      toast.error('An unexpected error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    setSelectedCycle(null)
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getDaysUntilDeadline = (deadline: string) => {
    const deadlineDate = new Date(deadline)
    const today = new Date()
    const diff = Math.ceil((deadlineDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  const isOverdue = (deadline: string) => {
    return new Date(deadline) < new Date()
  }

  if (paymentCycles.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-green-500 mb-3" />
        <p className="font-medium">No Pending Invoices</p>
        <p className="text-sm text-muted-foreground mt-1">
          All invoices are up to date.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {paymentCycles.map((cycle) => {
          const daysLeft = getDaysUntilDeadline(cycle.invoice_deadline)
          const overdue = isOverdue(cycle.invoice_deadline)
          const isUrgent = daysLeft <= 5 && !overdue

          return (
            <div
              key={cycle.id}
              className={`flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors ${
                overdue
                  ? 'border-red-300 bg-red-50/50 dark:bg-red-950/10'
                  : isUrgent
                  ? 'border-orange-300 bg-orange-50/50 dark:bg-orange-950/10'
                  : ''
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">Cycle #{cycle.cycle_number}</span>
                  {overdue && (
                    <Badge variant="destructive" className="text-xs">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Overdue
                    </Badge>
                  )}
                  {isUrgent && (
                    <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                      <Clock className="h-3 w-3 mr-1" />
                      {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(cycle.cycle_start_date)} — {formatDate(cycle.cycle_end_date)}
                  </span>
                  <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-medium' : ''}`}>
                    <Clock className="h-3 w-3" />
                    Deadline: {formatDate(cycle.invoice_deadline)}
                  </span>
                </div>
                {cycle.payment_utr && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Payment UTR: <span className="font-mono">{cycle.payment_utr}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                <Button
                  size="sm"
                  onClick={() => setSelectedCycle(cycle)}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload Invoice
                </Button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Upload Dialog */}
      <Dialog open={!!selectedCycle} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Upload Invoice
            </DialogTitle>
            <DialogDescription>
              {selectedCycle && (
                <>
                  Cycle #{selectedCycle.cycle_number} ({formatDate(selectedCycle.cycle_start_date)} — {formatDate(selectedCycle.cycle_end_date)})
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {selectedCycle && isOverdue(selectedCycle.invoice_deadline) && (
              <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-md text-sm text-red-800 dark:text-red-200">
                <p className="font-medium flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  This invoice is overdue
                </p>
                <p className="mt-1 text-red-700 dark:text-red-300">
                  Deadline was {selectedCycle && formatDate(selectedCycle.invoice_deadline)}. Please upload immediately.
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="invoice-file">Invoice File *</Label>
              <Input
                id="invoice-file"
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Accepted formats: PDF, JPG, PNG (max 10MB)
              </p>
            </div>

            {selectedFile && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-medium">Selected File:</p>
                <p className="text-muted-foreground">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isProcessing}>
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={isProcessing || !selectedFile}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Upload Invoice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
