'use client'

import { useMemo, useState } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { OpusFlowRow } from '@/lib/types'

interface PreviewTableProps {
  rows: OpusFlowRow[]
  pageSize?: number
  onTypeChange?: (sku: string, type: 'service' | 'material') => void
}

export function PreviewTable({ rows, pageSize = 10, onTypeChange }: PreviewTableProps) {
  const [currentPage, setCurrentPage] = useState(0)

  const totalPages = Math.ceil(rows.length / pageSize)
  const startIndex = currentPage * pageSize
  const endIndex = Math.min(startIndex + pageSize, rows.length)
  const currentRows = useMemo(() => rows.slice(startIndex, endIndex), [rows, startIndex, endIndex])

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(0, Math.min(page, totalPages - 1)))
  }

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Preview</CardTitle>
          <CardDescription>No positions to preview. Upload a GAEB file to get started.</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Showing {startIndex + 1}–{endIndex} of {rows.length} positions. Click the type badge to toggle service / material per position.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[200px]">Name</TableHead>
                <TableHead className="min-w-[250px]">Description</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
                <TableHead className="text-right">Purchase Price</TableHead>
                <TableHead>UOM</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentRows.map((row, index) => (
                <TableRow key={startIndex + index}>
                  <TableCell className="font-medium">{truncateText(row.name, 50)}</TableCell>
                  <TableCell className="text-muted-foreground">{truncateText(row.description, 60)}</TableCell>
                  <TableCell className="text-right font-mono">{row.selling_price}</TableCell>
                  <TableCell className="text-right font-mono">{row.purchase_price}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{row.uom_id}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{truncateText(row.sku, 20)}</TableCell>
                  <TableCell>
                    {onTypeChange ? (
                      <button
                        type="button"
                        title="Click to toggle between service and material"
                        onClick={() =>
                          onTypeChange(row.sku, row.type === 'service' ? 'material' : 'service')
                        }
                        className="cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <Badge
                          variant={row.type === 'service' ? 'default' : 'outline'}
                          className="transition-colors hover:opacity-80"
                        >
                          {row.type}
                        </Badge>
                      </button>
                    ) : (
                      <Badge variant={row.type === 'service' ? 'default' : 'outline'}>{row.type}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Page {currentPage + 1} of {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0}>
                <ChevronLeft className="size-4" />
                <span className="sr-only">Previous page</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages - 1}
              >
                <ChevronRight className="size-4" />
                <span className="sr-only">Next page</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
