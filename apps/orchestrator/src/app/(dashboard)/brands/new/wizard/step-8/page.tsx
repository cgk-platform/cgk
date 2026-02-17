'use client'

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  cn,
  Input,
  Label,
  RadixSelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@cgk-platform/ui'
import type { UserInvitation } from '@cgk-platform/onboarding'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Loader2,
  Mail,
  Plus,
  SkipForward,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useCallback, useEffect, useState } from 'react'

type InvitationRole = 'admin' | 'member'

interface PendingInvitation {
  id: string
  email: string
  role: InvitationRole
  status: 'draft' | 'pending' | 'sent' | 'accepted' | 'expired'
}

/**
 * Step 8: Initial Users
 *
 * Invite team members to the brand before launch.
 */
function Step8Content() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [invitations, setInvitations] = useState<PendingInvitation[]>([])
  const [newEmail, setNewEmail] = useState('')
  const [newRole, setNewRole] = useState<InvitationRole>('member')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)

  // Load existing invitations
  const loadInvitations = useCallback(async () => {
    if (!sessionId) return

    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/platform/onboarding/${sessionId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch session')
      }

      const { session } = await response.json()

      // Load existing invitations from step data
      if (session?.stepData?.users?.invitations) {
        const existingInvitations = session.stepData.users.invitations.map(
          (inv: UserInvitation, index: number) => ({
            id: inv.id || `temp-${index}`,
            email: inv.email,
            role: inv.role,
            status: inv.status || 'draft',
          })
        )
        setInvitations(existingInvitations)
      }
    } catch (err) {
      console.error('Failed to load invitations:', err)
      setError('Failed to load invitations')
    } finally {
      setIsLoading(false)
    }
  }, [sessionId])

  useEffect(() => {
    loadInvitations()
  }, [loadInvitations])

  // Validate email
  const validateEmail = (email: string): boolean => {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailPattern.test(email)
  }

  // Add new invitation
  const handleAddInvitation = () => {
    setEmailError(null)

    if (!newEmail.trim()) {
      setEmailError('Email is required')
      return
    }

    if (!validateEmail(newEmail)) {
      setEmailError('Please enter a valid email address')
      return
    }

    // Check for duplicates
    if (invitations.some((inv) => inv.email.toLowerCase() === newEmail.toLowerCase())) {
      setEmailError('This email has already been added')
      return
    }

    const newInvitation: PendingInvitation = {
      id: `draft-${Date.now()}`,
      email: newEmail.toLowerCase().trim(),
      role: newRole,
      status: 'draft',
    }

    setInvitations((prev) => [...prev, newInvitation])
    setNewEmail('')
    setNewRole('member')
  }

  // Remove invitation
  const handleRemoveInvitation = (id: string) => {
    setInvitations((prev) => prev.filter((inv) => inv.id !== id))
  }

  // Update invitation role
  const handleUpdateRole = (id: string, role: InvitationRole) => {
    setInvitations((prev) =>
      prev.map((inv) => (inv.id === id ? { ...inv, role } : inv))
    )
  }

  // Handle navigation
  const handleBack = async () => {
    if (!sessionId) {
      router.push('/brands/new/wizard/step-7')
      return
    }

    try {
      await fetch(`/api/platform/onboarding/${sessionId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepNumber: 8,
          data: {
            invitations: invitations.map((inv) => ({
              email: inv.email,
              role: inv.role,
              status: inv.status,
            })),
          },
          action: 'back',
        }),
      })
    } catch (err) {
      console.error('Failed to save step:', err)
    }

    router.push(`/brands/new/wizard/step-7?sessionId=${sessionId}`)
  }

  const handleNext = async () => {
    if (!sessionId) {
      router.push('/brands/new/wizard/step-9')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`/api/platform/onboarding/${sessionId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepNumber: 8,
          data: {
            invitations: invitations.map((inv) => ({
              email: inv.email,
              role: inv.role,
              status: inv.status === 'draft' ? 'pending' : inv.status,
            })),
          },
          action: 'next',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save invitations')
      }

      router.push(`/brands/new/wizard/step-9?sessionId=${sessionId}`)
    } catch (err) {
      console.error('Failed to save step:', err)
      setError('Failed to save invitations')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSkip = async () => {
    if (!sessionId) {
      router.push('/brands/new/wizard/step-9')
      return
    }

    try {
      await fetch(`/api/platform/onboarding/${sessionId}/step`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stepNumber: 8,
          data: { invitations: [] },
          action: 'skip',
        }),
      })
    } catch (err) {
      console.error('Failed to skip step:', err)
    }

    router.push(`/brands/new/wizard/step-9?sessionId=${sessionId}`)
  }

  if (!sessionId) {
    return (
      <div className="space-y-6">
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Session Required</AlertTitle>
          <AlertDescription>
            Please start the onboarding wizard from the beginning.
          </AlertDescription>
        </Alert>
        <Link href="/brands/new">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Start Over
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Step 8 of 9</span>
          <span className="text-muted-foreground/50">|</span>
          <span>Team Setup</span>
          <Badge variant="secondary" className="ml-2">
            Optional
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Invite Team Members</h1>
        <p className="text-muted-foreground">
          Add team members who will help manage this brand. Invitations will be sent
          when you launch.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-1">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors',
              i < 8 ? 'bg-primary' : 'bg-muted'
            )}
          />
        ))}
      </div>

      {/* Error alert */}
      {error && (
        <Alert variant="error">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main content */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Add invitation form */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Add Team Member</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter email address and select role
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[1fr,150px,auto]">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="teammate@example.com"
                    value={newEmail}
                    onChange={(e) => {
                      setNewEmail(e.target.value)
                      setEmailError(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddInvitation()
                      }
                    }}
                    className={emailError ? 'border-destructive' : ''}
                  />
                  {emailError && (
                    <p className="text-xs text-destructive">{emailError}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Role</Label>
                  <RadixSelect value={newRole} onValueChange={(v) => setNewRole(v as InvitationRole)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </RadixSelect>
                </div>
                <div className="flex items-end">
                  <Button onClick={handleAddInvitation}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add
                  </Button>
                </div>
              </div>

              {/* Role descriptions */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm font-medium">Admin</p>
                  <p className="text-xs text-muted-foreground">
                    Full access to all brand settings, team management, and billing
                  </p>
                </div>
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-sm font-medium">Member</p>
                  <p className="text-xs text-muted-foreground">
                    Access to orders, products, and basic analytics
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Invitations list */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Pending Invitations</h3>
                    <p className="text-sm text-muted-foreground">
                      {invitations.length === 0
                        ? 'No invitations added yet'
                        : `${invitations.length} invitation${invitations.length === 1 ? '' : 's'}`}
                    </p>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {invitations.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-8">
                  <Mail className="h-10 w-10 text-muted-foreground/50" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No team members added yet
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Add team members above or skip this step
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium uppercase">
                          {invitation.email.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{invitation.email}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <StatusIcon status={invitation.status} />
                            <span className="capitalize">{invitation.status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadixSelect
                          value={invitation.role}
                          onValueChange={(v) =>
                            handleUpdateRole(invitation.id, v as InvitationRole)
                          }
                        >
                          <SelectTrigger className="w-[120px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="member">Member</SelectItem>
                          </SelectContent>
                        </RadixSelect>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveInvitation(invitation.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info card */}
          <Card className="bg-muted/30">
            <CardContent className="py-4">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">When are invitations sent?</p>
                  <p className="text-sm text-muted-foreground">
                    Invitations will be sent automatically when you complete the wizard
                    and launch the brand. Team members will receive an email with
                    instructions to set up their account.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <Button variant="outline" onClick={handleBack} disabled={isSaving}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={handleSkip} disabled={isSaving}>
            <SkipForward className="mr-2 h-4 w-4" />
            Skip for Now
          </Button>
          <Button onClick={handleNext} disabled={isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'sent':
      return <Mail className="h-3 w-3" />
    case 'accepted':
      return <Check className="h-3 w-3 text-success" />
    case 'expired':
      return <Clock className="h-3 w-3 text-destructive" />
    default:
      return <Clock className="h-3 w-3" />
  }
}

export default function Step8Page() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <Step8Content />
    </Suspense>
  )
}
