import type { GAEBPosition, ParsedFile } from './types'

/**
 * Parse GAEB XML content (supports GAEB 90, GAEB 2000, GAEB DA XML formats)
 */
export function parseGAEBXML(content: string, fileName: string): ParsedFile {
  const positions: GAEBPosition[] = []
  const errors: string[] = []

  try {
    // Detect format and extract positions
    if (content.includes('<GAEB') || content.includes('<gaeb')) {
      // GAEB DA XML format
      parseGAEBDAXML(content, positions, errors)
    } else if (content.includes('<LV') || content.includes('<lv')) {
      // GAEB 90/2000 format
      parseGAEB90(content, positions, errors)
    } else {
      // Try generic XML parsing
      parseGenericXML(content, positions, errors)
    }
  } catch (error) {
    errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return {
    positions,
    fileName,
    totalPositions: positions.length,
    errors,
  }
}

/**
 * Parse GAEB DA XML format (modern format)
 */
function parseGAEBDAXML(content: string, positions: GAEBPosition[], errors: string[]): void {
  // Match Item elements (positions)
  const itemRegex = /<Item[^>]*>([\s\S]*?)<\/Item>/gi
  const items = content.match(itemRegex) || []

  for (const item of items) {
    try {
      const position = extractPositionFromItem(item)
      if (position && position.oz) {
        positions.push(position)
      }
    } catch (error) {
      errors.push(`Failed to parse item: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  }

  // Also check for BoQBody > LV > BoQCtgy structure
  if (positions.length === 0) {
    const boqItemRegex = /<BoQItem[^>]*>([\s\S]*?)<\/BoQItem>/gi
    const boqItems = content.match(boqItemRegex) || []

    for (const item of boqItems) {
      try {
        const position = extractPositionFromBoQItem(item)
        if (position && position.oz) {
          positions.push(position)
        }
      } catch (error) {
        errors.push(`Failed to parse BoQ item: ${error instanceof Error ? error.message : 'Unknown'}`)
      }
    }
  }
}

/**
 * Parse GAEB 90/2000 format
 */
function parseGAEB90(content: string, positions: GAEBPosition[], errors: string[]): void {
  // Match position elements
  const posRegex = /<(?:Position|Pos|position|pos)[^>]*>([\s\S]*?)<\/(?:Position|Pos|position|pos)>/gi
  const posItems = content.match(posRegex) || []

  for (const item of posItems) {
    try {
      const position = extractPositionFromLegacy(item)
      if (position && position.oz) {
        positions.push(position)
      }
    } catch (error) {
      errors.push(`Failed to parse position: ${error instanceof Error ? error.message : 'Unknown'}`)
    }
  }
}

/**
 * Parse generic XML trying common patterns
 */
function parseGenericXML(content: string, positions: GAEBPosition[], errors: string[]): void {
  // Try to find any element that looks like a position
  const patterns = [
    /<(?:item|position|pos|zeile|row)[^>]*>([\s\S]*?)<\/(?:item|position|pos|zeile|row)>/gi,
    /<(?:Item|Position|Pos|Zeile|Row)[^>]*>([\s\S]*?)<\/(?:Item|Position|Pos|Zeile|Row)>/gi,
  ]

  for (const pattern of patterns) {
    const matches = content.match(pattern) || []
    for (const match of matches) {
      try {
        const position = extractPositionGeneric(match)
        if (position && position.oz) {
          positions.push(position)
        }
      } catch {
        // Skip invalid items
      }
    }
    if (positions.length > 0) break
  }

  if (positions.length === 0) {
    errors.push('Could not identify position structure in XML')
  }
}

/**
 * Extract position data from GAEB DA XML Item
 */
function extractPositionFromItem(itemXml: string): GAEBPosition | null {
  const oz = extractTag(itemXml, 'OZ') || extractTag(itemXml, 'RNoPart') || ''
  const kurztext = extractTag(itemXml, 'Brief') || extractTag(itemXml, 'Kurztext') || extractTag(itemXml, 'ShortText') || ''
  const langtext = extractTag(itemXml, 'Detailed') || extractTag(itemXml, 'Langtext') || extractTag(itemXml, 'LongText') || ''
  const einheit = extractTag(itemXml, 'QU') || extractTag(itemXml, 'Einheit') || extractTag(itemXml, 'Unit') || 'Stk'
  const menge = parseFloat(extractTag(itemXml, 'Qty') || extractTag(itemXml, 'Menge') || '0') || 0
  const ep = parseFloat(extractTag(itemXml, 'UP') || extractTag(itemXml, 'EP') || extractTag(itemXml, 'UnitPrice') || '0') || 0
  const posArt = extractTag(itemXml, 'ItemTag') || extractTag(itemXml, 'PosArt') || ''

  if (!oz && !kurztext) return null

  return {
    oz: oz.trim(),
    kurztext: cleanText(kurztext),
    langtext: cleanText(langtext),
    menge,
    einheit: einheit.trim(),
    ep,
    posArt,
    level: calculateLevel(oz),
    isSection: posArt === 'Leitbeschreibung' || posArt === 'Titel' || posArt === 'Section',
  }
}

/**
 * Extract position from BoQItem element
 */
function extractPositionFromBoQItem(itemXml: string): GAEBPosition | null {
  const oz = extractTag(itemXml, 'RNoPart') || extractAttribute(itemXml, 'RNoPart') || ''
  const kurztext = extractTag(itemXml, 'Outline') || extractTag(itemXml, 'OutlineText') || ''
  const langtext = extractTag(itemXml, 'Description') || extractTag(itemXml, 'DetailTxt') || ''
  const einheit = extractTag(itemXml, 'QU') || extractTag(itemXml, 'Unit') || 'Stk'
  const menge = parseFloat(extractTag(itemXml, 'Qty') || '0') || 0
  const ep = parseFloat(extractTag(itemXml, 'UP') || extractTag(itemXml, 'UnitPrice') || '0') || 0

  if (!oz && !kurztext) return null

  return {
    oz: oz.trim(),
    kurztext: cleanText(kurztext),
    langtext: cleanText(langtext),
    menge,
    einheit: einheit.trim(),
    ep,
    level: calculateLevel(oz),
  }
}

/**
 * Extract position from legacy GAEB format
 */
function extractPositionFromLegacy(itemXml: string): GAEBPosition | null {
  const oz = extractTag(itemXml, 'OZ') || extractTag(itemXml, 'Ordnungszahl') || extractTag(itemXml, 'Nr') || ''
  const kurztext = extractTag(itemXml, 'Kurztext') || extractTag(itemXml, 'KT') || extractTag(itemXml, 'Text') || ''
  const langtext = extractTag(itemXml, 'Langtext') || extractTag(itemXml, 'LT') || extractTag(itemXml, 'Beschreibung') || ''
  const einheit = extractTag(itemXml, 'Einheit') || extractTag(itemXml, 'ME') || 'Stk'
  const menge = parseFloat(extractTag(itemXml, 'Menge') || '0') || 0
  const ep = parseFloat(extractTag(itemXml, 'EP') || extractTag(itemXml, 'Einheitspreis') || '0') || 0
  const posArt = extractTag(itemXml, 'PosArt') || extractTag(itemXml, 'Art') || ''

  if (!oz && !kurztext) return null

  return {
    oz: oz.trim(),
    kurztext: cleanText(kurztext),
    langtext: cleanText(langtext),
    menge,
    einheit: einheit.trim(),
    ep,
    posArt,
    level: calculateLevel(oz),
    isSection: posArt === 'Titel' || posArt === 'LB',
  }
}

/**
 * Extract position using generic patterns
 */
function extractPositionGeneric(itemXml: string): GAEBPosition | null {
  // Try various field name patterns
  const ozPatterns = ['OZ', 'oz', 'Nr', 'nr', 'Number', 'number', 'Id', 'id', 'SKU', 'sku']
  const textPatterns = ['Text', 'text', 'Name', 'name', 'Bezeichnung', 'bezeichnung', 'Description', 'description']
  const unitPatterns = ['Unit', 'unit', 'Einheit', 'einheit', 'UOM', 'uom', 'ME', 'me']
  const pricePatterns = ['Price', 'price', 'Preis', 'preis', 'EP', 'ep', 'UP', 'up']
  const qtyPatterns = ['Qty', 'qty', 'Menge', 'menge', 'Quantity', 'quantity']

  let oz = ''
  let kurztext = ''
  let einheit = 'Stk'
  let ep = 0
  let menge = 0

  for (const pattern of ozPatterns) {
    const value = extractTag(itemXml, pattern)
    if (value) {
      oz = value
      break
    }
  }

  for (const pattern of textPatterns) {
    const value = extractTag(itemXml, pattern)
    if (value) {
      kurztext = value
      break
    }
  }

  for (const pattern of unitPatterns) {
    const value = extractTag(itemXml, pattern)
    if (value) {
      einheit = value
      break
    }
  }

  for (const pattern of pricePatterns) {
    const value = extractTag(itemXml, pattern)
    if (value) {
      ep = parseFloat(value) || 0
      break
    }
  }

  for (const pattern of qtyPatterns) {
    const value = extractTag(itemXml, pattern)
    if (value) {
      menge = parseFloat(value) || 0
      break
    }
  }

  if (!oz && !kurztext) return null

  return {
    oz: oz.trim(),
    kurztext: cleanText(kurztext),
    langtext: '',
    menge,
    einheit: einheit.trim(),
    ep,
    level: calculateLevel(oz),
  }
}

/**
 * Extract content from XML tag
 */
function extractTag(xml: string, tagName: string): string {
  const regex = new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i')
  const match = xml.match(regex)
  return match ? match[1].trim() : ''
}

/**
 * Extract attribute value
 */
function extractAttribute(xml: string, attrName: string): string {
  const regex = new RegExp(`${attrName}=["']([^"']*)["']`, 'i')
  const match = xml.match(regex)
  return match ? match[1].trim() : ''
}

/**
 * Clean text content (remove CDATA, extra whitespace, etc.)
 */
function cleanText(text: string): string {
  return text
    .replace(/<!\[CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Calculate hierarchy level from OZ
 */
function calculateLevel(oz: string): number {
  if (!oz) return 0
  const parts = oz.split(/[.\-_]/)
  return parts.length
}

/**
 * Parse D83/X83 binary format (simplified - treats as text with position extraction)
 */
export function parseD83X83(content: string, fileName: string): ParsedFile {
  const positions: GAEBPosition[] = []
  const errors: string[] = []

  try {
    // D83/X83 files often have a text section we can parse
    // Look for patterns that indicate position data
    const lines = content.split(/[\r\n]+/)
    let currentOZ = ''
    let currentText = ''
    let currentEP = 0
    let currentEinheit = 'Stk'

    for (const line of lines) {
      // Look for OZ patterns (e.g., "01.01.010" or similar)
      const ozMatch = line.match(/^\s*(\d{2}(?:\.\d{2,3})+)\s*/)
      if (ozMatch) {
        // Save previous position if exists
        if (currentOZ && currentText) {
          positions.push({
            oz: currentOZ,
            kurztext: currentText,
            langtext: '',
            menge: 0,
            einheit: currentEinheit,
            ep: currentEP,
            level: calculateLevel(currentOZ),
          })
        }
        currentOZ = ozMatch[1]
        currentText = line.substring(ozMatch[0].length).trim()
        currentEP = 0
        currentEinheit = 'Stk'
      } else if (currentOZ) {
        // Look for price/unit info
        const priceMatch = line.match(/(\d+[.,]\d{2})\s*(€|EUR)?/)
        if (priceMatch) {
          currentEP = parseFloat(priceMatch[1].replace(',', '.'))
        }
        const unitMatch = line.match(/\b(Stk|m|m2|m3|kg|l|h|Std|psch)\b/i)
        if (unitMatch) {
          currentEinheit = unitMatch[1]
        }
        // Append text if it seems like description
        if (line.trim() && !priceMatch) {
          currentText += ' ' + line.trim()
        }
      }
    }

    // Don't forget the last position
    if (currentOZ && currentText) {
      positions.push({
        oz: currentOZ,
        kurztext: currentText.substring(0, 100),
        langtext: currentText,
        menge: 0,
        einheit: currentEinheit,
        ep: currentEP,
        level: calculateLevel(currentOZ),
      })
    }

    if (positions.length === 0) {
      errors.push('Could not extract positions from D83/X83 file. Try converting to XML format first.')
    }
  } catch (error) {
    errors.push(`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }

  return {
    positions,
    fileName,
    totalPositions: positions.length,
    errors,
  }
}
