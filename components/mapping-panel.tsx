'use client'

import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldGroup, FieldLabel, FieldDescription } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { MappingOptions } from '@/lib/types'

interface MappingPanelProps {
  options: MappingOptions
  onChange: (options: MappingOptions) => void
}

export function MappingPanel({ options, onChange }: MappingPanelProps) {
  const updateOption = <K extends keyof MappingOptions>(key: K, value: MappingOptions[K]) => {
    onChange({ ...options, [key]: value })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Mapping Options</CardTitle>
        <CardDescription>Configure how GAEB data is mapped to OpusFlow format</CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field orientation="horizontal">
            <FieldLabel className="flex-1">
              <div className="flex flex-col gap-1">
                <span>Export Type</span>
                <FieldDescription>Choose the default type for exported items</FieldDescription>
              </div>
            </FieldLabel>
            <Select value={options.exportType} onValueChange={(value: 'service' | 'material') => updateOption('exportType', value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="service">Service</SelectItem>
                <SelectItem value="material">Material</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field orientation="horizontal">
            <FieldLabel className="flex-1">
              <div className="flex flex-col gap-1">
                <span>Keep GAEB Structure</span>
                <FieldDescription>Prefix position names with OZ numbers (e.g., [01.01.010] Kabel verlegen)</FieldDescription>
              </div>
            </FieldLabel>
            <Switch checked={options.keepStructure} onCheckedChange={(checked) => updateOption('keepStructure', checked)} />
          </Field>

          <Field orientation="horizontal">
            <FieldLabel className="flex-1">
              <div className="flex flex-col gap-1">
                <span>Set Purchase Price</span>
                <FieldDescription>Use unit price (EP) as purchase price</FieldDescription>
              </div>
            </FieldLabel>
            <Switch
              checked={options.usePurchasePrice}
              onCheckedChange={(checked) => updateOption('usePurchasePrice', checked)}
            />
          </Field>

          <Field orientation="horizontal">
            <FieldLabel className="flex-1">
              <div className="flex flex-col gap-1">
                <span>Price Markup (%)</span>
                <FieldDescription>Add markup percentage to selling price</FieldDescription>
              </div>
            </FieldLabel>
            <Input
              type="number"
              min="0"
              max="500"
              step="1"
              value={options.priceMarkup}
              onChange={(e) => updateOption('priceMarkup', Math.max(0, Number(e.target.value)))}
              className="w-[100px]"
            />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
