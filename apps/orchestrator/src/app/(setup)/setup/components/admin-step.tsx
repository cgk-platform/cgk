'use client'

import { useState } from 'react'
import { Button, Input, Label } from '@cgk-platform/ui'
import { UserCog, CheckCircle2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react'

interface StepProps {
  onComplete: () => void
  onBack: () => void
  isFirst: boolean
  isLast: boolean
}

/**
 * Admin User Creation Step
 *
 * Creates the first super admin user for the platform.
 */
export function AdminStep({ onComplete, onBack }: StepProps) {
  const [creating, setCreating] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })

  const [validation, setValidation] = useState({
    name: true,
    email: true,
    password: true,
    confirmPassword: true,
  })

  const validateForm = () => {
    const isNameValid = formData.name.trim().length >= 2
    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    const isPasswordValid = formData.password.length >= 12
    const isConfirmValid = formData.password === formData.confirmPassword

    setValidation({
      name: isNameValid,
      email: isEmailValid,
      password: isPasswordValid,
      confirmPassword: isConfirmValid,
    })

    return isNameValid && isEmailValid && isPasswordValid && isConfirmValid
  }

  const createAdmin = async () => {
    if (!validateForm()) return

    setCreating(true)
    setError(null)

    try {
      const response = await fetch('/api/setup/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
      } else {
        setStatus('error')
        setError(data.error || 'Failed to create admin user')
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Failed to create admin')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg bg-cyan-950/50 border border-cyan-500/30 flex items-center justify-center">
          <UserCog className="w-6 h-6 text-cyan-400" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white">Create Super Admin</h2>
          <p className="text-zinc-400 text-sm">
            Set up the first administrator account for the platform
          </p>
        </div>
      </div>

      {/* Form */}
      {status !== 'success' ? (
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-400 text-xs uppercase tracking-wider">
              Full Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="Jane Smith"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className={`bg-zinc-900 border-zinc-700 ${!validation.name ? 'border-red-500' : ''}`}
            />
            {!validation.name && (
              <p className="text-xs text-red-400">Name must be at least 2 characters</p>
            )}
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-400 text-xs uppercase tracking-wider">
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="admin@example.com"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className={`bg-zinc-900 border-zinc-700 ${!validation.email ? 'border-red-500' : ''}`}
            />
            {!validation.email && <p className="text-xs text-red-400">Enter a valid email address</p>}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-zinc-400 text-xs uppercase tracking-wider">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={formData.password}
                onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                className={`bg-zinc-900 border-zinc-700 pr-10 ${!validation.password ? 'border-red-500' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {!validation.password && (
              <p className="text-xs text-red-400">Password must be at least 12 characters</p>
            )}
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <Label
              htmlFor="confirmPassword"
              className="text-zinc-400 text-xs uppercase tracking-wider"
            >
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••••••"
              value={formData.confirmPassword}
              onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className={`bg-zinc-900 border-zinc-700 ${!validation.confirmPassword ? 'border-red-500' : ''}`}
            />
            {!validation.confirmPassword && (
              <p className="text-xs text-red-400">Passwords do not match</p>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-950/30 border border-red-900/50 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-400 font-medium">Creation Failed</p>
                <p className="text-xs text-red-400/70 mt-1">{error}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Success State */
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4">
          <div className="p-3 bg-emerald-950/30 border border-emerald-900/50 rounded-lg flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-emerald-400 font-medium">Super Admin Created</p>
              <p className="text-xs text-emerald-400/70 mt-1">
                Account created for <strong>{formData.email}</strong>
              </p>
              <p className="text-xs text-zinc-500 mt-2">
                You can log in with these credentials after setup is complete.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Security Info */}
      <div className="text-xs text-zinc-500 space-y-2">
        <p>
          <strong className="text-zinc-400">Security Requirements:</strong>
        </p>
        <ul className="list-disc list-inside space-y-1 text-zinc-600">
          <li>Password minimum 12 characters</li>
          <li>MFA will be required after first login</li>
          <li>All super admin actions are logged</li>
          <li>Session expires after 4 hours of inactivity</li>
        </ul>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
        <Button variant="ghost" onClick={onBack} className="text-zinc-400">
          Back
        </Button>

        <div className="flex items-center gap-3">
          {status !== 'success' ? (
            <Button
              onClick={createAdmin}
              disabled={creating}
              className="bg-cyan-600 hover:bg-cyan-500 text-white"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          ) : (
            <Button onClick={onComplete} className="bg-cyan-600 hover:bg-cyan-500 text-white">
              Continue
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
