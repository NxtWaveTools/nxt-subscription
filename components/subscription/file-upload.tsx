// ============================================================================
// File Upload Component
// Reusable component for uploading subscription attachments
// ============================================================================

'use client'

import { useState, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Upload, X, File, Download, Trash2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { FILE_TYPES, FILE_SIZE_LIMITS } from '@/lib/constants'
import type { FileType } from '@/lib/constants'
import type { SubscriptionFile } from '@/lib/types'
import {
  uploadSubscriptionFile,
  deleteSubscriptionFile,
  getFileDownloadUrl,
} from '@/app/admin/actions/files'

// ============================================================================
// Types
// ============================================================================

interface FileUploadProps {
  subscriptionId: string
  existingFiles?: SubscriptionFile[]
  onFilesChange?: (files: SubscriptionFile[]) => void
  disabled?: boolean
  allowedTypes?: FileType[]
  className?: string
}

interface PendingFile {
  id: string
  file: File
  fileType: FileType
  progress: number
  error?: string
}

// ============================================================================
// Utility Functions
// ============================================================================

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getFileIcon(mimeType: string | null): string {
  if (!mimeType) return '📄'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.includes('pdf')) return '📕'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📘'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📗'
  return '📄'
}

// ============================================================================
// Component
// ============================================================================

