'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@cgk-platform/ui'
import { CheckCircle2, Rocket, ExternalLink } from 'lucide-react'

interface StepProps {
  onComplete: () => void
  onBack: () => void
  isFirst: boolean
  isLast: boolean
}

/**
 * Setup Complete Step
 *
 * Congratulatory step with animated celebration and next steps.
 */
export function CompleteStep({ onBack }: StepProps) {
  const router = useRouter()
  const [showAnimation, setShowAnimation] = useState(false)

  useEffect(() => {
    // Trigger animation after mount
    const timer = setTimeout(() => setShowAnimation(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const goToDashboard = () => {
    router.push('/')
  }

  return (
    <div className="space-y-6">
      {/* Animated Success Header */}
      <div
        className={`text-center transition-all duration-700 ${
          showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        {/* Animated checkmark with glow */}
        <div className="relative inline-flex items-center justify-center mb-6">
          {/* Outer glow ring */}
          <div
            className={`absolute w-24 h-24 rounded-full bg-emerald-500/20 transition-all duration-1000 ${
              showAnimation ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}
          />
          {/* Inner glow ring */}
          <div
            className={`absolute w-20 h-20 rounded-full bg-emerald-500/30 transition-all duration-700 delay-200 ${
              showAnimation ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
            }`}
          />
          {/* Icon container */}
          <div
            className={`relative w-16 h-16 rounded-full bg-emerald-950 border-2 border-emerald-500 flex items-center justify-center transition-all duration-500 delay-300 ${
              showAnimation ? 'scale-100' : 'scale-0'
            }`}
          >
            <CheckCircle2
              className={`w-8 h-8 text-emerald-400 transition-all duration-500 delay-500 ${
                showAnimation ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
              }`}
            />
          </div>
        </div>

        <h2
          className={`text-2xl font-bold text-white mb-2 transition-all duration-500 delay-400 ${
            showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Setup Complete!
        </h2>
        <p
          className={`text-zinc-400 transition-all duration-500 delay-500 ${
            showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Your CGK platform is ready to use
        </p>
      </div>

      {/* Summary Panel */}
      <div
        className={`bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 transition-all duration-500 delay-600 ${
          showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <h3 className="text-sm font-medium text-zinc-300 mb-3">Configuration Summary</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-zinc-400">Database connected and migrated</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-zinc-400">Cache/KV configured</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-zinc-400">Super admin account created</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-zinc-400">Platform configuration saved</span>
          </div>
        </div>
      </div>

      {/* Next Steps */}
      <div
        className={`bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 transition-all duration-500 delay-700 ${
          showAnimation ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <h3 className="text-sm font-medium text-zinc-300 mb-3">Next Steps</h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-cyan-950 border border-cyan-800 flex items-center justify-center text-xs font-mono text-cyan-400">
              1
            </div>
            <div>
              <p className="text-sm text-zinc-300">Create your first brand</p>
              <p className="text-xs text-zinc-500">Go to Brands → New Brand to set up a tenant</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-cyan-950 border border-cyan-800 flex items-center justify-center text-xs font-mono text-cyan-400">
              2
            </div>
            <div>
              <p className="text-sm text-zinc-300">Connect integrations</p>
              <p className="text-xs text-zinc-500">Configure Stripe, Resend, and other services</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 rounded bg-cyan-950 border border-cyan-800 flex items-center justify-center text-xs font-mono text-cyan-400">
              3
            </div>
            <div>
              <p className="text-sm text-zinc-300">Invite team members</p>
              <p className="text-xs text-zinc-500">Add other super admins to help manage the platform</p>
            </div>
          </div>
        </div>
      </div>

      {/* Documentation Link */}
      <div
        className={`text-center text-xs text-zinc-500 transition-all duration-500 delay-800 ${
          showAnimation ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <a
          href="https://docs.cgk.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
        >
          Read the documentation
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Actions */}
      <div
        className={`flex items-center justify-between pt-4 border-t border-zinc-800 transition-all duration-500 delay-900 ${
          showAnimation ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <Button variant="ghost" onClick={onBack} className="text-zinc-400">
          Back
        </Button>

        <Button
          onClick={goToDashboard}
          className="bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white"
        >
          <Rocket className="w-4 h-4 mr-2" />
          Launch Dashboard
        </Button>
      </div>
    </div>
  )
}
