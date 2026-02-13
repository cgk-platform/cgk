'use client'

import * as React from 'react'
import { Toaster as Sonner, toast as sonnerToast } from 'sonner'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

import { cn } from '../utils/cn'

type ToasterProps = React.ComponentProps<typeof Sonner>

/**
 * Toast container component
 * Place once in your app layout
 */
function Toaster({ className, ...props }: ToasterProps) {
  return (
    <Sonner
      className={cn('toaster group', className)}
      toastOptions={{
        classNames: {
          toast: cn(
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground',
            'group-[.toaster]:border-border group-[.toaster]:shadow-lg',
            'group-[.toaster]:rounded-lg group-[.toaster]:p-4'
          ),
          description: 'group-[.toast]:text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          closeButton: cn(
            'group-[.toast]:bg-background group-[.toast]:border-border',
            'group-[.toast]:text-foreground group-[.toast]:hover:bg-muted'
          ),
          success: cn(
            'group-[.toaster]:border-success/20 group-[.toaster]:bg-success/10',
            '[&>svg]:text-success'
          ),
          error: cn(
            'group-[.toaster]:border-destructive/20 group-[.toaster]:bg-destructive/10',
            '[&>svg]:text-destructive'
          ),
          warning: cn(
            'group-[.toaster]:border-warning/20 group-[.toaster]:bg-warning/10',
            '[&>svg]:text-warning'
          ),
          info: cn(
            'group-[.toaster]:border-info/20 group-[.toaster]:bg-info/10',
            '[&>svg]:text-info'
          ),
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-5 w-5" />,
        error: <XCircle className="h-5 w-5" />,
        warning: <AlertTriangle className="h-5 w-5" />,
        info: <Info className="h-5 w-5" />,
        close: <X className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}

/**
 * Toast function - re-export from sonner with typed wrapper
 *
 * Usage:
 *   toast('Message')
 *   toast.success('Success!')
 *   toast.error('Error!')
 *   toast.warning('Warning!')
 *   toast.info('Info!')
 *   toast.loading('Loading...')
 *   toast.promise(asyncFn, { loading, success, error })
 *   toast.dismiss(id)
 */
const toast = sonnerToast

export { Toaster, toast }
