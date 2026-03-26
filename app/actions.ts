'use server'

import { parseGAEBXML, parseD83X83 } from '@/lib/gaeb-parser'
import { parseExcel } from '@/lib/excel-parser'
import { convertToOpusFlow, generateCSV } from '@/lib/csv-generator'
import type { GAEBPosition, MappingOptions, OpusFlowRow, ParsedFile } from '@/lib/types'

export interface ParseResult {
  success: boolean
  positions: GAEBPosition[]
  fileName: string
  totalPositions: number
  errors: string[]
}

export interface ExportResult {
  success: boolean
  csv: string
  fileName: string
  rowCount: number
  error?: string
}

/**
 * Parse uploaded GAEB file
 */
export async function parseFile(formData: FormData): Promise<ParseResult> {
  const file = formData.get('file') as File | null

  if (!file) {
    return {
      success: false,
      positions: [],
      fileName: '',
      totalPositions: 0,
      errors: ['No file provided'],
    }
  }

  const fileName = file.name
  const extension = fileName.split('.').pop()?.toLowerCase() || ''

  try {
    let result: ParsedFile

    if (extension === 'xlsx' || extension === 'xls') {
      // Excel file
      const buffer = await file.arrayBuffer()
      result = parseExcel(buffer, fileName)
    } else if (extension === 'd83' || extension === 'x83') {
      // D83/X83 binary format
      const content = await file.text()
      result = parseD83X83(content, fileName)
    } else {
      // XML format (default)
      const content = await file.text()
      result = parseGAEBXML(content, fileName)
    }

    return {
      success: result.positions.length > 0,
      positions: result.positions,
      fileName: result.fileName,
      totalPositions: result.totalPositions,
      errors: result.errors,
    }
  } catch (error) {
    return {
      success: false,
      positions: [],
      fileName,
      totalPositions: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error during parsing'],
    }
  }
}

/**
 * Convert positions to OpusFlow CSV
 */
export async function exportToCSV(
  positions: GAEBPosition[],
  options: MappingOptions,
  originalFileName: string
): Promise<ExportResult> {
  try {
    if (positions.length === 0) {
      return {
        success: false,
        csv: '',
        fileName: '',
        rowCount: 0,
        error: 'No positions to export',
      }
    }

    const rows: OpusFlowRow[] = convertToOpusFlow(positions, options)
    const csv = generateCSV(rows)

    // Generate output filename
    const baseName = originalFileName.replace(/\.[^.]+$/, '')
    const exportFileName = `${baseName}_opusflow_${options.exportType}.csv`

    return {
      success: true,
      csv,
      fileName: exportFileName,
      rowCount: rows.length,
    }
  } catch (error) {
    return {
      success: false,
      csv: '',
      fileName: '',
      rowCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error during export',
    }
  }
}

/**
 * Preview conversion without generating full CSV
 */
export async function previewConversion(positions: GAEBPosition[], options: MappingOptions): Promise<OpusFlowRow[]> {
  return convertToOpusFlow(positions, options)
}
