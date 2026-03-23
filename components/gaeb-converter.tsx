'use client'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { FileUploader } from '@/components/file-uploader'
import { MappingPanel } from '@/components/mapping-panel'
import { PreviewTable } from '@/components/preview-table'
import { ExportButton } from '@/components/export-button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { FileText, Settings, Download, AlertCircle, CheckCircle2 } from 'lucide-react'
import { parseFile, previewConversion } from '@/app/actions'
import type { GAEBPosition, MappingOptions, OpusFlowRow } from '@/lib/types'

type Step = 'upload' | 'mapping' | 'export'

const DEFAULT_OPTIONS: MappingOptions = {
  exportType: 'service',
  keepStructure: true,
  usePurchasePrice: true,
  priceMarkup: 0,
}

export function GAEBConverter() {
  const [currentStep, setCurrentStep] = useState<Step>('upload')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [parseError, setParseError] = useState<string | null>(null)
  const [parseWarnings, setParseWarnings] = useState<string[]>([])
  const [positions, setPositions] = useState<GAEBPosition[]>([])
  const [options, setOptions] = useState<MappingOptions>(DEFAULT_OPTIONS)
  const [previewRows, setPreviewRows] = useState<OpusFlowRow[]>([])

  const handleFileSelect = useCallback(async (file: File) => {
    setSelectedFile(file)
    setIsLoading(true)
    setParseError(null)
    setParseWarnings([])
    setPositions([])

    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await parseFile(formData)

      if (!result.success) {
        setParseError(result.errors.join('\n') || 'Failed to parse file')
        return
      }

      setPositions(result.positions)
      setParseWarnings(result.errors)
      setCurrentStep('mapping')
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Failed to parse file')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const handleClearFile = useCallback(() => {
    setSelectedFile(null)
    setPositions([])
    setPreviewRows([])
    setParseError(null)
    setParseWarnings([])
    setCurrentStep('upload')
  }, [])

  // Update preview when options change
  useEffect(() => {
    if (positions.length === 0) {
      setPreviewRows([])
      return
    }

    const updatePreview = async () => {
      const rows = await previewConversion(positions, options)
      setPreviewRows(rows)
    }

    updatePreview()
  }, [positions, options])

  const steps = useMemo(
    () => [
      { id: 'upload' as const, label: 'Upload', icon: FileText, complete: currentStep !== 'upload' },
      { id: 'mapping' as const, label: 'Mapping', icon: Settings, complete: currentStep === 'export' },
      { id: 'export' as const, label: 'Export', icon: Download, complete: false },
    ],
    [currentStep]
  )

  return (
    <div className="space-y-8">
      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-4">
            <button
              onClick={() => {
                if (step.id === 'upload') setCurrentStep('upload')
                else if (step.id === 'mapping' && positions.length > 0) setCurrentStep('mapping')
                else if (step.id === 'export' && positions.length > 0) setCurrentStep('export')
              }}
              disabled={step.id !== 'upload' && positions.length === 0}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            >
              <div
                className={`flex size-8 items-center justify-center rounded-full ${
                  currentStep === step.id
                    ? 'bg-primary text-primary-foreground'
                    : step.complete
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {step.complete ? <CheckCircle2 className="size-4" /> : <step.icon className="size-4" />}
              </div>
              <span className={currentStep === step.id ? 'text-foreground' : 'text-muted-foreground'}>{step.label}</span>
            </button>
            {index < steps.length - 1 && <div className="h-px w-8 bg-border" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="space-y-6">
        {/* Upload Step */}
        {currentStep === 'upload' && (
          <Card>
            <CardHeader>
              <CardTitle>Upload GAEB File</CardTitle>
              <CardDescription>
                Upload your GAEB file (XML, X83, D83) or Excel fallback to begin conversion
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-4">
                  <Spinner className="size-8" />
                  <p className="text-muted-foreground">Parsing file...</p>
                </div>
              ) : (
                <FileUploader
                  onFileSelect={handleFileSelect}
                  isLoading={isLoading}
                  error={parseError}
                  selectedFile={selectedFile}
                  onClear={handleClearFile}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* Mapping Step */}
        {currentStep === 'mapping' && (
          <>
            {parseWarnings.length > 0 && (
              <Alert variant="default">
                <AlertCircle className="size-4" />
                <AlertTitle>Parsing Warnings</AlertTitle>
                <AlertDescription>
                  <ul className="mt-2 list-inside list-disc space-y-1">
                    {parseWarnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="size-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{selectedFile?.name}</p>
                  <p className="text-sm text-muted-foreground">{positions.length} positions parsed</p>
                </div>
              </div>
              <button
                onClick={handleClearFile}
                className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
              >
                Upload different file
              </button>
            </div>

            <MappingPanel options={options} onChange={setOptions} />

            <PreviewTable rows={previewRows} />

            <div className="flex justify-end">
              <button
                onClick={() => setCurrentStep('export')}
                className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                Continue to Export
              </button>
            </div>
          </>
        )}

        {/* Export Step */}
        {currentStep === 'export' && (
          <Card>
            <CardHeader>
              <CardTitle>Export to OpusFlow</CardTitle>
              <CardDescription>Review your settings and download the CSV file</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Positions</p>
                  <p className="text-2xl font-semibold">{previewRows.length}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Export Type</p>
                  <p className="text-2xl font-semibold capitalize">{options.exportType}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Structure</p>
                  <p className="text-2xl font-semibold">{options.keepStructure ? 'Preserved' : 'Flattened'}</p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm text-muted-foreground">Price Markup</p>
                  <p className="text-2xl font-semibold">{options.priceMarkup}%</p>
                </div>
              </div>

              {/* Field Mapping Summary */}
              <div className="rounded-lg border p-4">
                <h4 className="mb-3 font-medium">Field Mapping</h4>
                <div className="grid gap-2 text-sm sm:grid-cols-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kurztext</span>
                    <span className="font-mono">name</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Langtext</span>
                    <span className="font-mono">description</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Einheitspreis (EP)</span>
                    <span className="font-mono">selling_price</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">EP (with markup)</span>
                    <Badge variant={options.usePurchasePrice ? 'default' : 'secondary'}>
                      {options.usePurchasePrice ? 'purchase_price' : 'disabled'}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Einheit</span>
                    <span className="font-mono">uom_id</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">OZ (Ordnungszahl)</span>
                    <span className="font-mono">sku</span>
                  </div>
                </div>
              </div>

              {/* Export Button */}
              <div className="flex flex-col items-center gap-4 pt-4">
                <ExportButton
                  positions={positions}
                  options={options}
                  originalFileName={selectedFile?.name || 'export'}
                />

                <button
                  onClick={() => setCurrentStep('mapping')}
                  className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                >
                  Back to mapping options
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
