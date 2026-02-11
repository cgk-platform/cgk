import { Suspense } from 'react'

import { TemplateLibraryContent, TemplateLibrarySkeleton } from './template-library-client'

export const metadata = {
  title: 'Template Library | Admin',
  description: 'Manage all email templates across the platform',
}

export default function TemplateLibraryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Template Library</h1>
        <p className="text-sm text-muted-foreground">
          View and manage all notification email templates across the platform
        </p>
      </div>

      <Suspense fallback={<TemplateLibrarySkeleton />}>
        <TemplateLibraryContent />
      </Suspense>
    </div>
  )
}
