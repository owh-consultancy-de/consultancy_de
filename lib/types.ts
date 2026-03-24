// GAEB Position Types
export interface GAEBPosition {
  oz: string // Ordnungszahl (e.g., 01.01.010)
  kurztext: string // Short text
  langtext: string // Long text / description
  menge: number // Quantity
  einheit: string // Unit of measure
  ep: number // Unit price (Einheitspreis)
  posArt?: string // Position type
  hinweistext?: string // Additional notes
  level: number // Hierarchy level (derived from OZ)
  isSection?: boolean // Is this a section header?
}

// OpusFlow CSV Row
export interface OpusFlowRow {
  name: string
  description: string
  selling_price: string
  purchase_price: string
  uom_id: string
  sku: string
  type: 'service' | 'material'
}

// Mapping Options
export interface MappingOptions {
  exportType: 'service' | 'material'
  keepStructure: boolean // Prefix OZ to name
  usePurchasePrice: boolean // Use EP as purchase price too
  priceMarkup: number // Markup percentage for selling price
  typeOverrides: Record<string, 'service' | 'material'> // Per-position overrides keyed by OZ/SKU
}

// Parsed File Result
export interface ParsedFile {
  positions: GAEBPosition[]
  fileName: string
  totalPositions: number
  errors: string[]
}

// Unit of Measure mapping
export const UOM_MAPPING: Record<string, string> = {
  // German to OpusFlow
  Stk: 'pcs',
  stk: 'pcs',
  ST: 'pcs',
  St: 'pcs',
  Stück: 'pcs',
  m: 'm',
  M: 'm',
  m2: 'm2',
  qm: 'm2',
  m3: 'm3',
  cbm: 'm3',
  kg: 'kg',
  KG: 'kg',
  l: 'l',
  L: 'l',
  Liter: 'l',
  h: 'h',
  Std: 'h',
  Stunde: 'h',
  Stunden: 'h',
  psch: 'lump_sum',
  Psch: 'lump_sum',
  pauschal: 'lump_sum',
  Pauschal: 'lump_sum',
}

export function mapUnitOfMeasure(einheit: string): string {
  return UOM_MAPPING[einheit] || einheit || 'pcs'
}
