'use client'

/**
 * Team Grid Block Component
 *
 * Display team members in a responsive grid with avatars,
 * roles, bios, and social links.
 */

import Image from 'next/image'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, TeamGridConfig, TeamMember } from '../types'
import { LucideIcon, getSocialIcon } from '../icons'

/**
 * Column class mapping
 */
const columnClasses = {
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
}

/**
 * Team member card component
 */
function TeamMemberCard({
  member,
  index,
  showBio,
  showSocialLinks,
}: {
  member: TeamMember
  index: number
  showBio: boolean
  showSocialLinks: boolean
}) {
  return (
    <div
      className={cn(
        'group relative rounded-2xl p-6 transition-all duration-300',
        'bg-[hsl(var(--portal-card))]',
        'border border-[hsl(var(--portal-border))]',
        'hover:shadow-xl hover:-translate-y-1',
        'animate-fade-in-up'
      )}
      style={{ animationDelay: `${index * 100}ms` }}
    >
      {/* Avatar */}
      <div className="relative mx-auto mb-6 h-32 w-32 overflow-hidden rounded-full">
        {member.avatar?.src ? (
          <Image
            src={member.avatar.src}
            alt={member.avatar.alt || member.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="128px"
          />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center',
              'bg-gradient-to-br from-[hsl(var(--portal-primary))] to-[hsl(var(--portal-accent))]',
              'text-4xl font-bold text-white'
            )}
          >
            {member.name.charAt(0).toUpperCase()}
          </div>
        )}
        {/* Decorative ring on hover */}
        <div
          className={cn(
            'absolute inset-0 rounded-full',
            'border-2 border-[hsl(var(--portal-primary))]/0 transition-all duration-300',
            'group-hover:border-[hsl(var(--portal-primary))]/50 group-hover:scale-105'
          )}
        />
      </div>

      {/* Name */}
      <h3 className="text-center text-xl font-semibold text-[hsl(var(--portal-foreground))]">
        {member.name}
      </h3>

      {/* Role */}
      <p className="mt-1 text-center text-[hsl(var(--portal-primary))]">{member.role}</p>

      {/* Bio */}
      {showBio && member.bio && (
        <p className="mt-4 text-center text-sm text-[hsl(var(--portal-muted-foreground))] leading-relaxed">
          {member.bio}
        </p>
      )}

      {/* Social Links */}
      {showSocialLinks && member.socialLinks && member.socialLinks.length > 0 && (
        <div className="mt-6 flex justify-center gap-3">
          {member.socialLinks.map((link) => (
            <a
              key={link.platform}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full',
                'bg-[hsl(var(--portal-muted))]',
                'text-[hsl(var(--portal-muted-foreground))]',
                'transition-all duration-200',
                'hover:bg-[hsl(var(--portal-primary))] hover:text-white',
                'hover:scale-110'
              )}
              aria-label={`${member.name} on ${link.platform}`}
            >
              <LucideIcon name={getSocialIcon(link.platform)} className="h-4 w-4" />
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * Team member list item component
 */
function TeamMemberListItem({
  member,
  index,
  showBio,
  showSocialLinks,
}: {
  member: TeamMember
  index: number
  showBio: boolean
  showSocialLinks: boolean
}) {
  return (
    <div
      className={cn(
        'group flex gap-6 rounded-2xl p-6 transition-all duration-300',
        'bg-[hsl(var(--portal-card))]',
        'border border-[hsl(var(--portal-border))]',
        'hover:shadow-lg',
        'animate-fade-in-up'
      )}
      style={{ animationDelay: `${index * 75}ms` }}
    >
      {/* Avatar */}
      <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl">
        {member.avatar?.src ? (
          <Image
            src={member.avatar.src}
            alt={member.avatar.alt || member.name}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div
            className={cn(
              'flex h-full w-full items-center justify-center',
              'bg-gradient-to-br from-[hsl(var(--portal-primary))] to-[hsl(var(--portal-accent))]',
              'text-3xl font-bold text-white'
            )}
          >
            {member.name.charAt(0).toUpperCase()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1">
        <h3 className="text-xl font-semibold text-[hsl(var(--portal-foreground))]">
          {member.name}
        </h3>
        <p className="text-[hsl(var(--portal-primary))]">{member.role}</p>

        {showBio && member.bio && (
          <p className="mt-3 text-sm text-[hsl(var(--portal-muted-foreground))] leading-relaxed">
            {member.bio}
          </p>
        )}

        {/* Social Links */}
        {showSocialLinks && member.socialLinks && member.socialLinks.length > 0 && (
          <div className="mt-4 flex gap-2">
            {member.socialLinks.map((link) => (
              <a
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-lg',
                  'bg-[hsl(var(--portal-muted))]',
                  'text-[hsl(var(--portal-muted-foreground))]',
                  'transition-all duration-200',
                  'hover:bg-[hsl(var(--portal-primary))] hover:text-white'
                )}
                aria-label={`${member.name} on ${link.platform}`}
              >
                <LucideIcon name={getSocialIcon(link.platform)} className="h-4 w-4" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * Team Grid Block Component
 */
export function TeamGridBlock({ block, className }: BlockProps<TeamGridConfig>) {
  const {
    headline,
    subheadline,
    description,
    members,
    columns = 3,
    layout = 'grid',
    showBio = true,
    showSocialLinks = true,
    backgroundColor,
  } = block.config

  return (
    <section
      className={cn('py-20 sm:py-28', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Header */}
        {(headline || subheadline || description) && (
          <div className="mx-auto mb-16 max-w-3xl text-center">
            {subheadline && (
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[hsl(var(--portal-primary))]">
                {subheadline}
              </p>
            )}
            {headline && (
              <h2 className="text-3xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-4xl lg:text-5xl">
                {headline}
              </h2>
            )}
            {description && (
              <p className="mt-4 text-lg text-[hsl(var(--portal-muted-foreground))]">
                {description}
              </p>
            )}
          </div>
        )}

        {/* Team Members */}
        {layout === 'grid' ? (
          <div className={cn('grid gap-8', columnClasses[columns])}>
            {members.map((member, index) => (
              <TeamMemberCard
                key={member.id}
                member={member}
                index={index}
                showBio={showBio}
                showSocialLinks={showSocialLinks}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {members.map((member, index) => (
              <TeamMemberListItem
                key={member.id}
                member={member}
                index={index}
                showBio={showBio}
                showSocialLinks={showSocialLinks}
              />
            ))}
          </div>
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
