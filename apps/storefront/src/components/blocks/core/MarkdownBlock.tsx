/**
 * Markdown Block Component
 *
 * Renders markdown content with proper typography styling.
 * Supports various widths and text alignments.
 */

import { cn } from '@cgk-platform/ui'
import type { BlockProps, MarkdownConfig } from '../types'

/**
 * Max width class mapping
 */
const maxWidthClasses = {
  sm: 'max-w-xl',
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  full: 'max-w-none',
}

/**
 * Text alignment class mapping
 */
const alignmentClasses = {
  left: 'text-left',
  center: 'text-center mx-auto',
  right: 'text-right ml-auto',
}

/**
 * Padding class mapping
 */
const paddingClasses = {
  none: 'py-0',
  sm: 'py-8',
  md: 'py-16',
  lg: 'py-24',
}

/**
 * Simple markdown to HTML converter
 * Handles common markdown patterns without external dependencies
 */
function parseMarkdown(content: string): string {
  let html = content

  // Escape HTML entities first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Headers (h1-h6)
  html = html.replace(/^###### (.+)$/gm, '<h6>$1</h6>')
  html = html.replace(/^##### (.+)$/gm, '<h5>$1</h5>')
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>')
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
  html = html.replace(/_(.+?)_/g, '<em>$1</em>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')

  // Images
  html = html.replace(
    /!\[([^\]]*)\]\(([^)]+)\)/g,
    '<figure><img src="$2" alt="$1" loading="lazy" /><figcaption>$1</figcaption></figure>'
  )

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
  // Merge consecutive blockquotes
  html = html.replace(/<\/blockquote>\n<blockquote>/g, '\n')

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr />')
  html = html.replace(/^\*\*\*$/gm, '<hr />')

  // Unordered lists
  html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Paragraphs - wrap non-tag text
  const lines = html.split('\n\n')
  html = lines
    .map((line) => {
      const trimmed = line.trim()
      if (!trimmed) return ''
      if (
        trimmed.startsWith('<h') ||
        trimmed.startsWith('<ul') ||
        trimmed.startsWith('<ol') ||
        trimmed.startsWith('<blockquote') ||
        trimmed.startsWith('<pre') ||
        trimmed.startsWith('<hr') ||
        trimmed.startsWith('<figure')
      ) {
        return trimmed
      }
      return `<p>${trimmed}</p>`
    })
    .filter(Boolean)
    .join('\n')

  return html
}

/**
 * Markdown Block Component
 */
export function MarkdownBlock({ block, className }: BlockProps<MarkdownConfig>) {
  const {
    content,
    maxWidth = 'md',
    textAlignment = 'left',
    padding = 'md',
  } = block.config

  const html = parseMarkdown(content)

  return (
    <section className={cn(paddingClasses[padding], className)}>
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div
          className={cn(
            'prose prose-lg dark:prose-invert',
            maxWidthClasses[maxWidth],
            alignmentClasses[textAlignment],
            // Custom prose styling using CSS variables
            'prose-headings:font-bold prose-headings:tracking-tight',
            'prose-headings:text-[hsl(var(--portal-foreground))]',
            'prose-p:text-[hsl(var(--portal-muted-foreground))]',
            'prose-p:leading-relaxed',
            'prose-a:text-[hsl(var(--portal-primary))]',
            'prose-a:no-underline hover:prose-a:underline',
            'prose-strong:text-[hsl(var(--portal-foreground))]',
            'prose-blockquote:border-l-[hsl(var(--portal-primary))]',
            'prose-blockquote:text-[hsl(var(--portal-muted-foreground))]',
            'prose-blockquote:not-italic',
            'prose-code:text-[hsl(var(--portal-primary))]',
            'prose-code:bg-[hsl(var(--portal-muted))]',
            'prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded',
            'prose-code:before:content-none prose-code:after:content-none',
            'prose-pre:bg-[hsl(var(--portal-card))]',
            'prose-pre:border prose-pre:border-[hsl(var(--portal-border))]',
            'prose-pre:rounded-xl',
            'prose-hr:border-[hsl(var(--portal-border))]',
            'prose-li:text-[hsl(var(--portal-muted-foreground))]',
            'prose-img:rounded-xl prose-img:shadow-lg',
            'prose-figure:text-center',
            'prose-figcaption:text-sm prose-figcaption:text-[hsl(var(--portal-muted-foreground))]'
          )}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </section>
  )
}
