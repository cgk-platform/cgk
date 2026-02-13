'use client'

import * as React from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'

import { cn } from '../utils/cn'

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipContent = React.forwardRef<
  React.ComponentRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      'z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md',
      'animate-in fade-in-0 zoom-in-95',
      'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
      'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
      'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

/**
 * Simple Tooltip wrapper for common use case
 * Provides tooltip on hover with minimal boilerplate
 */
interface SimpleTooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'right' | 'bottom' | 'left'
  align?: 'start' | 'center' | 'end'
  delayDuration?: number
  className?: string
  asChild?: boolean
}

function SimpleTooltip({
  content,
  children,
  side = 'top',
  align = 'center',
  delayDuration = 200,
  className,
  asChild = true,
}: SimpleTooltipProps) {
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild={asChild}>{children}</TooltipTrigger>
      <TooltipContent side={side} align={align} className={className}>
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Info Tooltip - icon with tooltip for explanatory text
 */
interface InfoTooltipProps {
  content: React.ReactNode
  className?: string
  iconClassName?: string
  side?: 'top' | 'right' | 'bottom' | 'left'
}

function InfoTooltip({
  content,
  className,
  iconClassName,
  side = 'top',
}: InfoTooltipProps) {
  return (
    <Tooltip delayDuration={100}>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'inline-flex h-4 w-4 items-center justify-center rounded-full',
            'text-muted-foreground hover:text-foreground transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            className
          )}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className={cn('h-4 w-4', iconClassName)}
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
              clipRule="evenodd"
            />
          </svg>
          <span className="sr-only">More information</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Truncated Text with Tooltip
 * Shows full text in tooltip when content is truncated
 */
interface TruncatedTextProps extends React.HTMLAttributes<HTMLSpanElement> {
  text: string
  maxWidth?: string | number
  side?: 'top' | 'right' | 'bottom' | 'left'
}

function TruncatedText({
  text,
  maxWidth = '200px',
  side = 'top',
  className,
  ...props
}: TruncatedTextProps) {
  const [isTruncated, setIsTruncated] = React.useState(false)
  const textRef = React.useRef<HTMLSpanElement>(null)

  React.useEffect(() => {
    const element = textRef.current
    if (element) {
      setIsTruncated(element.scrollWidth > element.clientWidth)
    }
  }, [text])

  const content = (
    <span
      ref={textRef}
      className={cn('block truncate', className)}
      style={{ maxWidth }}
      {...props}
    >
      {text}
    </span>
  )

  if (!isTruncated) {
    return content
  }

  return (
    <Tooltip delayDuration={300}>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side={side} className="max-w-sm">
        {text}
      </TooltipContent>
    </Tooltip>
  )
}

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  SimpleTooltip,
  InfoTooltip,
  TruncatedText,
}

export type { SimpleTooltipProps, InfoTooltipProps, TruncatedTextProps }
