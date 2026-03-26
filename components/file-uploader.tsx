'use client'

import { useCallback, useState } from 'react'
import { Upload, FileText, AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface FileUploaderProps {
  onFileSelect: (file: File) => void
  isLoading?: boolean
  error?: string | null
  selectedFile?: File | null
  onClear?: () => void
}

const ACCEPTED_EXTENSIONS = ['.xml', '.x83', '.d83', '.xlsx', '.xls']
const ACCEPTED_MIME_TYPES = [
  'text/xml',
  'application/xml',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]

export function FileUploader({ onFileSelect, isLoading = false, error, selectedFile, onClear }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)

  const validateFile = useCallback((file: File): string | null => {
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    const isValidExtension = ACCEPTED_EXTENSIONS.includes(extension)
    const isValidMime = ACCEPTED_MIME_TYPES.includes(file.type) || file.type === ''

    if (!isValidExtension && !isValidMime) {
      return `Invalid file type. Accepted: ${ACCEPTED_EXTENSIONS.join(', ')}`
    }

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      return 'File too large. Maximum size is 50MB.'
    }

    return null
  }, [])

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file)
      if (validationError) {
        return
      }
      onFileSelect(file)
    },
    [validateFile, onFileSelect]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const file = e.dataTransfer.files[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (selectedFile && !error) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="size-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{selectedFile.name}</p>
              <p className="text-sm text-muted-foreground">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          {onClear && (
            <Button variant="ghost" size="icon-sm" onClick={onClear} disabled={isLoading}>
              <X className="size-4" />
              <span className="sr-only">Remove file</span>
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed transition-colors',
          isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          error && 'border-destructive/50 bg-destructive/5',
          isLoading && 'pointer-events-none opacity-60'
        )}
      >
        <input
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          onChange={handleInputChange}
          className="absolute inset-0 cursor-pointer opacity-0"
          disabled={isLoading}
        />

        <div className="flex flex-col items-center gap-3 p-6 text-center">
          <div
            className={cn(
              'flex size-12 items-center justify-center rounded-full',
              error ? 'bg-destructive/10' : 'bg-muted'
            )}
          >
            {error ? (
              <AlertCircle className="size-6 text-destructive" />
            ) : (
              <Upload className={cn('size-6', isDragging ? 'text-primary' : 'text-muted-foreground')} />
            )}
          </div>

          <div>
            <p className="font-medium text-foreground">
              {isDragging ? 'Drop your file here' : 'Drag and drop your GAEB file'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">or click to browse</p>
          </div>

          <div className="flex flex-wrap justify-center gap-1.5">
            {ACCEPTED_EXTENSIONS.map((ext) => (
              <span key={ext} className="rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {ext}
              </span>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  )
}
