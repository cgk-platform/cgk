'use client'

/**
 * Image + Text Block Component
 *
 * Split layout with image on one side and text content on the other.
 * Supports left/right image positioning and vertical alignment options.
 */

import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, ImageTextConfig } from '../types'
import { LucideIcon } from '../icons'

/**
 * Vertical alignment class mapping
 */
const alignmentClasses = {
  top: 'items-start',
  center: 'items-center',
  bottom: 'items-end',
}

/**
 * Image + Text Block Component
 */
export function ImageTextBlock({ block, className }: BlockProps<ImageTextConfig>) {
  const {
    headline,
    description,
    image,
    imagePosition = 'left',
    button,
    backgroundColor,
    verticalAlign = 'center',
  } = block.config

  const isImageRight = imagePosition === 'right'

  return (
    <section
      className={cn('py-20 sm:py-28', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        <div
          className={cn(
            'grid gap-12 lg:grid-cols-2 lg:gap-16',
            alignmentClasses[verticalAlign]
          )}
        >
          {/* Image */}
          <div
            className={cn(
              'relative',
              isImageRight && 'lg:order-2'
            )}
          >
            {/* Decorative background */}
            <div
              className={cn(
                'absolute -inset-4 rounded-3xl bg-gradient-to-br opacity-50',
                'from-[hsl(var(--portal-primary))]/10 to-transparent',
                isImageRight ? 'rotate-2' : '-rotate-2'
              )}
            />

            {/* Image container */}
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-2xl">
              {image?.src ? (
                <Image
                  src={image.src}
                  alt={image.alt || headline}
                  fill
                  className="object-cover transition-transform duration-500 hover:scale-105"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  priority={image.priority}
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[hsl(var(--portal-muted))]">
                  <LucideIcon
                    name="Image"
                    className="h-16 w-16 text-[hsl(var(--portal-muted-foreground))]"
                  />
                </div>
              )}

              {/* Overlay gradient */}
              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-t from-black/20 to-transparent',
                  'opacity-0 transition-opacity duration-300 hover:opacity-100'
                )}
              />
            </div>

            {/* Decorative corner element */}
            <div
              className={cn(
                'absolute -bottom-6 h-12 w-12 rounded-xl',
                'bg-[hsl(var(--portal-primary))]',
                isImageRight ? '-left-6' : '-right-6'
              )}
            />
          </div>

          {/* Content */}
          <div className={cn('flex flex-col justify-center', isImageRight && 'lg:order-1')}>
            {/* Headline */}
            <h2
              className={cn(
                'text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl',
                'text-[hsl(var(--portal-foreground))]',
                'animate-fade-in-up'
              )}
              style={{ animationDelay: '0ms' }}
            >
              {headline}
            </h2>

            {/* Description */}
            {description && (
              <p
                className={cn(
                  'mt-6 text-lg leading-relaxed',
                  'text-[hsl(var(--portal-muted-foreground))]',
                  'animate-fade-in-up'
                )}
                style={{ animationDelay: '100ms' }}
              >
                {description}
              </p>
            )}

            {/* Button */}
            {button && (
              <div
                className="mt-10 animate-fade-in-up"
                style={{ animationDelay: '200ms' }}
              >
                <Link
                  href={button.href}
                  className={cn(
                    'group inline-flex items-center gap-3',
                    'font-semibold transition-all duration-300',
                    button.variant === 'primary' || !button.variant
                      ? cn(
                          'rounded-lg px-6 py-3',
                          'bg-[hsl(var(--portal-primary))] text-white',
                          'hover:bg-[hsl(var(--portal-primary))]/90',
                          'shadow-lg hover:shadow-xl hover:-translate-y-0.5'
                        )
                      : cn(
                          'text-[hsl(var(--portal-primary))]',
                          'hover:underline underline-offset-4'
                        )
                  )}
                  {...(button.openInNewTab && {
                    target: '_blank',
                    rel: 'noopener noreferrer',
                  })}
                >
                  {button.text}
                  <LucideIcon
                    name="ArrowRight"
                    className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  />
                </Link>
              </div>
            )}
          </div>
        </div>
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
