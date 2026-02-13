/**
 * Field Palette Component
 *
 * Draggable field types for the template editor.
 * Provides all available field types that can be placed on a document.
 */

'use client'

import { cn } from '@cgk-platform/ui'
import {
  AlignLeft,
  AtSign,
  Building,
  Calendar,
  CalendarCheck,
  CheckSquare,
  CircleDot,
  FileSignature,
  Hash,
  ListFilter,
  Paperclip,
  PenTool,
  StickyNote,
  Type,
  User,
  Variable,
} from 'lucide-react'
import type { EsignFieldType } from '@/lib/esign/types'

export interface FieldTypeConfig {
  type: EsignFieldType
  label: string
  icon: React.ComponentType<{ className?: string }>
  description: string
  category: 'signature' | 'input' | 'selection' | 'special'
  defaultWidth: number
  defaultHeight: number
}

export const FIELD_TYPES: FieldTypeConfig[] = [
  // Signature fields
  {
    type: 'signature',
    label: 'Signature',
    icon: FileSignature,
    description: 'Full signature capture',
    category: 'signature',
    defaultWidth: 20,
    defaultHeight: 5,
  },
  {
    type: 'initial',
    label: 'Initials',
    icon: PenTool,
    description: 'Initials only',
    category: 'signature',
    defaultWidth: 8,
    defaultHeight: 4,
  },
  {
    type: 'date_signed',
    label: 'Date Signed',
    icon: CalendarCheck,
    description: 'Auto-filled sign date',
    category: 'signature',
    defaultWidth: 15,
    defaultHeight: 3,
  },
  // Input fields
  {
    type: 'text',
    label: 'Text',
    icon: Type,
    description: 'Single line text input',
    category: 'input',
    defaultWidth: 25,
    defaultHeight: 3,
  },
  {
    type: 'textarea',
    label: 'Text Area',
    icon: AlignLeft,
    description: 'Multi-line text input',
    category: 'input',
    defaultWidth: 30,
    defaultHeight: 10,
  },
  {
    type: 'number',
    label: 'Number',
    icon: Hash,
    description: 'Numeric input',
    category: 'input',
    defaultWidth: 15,
    defaultHeight: 3,
  },
  {
    type: 'date',
    label: 'Date',
    icon: Calendar,
    description: 'Date picker',
    category: 'input',
    defaultWidth: 15,
    defaultHeight: 3,
  },
  {
    type: 'name',
    label: 'Full Name',
    icon: User,
    description: 'Signer name field',
    category: 'input',
    defaultWidth: 25,
    defaultHeight: 3,
  },
  {
    type: 'email',
    label: 'Email',
    icon: AtSign,
    description: 'Email address',
    category: 'input',
    defaultWidth: 30,
    defaultHeight: 3,
  },
  {
    type: 'company',
    label: 'Company',
    icon: Building,
    description: 'Company name',
    category: 'input',
    defaultWidth: 25,
    defaultHeight: 3,
  },
  {
    type: 'title',
    label: 'Title',
    icon: User,
    description: 'Job title',
    category: 'input',
    defaultWidth: 20,
    defaultHeight: 3,
  },
  // Selection fields
  {
    type: 'checkbox',
    label: 'Checkbox',
    icon: CheckSquare,
    description: 'Single checkbox',
    category: 'selection',
    defaultWidth: 3,
    defaultHeight: 3,
  },
  {
    type: 'checkbox_group',
    label: 'Checkbox Group',
    icon: CheckSquare,
    description: 'Multiple checkboxes',
    category: 'selection',
    defaultWidth: 20,
    defaultHeight: 6,
  },
  {
    type: 'radio_group',
    label: 'Radio Group',
    icon: CircleDot,
    description: 'Single selection',
    category: 'selection',
    defaultWidth: 20,
    defaultHeight: 6,
  },
  {
    type: 'dropdown',
    label: 'Dropdown',
    icon: ListFilter,
    description: 'Select from options',
    category: 'selection',
    defaultWidth: 25,
    defaultHeight: 3,
  },
  // Special fields
  {
    type: 'attachment',
    label: 'Attachment',
    icon: Paperclip,
    description: 'File upload',
    category: 'special',
    defaultWidth: 30,
    defaultHeight: 5,
  },
  {
    type: 'formula',
    label: 'Formula',
    icon: Variable,
    description: 'Computed value',
    category: 'special',
    defaultWidth: 20,
    defaultHeight: 3,
  },
  {
    type: 'note',
    label: 'Note/Label',
    icon: StickyNote,
    description: 'Read-only label',
    category: 'special',
    defaultWidth: 40,
    defaultHeight: 5,
  },
]

