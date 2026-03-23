'use client'

import { useState } from 'react'
import { Download, Check, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { exportToCSV } from '@/app/actions'
import type { GAEBPosition, MappingOptions } from '@/lib/types'

interface ExportButtonProps {
  positions: GAEBPosition[]
  options: MappingOptions
  originalFileName: string
  disabled?: boolean
}

export function ExportButton({ positions, options, originalFileName, disabled }: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    setExportStatus('idle')
    setErrorMessage(null)

    try {
      const result = await exportToCSV(positions, options, originalFileName)

      if (!result.success) {
        throw new Error(result.error || 'Export failed')
      }

      // Create and download file
      const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      setExportStatus('success')

      // Reset status after a delay
      setTimeout(() => setExportStatus('idle'), 3000)
    } catch (error) {
      setExportStatus('error')
      setErrorMessage(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  const isDisabled = disabled || positions.length === 0 || isExporting

  return (
    <div className="flex flex-col gap-2">
      <Button size="lg" onClick={handleExport} disabled={isDisabled} className="gap-2">
        {isExporting ? (
          <>
            <Spinner className="size-4" />
            Exporting...
          </>
        ) : exportStatus === 'success' ? (
          <>
            <Check className="size-4" />
            Downloaded!
          </>
        ) : (
          <>
            <Download className="size-4" />
            Download OpusFlow CSV
          </>
        )}
      </Button>

      {exportStatus === 'error' && errorMessage && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {positions.length > 0 && (
        <p className="text-center text-sm text-muted-foreground">{positions.length} positions ready for export</p>
      )}
    </div>
  )
}
