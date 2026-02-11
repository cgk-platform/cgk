'use client'

import { Card, CardContent, CardHeader } from '@cgk/ui'

interface SERPPreviewProps {
  title: string
  description: string
  url: string
}

export function SERPPreview({ title, description, url }: SERPPreviewProps) {
  // Truncate title at 60 characters
  const displayTitle = title.length > 60 ? title.slice(0, 57) + '...' : title

  // Truncate description at 160 characters
  const displayDesc = description.length > 160 ? description.slice(0, 157) + '...' : description

  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-medium text-muted-foreground">
          Google Search Preview
        </h3>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border p-4">
          {/* URL */}
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted">
              <span className="text-xs font-bold">G</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{url}</p>
            </div>
          </div>

          {/* Title */}
          <h3 className="mt-2 text-xl text-blue-600 hover:underline cursor-pointer">
            {displayTitle}
          </h3>

          {/* Description */}
          <p className="mt-1 text-sm text-muted-foreground">
            {displayDesc}
          </p>
        </div>

        {/* Character counts */}
        <div className="mt-4 flex gap-6 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">Title:</span>{' '}
            <span className={title.length > 60 ? 'text-destructive' : title.length < 30 ? 'text-yellow-600' : 'text-green-600'}>
              {title.length}/60
            </span>
          </div>
          <div>
            <span className="font-medium">Description:</span>{' '}
            <span className={description.length > 160 ? 'text-destructive' : description.length < 120 ? 'text-yellow-600' : 'text-green-600'}>
              {description.length}/160
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface SocialPreviewProps {
  title: string
  description: string
  image?: string | null
  siteName: string
}

export function SocialPreview({ title, description, image, siteName }: SocialPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <h3 className="text-sm font-medium text-muted-foreground">
          Social Share Preview
        </h3>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-lg border">
          {/* Image */}
          {image ? (
            <img
              src={image}
              alt="OG Preview"
              className="aspect-[1200/630] w-full bg-muted object-cover"
            />
          ) : (
            <div className="flex aspect-[1200/630] items-center justify-center bg-muted text-sm text-muted-foreground">
              No image set
            </div>
          )}

          {/* Content */}
          <div className="p-3">
            <p className="text-xs uppercase text-muted-foreground">{siteName}</p>
            <p className="font-medium line-clamp-2">{title}</p>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
