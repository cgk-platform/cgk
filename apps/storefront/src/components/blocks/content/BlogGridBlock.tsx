/**
 * Blog Grid Block Component
 *
 * Displays blog posts in a configurable grid layout with
 * post cards featuring images, titles, excerpts, dates, and category badges.
 */

'use client'

import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, BlogGridConfig, BlogGridItem } from '../types'
import { LucideIcon } from '../icons'

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Blog Post Card Component
 */
function BlogPostCard({
  post,
  index,
  showExcerpts,
  showDates,
  showAuthors,
}: {
  post: BlogGridItem
  index: number
  showExcerpts: boolean
  showDates: boolean
  showAuthors: boolean
}) {
  return (
    <article
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-2xl',
        'bg-[hsl(var(--portal-card))]',
        'border border-[hsl(var(--portal-border))]',
        'transition-all duration-300',
        'hover:border-[hsl(var(--portal-primary))]/20',
        'hover:shadow-xl hover:-translate-y-1',
        'animate-fade-in'
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Image */}
      {post.image && (
        <Link href={`/blog/${post.slug}`} className="relative aspect-[16/10] overflow-hidden">
          <Image
            src={post.image.src}
            alt={post.image.alt || post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          {/* Category Badge */}
          {post.category && (
            <div className="absolute left-4 top-4">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-3 py-1',
                  'bg-[hsl(var(--portal-primary))] text-white',
                  'text-xs font-semibold uppercase tracking-wider',
                  'shadow-lg'
                )}
              >
                {post.category}
              </span>
            </div>
          )}
        </Link>
      )}

      {/* Content */}
      <div className="flex flex-1 flex-col p-6">
        {/* Meta info */}
        {(showDates || showAuthors) && (
          <div className="mb-3 flex flex-wrap items-center gap-3 text-sm text-[hsl(var(--portal-muted-foreground))]">
            {showDates && post.date && (
              <span className="flex items-center gap-1.5">
                <LucideIcon name="Calendar" className="h-3.5 w-3.5" />
                {formatDate(post.date)}
              </span>
            )}
            {showAuthors && post.author && (
              <span className="flex items-center gap-1.5">
                <LucideIcon name="User" className="h-3.5 w-3.5" />
                {post.author}
              </span>
            )}
          </div>
        )}

        {/* Title */}
        <h3 className="mb-3 text-xl font-bold text-[hsl(var(--portal-foreground))]">
          <Link
            href={`/blog/${post.slug}`}
            className="transition-colors hover:text-[hsl(var(--portal-primary))]"
          >
            {post.title}
          </Link>
        </h3>

        {/* Excerpt */}
        {showExcerpts && post.excerpt && (
          <p className="mb-4 flex-1 text-[hsl(var(--portal-muted-foreground))] line-clamp-3">
            {post.excerpt}
          </p>
        )}

        {/* Read More Link */}
        <Link
          href={`/blog/${post.slug}`}
          className={cn(
            'mt-auto inline-flex items-center gap-2',
            'text-sm font-semibold text-[hsl(var(--portal-primary))]',
            'transition-all hover:gap-3'
          )}
        >
          Read More
          <LucideIcon name="ArrowRight" className="h-4 w-4" />
        </Link>
      </div>
    </article>
  )
}

/**
 * Blog Grid Block Component
 */
export function BlogGridBlock({ block, className }: BlockProps<BlogGridConfig>) {
  const {
    headline,
    posts,
    columns = 3,
    showExcerpts = true,
    showDates = true,
    showAuthors = false,
    backgroundColor,
  } = block.config

  // Column class mapping
  const columnClasses = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <section
      className={cn('py-20 sm:py-28', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Header */}
        {headline && (
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-4xl">
              {headline}
            </h2>
          </div>
        )}

        {/* Posts Grid */}
        {posts.length > 0 ? (
          <div className={cn('grid gap-8', columnClasses[columns] || columnClasses[3])}>
            {posts.map((post, index) => (
              <BlogPostCard
                key={post.id}
                post={post}
                index={index}
                showExcerpts={showExcerpts}
                showDates={showDates}
                showAuthors={showAuthors}
              />
            ))}
          </div>
        ) : (
          <div className="py-16 text-center">
            <LucideIcon
              name="FileText"
              className="mx-auto h-12 w-12 text-[hsl(var(--portal-muted-foreground))]"
            />
            <p className="mt-4 text-lg text-[hsl(var(--portal-muted-foreground))]">
              No blog posts yet. Check back soon!
            </p>
          </div>
        )}
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  )
}