const CATEGORIES = [
  { id: 'signature', label: 'Signature' },
  { id: 'input', label: 'Input' },
  { id: 'selection', label: 'Selection' },
  { id: 'special', label: 'Special' },
] as const

interface FieldPaletteProps {
  onDragStart: (fieldType: FieldTypeConfig) => void
  selectedField?: EsignFieldType
  onFieldSelect?: (fieldType: FieldTypeConfig) => void
  compact?: boolean
  className?: string
}

export function FieldPalette({
  onDragStart,
  selectedField,
  onFieldSelect,
  compact = false,
  className,
}: FieldPaletteProps) {
  const handleDragStart = (e: React.DragEvent, fieldType: FieldTypeConfig) => {
    e.dataTransfer.setData('application/json', JSON.stringify(fieldType))
    e.dataTransfer.effectAllowed = 'copy'
    onDragStart(fieldType)
  }

  const groupedFields = CATEGORIES.map((category) => ({
    ...category,
    fields: FIELD_TYPES.filter((f) => f.category === category.id),
  }))

  if (compact) {
    return (
      <div className={cn('flex flex-wrap gap-2', className)}>
        {FIELD_TYPES.map((fieldType) => {
          const Icon = fieldType.icon
          return (
            <button
              key={fieldType.type}
              draggable
              onDragStart={(e) => handleDragStart(e, fieldType)}
              onClick={() => onFieldSelect?.(fieldType)}
              title={fieldType.label}
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-2 py-1.5',
                'transition-all duration-200 cursor-grab active:cursor-grabbing',
                selectedField === fieldType.type
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs font-medium">{fieldType.label}</span>
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          Field Types
        </h3>
        <span className="text-xs text-slate-500">Drag to place</span>
      </div>

      {groupedFields.map((category) => (
        <div key={category.id}>
          <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-slate-500">
            {category.label}
          </h4>
          <div className="grid grid-cols-2 gap-2">
            {category.fields.map((fieldType) => {
              const Icon = fieldType.icon
              return (
                <button
                  key={fieldType.type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, fieldType)}
                  onClick={() => onFieldSelect?.(fieldType)}
                  className={cn(
                    'group flex flex-col items-center gap-1.5 rounded-lg border p-3',
                    'transition-all duration-200 cursor-grab active:cursor-grabbing',
                    'hover:shadow-sm',
                    selectedField === fieldType.type
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600'
                  )}
                >
                  <div
                    className={cn(
                      'rounded-md p-2',
                      selectedField === fieldType.type
                        ? 'bg-emerald-100 dark:bg-emerald-900/40'
                        : 'bg-slate-100 group-hover:bg-slate-200 dark:bg-slate-700 dark:group-hover:bg-slate-600'
                    )}
                  >
                    <Icon
                      className={cn(
                        'h-5 w-5',
                        selectedField === fieldType.type
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-600 dark:text-slate-400'
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      'text-xs font-medium',
                      selectedField === fieldType.type
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-700 dark:text-slate-300'
                    )}
                  >
                    {fieldType.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <div className="rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-600">
        <p className="text-center text-xs text-slate-500">
          Drag fields onto the document to place them
        </p>
      </div>
    </div>
  )
}

/**
 * Get field type configuration
 */
export function getFieldTypeConfig(type: EsignFieldType): FieldTypeConfig | undefined {
  return FIELD_TYPES.find((f) => f.type === type)
}
