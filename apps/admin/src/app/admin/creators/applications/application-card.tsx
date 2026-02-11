'use client'

import { useState } from 'react'
import { Card, CardContent, Badge, Button } from '@cgk/ui'

import type { CreatorApplication, ApplicationStatus } from '@/lib/creators-admin-ops'
import { formatDateTime } from '@/lib/format'

import { ApplicationReviewModal } from './application-review-modal'

const statusConfig: Record<ApplicationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  new: { label: 'New', variant: 'default' },
  in_review: { label: 'In Review', variant: 'outline' },
  approved: { label: 'Approved', variant: 'secondary' },
  rejected: { label: 'Rejected', variant: 'destructive' },
  waitlisted: { label: 'Waitlisted', variant: 'outline' },
}

export function ApplicationCard({ application }: { application: CreatorApplication }) {
  const [showModal, setShowModal] = useState(false)
  const config = statusConfig[application.status]

  const socialLinks = [
    application.instagram && { platform: 'Instagram', handle: application.instagram },
    application.tiktok && { platform: 'TikTok', handle: application.tiktok },
    application.youtube && { platform: 'YouTube', handle: application.youtube },
  ].filter(Boolean)

  const followerDisplay = application.follower_count
    ? application.follower_count >= 1000
      ? `${(application.follower_count / 1000).toFixed(1)}K`
      : application.follower_count.toString()
    : null

  return (
    <>
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-3">
                <h3 className="truncate text-base font-semibold">{application.name}</h3>
                <Badge variant={config.variant}>{config.label}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDateTime(application.created_at)}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>{application.email}</span>
                {socialLinks.map((link) => (
                  <span key={link?.platform} className="flex items-center gap-1">
                    <span className="font-medium">{link?.platform}:</span>
                    <span>@{link?.handle}</span>
                  </span>
                ))}
                {followerDisplay && (
                  <span className="font-medium text-foreground">{followerDisplay} followers</span>
                )}
              </div>

              {application.bio && (
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  "{application.bio}"
                </p>
              )}
            </div>

            <div className="flex shrink-0 gap-2">
              {application.status === 'new' || application.status === 'in_review' ? (
                <>
                  <Button size="sm" variant="outline" onClick={() => setShowModal(true)}>
                    Review
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowModal(true)}>
                  View
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {showModal && (
        <ApplicationReviewModal
          application={application}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  )
}
