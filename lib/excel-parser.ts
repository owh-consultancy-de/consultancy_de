import * as XLSX from 'xlsx'
import type { GAEBPosition, ParsedFile } from './types'

// Common column name variations for each field
const COLUMN_MAPPINGS = {
  oz: ['OZ', 'oz', 'Ordnungszahl', 'Nr', 'Nr.', 'Number', 'Pos', 'Position', 'PosNr', 'SKU', 'ID', 'Nummer'],
  kurztext: ['Kurztext', 'KT', 'Text', 'Name', 'Bezeichnung', 'Description', 'Title', 'Titel', 'ShortText', 'Short Text'],
  langtext: ['Langtext', 'LT', 'Long Text', 'LongText', 'Beschreibung', 'Description Long', 'Details', 'Bemerkung'],
  menge: ['Menge', 'Qty', 'Quantity', 'Amount', 'Anzahl', 'Count'],
  einheit: ['Einheit', 'Unit', 'ME', 'UOM', 'Mengeneinheit', 'Unit of Measure'],
  ep: ['EP', 'Einheitspreis', 'UP', 'Unit Price', 'UnitPrice', 'Preis', 'Price', 'EUR', 'Einzelpreis'],
  posArt: ['PosArt', 'Type', 'Art', 'Positionsart', 'Category', 'Kategorie'],
}

/**
 * Parse Excel file content
 */
export function parseExcel(buffer: ArrayBuffer, fileName: string): ParsedFile {
  const positions: GAEBPosition[] = []
  const errors: string[] = []

  try {
    const workbook = XLSX.read(buffer, { type: 'array' })
    const firstSheetName = workbook.SheetNames[0]

    if (!firstSheetName) {
      errors.push('No sheets found in Excel file')
      return { positions, fileName, totalPositions: 0, errors }
    }

    const worksheet = workbook.Sheets[firstSheetName]
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })

    if (data.length === 0) {
      errors.push('No data found in Excel file')
      return { positions, fileName, totalPositions: 0, errors }
    }

    // Get headers from first row
    const headers = Object.keys(data[0] || {})

    // Map column names to our fields
    const columnMap = mapColumns(headers)

    if (!columnMap.oz && !columnMap.kurztext) {
      errors.push('Could not identify required columns (OZ or Kurztext/Text). Please check column headers.')
      return { positions, fileName, totalPositions: 0, errors }
    }

    // Parse each row
    for (let i = 0; i < data.length; i++) {
      const row = data[i]
      try {
        const position = extractPositionFromRow(row, columnMap, i + 2) // +2 for 1-indexed + header row
        if (position) {
          positions.push(position)
        }
      } catch (error) {
        errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Parse error'}`)
      }
    }
  } catch (error) {
    errors.push(`Excel parse error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return {
    positions,
    fileName,
    totalPositions: positions.length,
    errors,
  }
}

/**
 * Map detected column headers to our field names
 */
function mapColumns(headers: string[]): Record<string, string | null> {
  const result: Record<string, string | null> = {
    oz: null,
    kurztext: null,
    langtext: null,
    menge: null,
    einheit: null,
    ep: null,
    posArt: null,
  }

  const normalizedHeaders = headers.map((h) => ({
    original: h,
    normalized: h.toLowerCase().replace(/[^a-z0-9]/g, ''),
  }))

  for (const [field, variations] of Object.entries(COLUMN_MAPPINGS)) {
    for (const variation of variations) {
      const normalizedVariation = variation.toLowerCase().replace(/[^a-z0-9]/g, '')
      const match = normalizedHeaders.find((h) => h.normalized === normalizedVariation || h.normalized.includes(normalizedVariation))
      if (match) {
        result[field] = match.original
        break
      }
    }
  }

  return result
}

/**
 * Extract position from Excel row
 */
function extractPositionFromRow(
  row: Record<string, unknown>,
  columnMap: Record<string, string | null>,
  rowNum: number
): GAEBPosition | null {
  const getValue = (field: string): string => {
    const col = columnMap[field]
    if (!col) return ''
    const val = row[col]
    return val != null ? String(val).trim() : ''
  }

  const oz = getValue('oz')
  const kurztext = getValue('kurztext')

  // Skip empty rows
  if (!oz && !kurztext) {
    return null
  }

  // Generate OZ if missing
  const finalOZ = oz || String(rowNum).padStart(5, '0')

  const langtext = getValue('langtext')
  const menge = parseFloat(getValue('menge')) || 0
  const einheit = getValue('einheit') || 'Stk'
  const ep = parseFloat(getValue('ep').replace(',', '.').replace(/[^\d.-]/g, '')) || 0
  const posArt = getValue('posArt')

  return {
    oz: finalOZ,
    kurztext: kurztext || `Position ${finalOZ}`,
    langtext,
    menge,
    einheit,
    ep,
    posArt,
    level: calculateLevel(finalOZ),
    isSection: posArt.toLowerCase().includes('titel') || posArt.toLowerCase().includes('section'),
  }
}

/**
 * Calculate hierarchy level from OZ
 */
function calculateLevel(oz: string): number {
  if (!oz) return 0
  const parts = oz.split(/[.\-_]/)
  return parts.length
}
