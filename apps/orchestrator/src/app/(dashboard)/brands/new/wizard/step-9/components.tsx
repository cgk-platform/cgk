'use client'

import { AlertCircle, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'

import type { ConfettiPiece } from './utils'

/**
 * Checklist status icon component
 */
export function ChecklistIcon({ status }: { status: string }) {
  switch (status) {
    case 'pass':
      return <CheckCircle2 className="h-5 w-5 text-success" />
    case 'fail':
      return <XCircle className="h-5 w-5 text-destructive" />
    case 'warning':
      return <AlertCircle className="h-5 w-5 text-warning" />
    default:
      return <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
  }
}

/**
 * Next action card for success state
 */
export function NextActionCard({
  href,
  icon,
  title,
  description,
  external,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  external?: boolean
}) {
  const Component = external ? 'a' : Link
  const extraProps = external ? { target: '_blank', rel: 'noopener noreferrer' } : {}

  return (
    <Component
      href={href}
      className="group flex items-center gap-4 rounded-lg border bg-card p-4 text-left transition-all hover:border-primary/50 hover:shadow-sm"
      {...extraProps}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
        {icon}
      </div>
      <div className="flex-1">
        <p className="font-medium group-hover:text-primary">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowLeft className="h-5 w-5 rotate-180 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
    </Component>
  )
}

/**
 * Confetti animation overlay
 */
export function ConfettiOverlay({ pieces, show }: { pieces: ConfettiPiece[]; show: boolean }) {
  if (!show) return null

  return (
    <>
      <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
        {pieces.map((piece) => (
          <div
            key={piece.id}
            className="absolute animate-confetti-fall"
            style={{
              left: `${piece.x}%`,
              animationDelay: `${piece.delay}s`,
              animationDuration: `${piece.duration}s`,
            }}
          >
            <div
              className="h-3 w-2"
              style={{
                backgroundColor: piece.color,
                transform: `rotate(${piece.rotation}deg)`,
              }}
            />
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </>
  )
}
