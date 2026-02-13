'use client'

import { cn, Input, Label } from '@cgk-platform/ui'
import { useCallback, useRef, useState } from 'react'

import type { ProfileData } from '../../../lib/onboarding-wizard/types'

interface ProfileStepProps {
  data: ProfileData
  errors: Record<string, string>
  onChange: (data: ProfileData) => void
}

/**
 * Profile Step
 *
 * Collect creator's display name, bio, and profile photo.
 */
export function ProfileStep({
  data,
  errors,
  onChange,
}: ProfileStepProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(data.photoUrl)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleChange = useCallback(
    (field: keyof ProfileData, value: string) => {
      onChange({ ...data, [field]: value })
    },
    [data, onChange]
  )

  const handlePhotoSelect = useCallback(
    (file: File) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const url = e.target?.result as string
        setPreviewUrl(url)
        onChange({ ...data, photoFile: file, photoUrl: url })
      }
      reader.readAsDataURL(file)
    },
    [data, onChange]
  )

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handlePhotoSelect(file)
      }
    },
    [handlePhotoSelect]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file && file.type.startsWith('image/')) {
        handlePhotoSelect(file)
      }
    },
    [handlePhotoSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false)
  }, [])

  return (
    <div className="space-y-8">
      {/* Photo upload */}
      <div>
        <Label className="text-sm font-medium text-wizard-text">
          Profile Photo
        </Label>
        <p className="mt-1 text-sm text-wizard-muted">
          A great photo helps you connect with brands and audiences
        </p>

        <div className="mt-4 flex items-start gap-6">
          {/* Photo preview */}
          <div className="relative">
            <div
              className={cn(
                'h-24 w-24 overflow-hidden rounded-full border-2 bg-wizard-hover transition-all',
                isDragOver && 'border-wizard-accent scale-105',
                previewUrl ? 'border-transparent' : 'border-dashed border-wizard-border'
              )}
            >
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-wizard-muted">
                  <UserIcon />
                </div>
              )}
            </div>

            {previewUrl && (
              <button
                type="button"
                onClick={() => {
                  setPreviewUrl(null)
                  onChange({ ...data, photoFile: null, photoUrl: null })
                }}
                className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-sm transition-transform hover:scale-110"
              >
                <XIcon />
              </button>
            )}
          </div>

          {/* Upload area */}
          <div
            className={cn(
              'flex-1 cursor-pointer rounded-lg border-2 border-dashed p-4 text-center transition-all',
              isDragOver
                ? 'border-wizard-accent bg-wizard-accent/5'
                : 'border-wizard-border hover:border-wizard-accent/50 hover:bg-wizard-hover'
            )}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon className="mx-auto h-8 w-8 text-wizard-muted" />
            <p className="mt-2 text-sm font-medium text-wizard-text">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 text-xs text-wizard-muted">
              PNG, JPG up to 5MB
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Display name */}
      <div>
        <Label htmlFor="displayName" className="text-sm font-medium text-wizard-text">
          Display Name <span className="text-red-500">*</span>
        </Label>
        <p className="mt-1 text-sm text-wizard-muted">
          This is how you&apos;ll appear to brands and other creators
        </p>
        <Input
          id="displayName"
          value={data.displayName}
          onChange={(e) => handleChange('displayName', e.target.value)}
          placeholder="e.g., Sarah Creates"
          className="mt-2"
        />
        {errors.displayName && (
          <p className="mt-1.5 text-sm text-red-500">{errors.displayName}</p>
        )}
      </div>

      {/* Bio */}
      <div>
        <Label htmlFor="bio" className="text-sm font-medium text-wizard-text">
          Bio <span className="text-red-500">*</span>
        </Label>
        <p className="mt-1 text-sm text-wizard-muted">
          Tell brands and audiences what makes you unique
        </p>
        <textarea
          id="bio"
          value={data.bio}
          onChange={(e) => handleChange('bio', e.target.value)}
          placeholder="I'm a lifestyle content creator passionate about..."
          rows={4}
          className="mt-2 w-full rounded-lg border border-wizard-border bg-white px-4 py-3 text-wizard-text placeholder:text-wizard-muted/50 focus:border-wizard-accent focus:outline-none focus:ring-2 focus:ring-wizard-accent/20"
        />
        <div className="mt-1.5 flex items-center justify-between text-xs">
          {errors.bio ? (
            <p className="text-red-500">{errors.bio}</p>
          ) : (
            <p className="text-wizard-muted">Minimum 20 characters</p>
          )}
          <p
            className={cn(
              'tabular-nums',
              data.bio.length < 20 && 'text-wizard-muted',
              data.bio.length >= 20 && data.bio.length <= 500 && 'text-wizard-success',
              data.bio.length > 500 && 'text-red-500'
            )}
          >
            {data.bio.length}/500
          </p>
        </div>
      </div>

      {/* Additional info row */}
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Pronouns */}
        <div>
          <Label htmlFor="pronouns" className="text-sm font-medium text-wizard-text">
            Pronouns
          </Label>
          <select
            id="pronouns"
            value={data.pronouns}
            onChange={(e) => handleChange('pronouns', e.target.value)}
            className="mt-2 w-full rounded-lg border border-wizard-border bg-white px-4 py-2.5 text-wizard-text focus:border-wizard-accent focus:outline-none focus:ring-2 focus:ring-wizard-accent/20"
          >
            <option value="">Prefer not to say</option>
            <option value="she/her">She/Her</option>
            <option value="he/him">He/Him</option>
            <option value="they/them">They/Them</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Location */}
        <div>
          <Label htmlFor="location" className="text-sm font-medium text-wizard-text">
            Location
          </Label>
          <Input
            id="location"
            value={data.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="e.g., Los Angeles, CA"
            className="mt-2"
          />
        </div>
      </div>

      {/* Website */}
      <div>
        <Label htmlFor="website" className="text-sm font-medium text-wizard-text">
          Website
        </Label>
        <Input
          id="website"
          type="url"
          value={data.website}
          onChange={(e) => handleChange('website', e.target.value)}
          placeholder="https://yourwebsite.com"
          className="mt-2"
        />
        {errors.website && (
          <p className="mt-1.5 text-sm text-red-500">{errors.website}</p>
        )}
      </div>
    </div>
  )
}

function UserIcon(): React.JSX.Element {
  return (
    <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function UploadIcon({ className }: { className?: string }): React.JSX.Element {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function XIcon(): React.JSX.Element {
  return (
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}
