'use client'

import { Button, Input, Label, cn } from '@cgk/ui'
import { Eye, EyeOff, Copy, Check } from 'lucide-react'
import { useState } from 'react'

interface SecureApiKeyInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  label: string
  description?: string
  disabled?: boolean
  className?: string
}

export function SecureApiKeyInput({
  value,
  onChange,
  placeholder = 'Enter API key...',
  label,
  description,
  disabled = false,
  className,
}: SecureApiKeyInputProps) {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (!value) return
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Label htmlFor={label.toLowerCase().replace(/\s+/g, '-')}>{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      <div className="relative flex gap-2">
        <div className="relative flex-1">
          <Input
            id={label.toLowerCase().replace(/\s+/g, '-')}
            type={visible ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-10 font-mono text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setVisible(!visible)}
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            disabled={disabled}
          >
            {visible ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
