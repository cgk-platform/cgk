'use client'

import { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@cgk-platform/ui'
import { Database, FileUp, Package, Save } from 'lucide-react'

type CogsSource = 'manual' | 'import' | 'shopify'

interface CategoryOverride {
  id: string
  category: string
  cogsPercent: number
}

const INITIAL_OVERRIDES: CategoryOverride[] = [
  { id: '1', category: 'Skincare', cogsPercent: 28 },
  { id: '2', category: 'Supplements', cogsPercent: 22 },
  { id: '3', category: 'Accessories', cogsPercent: 35 },
]

const SOURCE_OPTIONS: { value: CogsSource; label: string; description: string; icon: React.FC<{ className?: string }> }[] = [
  {
    value: 'manual',
    label: 'Manual Entry',
    description: 'Set COGS manually per product or category override.',
    icon: Database,
  },
  {
    value: 'import',
    label: 'CSV Import',
    description: 'Import COGS data from a CSV file on a schedule.',
    icon: FileUp,
  },
  {
    value: 'shopify',
    label: 'Shopify Cost',
    description: 'Pull cost-per-item directly from Shopify product variants.',
    icon: Package,
  },
]

export default function CogsSettingsPage() {
  const [source, setSource] = useState<CogsSource>('shopify')
  const [overrides, setOverrides] = useState<CategoryOverride[]>(INITIAL_OVERRIDES)
  const [saving, setSaving] = useState(false)

  function handleOverrideChange(id: string, value: string) {
    const num = parseFloat(value)
    setOverrides((prev) =>
      prev.map((o) => (o.id === id ? { ...o, cogsPercent: isNaN(num) ? 0 : num } : o))
    )
  }

  async function handleSave() {
    setSaving(true)
    await new Promise((r) => setTimeout(r, 800))
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">COGS Configuration</h1>
        <p className="text-muted-foreground">
          Choose the source for Cost of Goods Sold data and set category-level overrides.
        </p>
      </div>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-base font-semibold">COGS Data Source</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {SOURCE_OPTIONS.map((opt) => {
              const Icon = opt.icon
              const active = source === opt.value
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSource(opt.value)}
                  className={`flex flex-col gap-2 rounded-lg border p-4 text-left transition-all duration-fast ${
                    active
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-border hover:border-primary/40 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    {active && (
                      <Badge variant="default" className="text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium">{opt.label}</p>
                  <p className="text-xs text-muted-foreground">{opt.description}</p>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h2 className="mb-1 text-base font-semibold">Category COGS Overrides</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Override the default COGS percentage for specific product categories. These take
            precedence over the data source above.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="w-40">COGS %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {overrides.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.category}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.1}
                        value={row.cogsPercent}
                        onChange={(e) => handleOverrideChange(row.id, e.target.value)}
                        className="w-24"
                      />
                      <Label className="text-muted-foreground">%</Label>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving…' : 'Save Changes'}
        </Button>
      </div>
    </div>
  )
}
