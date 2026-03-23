import type { GAEBPosition, MappingOptions, OpusFlowRow } from './types'
import { mapUnitOfMeasure } from './types'

/**
 * Convert GAEB positions to OpusFlow CSV rows
 */
export function convertToOpusFlow(positions: GAEBPosition[], options: MappingOptions): OpusFlowRow[] {
  const rows: OpusFlowRow[] = []
  const usedSKUs = new Set<string>()

  for (const position of positions) {
    // Skip section headers unless we want to keep structure
    if (position.isSection && !options.keepStructure) {
      continue
    }

    const row = mapPositionToRow(position, options, usedSKUs)
    rows.push(row)
  }

  return rows
}

/**
 * Map a single GAEB position to OpusFlow row
 */
function mapPositionToRow(position: GAEBPosition, options: MappingOptions, usedSKUs: Set<string>): OpusFlowRow {
  // Generate name
  let name = position.kurztext || `Position ${position.oz}`
  if (options.keepStructure && position.oz) {
    name = `[${position.oz}] ${name}`
  }

  // Generate description
  let description = position.langtext || position.kurztext || ''
  if (position.hinweistext) {
    description = description ? `${description}\n\n${position.hinweistext}` : position.hinweistext
  }

  // Calculate prices
  const basePrice = position.ep || 0
  const sellingPrice = options.priceMarkup > 0 ? basePrice * (1 + options.priceMarkup / 100) : basePrice

  const purchasePrice = options.usePurchasePrice ? basePrice : 0

  // Generate unique SKU
  let sku = position.oz || generateSKU()
  sku = ensureUniqueSKU(sku, usedSKUs)
  usedSKUs.add(sku)

  // Determine type
  let type: 'service' | 'material' = options.exportType
  if (position.posArt) {
    const posArtLower = position.posArt.toLowerCase()
    if (posArtLower.includes('material') || posArtLower.includes('lieferung')) {
      type = 'material'
    } else if (posArtLower.includes('service') || posArtLower.includes('leistung') || posArtLower.includes('arbeit')) {
      type = 'service'
    }
  }

  return {
    name: sanitizeCSVField(name),
    description: sanitizeCSVField(description),
    selling_price: formatPrice(sellingPrice),
    purchase_price: formatPrice(purchasePrice),
    uom_id: mapUnitOfMeasure(position.einheit),
    sku: sanitizeCSVField(sku),
    type,
  }
}

/**
 * Generate CSV string from OpusFlow rows
 */
export function generateCSV(rows: OpusFlowRow[]): string {
  const headers = ['name', 'description', 'selling_price', 'purchase_price', 'uom_id', 'sku', 'type']

  const csvLines = [headers.join(',')]

  for (const row of rows) {
    const values = headers.map((header) => {
      const value = row[header as keyof OpusFlowRow]
      // Escape quotes and wrap in quotes if needed
      if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    })
    csvLines.push(values.join(','))
  }

  return csvLines.join('\n')
}

/**
 * Sanitize field for CSV output
 */
function sanitizeCSVField(value: string): string {
  return value
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .trim()
}

/**
 * Format price to 2 decimal places
 */
function formatPrice(price: number): string {
  return price.toFixed(2)
}

/**
 * Generate random SKU
 */
function generateSKU(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 6)
  return `SKU-${timestamp}-${random}`.toUpperCase()
}

/**
 * Ensure SKU is unique by appending suffix if needed
 */
function ensureUniqueSKU(sku: string, usedSKUs: Set<string>): string {
  if (!usedSKUs.has(sku)) {
    return sku
  }

  let counter = 1
  let newSKU = `${sku}-${counter}`
  while (usedSKUs.has(newSKU)) {
    counter++
    newSKU = `${sku}-${counter}`
  }
  return newSKU
}
