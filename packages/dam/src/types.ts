/**
 * Digital Asset Management Types
 * Core type definitions for DAM system
 */

// Asset Types
export type AssetType = 'image' | 'video' | 'audio' | 'document'

export type QualityVariant = 'master' | 'full' | 'web' | 'thumbnail' | 'proxy'

export type RightsStatus = 'active' | 'pending' | 'expired' | 'revoked'

export type SourceType = 'upload' | 'gdrive' | 'api' | 'import'

export interface Asset {
  id: string
  tenant_id: string
  user_id: string
  title: string
  description: string | null
  asset_type: AssetType
  mime_type: string
  file_extension: string | null
  file_url: string
  thumbnail_url: string | null
  file_size_bytes: number | null
  width: number | null
  height: number | null
  duration_seconds: number | null
  quality_variant: QualityVariant
  parent_asset_id: string | null
  asset_group_id: string | null
  version_number: number
  mux_asset_id: string | null
  mux_playback_id: string | null
  metadata: Record<string, unknown>
  exif_data: Record<string, unknown> | null
  manual_tags: string[]
  ai_tags: string[]
  ai_objects: string[]
  ai_scenes: string[]
  ai_visual_description: string | null
  content_tags: string[]
  product_tags: string[]
  rights_status: RightsStatus
  rights_expires_at: string | null
  rights_holder: string | null
  rights_notes: string | null
  is_active: boolean
  is_archived: boolean
  is_favorite: boolean
  is_featured: boolean
  view_count: number
  download_count: number
  source_type: SourceType | null
  source_file_id: string | null
  source_folder_path: string | null
  file_hash: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface AssetRow extends Asset {
  collection_names?: string[]
}

export interface CreateAssetInput {
  title: string
  description?: string | null
  asset_type: AssetType
  mime_type: string
  file_extension?: string | null
  file_url: string
  thumbnail_url?: string | null
  file_size_bytes?: number | null
  width?: number | null
  height?: number | null
  duration_seconds?: number | null
  quality_variant?: QualityVariant
  parent_asset_id?: string | null
  asset_group_id?: string | null
  metadata?: Record<string, unknown>
  exif_data?: Record<string, unknown> | null
  manual_tags?: string[]
  content_tags?: string[]
  product_tags?: string[]
  rights_status?: RightsStatus
  rights_expires_at?: string | null
  rights_holder?: string | null
  rights_notes?: string | null
  source_type?: SourceType | null
  source_file_id?: string | null
  source_folder_path?: string | null
  file_hash?: string | null
}

export interface UpdateAssetInput {
  id: string
  title?: string
  description?: string | null
  manual_tags?: string[]
  content_tags?: string[]
  product_tags?: string[]
  rights_status?: RightsStatus
  rights_expires_at?: string | null
  rights_holder?: string | null
  rights_notes?: string | null
  is_active?: boolean
  is_archived?: boolean
  is_favorite?: boolean
  is_featured?: boolean
  metadata?: Record<string, unknown>
}

// Collection Types
export type CollectionType = 'manual' | 'smart'

export interface SmartCollectionRule {
  field: string
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'greater_than' | 'less_than' | 'in'
  value: string | string[] | number | boolean
}

export interface SmartCollectionRules {
  match: 'all' | 'any'
  rules: SmartCollectionRule[]
}

export interface Collection {
  id: string
  tenant_id: string
  user_id: string
  name: string
  description: string | null
  collection_type: CollectionType
  cover_asset_id: string | null
  smart_rules: SmartCollectionRules | null
  is_public: boolean
  sort_order: number
  asset_count: number
  created_at: string
  updated_at: string
}

export interface CreateCollectionInput {
  name: string
  description?: string | null
  collection_type?: CollectionType
  cover_asset_id?: string | null
  smart_rules?: SmartCollectionRules | null
  is_public?: boolean
  sort_order?: number
}

export interface UpdateCollectionInput {
  id: string
  name?: string
  description?: string | null
  cover_asset_id?: string | null
  smart_rules?: SmartCollectionRules | null
  is_public?: boolean
  sort_order?: number
}

// Google Drive Types
export type SyncMode = 'one_way' | 'two_way'

export type SyncStatus = 'pending' | 'imported' | 'skipped' | 'failed' | 'removed'

export interface GDriveConnection {
  id: string
  tenant_id: string
  user_id: string
  name: string
  folder_id: string
  folder_name: string | null
  access_token_encrypted: string
  refresh_token_encrypted: string
  token_expires_at: string | null
  sync_mode: SyncMode
  auto_sync: boolean
  last_sync_at: string | null
  last_sync_status: string | null
  sync_page_token: string | null
  watch_channel_id: string | null
  watch_channel_expiry: string | null
  watch_resource_id: string | null
  is_active: boolean
  needs_reauth: boolean
  last_error: string | null
  created_at: string
  updated_at: string
}

export interface CreateGDriveConnectionInput {
  name: string
  folder_id: string
  folder_name?: string | null
  access_token: string
  refresh_token: string
  token_expires_at?: string | null
  sync_mode?: SyncMode
  auto_sync?: boolean
}

export interface GDriveFileMapping {
  id: string
  tenant_id: string
  connection_id: string
  gdrive_file_id: string
  dam_asset_id: string | null
  gdrive_name: string | null
  gdrive_path: string | null
  gdrive_mime_type: string | null
  gdrive_modified_at: string | null
  sync_status: SyncStatus
  last_sync_at: string | null
  error_message: string | null
}

// Import Queue Types
export type ImportQueueStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed'

export interface ImportQueueItem {
  id: string
  tenant_id: string
  source_type: SourceType
  source_file_id: string | null
  source_folder_path: string | null
  file_name: string
  file_size_bytes: number | null
  mime_type: string | null
  preview_url: string | null
  suggested_title: string | null
  suggested_tags: string[] | null
  suggested_creator_id: string | null
  status: ImportQueueStatus
  assigned_to: string | null
  priority: number
  error_message: string | null
  imported_asset_id: string | null
  created_at: string
  processed_at: string | null
}

export interface CreateImportQueueItemInput {
  source_type: SourceType
  source_file_id?: string | null
  source_folder_path?: string | null
  file_name: string
  file_size_bytes?: number | null
  mime_type?: string | null
  preview_url?: string | null
  suggested_title?: string | null
  suggested_tags?: string[] | null
  suggested_creator_id?: string | null
  priority?: number
}

// Trash Types
export interface TrashItem {
  id: string
  tenant_id: string
  asset_id: string
  asset_data: Asset
  deleted_by: string
  deleted_at: string
  permanent_delete_at: string
}

// Usage and Audit Types
export type UsageAction = 'view' | 'download' | 'export' | 'share'

export interface UsageLog {
  id: string
  tenant_id: string
  asset_id: string
  user_id: string | null
  action: UsageAction
  metadata: Record<string, unknown> | null
  created_at: string
}

export type AuditAction =
  | 'create'
  | 'update'
  | 'delete'
  | 'restore'
  | 'rights_change'
  | 'tag_add'
  | 'tag_remove'
  | 'collection_add'
  | 'collection_remove'

export type AuditEntityType = 'asset' | 'collection' | 'connection'

export interface AuditLog {
  id: string
  tenant_id: string
  user_id: string
  user_name: string | null
  action: AuditAction
  entity_type: AuditEntityType
  entity_id: string
  before_data: Record<string, unknown> | null
  after_data: Record<string, unknown> | null
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

// Search and Filter Types
export interface AssetFilters {
  page: number
  limit: number
  offset: number
  search?: string
  asset_type?: AssetType | AssetType[]
  collection_id?: string
  tags?: string[]
  rights_status?: RightsStatus
  is_archived?: boolean
  is_favorite?: boolean
  is_featured?: boolean
  date_from?: string
  date_to?: string
  sort: string
  dir: 'asc' | 'desc'
}

export interface SearchResult {
  assets: AssetRow[]
  totalCount: number
  facets?: {
    asset_types: { type: AssetType; count: number }[]
    tags: { tag: string; count: number }[]
    collections: { id: string; name: string; count: number }[]
  }
}

// Bulk Operation Types
export type BulkOperation = 'move' | 'tag' | 'delete' | 'archive' | 'unarchive' | 'favorite' | 'unfavorite'

export interface BulkOperationInput {
  operation: BulkOperation
  asset_ids: string[]
  collection_id?: string
  tags_to_add?: string[]
  tags_to_remove?: string[]
}

export interface BulkOperationResult {
  success: boolean
  processed: number
  failed: number
  errors: { asset_id: string; error: string }[]
}

// Storage Provider Types
export interface UploadOptions {
  filename: string
  contentType: string
  folder?: string
  metadata?: Record<string, string>
}

export interface UploadResult {
  url: string
  pathname: string
  contentType: string
  size: number
}

export interface IStorageProvider {
  upload(file: Buffer | Blob, options: UploadOptions): Promise<UploadResult>
  delete(url: string): Promise<boolean>
  getSignedUrl(url: string, expiresIn?: number): Promise<string>
  copy(sourceUrl: string, destination: UploadOptions): Promise<UploadResult>
}

// Supported File Types
export const SUPPORTED_EXTENSIONS: Record<AssetType, string[]> = {
  image: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'tiff', 'raw', 'psd', 'ai', 'avif', 'svg', 'heic'],
  video: ['mp4', 'mov', 'mxf', 'webm', 'mkv', 'avi', 'm4v'],
  audio: ['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'],
}

export const MIME_TYPE_MAP: Record<string, AssetType> = {
  'image/png': 'image',
  'image/jpeg': 'image',
  'image/webp': 'image',
  'image/gif': 'image',
  'image/tiff': 'image',
  'image/svg+xml': 'image',
  'image/heic': 'image',
  'image/avif': 'image',
  'video/mp4': 'video',
  'video/quicktime': 'video',
  'video/webm': 'video',
  'video/x-matroska': 'video',
  'video/x-msvideo': 'video',
  'audio/mpeg': 'audio',
  'audio/wav': 'audio',
  'audio/mp4': 'audio',
  'audio/aac': 'audio',
  'audio/ogg': 'audio',
  'audio/flac': 'audio',
  'application/pdf': 'document',
  'application/msword': 'document',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'document',
  'application/vnd.ms-excel': 'document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'document',
  'text/plain': 'document',
  'text/csv': 'document',
}

/**
 * Get asset type from MIME type
 */
export function getAssetTypeFromMime(mimeType: string): AssetType | null {
  return MIME_TYPE_MAP[mimeType] ?? null
}

/**
 * Get asset type from file extension
 */
export function getAssetTypeFromExtension(extension: string): AssetType | null {
  const ext = extension.toLowerCase().replace('.', '')
  for (const [type, extensions] of Object.entries(SUPPORTED_EXTENSIONS)) {
    if (extensions.includes(ext)) {
      return type as AssetType
    }
  }
  return null
}

/**
 * Check if a file type is supported
 */
export function isSupportedFileType(mimeType: string, extension?: string): boolean {
  if (MIME_TYPE_MAP[mimeType]) return true
  if (extension) {
    return getAssetTypeFromExtension(extension) !== null
  }
  return false
}
