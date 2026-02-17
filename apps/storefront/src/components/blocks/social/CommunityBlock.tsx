'use client'

/**
 * Community Block Component
 *
 * Displays community stats, social links, recent community posts preview,
 * and a CTA to join the community.
 */

import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import {
  Users,
  MessageCircle,
  Heart,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import type { BlockProps, CommunityConfig, ButtonConfig, ImageConfig } from '../types'
import { LucideIcon } from '../icons'

/**
 * Community post preview
 */
export interface CommunityPost {
  id: string
  author: string
  avatar?: ImageConfig
  content: string
  likes?: number
  comments?: number
  timestamp?: string
}

/**
 * Extended Community config with additional properties
 */
interface ExtendedCommunityConfig extends CommunityConfig {
  memberCount?: string
  memberCountLabel?: string
  posts?: CommunityPost[]
  postsHeadline?: string
  ctaButton?: ButtonConfig
  layout?: 'centered' | 'split'
}

/**
 * Get icon for social platform
 */
function getSocialPlatformIcon(platform: string): string {
  const platformMap: Record<string, string> = {
    facebook: 'Facebook',
    twitter: 'Twitter',
    instagram: 'Instagram',
    linkedin: 'Linkedin',
    youtube: 'Youtube',
    discord: 'MessageCircle',
    slack: 'Hash',
    telegram: 'Send',
    reddit: 'MessageSquare',
    tiktok: 'Music2',
  }
  return platformMap[platform.toLowerCase()] || 'Link'
}

/**
 * Community Block Component
 */
export function CommunityBlock({ block, className }: BlockProps<ExtendedCommunityConfig>) {
  const {
    headline = 'Join Our Community',
    description,
    stats = [],
    socialLinks = [],
    memberCount,
    memberCountLabel = 'members',
    posts = [],
    postsHeadline = 'Recent Discussions',
    ctaButton,
    backgroundColor,
    layout = 'centered',
  } = block.config

  const hasPosts = posts.length > 0
  const hasStats = stats.length > 0 || !!memberCount
  const hasSocialLinks = socialLinks.length > 0

  return (
    <section
      className={cn('py-16 sm:py-20', className)}
      style={{ backgroundColor }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {layout === 'centered' ? (
          <CenteredLayout
            headline={headline}
            description={description}
            stats={stats}
            memberCount={memberCount}
            memberCountLabel={memberCountLabel}
            socialLinks={socialLinks}
            posts={posts}
            postsHeadline={postsHeadline}
            ctaButton={ctaButton}
            hasStats={hasStats}
            hasSocialLinks={hasSocialLinks}
            hasPosts={hasPosts}
          />
        ) : (
          <SplitLayout
            headline={headline}
            description={description}
            stats={stats}
            memberCount={memberCount}
            memberCountLabel={memberCountLabel}
            socialLinks={socialLinks}
            posts={posts}
            postsHeadline={postsHeadline}
            ctaButton={ctaButton}
            hasStats={hasStats}
            hasSocialLinks={hasSocialLinks}
            hasPosts={hasPosts}
          />
        )}
      </div>

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </section>
  )
}

interface LayoutProps {
  headline: string
  description?: string
  stats: Array<{ value: string; label: string }>
  memberCount?: string
  memberCountLabel: string
  socialLinks: Array<{ platform: string; url: string }>
  posts: CommunityPost[]
  postsHeadline: string
  ctaButton?: ButtonConfig
  hasStats: boolean
  hasSocialLinks: boolean
  hasPosts: boolean
}

/**
 * Centered layout variant
 */
function CenteredLayout({
  headline,
  description,
  stats,
  memberCount,
  memberCountLabel,
  socialLinks,
  posts,
  postsHeadline,
  ctaButton,
  hasStats,
  hasSocialLinks,
  hasPosts,
}: LayoutProps) {
  return (
    <>
      {/* Header */}
      <div className="mb-12 text-center">
        <div className="animate-fade-in-up mb-4 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--portal-primary))]/10 px-4 py-2 text-sm font-medium text-[hsl(var(--portal-primary))]">
          <Users className="h-4 w-4" />
          Community
        </div>
        <h2
          className="animate-fade-in-up text-3xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-4xl"
          style={{ animationDelay: '50ms' }}
        >
          {headline}
        </h2>
        {description && (
          <p
            className="animate-fade-in-up mx-auto mt-4 max-w-2xl text-lg text-[hsl(var(--portal-muted-foreground))]"
            style={{ animationDelay: '100ms' }}
          >
            {description}
          </p>
        )}
      </div>

      {/* Stats */}
      {hasStats && (
        <div className="mb-12 flex flex-wrap items-center justify-center gap-8 lg:gap-16">
          {memberCount && (
            <StatItem
              value={memberCount}
              label={memberCountLabel}
              icon="Users"
              delay={150}
            />
          )}
          {stats.map((stat, index) => (
            <StatItem
              key={stat.label}
              value={stat.value}
              label={stat.label}
              delay={150 + (index + 1) * 50}
            />
          ))}
        </div>
      )}

      {/* Social Links */}
      {hasSocialLinks && (
        <div
          className="animate-fade-in-up mb-12 flex flex-wrap items-center justify-center gap-4"
          style={{ animationDelay: '250ms' }}
        >
          {socialLinks.map((social) => (
            <SocialButton key={social.platform} platform={social.platform} url={social.url} />
          ))}
        </div>
      )}

      {/* Community Posts Preview */}
      {hasPosts && (
        <div className="mb-10">
          <h3
            className="animate-fade-in-up mb-6 text-center text-lg font-semibold text-[hsl(var(--portal-foreground))]"
            style={{ animationDelay: '300ms' }}
          >
            {postsHeadline}
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {posts.slice(0, 3).map((post, index) => (
              <PostCard key={post.id} post={post} delay={350 + index * 75} />
            ))}
          </div>
        </div>
      )}

      {/* CTA Button */}
      {ctaButton && (
        <div
          className="animate-fade-in-up text-center"
          style={{ animationDelay: '450ms' }}
        >
          <Link
            href={ctaButton.href}
            className={cn(
              'group inline-flex items-center gap-3 rounded-lg px-8 py-4',
              'bg-[hsl(var(--portal-primary))] text-white',
              'font-semibold transition-all duration-300',
              'hover:bg-[hsl(var(--portal-primary))]/90 hover:-translate-y-0.5 hover:shadow-lg'
            )}
            {...(ctaButton.openInNewTab && { target: '_blank', rel: 'noopener noreferrer' })}
          >
            {ctaButton.text}
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      )}
    </>
  )
}

/**
 * Split layout variant
 */
function SplitLayout({
  headline,
  description,
  stats,
  memberCount,
  memberCountLabel,
  socialLinks,
  posts,
  postsHeadline,
  ctaButton,
  hasStats,
  hasSocialLinks,
  hasPosts,
}: LayoutProps) {
  return (
    <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
      {/* Left: Info */}
      <div>
        <div className="animate-fade-in-up mb-4 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--portal-primary))]/10 px-4 py-2 text-sm font-medium text-[hsl(var(--portal-primary))]">
          <Users className="h-4 w-4" />
          Community
        </div>
        <h2
          className="animate-fade-in-up text-3xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-4xl"
          style={{ animationDelay: '50ms' }}
        >
          {headline}
        </h2>
        {description && (
          <p
            className="animate-fade-in-up mt-4 text-lg text-[hsl(var(--portal-muted-foreground))]"
            style={{ animationDelay: '100ms' }}
          >
            {description}
          </p>
        )}

        {/* Stats */}
        {hasStats && (
          <div className="mt-8 flex flex-wrap gap-6">
            {memberCount && (
              <StatItem
                value={memberCount}
                label={memberCountLabel}
                icon="Users"
                delay={150}
                compact
              />
            )}
            {stats.map((stat, index) => (
              <StatItem
                key={stat.label}
                value={stat.value}
                label={stat.label}
                delay={150 + (index + 1) * 50}
                compact
              />
            ))}
          </div>
        )}

        {/* Social Links */}
        {hasSocialLinks && (
          <div
            className="animate-fade-in-up mt-8 flex flex-wrap gap-3"
            style={{ animationDelay: '250ms' }}
          >
            {socialLinks.map((social) => (
              <SocialButton key={social.platform} platform={social.platform} url={social.url} />
            ))}
          </div>
        )}

        {/* CTA Button */}
        {ctaButton && (
          <div
            className="animate-fade-in-up mt-8"
            style={{ animationDelay: '300ms' }}
          >
            <Link
              href={ctaButton.href}
              className={cn(
                'group inline-flex items-center gap-3 rounded-lg px-8 py-4',
                'bg-[hsl(var(--portal-primary))] text-white',
                'font-semibold transition-all duration-300',
                'hover:bg-[hsl(var(--portal-primary))]/90 hover:-translate-y-0.5 hover:shadow-lg'
              )}
              {...(ctaButton.openInNewTab && { target: '_blank', rel: 'noopener noreferrer' })}
            >
              {ctaButton.text}
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        )}
      </div>

      {/* Right: Posts */}
      {hasPosts && (
        <div>
          <h3
            className="animate-fade-in-up mb-6 text-lg font-semibold text-[hsl(var(--portal-foreground))]"
            style={{ animationDelay: '150ms' }}
          >
            {postsHeadline}
          </h3>
          <div className="space-y-4">
            {posts.slice(0, 3).map((post, index) => (
              <PostCard key={post.id} post={post} delay={200 + index * 75} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Stat item component
 */
function StatItem({
  value,
  label,
  icon,
  delay,
  compact = false,
}: {
  value: string
  label: string
  icon?: string
  delay: number
  compact?: boolean
}) {
  return (
    <div
      className={cn('animate-fade-in-up', compact ? 'text-left' : 'text-center')}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2">
        {icon && (
          <LucideIcon name={icon} className="h-5 w-5 text-[hsl(var(--portal-primary))]" />
        )}
        <span className="text-3xl font-bold text-[hsl(var(--portal-foreground))]">
          {value}
        </span>
      </div>
      <span className="text-sm text-[hsl(var(--portal-muted-foreground))]">{label}</span>
    </div>
  )
}

/**
 * Social button component
 */
function SocialButton({ platform, url }: { platform: string; url: string }) {
  const iconName = getSocialPlatformIcon(platform)

  return (
    <Link
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'inline-flex items-center gap-2 rounded-lg px-4 py-2',
        'border border-[hsl(var(--portal-border))]',
        'text-[hsl(var(--portal-foreground))]',
        'transition-all duration-200',
        'hover:border-[hsl(var(--portal-primary))] hover:text-[hsl(var(--portal-primary))]'
      )}
    >
      <LucideIcon name={iconName} className="h-5 w-5" />
      <span className="text-sm font-medium capitalize">{platform}</span>
      <ExternalLink className="h-3 w-3 opacity-50" />
    </Link>
  )
}

/**
 * Community post card component
 */
function PostCard({ post, delay }: { post: CommunityPost; delay: number }) {
  return (
    <div
      className={cn(
        'animate-fade-in-up rounded-xl p-4',
        'border border-[hsl(var(--portal-border))]',
        'bg-[hsl(var(--portal-card))]',
        'transition-all duration-300 hover:shadow-md'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[hsl(var(--portal-muted))]">
          {post.avatar?.src ? (
            <Image
              src={post.avatar.src}
              alt={post.avatar.alt || post.author}
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-sm font-medium text-[hsl(var(--portal-muted-foreground))]">
              {post.author.charAt(0).toUpperCase()}
            </span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-[hsl(var(--portal-foreground))]">
              {post.author}
            </span>
            {post.timestamp && (
              <span className="text-xs text-[hsl(var(--portal-muted-foreground))]">
                {post.timestamp}
              </span>
            )}
          </div>
          <p className="mt-1 line-clamp-2 text-sm text-[hsl(var(--portal-muted-foreground))]">
            {post.content}
          </p>

          {/* Engagement */}
          {(post.likes !== undefined || post.comments !== undefined) && (
            <div className="mt-2 flex items-center gap-4 text-xs text-[hsl(var(--portal-muted-foreground))]">
              {post.likes !== undefined && (
                <span className="flex items-center gap-1">
                  <Heart className="h-3 w-3" />
                  {post.likes}
                </span>
              )}
              {post.comments !== undefined && (
                <span className="flex items-center gap-1">
                  <MessageCircle className="h-3 w-3" />
                  {post.comments}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
