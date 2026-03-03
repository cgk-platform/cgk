'use client'

/**
 * DeliveryEstimate Component
 *
 * Displays estimated delivery date based on user's zip code.
 * Matches Figma design with Manrope Medium, truck icon, and inline editing.
 *
 * Design specs:
 * - Font: Manrope Medium, 15px
 * - Color: #161F2B (meliusly-dark)
 * - Zip code: #0268A0 (meliusly-primary), underlined
 * - Icon: Truck (lucide-react), #0268A0, 14px width, stroke-width 1.5
 * - Gap: 12px between icon and text
 */

import { Truck } from 'lucide-react'
import { cn } from '@cgk-platform/ui'
import { useState, useRef, useEffect, useCallback } from 'react'

interface DeliveryEstimateProps {
  /** Zip code for delivery calculation. Defaults to "90210" */
  zipCode?: string
  /** Callback when user changes zip code */
  onZipCodeChange?: (newZipCode: string) => void
  /** Custom class name */
  className?: string
}

/**
 * Calculate delivery date by adding 5 business days to current date.
 * Skips weekends - if delivery lands on Saturday/Sunday, pushes to Monday.
 */
function calculateDeliveryDate(): string {
  const today = new Date()
  let businessDaysAdded = 0
  let currentDate = new Date(today)

  while (businessDaysAdded < 5) {
    currentDate.setDate(currentDate.getDate() + 1)
    const dayOfWeek = currentDate.getDay()

    // Skip weekends (Saturday = 6, Sunday = 0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      businessDaysAdded++
    }
  }

  // If delivery date lands on weekend, push to Monday
  const finalDayOfWeek = currentDate.getDay()
  if (finalDayOfWeek === 6) {
    // Saturday -> add 2 days to Monday
    currentDate.setDate(currentDate.getDate() + 2)
  } else if (finalDayOfWeek === 0) {
    // Sunday -> add 1 day to Monday
    currentDate.setDate(currentDate.getDate() + 1)
  }

  // Format as "Thurs, 10 Oct"
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  const formatted = formatter.format(currentDate)
  // Convert "Thu, 10 Oct" to "Thurs, 10 Oct" by replacing short weekday with abbreviated form
  return formatted.replace(/^(\w+),/, (match, day) => {
    const weekdayMap: Record<string, string> = {
      Sun: 'Sun',
      Mon: 'Mon',
      Tue: 'Tues',
      Wed: 'Wed',
      Thu: 'Thurs',
      Fri: 'Fri',
      Sat: 'Sat',
    }
    return `${weekdayMap[day] || day},`
  })
}

/**
 * Validate zip code format (5 digits).
 */
function isValidZipCode(zip: string): boolean {
  return /^\d{5}$/.test(zip)
}

export function DeliveryEstimate({
  zipCode = '90210',
  onZipCodeChange,
  className,
}: DeliveryEstimateProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(zipCode)
  const [currentZipCode, setCurrentZipCode] = useState(zipCode)
  const inputRef = useRef<HTMLInputElement>(null)
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const deliveryDate = calculateDeliveryDate()

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  const handleZipCodeClick = () => {
    setEditValue(currentZipCode)
    setIsEditing(true)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5) // Only digits, max 5
    setEditValue(value)
  }

  const handleSaveZipCode = () => {
    if (isValidZipCode(editValue)) {
      setCurrentZipCode(editValue)
      onZipCodeChange?.(editValue)
      setIsEditing(false)
    }
  }

  const handleCancelEdit = () => {
    setEditValue(currentZipCode)
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveZipCode()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancelEdit()
    }
  }

  const handleBlur = useCallback(() => {
    // Small delay to allow click events to register first
    blurTimeoutRef.current = setTimeout(() => {
      if (isValidZipCode(editValue)) {
        handleSaveZipCode()
      } else {
        handleCancelEdit()
      }
    }, 150)
  }, [editValue])

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {/* Truck Icon */}
      <Truck
        className="flex-shrink-0 text-meliusly-primary"
        size={14}
        strokeWidth={1.5}
        aria-hidden="true"
      />

      {/* Delivery Text */}
      <div className="font-manrope text-[15px] font-medium text-meliusly-dark">
        Est. delivery to{' '}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            inputMode="numeric"
            value={editValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="inline-block w-[70px] border-b-2 border-meliusly-primary bg-transparent text-meliusly-primary outline-none"
            aria-label="Edit zip code"
          />
        ) : (
          <button
            type="button"
            onClick={handleZipCodeClick}
            className="text-meliusly-primary underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-meliusly-primary focus:ring-offset-2"
            aria-label={`Change zip code from ${currentZipCode}`}
          >
            {currentZipCode}
          </button>
        )}{' '}
        by {deliveryDate}
      </div>
    </div>
  )
}
