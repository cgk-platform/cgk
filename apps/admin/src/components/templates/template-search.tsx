'use client'

import { Input } from '@cgk/ui'
import { Search, X } from 'lucide-react'
import { useCallback, useState, useTransition } from 'react'

export interface TemplateSearchProps {
  onSearch: (query: string) => void
  placeholder?: string
}

export function TemplateSearch({
  onSearch,
  placeholder = 'Search templates...',
}: TemplateSearchProps) {
  const [value, setValue] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      setValue(newValue)
      startTransition(() => {
        onSearch(newValue)
      })
    },
    [onSearch]
  )

  const handleClear = useCallback(() => {
    setValue('')
    startTransition(() => {
      onSearch('')
    })
  }, [onSearch])

  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        className="pl-9 pr-9"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {isPending && (
        <div className="absolute right-10 top-1/2 -translate-y-1/2">
          <div className="h-3 w-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}