export function FileUpload({
  subscriptionId,
  existingFiles = [],
  onFilesChange,
  disabled = false,
  allowedTypes = Object.values(FILE_TYPES) as FileType[],
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<SubscriptionFile[]>(existingFiles)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [selectedFileType, setSelectedFileType] = useState<FileType>(allowedTypes[0])
  const [isDragOver, setIsDragOver] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const sizeLimit = FILE_SIZE_LIMITS[selectedFileType]
  const sizeLimitMB = sizeLimit / (1024 * 1024)

  // Handle file selection
  const handleFileSelect = useCallback(
    async (selectedFiles: FileList | null) => {
      if (!selectedFiles || selectedFiles.length === 0) return

      const newPendingFiles: PendingFile[] = []

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]

        // Validate file size
        if (file.size > sizeLimit) {
          toast.error(`File "${file.name}" exceeds the ${sizeLimitMB}MB limit`)
          continue
        }

        const pendingFile: PendingFile = {
          id: `pending-${Date.now()}-${i}`,
          file,
          fileType: selectedFileType,
          progress: 0,
        }

        newPendingFiles.push(pendingFile)
      }

      if (newPendingFiles.length === 0) return

      setPendingFiles((prev) => [...prev, ...newPendingFiles])

      // Upload files one by one
      for (const pendingFile of newPendingFiles) {
        try {
          // Update progress
          setPendingFiles((prev) =>
            prev.map((p) =>
              p.id === pendingFile.id ? { ...p, progress: 10 } : p
            )
          )

          // Read file as base64
          const fileData = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(reader.result as string)
            reader.onerror = reject
            reader.readAsDataURL(pendingFile.file)
          })

          setPendingFiles((prev) =>
            prev.map((p) =>
              p.id === pendingFile.id ? { ...p, progress: 50 } : p
            )
          )

          // Upload to server
          const result = await uploadSubscriptionFile({
            subscriptionId,
            fileType: pendingFile.fileType,
            fileName: pendingFile.file.name,
            fileSize: pendingFile.file.size,
            mimeType: pendingFile.file.type || 'application/octet-stream',
            fileData,
          })

          if (result.success && result.data) {
            setFiles((prev) => {
              const updated = [result.data!, ...prev]
              onFilesChange?.(updated)
              return updated
            })
            setPendingFiles((prev) => prev.filter((p) => p.id !== pendingFile.id))
            toast.success(`File "${pendingFile.file.name}" uploaded successfully`)
          } else {
            setPendingFiles((prev) =>
              prev.map((p) =>
                p.id === pendingFile.id
                  ? { ...p, progress: 0, error: result.error || 'Upload failed' }
                  : p
              )
            )
            toast.error(result.error || `Failed to upload "${pendingFile.file.name}"`)
          }
        } catch (error) {
          setPendingFiles((prev) =>
            prev.map((p) =>
              p.id === pendingFile.id
                ? { ...p, progress: 0, error: 'Upload failed' }
                : p
            )
          )
          toast.error(`Failed to upload "${pendingFile.file.name}"`)
        }
      }
    },
    [subscriptionId, selectedFileType, sizeLimit, sizeLimitMB, onFilesChange]
  )

  // Handle file input change
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files)
      // Reset input value to allow re-selecting the same file
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    },
    [handleFileSelect]
  )

  // Handle drag and drop
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      handleFileSelect(e.dataTransfer.files)
    },
    [handleFileSelect]
  )

  // Handle file download
  const handleDownload = useCallback(
    async (file: SubscriptionFile) => {
      try {
        const result = await getFileDownloadUrl(file.id, subscriptionId)
        if (result.success && result.data) {
          // Open download URL in new tab
          window.open(result.data.url, '_blank')
        } else {
          toast.error(result.error || 'Failed to get download URL')
        }
      } catch (error) {
        toast.error('Failed to download file')
      }
    },
    [subscriptionId]
  )

  // Handle file delete
  const handleDelete = useCallback(
    async (file: SubscriptionFile) => {
      setIsDeleting(file.id)
      try {
        const result = await deleteSubscriptionFile(file.id, subscriptionId)
        if (result.success) {
          setFiles((prev) => {
            const updated = prev.filter((f) => f.id !== file.id)
            onFilesChange?.(updated)
            return updated
          })
          toast.success('File deleted successfully')
        } else {
          toast.error(result.error || 'Failed to delete file')
        }
      } catch (error) {
        toast.error('Failed to delete file')
      }
      setIsDeleting(null)
    },
    [subscriptionId, onFilesChange]
  )

  // Remove pending file with error
  const removePendingFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((p) => p.id !== id))
  }, [])

  return (
    <div className={cn('space-y-4', className)}>
      {/* File Type Selector */}
      <div className="flex items-center gap-4">
        <Select
          value={selectedFileType}
          onValueChange={(value) => setSelectedFileType(value as FileType)}
          disabled={disabled}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select file type" />
          </SelectTrigger>
          <SelectContent>
            {allowedTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground">
          Max size: {sizeLimitMB}MB
        </span>
      </div>

      {/* Drop Zone */}
      <div
        className={cn(
          'relative border-2 border-dashed rounded-lg p-8 text-center transition-colors',
          isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={disabled ? undefined : handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled}
          multiple
        />
        <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">
          Drag and drop files here, or{' '}
          <Button
            variant="link"
            className="p-0 h-auto"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            browse
          </Button>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Supported: PDF, Images, Documents • Max {sizeLimitMB}MB
        </p>
      </div>

      {/* Pending Files (uploading) */}
      {pendingFiles.length > 0 && (
        <div className="space-y-2">
          {pendingFiles.map((pendingFile) => (
            <Card key={pendingFile.id} className={cn(pendingFile.error && 'border-destructive')}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <File className="h-8 w-8 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{pendingFile.file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(pendingFile.file.size)} • {pendingFile.fileType}
                    </p>
                    {pendingFile.error ? (
                      <div className="flex items-center gap-1 text-xs text-destructive mt-1">
                        <AlertCircle className="h-3 w-3" />
                        {pendingFile.error}
                      </div>
                    ) : (
                      <Progress value={pendingFile.progress} className="h-1 mt-2" />
                    )}
                  </div>
                  {pendingFile.error && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      onClick={() => removePendingFile(pendingFile.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Uploaded Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Uploaded Files ({files.length})
          </p>
          {files.map((file) => (
            <Card key={file.id}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl shrink-0">{getFileIcon(file.mime_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.original_filename}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {file.file_type.replace(/_/g, ' ')}
                      </Badge>
                      {file.file_size && (
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(file.file_size)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(file.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(file)}
                      disabled={disabled}
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(file)}
                      disabled={disabled || isDeleting === file.id}
                      title="Delete"
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {files.length === 0 && pendingFiles.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No files attached yet
        </p>
      )}
    </div>
  )
}
