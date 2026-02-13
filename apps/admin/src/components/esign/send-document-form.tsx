/**
 * Send Document Form Component
 *
 * Form for configuring and sending a document for signature.
 * Allows adding multiple signers with roles and ordering.
 */

'use client'

import { useState } from 'react'
import {
  Button,
  Card,
  CardContent,
  cn,
  Input,
  Label,
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@cgk-platform/ui'
import {
  ArrowDown,
  ArrowUp,
  Calendar,
  GripVertical,
  Mail,
  Plus,
  Send,
  Trash2,
  User,
  UserPlus,
} from 'lucide-react'
import type { EsignSignerRole } from '@/lib/esign/types'

export interface SignerInput {
  id: string
  name: string
  email: string
  role: EsignSignerRole
  signingOrder: number
  isInternal: boolean
}

export interface SendDocumentFormData {
  templateId: string
  documentName?: string
  signers: SignerInput[]
  message?: string
  expiresInDays?: number
  reminderEnabled: boolean
  reminderDays: number
}

interface SendDocumentFormProps {
  templateId: string
  templateName: string
  onSubmit: (data: SendDocumentFormData) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
  creatorName?: string
  creatorEmail?: string
  className?: string
}

const SIGNER_ROLES: Array<{ value: EsignSignerRole; label: string; description: string }> = [
  { value: 'signer', label: 'Signer', description: 'Must sign the document' },
  { value: 'approver', label: 'Approver', description: 'Must approve before signers' },
  { value: 'cc', label: 'CC', description: 'Receives copy when complete' },
  { value: 'viewer', label: 'Viewer', description: 'Can view but not sign' },
]

const EXPIRY_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '14', label: '14 days' },
  { value: '30', label: '30 days' },
  { value: '60', label: '60 days' },
  { value: '90', label: '90 days' },
  { value: 'none', label: 'No expiration' },
]

