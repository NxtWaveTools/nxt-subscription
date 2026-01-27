// ============================================================================
// File Upload Section Component
// Client component for managing subscription files
// ============================================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FileText, Upload, Trash2, Download, Loader2, FileIcon } from 'lucide-react'
import { toast } from 'sonner'
import {
  uploadSubscriptionFile,
  deleteSubscriptionFile,
  getFileDownloadUrl,
} from '@/app/admin/actions/files'
import { FILE_TYPES, FILE_SIZE_LIMITS } from '@/lib/constants'
import type { SubscriptionFile } from '@/lib/types'
import type { FileType } from '@/lib/constants'

interface FileUploadSectionProps {
  subscriptionId: string
  files: SubscriptionFile[]
}

export function FileUploadSection({ subscriptionId, files }: FileUploadSectionProps) {
  const router = useRouter()
  const [selectedFileType, setSelectedFileType] = useState<FileType>('INVOICE')
  const [isUploading, setIsUploading] = useState(false)
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null)
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null)

  const fileTypeLabels: Record<string, string> = {
    INVOICE: 'Invoice',
    PROOF_OF_PAYMENT: 'Proof of Payment',
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Check file size
    const maxSize = FILE_SIZE_LIMITS[selectedFileType]
    if (file.size > maxSize) {
      toast.error(`File size exceeds ${formatFileSize(maxSize)} limit`)
      return
    }

    // Convert to base64
    const reader = new FileReader()
    reader.onload = async () => {
      const base64 = reader.result as string

      setIsUploading(true)
      const result = await uploadSubscriptionFile({
        subscriptionId,
        fileType: selectedFileType,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        fileData: base64,
      })
      setIsUploading(false)

      if (result.success) {
        toast.success('File uploaded successfully')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to upload file')
      }
    }
    reader.readAsDataURL(file)

    // Reset input
    e.target.value = ''
  }

  const handleDelete = async (fileId: string) => {
    setDeletingFileId(fileId)
    const result = await deleteSubscriptionFile(fileId, subscriptionId)
    setDeletingFileId(null)

    if (result.success) {
      toast.success('File deleted successfully')
      router.refresh()
    } else {
      toast.error(result.error || 'Failed to delete file')
    }
  }

  const handleDownload = async (file: SubscriptionFile) => {
    setDownloadingFileId(file.id)
    const result = await getFileDownloadUrl(file.id, subscriptionId)
    setDownloadingFileId(null)

    if (result.success && result.data?.url) {
      // Open in new tab for download
      window.open(result.data.url, '_blank')
    } else {
      toast.error(result.error || 'Failed to get download link')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const invoices = files.filter((f) => f.file_type === 'INVOICE')
  const proofOfPayments = files.filter((f) => f.file_type === 'PROOF_OF_PAYMENT')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Files & Documents
        </CardTitle>
        <CardDescription>
          Upload invoices and proof of payment documents
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Section */}
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
          <Select
            value={selectedFileType}
            onValueChange={(v) => setSelectedFileType(v as FileType)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="File type" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(FILE_TYPES).map(([key, value]) => (
                <SelectItem key={key} value={value}>
                  {fileTypeLabels[value]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex-1">
            <label htmlFor="file-upload" className="cursor-pointer">
              <Button variant="outline" className="w-full" disabled={isUploading} asChild>
                <span>
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  {isUploading ? 'Uploading...' : 'Upload File'}
                </span>
              </Button>
            </label>
            <input
              id="file-upload"
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
          </div>
        </div>

        {/* Files List */}
        {files.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">
            No files uploaded yet
          </p>
        ) : (
          <div className="space-y-6">
            {/* Invoices */}
            {invoices.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Invoices</h4>
                <div className="space-y-2">
                  {invoices.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      isDeleting={deletingFileId === file.id}
                      isDownloading={downloadingFileId === file.id}
                      onDownload={() => handleDownload(file)}
                      onDelete={() => handleDelete(file.id)}
                      formatFileSize={formatFileSize}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Proof of Payment */}
            {proofOfPayments.length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-2">Proof of Payment</h4>
                <div className="space-y-2">
                  {proofOfPayments.map((file) => (
                    <FileRow
                      key={file.id}
                      file={file}
                      isDeleting={deletingFileId === file.id}
                      isDownloading={downloadingFileId === file.id}
                      onDownload={() => handleDownload(file)}
                      onDelete={() => handleDelete(file.id)}
                      formatFileSize={formatFileSize}
                      formatDate={formatDate}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// File row component
interface FileRowProps {
  file: SubscriptionFile
  isDeleting: boolean
  isDownloading: boolean
  onDownload: () => void
  onDelete: () => void
  formatFileSize: (bytes: number) => string
  formatDate: (dateStr: string) => string
}

function FileRow({
  file,
  isDeleting,
  isDownloading,
  onDownload,
  onDelete,
  formatFileSize,
  formatDate,
}: FileRowProps) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <div className="flex items-center gap-3">
        <FileIcon className="h-5 w-5 text-muted-foreground" />
        <div>
          <p className="font-medium text-sm">{file.original_filename}</p>
          <p className="text-xs text-muted-foreground">
            {file.file_size ? formatFileSize(file.file_size) : 'Unknown size'} •{' '}
            {formatDate(file.created_at)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onDownload}
          disabled={isDownloading}
        >
          {isDownloading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          disabled={isDeleting}
          className="text-destructive hover:text-destructive"
        >
          {isDeleting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
