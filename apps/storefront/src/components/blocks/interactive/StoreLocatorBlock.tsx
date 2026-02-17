'use client'

/**
 * Store Locator Block Component
 *
 * Display store locations with search, filters,
 * and an optional map view placeholder.
 */

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { cn } from '@cgk-platform/ui'
import type { BlockProps, StoreLocatorConfig, StoreLocation } from '../types'
import { LucideIcon } from '../icons'

/**
 * Store card component
 */
function StoreCard({
  store,
  isSelected,
  onSelect,
}: {
  store: StoreLocation
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <div
      onClick={onSelect}
      className={cn(
        'cursor-pointer rounded-xl p-4 transition-all duration-200',
        'border',
        isSelected
          ? 'border-[hsl(var(--portal-primary))] bg-[hsl(var(--portal-primary))]/5 shadow-md'
          : 'border-[hsl(var(--portal-border))] bg-[hsl(var(--portal-card))] hover:border-[hsl(var(--portal-primary))]/50'
      )}
    >
      <div className="flex gap-4">
        {/* Image */}
        {store.image?.src ? (
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
            <Image
              src={store.image.src}
              alt={store.image.alt || store.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          </div>
        ) : (
          <div
            className={cn(
              'flex h-20 w-20 shrink-0 items-center justify-center rounded-lg',
              'bg-[hsl(var(--portal-primary))]/10'
            )}
          >
            <LucideIcon
              name="MapPin"
              className="h-8 w-8 text-[hsl(var(--portal-primary))]"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-[hsl(var(--portal-foreground))] truncate">
            {store.name}
          </h3>
          <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
            {store.address}
          </p>
          <p className="text-sm text-[hsl(var(--portal-muted-foreground))]">
            {store.city}
            {store.state && `, ${store.state}`} {store.zipCode}
          </p>
        </div>
      </div>

      {/* Contact info */}
      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        {store.phone && (
          <a
            href={`tel:${store.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-[hsl(var(--portal-primary))] hover:underline"
          >
            <LucideIcon name="Phone" className="h-4 w-4" />
            {store.phone}
          </a>
        )}
        {store.email && (
          <a
            href={`mailto:${store.email}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 text-[hsl(var(--portal-primary))] hover:underline"
          >
            <LucideIcon name="Mail" className="h-4 w-4" />
            Email
          </a>
        )}
      </div>

      {/* Hours */}
      {store.hours && store.hours.length > 0 && (
        <div className="mt-3 border-t border-[hsl(var(--portal-border))] pt-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[hsl(var(--portal-muted-foreground))]">
            Store Hours
          </p>
          <div className="text-sm text-[hsl(var(--portal-muted-foreground))]">
            {store.hours.map((hour, i) => (
              <p key={i}>{hour}</p>
            ))}
          </div>
        </div>
      )}

      {/* Directions button */}
      {store.coordinates && (
        <a
          href={`https://www.google.com/maps/dir/?api=1&destination=${store.coordinates.lat},${store.coordinates.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'mt-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5',
            'bg-[hsl(var(--portal-primary))] text-[hsl(var(--portal-primary-foreground))]',
            'text-sm font-medium transition-all duration-200',
            'hover:bg-[hsl(var(--portal-primary))]/90'
          )}
        >
          <LucideIcon name="Navigation" className="h-4 w-4" />
          Get Directions
        </a>
      )}
    </div>
  )
}

/**
 * Map placeholder component
 */
function MapPlaceholder({
  selectedStore,
}: {
  selectedStore?: StoreLocation
}) {
  return (
    <div
      className={cn(
        'relative flex h-full min-h-[400px] items-center justify-center rounded-xl',
        'bg-[hsl(var(--portal-muted))]/30',
        'border border-[hsl(var(--portal-border))]'
      )}
    >
      {/* Placeholder content */}
      <div className="text-center">
        <div
          className={cn(
            'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full',
            'bg-[hsl(var(--portal-primary))]/10'
          )}
        >
          <LucideIcon
            name="Map"
            className="h-8 w-8 text-[hsl(var(--portal-primary))]"
          />
        </div>

        {selectedStore ? (
          <>
            <p className="font-semibold text-[hsl(var(--portal-foreground))]">
              {selectedStore.name}
            </p>
            <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
              {selectedStore.address}, {selectedStore.city}
            </p>
            {selectedStore.coordinates && (
              <p className="mt-2 text-xs text-[hsl(var(--portal-muted-foreground))]">
                {selectedStore.coordinates.lat.toFixed(4)}, {selectedStore.coordinates.lng.toFixed(4)}
              </p>
            )}
          </>
        ) : (
          <>
            <p className="font-medium text-[hsl(var(--portal-foreground))]">
              Interactive Map
            </p>
            <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
              Select a store to view on map
            </p>
          </>
        )}
      </div>

      {/* Map attribution note */}
      <div className="absolute bottom-4 left-4 text-xs text-[hsl(var(--portal-muted-foreground))]">
        Map integration available with Google Maps or Mapbox
      </div>
    </div>
  )
}

/**
 * Store Locator Block Component
 */
export function StoreLocatorBlock({ block, className }: BlockProps<StoreLocatorConfig>) {
  const {
    headline,
    subheadline,
    locations,
    showMap = true,
    showSearch = true,
    layout = 'map-left',
    backgroundColor,
  } = block.config

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null)

  // Filter locations based on search
  const filteredLocations = useMemo(() => {
    if (!searchQuery.trim()) return locations

    const query = searchQuery.toLowerCase()
    return locations.filter(
      (store) =>
        store.name.toLowerCase().includes(query) ||
        store.city.toLowerCase().includes(query) ||
        store.address.toLowerCase().includes(query) ||
        (store.state && store.state.toLowerCase().includes(query)) ||
        (store.zipCode && store.zipCode.includes(query))
    )
  }, [locations, searchQuery])

  const selectedStore = locations.find((s) => s.id === selectedStoreId)

  const isMapFirst = layout === 'map-left' || layout === 'map-top'
  const isVertical = layout === 'map-top'

  return (
    <section
      className={cn('py-20 sm:py-28', className)}
      style={{ backgroundColor: backgroundColor || 'transparent' }}
    >
      <div className="mx-auto max-w-7xl px-6 sm:px-8">
        {/* Header */}
        {(headline || subheadline) && (
          <div className="mb-12 text-center">
            {subheadline && (
              <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-[hsl(var(--portal-primary))]">
                {subheadline}
              </p>
            )}
            {headline && (
              <h2 className="text-3xl font-bold tracking-tight text-[hsl(var(--portal-foreground))] sm:text-4xl">
                {headline}
              </h2>
            )}
          </div>
        )}

        {/* Search */}
        {showSearch && (
          <div className="mx-auto mb-8 max-w-md">
            <div className="relative">
              <LucideIcon
                name="Search"
                className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[hsl(var(--portal-muted-foreground))]"
              />
              <input
                type="text"
                placeholder="Search by city, address, or zip code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  'w-full rounded-xl py-3 pl-12 pr-4',
                  'bg-[hsl(var(--portal-card))]',
                  'border border-[hsl(var(--portal-border))]',
                  'text-[hsl(var(--portal-foreground))]',
                  'placeholder:text-[hsl(var(--portal-muted-foreground))]',
                  'transition-all duration-200',
                  'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--portal-primary))]',
                  'hover:border-[hsl(var(--portal-primary))]/50'
                )}
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div
          className={cn(
            'gap-8',
            showMap
              ? isVertical
                ? 'flex flex-col'
                : 'grid lg:grid-cols-2'
              : ''
          )}
        >
          {/* Map */}
          {showMap && isMapFirst && <MapPlaceholder selectedStore={selectedStore} />}

          {/* Store list */}
          <div
            className={cn(
              'space-y-4',
              showMap && !isVertical && 'max-h-[600px] overflow-y-auto pr-2'
            )}
          >
            {filteredLocations.length > 0 ? (
              filteredLocations.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  isSelected={selectedStoreId === store.id}
                  onSelect={() => setSelectedStoreId(store.id)}
                />
              ))
            ) : (
              <div className="rounded-xl bg-[hsl(var(--portal-muted))]/30 p-8 text-center">
                <LucideIcon
                  name="MapPinOff"
                  className="mx-auto mb-4 h-10 w-10 text-[hsl(var(--portal-muted-foreground))]"
                />
                <p className="font-medium text-[hsl(var(--portal-foreground))]">
                  No stores found
                </p>
                <p className="mt-1 text-sm text-[hsl(var(--portal-muted-foreground))]">
                  Try adjusting your search criteria
                </p>
              </div>
            )}
          </div>

          {/* Map (after list if layout is map-right) */}
          {showMap && !isMapFirst && <MapPlaceholder selectedStore={selectedStore} />}
        </div>

        {/* Store count */}
        <div className="mt-8 text-center text-sm text-[hsl(var(--portal-muted-foreground))]">
          Showing {filteredLocations.length} of {locations.length} locations
        </div>
      </div>
    </section>
  )
}
