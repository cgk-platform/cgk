/**
 * Policy Content Block Component
 *
 * Rich text policy content block with optional table of contents,
 * last updated date, and responsive typography.
 */

import { cn } from '@cgk-platform/ui'
import type { BlockProps, PolicyContentConfig } from '../types'

/**
 * Max width class mapping
 */
const maxWidthClasses = {
  sm: 'max-w-2xl',
  md: 'max-w-3xl',
  lg: 'max-w-4xl',
  full: 'max-w-none',
}

/**
 * Extract headings from markdown-like content for table of contents
 */
function extractHeadings(content: string): Array<{ id: string; text: string; level: number }> {
  const headingRegex = /^(#{1,3})\s+(.+)$/gm
  const headings: Array<{ id: string; text: string; level: number }> = []
  let match

  while ((match = headingRegex.exec(content)) !== null) {
    const hashPart = match[1]
    const textPart = match[2]
    if (!hashPart || !textPart) continue
    const level = hashPart.length
    const text = textPart.trim()
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')

    headings.push({ id, text, level })
  }

  return headings
}

/**
 * Simple markdown-to-HTML renderer for policy content
 */
function renderContent(content: string): string {
  let html = content
    // Escape HTML entities first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    // Headers with IDs for anchor links
    .replace(/^### (.+)$/gm, (_, text) => {
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      return `<h3 id="${id}" class="text-xl font-semibold text-[hsl(var(--portal-foreground))] mt-8 mb-4">${text}</h3>`
    })
    .replace(/^## (.+)$/gm, (_, text) => {
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      return `<h2 id="${id}" class="text-2xl font-bold text-[hsl(var(--portal-foreground))] mt-10 mb-4">${text}</h2>`
    })
    .replace(/^# (.+)$/gm, (_, text) => {
      const id = text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
      return `<h1 id="${id}" class="text-3xl font-bold text-[hsl(var(--portal-foreground))] mt-10 mb-6">${text}</h1>`
    })
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" class="text-[hsl(var(--portal-primary))] hover:underline">$1</a>'
    )
    // Unordered lists
    .replace(
      /^[-*] (.+)$/gm,
      '<li class="ml-6 list-disc text-[hsl(var(--portal-muted-foreground))]">$1</li>'
    )
    // Ordered lists
    .replace(
      /^\d+\. (.+)$/gm,
      '<li class="ml-6 list-decimal text-[hsl(var(--portal-muted-foreground))]">$1</li>'
    )
    // Paragraphs (double newlines)
    .replace(
      /\n\n(?!<)/g,
      '</p><p class="text-[hsl(var(--portal-muted-foreground))] leading-relaxed mb-4">'
    )
    // Single line breaks
    .replace(/\n(?!<)/g, '<br />')

  // Wrap in initial paragraph if not starting with a tag
  if (!html.startsWith('<')) {
    html = `<p class="text-[hsl(var(--portal-muted-foreground))] leading-relaxed mb-4">${html}</p>`
  }

  return html
}

/**
 * Table of Contents component
 */
function TableOfContents({
  headings,
}: {
  headings: Array<{ id: string; text: string; level: number }>
}) {
  if (headings.length === 0) return null

  return (
    <nav className="mb-12 rounded-xl border border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-muted))]/30 p-6">
      <h2 className="mb-4 text-lg font-semibold text-[hsl(var(--portal-foreground))]">
        Table of Contents
      </h2>
      <ul className="space-y-2">
        {headings.map((heading) => (
          <li
            key={heading.id}
            style={{ paddingLeft: `${(heading.level - 1) * 16}px` }}
          >
            <a
              href={`#${heading.id}`}
              className={cn(
                'text-[hsl(var(--portal-muted-foreground))] transition-colors',
                'hover:text-[hsl(var(--portal-primary))]',
                heading.level === 1 && 'font-medium'
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * Policy Content Block Component
 */
export function PolicyContentBlock({ block, className }: BlockProps<PolicyContentConfig>) {
  const {
    title,
    content,
    lastUpdated,
    showTableOfContents = false,
    maxWidth = 'md',
    backgroundColor,
  } = block.config

  const headings = showTableOfContents ? extractHeadings(content) : []
  const renderedContent = renderContent(content)

  return (
    <section
      className={cn('py-16 sm:py-20', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className={cn('mx-auto px-6 sm:px-8', maxWidthClasses[maxWidth])}>
        {/* Title and last updated */}
        {(title || lastUpdated) && (
          <div className="mb-10 border-b border-[hsl(var(--portal-border))] pb-8">
            {title && (
              <h1 className="text-3xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-4xl">
                {title}
              </h1>
            )}
            {lastUpdated && (
              <p className="mt-3 text-sm text-[hsl(var(--portal-muted-foreground))]">
                Last updated: {lastUpdated}
              </p>
            )}
          </div>
        )}

        {/* Table of Contents */}
        {showTableOfContents && <TableOfContents headings={headings} />}

        {/* Content */}
        <article
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{ __html: renderedContent }}
        />
      </div>
    </section>
  )
}