export function SendDocumentForm({
  templateId,
  templateName,
  onSubmit,
  onCancel,
  isSubmitting = false,
  creatorName,
  creatorEmail,
  className,
}: SendDocumentFormProps) {
  const [signers, setSigners] = useState<SignerInput[]>([
    {
      id: crypto.randomUUID(),
      name: creatorName || '',
      email: creatorEmail || '',
      role: 'signer',
      signingOrder: 1,
      isInternal: false,
    },
  ])
  const [documentName, setDocumentName] = useState('')
  const [message, setMessage] = useState('')
  const [expiresInDays, setExpiresInDays] = useState<string>('30')
  const [reminderEnabled, setReminderEnabled] = useState(true)
  const [reminderDays, setReminderDays] = useState(3)
  const [addCounterSigner, setAddCounterSigner] = useState(false)
  const [counterSignerEmail, setCounterSignerEmail] = useState('')

  const addSigner = () => {
    const maxOrder = Math.max(...signers.map(s => s.signingOrder), 0)
    setSigners([
      ...signers,
      {
        id: crypto.randomUUID(),
        name: '',
        email: '',
        role: 'signer',
        signingOrder: maxOrder + 1,
        isInternal: false,
      },
    ])
  }

  const removeSigner = (id: string) => {
    if (signers.length > 1) {
      setSigners(signers.filter(s => s.id !== id))
    }
  }

  const updateSigner = (id: string, updates: Partial<SignerInput>) => {
    setSigners(signers.map(s => s.id === id ? { ...s, ...updates } : s))
  }

  const moveSignerUp = (index: number) => {
    if (index === 0) return
    const newSigners = [...signers]
    const current = newSigners[index]
    const previous = newSigners[index - 1]
    if (!current || !previous) return
    const temp = current.signingOrder
    current.signingOrder = previous.signingOrder
    previous.signingOrder = temp
    ;[newSigners[index], newSigners[index - 1]] = [previous, current]
    setSigners(newSigners)
  }

  const moveSignerDown = (index: number) => {
    if (index === signers.length - 1) return
    const newSigners = [...signers]
    const current = newSigners[index]
    const next = newSigners[index + 1]
    if (!current || !next) return
    const temp = current.signingOrder
    current.signingOrder = next.signingOrder
    next.signingOrder = temp
    ;[newSigners[index], newSigners[index + 1]] = [next, current]
    setSigners(newSigners)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const allSigners = [...signers]

    // Add counter-signer if enabled
    if (addCounterSigner && counterSignerEmail) {
      allSigners.push({
        id: crypto.randomUUID(),
        name: 'Counter-Signer',
        email: counterSignerEmail,
        role: 'signer',
        signingOrder: Math.max(...signers.map(s => s.signingOrder)) + 1,
        isInternal: true,
      })
    }

    await onSubmit({
      templateId,
      documentName: documentName || undefined,
      signers: allSigners,
      message: message || undefined,
      expiresInDays: expiresInDays === 'none' ? undefined : parseInt(expiresInDays, 10),
      reminderEnabled,
      reminderDays,
    })
  }

  const isValid = signers.every(s => s.name.trim() && s.email.trim() && s.email.includes('@'))

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      {/* Document Name */}
      <div className="space-y-2">
        <Label htmlFor="documentName">Document Name (Optional)</Label>
        <Input
          id="documentName"
          value={documentName}
          onChange={(e) => setDocumentName(e.target.value)}
          placeholder={`${templateName} - Recipient Name`}
        />
        <p className="text-xs text-slate-500">
          Leave blank to auto-generate based on template and signer name
        </p>
      </div>

      {/* Signers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Label>Recipients</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addSigner}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Add Recipient
          </Button>
        </div>

        <div className="space-y-3">
          {signers.map((signer, index) => (
            <Card key={signer.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {/* Drag Handle & Order */}
                  <div className="flex flex-col items-center gap-1 pt-2">
                    <GripVertical className="h-4 w-4 text-slate-400 cursor-grab" />
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveSignerUp(index)}
                        disabled={index === 0}
                        className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
                      >
                        <ArrowUp className="h-3 w-3 text-slate-500" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSignerDown(index)}
                        disabled={index === signers.length - 1}
                        className="p-0.5 hover:bg-slate-100 rounded disabled:opacity-30"
                      >
                        <ArrowDown className="h-3 w-3 text-slate-500" />
                      </button>
                    </div>
                    <span className="text-xs font-medium text-slate-400">
                      #{signer.signingOrder}
                    </span>
                  </div>

                  {/* Signer Fields */}
                  <div className="flex-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={`name-${signer.id}`} className="text-xs">
                        Name
                      </Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id={`name-${signer.id}`}
                          value={signer.name}
                          onChange={(e) => updateSigner(signer.id, { name: e.target.value })}
                          placeholder="John Doe"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor={`email-${signer.id}`} className="text-xs">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          id={`email-${signer.id}`}
                          type="email"
                          value={signer.email}
                          onChange={(e) => updateSigner(signer.id, { email: e.target.value })}
                          placeholder="john@example.com"
                          className="pl-10"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Role</Label>
                      <RadixSelect
                        value={signer.role}
                        onValueChange={(v) => updateSigner(signer.id, { role: v as EsignSignerRole })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SIGNER_ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              <div>
                                <p>{role.label}</p>
                                <p className="text-xs text-slate-500">{role.description}</p>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </RadixSelect>
                    </div>

                    <div className="flex items-end">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSigner(signer.id)}
                        disabled={signers.length === 1}
                        className="text-slate-400 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Counter-Signer Option */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Switch
              id="counterSigner"
              checked={addCounterSigner}
              onCheckedChange={setAddCounterSigner}
            />
            <div className="flex-1 space-y-2">
              <Label htmlFor="counterSigner" className="font-medium">
                Add Counter-Signer
              </Label>
              <p className="text-sm text-slate-500">
                Require an internal signature after the external signer completes
              </p>
              {addCounterSigner && (
                <div className="mt-3">
                  <Label htmlFor="counterSignerEmail" className="text-xs">
                    Counter-Signer Email
                  </Label>
                  <div className="relative mt-1.5">
                    <UserPlus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="counterSignerEmail"
                      type="email"
                      value={counterSignerEmail}
                      onChange={(e) => setCounterSignerEmail(e.target.value)}
                      placeholder="admin@company.com"
                      className="pl-10"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message */}
      <div className="space-y-2">
        <Label htmlFor="message">Message to Recipients (Optional)</Label>
        <Textarea
          id="message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Please review and sign this document at your earliest convenience."
          rows={3}
        />
      </div>

      {/* Settings */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Expiration</Label>
          <RadixSelect value={expiresInDays} onValueChange={setExpiresInDays}>
            <SelectTrigger className="w-full">
              <Calendar className="mr-2 h-4 w-4 text-slate-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EXPIRY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </RadixSelect>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Reminders</Label>
            <Switch
              checked={reminderEnabled}
              onCheckedChange={setReminderEnabled}
            />
          </div>
          {reminderEnabled && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-600">Every</span>
              <Input
                type="number"
                min={1}
                max={30}
                value={reminderDays}
                onChange={(e) => setReminderDays(parseInt(e.target.value, 10) || 3)}
                className="w-20"
              />
              <span className="text-sm text-slate-600">days</span>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="gap-1.5"
        >
          <Send className="h-4 w-4" />
          {isSubmitting ? 'Sending...' : 'Send for Signature'}
        </Button>
      </div>
    </form>
  )
}
