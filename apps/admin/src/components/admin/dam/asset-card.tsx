'use client'

import { cn } from '@cgk/ui'
import {
  Check,
  Download,
  Eye,
  Heart,
  MoreHorizontal,
  Star,
  Trash2,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
} from 'lucide-react'
import Image from 'next/image'
import { useState } from 'react'

import type { AssetRow } from '@cgk/dam'

export interface AssetCardProps {
  asset: AssetRow
  isSelected?: boolean
  onSelect?: (assetId: string, selected: boolean) => void
  onClick?: (asset: AssetRow) => void
  onFavorite?: (assetId: string) => void
  onDelete?: (assetId: string) => void
  onDownload?: (assetId: string) => void
  viewMode?: 'grid' | 'list'
  showCheckbox?: boolean
}

const assetTypeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  image: FileImage,
  video: FileVideo,
  audio: FileAudio,
  document: FileText,
}

const assetTypeColors: Record<string, string> = {
  image: 'bg-teal-500/10 text-teal-500',
  video: 'bg-violet-500/10 text-violet-500',
  audio: 'bg-amber-500/10 text-amber-500',
  document: 'bg-slate-500/10 text-slate-500',
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '--'
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

function formatDimensions(width: number | null, height: number | null): string {
  if (!width || !height) return '--'
  return `${width} x ${height}`
}

export function AssetCard({
  asset,
  isSelected = false,
  onSelect,
  onClick,
  onFavorite,
  onDelete,
  onDownload,
  viewMode = 'grid',
  showCheckbox = true,
}: AssetCardProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)

  const TypeIcon = assetTypeIcons[asset.asset_type] || FileImage
  const typeColor = assetTypeColors[asset.asset_type] || 'bg-slate-500/10 text-slate-500'

  const handleCardClick = () => {
    if (onClick) {
      onClick(asset)
    }
  }

  const handleSelectClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onSelect) {
      onSelect(asset.id, !isSelected)
    }
  }

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onFavorite) {
      onFavorite(asset.id)
    }
  }

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDelete) {
      onDelete(asset.id)
    }
  }

  const handleDownloadClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onDownload) {
      onDownload(asset.id)
    }
  }

  if (viewMode === 'list') {
    return (
      <div
        className={cn(
          'group flex items-center gap-4 rounded-lg border p-3 transition-all cursor-pointer',
          'hover:border-amber-500/50 hover:bg-slate-900/50',
          isSelected && 'border-amber-500 bg-amber-500/5'
        )}
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Checkbox */}
        {showCheckbox && (
          <button
            onClick={handleSelectClick}
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
              isSelected
                ? 'border-amber-500 bg-amber-500'
                : 'border-slate-600 hover:border-amber-500/50'
            )}
          >
            {isSelected && <Check className="h-3 w-3 text-slate-900" />}
          </button>
        )}

        {/* Thumbnail */}
        <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-md bg-slate-800">
          {asset.thumbnail_url && !imageError ? (
            <Image
              src={asset.thumbnail_url}
              alt={asset.title}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className={cn('flex h-full w-full items-center justify-center', typeColor)}>
              <TypeIcon className="h-5 w-5" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-slate-100">{asset.title}</p>
            {asset.is_favorite && (
              <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
            )}
            {asset.is_featured && (
              <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-3 text-xs text-slate-500">
            <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium uppercase', typeColor)}>
              {asset.asset_type}
            </span>
            <span>{formatFileSize(asset.file_size_bytes)}</span>
            {(asset.width || asset.height) && (
              <span>{formatDimensions(asset.width, asset.height)}</span>
            )}
          </div>
        </div>

        {/* Tags */}
        <div className="hidden flex-shrink-0 gap-1 lg:flex">
          {(asset.manual_tags || []).slice(0, 3).map((tag: string) => (
            <span
              key={tag}
              className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400"
            >
              {tag}
            </span>
          ))}
          {(asset.manual_tags || []).length > 3 && (
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
              +{(asset.manual_tags || []).length - 3}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className={cn(
          'flex items-center gap-1 opacity-0 transition-opacity',
          isHovered && 'opacity-100'
        )}>
          <button
            onClick={handleDownloadClick}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <Download className="h-4 w-4" />
          </button>
          <button
            onClick={handleFavoriteClick}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-rose-400"
          >
            <Heart className={cn('h-4 w-4', asset.is_favorite && 'fill-rose-500 text-rose-500')} />
          </button>
          <button
            onClick={handleDeleteClick}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-red-400"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-xl border transition-all',
        'hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/5',
        isSelected && 'border-amber-500 ring-2 ring-amber-500/20'
      )}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Selection indicator - film strip inspired corner tabs */}
      {isSelected && (
        <>
          <div className="absolute left-0 top-0 h-8 w-8 overflow-hidden">
            <div className="absolute -left-4 -top-4 h-8 w-8 rotate-45 bg-amber-500" />
          </div>
          <div className="absolute bottom-0 right-0 h-8 w-8 overflow-hidden">
            <div className="absolute -bottom-4 -right-4 h-8 w-8 rotate-45 bg-amber-500" />
          </div>
        </>
      )}

      {/* Thumbnail */}
      <div className="relative aspect-square bg-slate-900">
        {asset.thumbnail_url && !imageError ? (
          <Image
            src={asset.thumbnail_url}
            alt={asset.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className={cn('flex h-full w-full items-center justify-center', typeColor)}>
            <TypeIcon className="h-12 w-12" />
          </div>
        )}

        {/* Hover overlay */}
        <div className={cn(
          'absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent',
          'opacity-0 transition-opacity duration-200',
          isHovered && 'opacity-100'
        )}>
          {/* Quick actions */}
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); onClick?.(asset) }}
                className="rounded-lg bg-slate-800/90 p-2 text-slate-300 backdrop-blur-sm hover:bg-slate-700 hover:text-white"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={handleDownloadClick}
                className="rounded-lg bg-slate-800/90 p-2 text-slate-300 backdrop-blur-sm hover:bg-slate-700 hover:text-white"
              >
                <Download className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={handleFavoriteClick}
              className="rounded-lg bg-slate-800/90 p-2 backdrop-blur-sm hover:bg-slate-700"
            >
              <Heart className={cn(
                'h-4 w-4',
                asset.is_favorite
                  ? 'fill-rose-500 text-rose-500'
                  : 'text-slate-300 hover:text-rose-400'
              )} />
            </button>
          </div>
        </div>

        {/* Checkbox */}
        {showCheckbox && (
          <button
            onClick={handleSelectClick}
            className={cn(
              'absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md border-2 transition-all',
              isSelected
                ? 'border-amber-500 bg-amber-500 opacity-100'
                : 'border-white/50 bg-slate-900/50 opacity-0 backdrop-blur-sm group-hover:opacity-100',
              isHovered && 'opacity-100'
            )}
          >
            {isSelected && <Check className="h-4 w-4 text-slate-900" />}
          </button>
        )}

        {/* Type badge */}
        <div className={cn(
          'absolute right-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide backdrop-blur-sm',
          typeColor
        )}>
          {asset.asset_type}
        </div>

        {/* Featured badge */}
        {asset.is_featured && (
          <div className="absolute left-2 bottom-2 flex items-center gap-1 rounded-md bg-amber-500/90 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-900 backdrop-blur-sm">
            <Star className="h-3 w-3" />
            Featured
          </div>
        )}
      </div>

      {/* Info footer */}
      <div className="border-t border-slate-800 bg-slate-950 p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-slate-100">{asset.title}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {formatFileSize(asset.file_size_bytes)}
              {asset.width && asset.height && ` / ${formatDimensions(asset.width, asset.height)}`}
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation() }}
            className="rounded-md p-1 text-slate-500 hover:bg-slate-800 hover:text-slate-300"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Tags preview */}
        {(asset.manual_tags || []).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {(asset.manual_tags || []).slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400"
              >
                {tag}
              </span>
            ))}
            {(asset.manual_tags || []).length > 2 && (
              <span className="rounded-full bg-slate-800/80 px-2 py-0.5 text-[10px] text-slate-400">
                +{(asset.manual_tags || []).length - 2}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
