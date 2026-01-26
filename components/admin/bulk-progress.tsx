// ============================================================================
// Bulk Progress Component
// Progress tracking for batched bulk operations
// ============================================================================

'use client'

import { Progress } from '@/components/ui/progress'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface BulkProgressProps {
  total: number
  processed: number
  successful: number
  failed: number
  isProcessing: boolean
  operationName: string
  errors?: Array<{ id: string; message: string }>
}

export function BulkProgress({
  total,
  processed,
  successful,
  failed,
  isProcessing,
  operationName,
  errors = [],
}: BulkProgressProps) {
  const progress = total > 0 ? (processed / total) * 100 : 0
  const isComplete = processed === total

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
          {isComplete && !isProcessing && <CheckCircle2 className="h-4 w-4 text-green-600" />}
          Bulk {operationName}
        </CardTitle>
        <CardDescription>
          Processing {total} item{total !== 1 ? 's' : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {processed} / {total}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Status Badges */}
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-green-600" />
            {successful} Successful
          </Badge>
          {failed > 0 && (
            <Badge variant="outline" className="gap-1">
              <XCircle className="h-3 w-3 text-destructive" />
              {failed} Failed
            </Badge>
          )}
          {isProcessing && (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Processing...
            </Badge>
          )}
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-destructive">Errors:</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {errors.map((error, index) => (
                <div
                  key={`${error.id}-${index}`}
                  className="text-xs bg-destructive/10 p-2 rounded border border-destructive/20"
                >
                  <span className="font-mono text-destructive">{error.id}:</span>{' '}
                  <span className="text-muted-foreground">{error.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completion Message */}
        {isComplete && !isProcessing && (
          <p className="text-sm text-muted-foreground">
            {failed === 0
              ? '✓ All operations completed successfully'
              : `✓ Completed with ${failed} error${failed !== 1 ? 's' : ''}`}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
