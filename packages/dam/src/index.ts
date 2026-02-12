/**
 * @cgk/dam - Digital Asset Management
 *
 * Provides centralized media management for tenant content including
 * product images, marketing assets, creator content, and ad creatives.
 *
 * @ai-pattern tenant-isolation
 * @ai-required All operations must use withTenant() context
 */

// Types
export type {
  Asset,
  AssetRow,
  AssetType,
  QualityVariant,
  RightsStatus,
  SourceType,
  CreateAssetInput,
  UpdateAssetInput,
  Collection,
  CollectionType,
  CreateCollectionInput,
  UpdateCollectionInput,
  SmartCollectionRules,
  SmartCollectionRule,
  GDriveConnection,
  CreateGDriveConnectionInput,
  GDriveFileMapping,
  SyncMode,
  SyncStatus,
  ImportQueueItem,
  ImportQueueStatus,
  CreateImportQueueItemInput,
  TrashItem,
  UsageLog,
  UsageAction,
  AuditLog,
  AuditAction,
  AuditEntityType,
  AssetFilters,
  SearchResult,
  BulkOperation,
  BulkOperationInput,
  BulkOperationResult,
  IStorageProvider,
  UploadOptions,
  UploadResult,
} from './types.js'

export {
  SUPPORTED_EXTENSIONS,
  MIME_TYPE_MAP,
  getAssetTypeFromMime,
  getAssetTypeFromExtension,
  isSupportedFileType,
} from './types.js'

// Asset CRUD
export {
  getAssets,
  getAssetById,
  createAsset,
  updateAsset,
  deleteAsset,
  restoreAsset,
  permanentlyDeleteAsset,
  bulkOperation,
  incrementViewCount,
  incrementDownloadCount,
  findDuplicateByHash,
  getAssetStats,
} from './assets/crud.js'

// Asset Metadata
export {
  extractMetadata,
  extractImageMetadata,
  extractVideoMetadata,
  extractAudioMetadata,
  extractDocumentMetadata,
  computeFileHash,
  parseDimensions,
  calculateAspectRatio,
  determineQualityTier,
  formatFileSize,
  formatDuration,
  type ExtractedMetadata,
} from './assets/metadata.js'

// Thumbnail Generation
export {
  generateThumbnail,
  generateImageThumbnail,
  generateVideoPlaceholder,
  generateAudioPlaceholder,
  generateDocumentPlaceholder,
  generateThumbnailSizes,
  type ThumbnailOptions,
  type ThumbnailResult,
} from './assets/thumbnails.js'

// Storage
export {
  generateUniqueFilename,
  getTenantAssetPath,
  getTenantThumbnailPath,
  parseStorageUrl,
  type CopyOptions,
  type ListOptions,
  type ListResult,
} from './storage/interface.js'

export {
  VercelBlobStorage,
  createVercelBlobStorage,
  type VercelBlobConfig,
} from './storage/vercel-blob.js'

// Collections
export {
  getCollections,
  getCollectionById,
  createCollection,
  updateCollection,
  deleteCollection,
  addAssetsToCollection,
  removeAssetsFromCollection,
  getCollectionAssets,
  updateCollectionAssetCount,
  reorderCollectionAssets,
  getCollectionsForAsset,
  evaluateSmartCollectionRules,
  refreshSmartCollection,
} from './collections/db.js'

// Google Drive OAuth
export {
  createOAuth2Client,
  generateAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  revokeTokens,
  encodeOAuthState,
  decodeOAuthState,
  isTokenExpired,
  getOAuthConfigFromEnv,
  type OAuthConfig,
  type OAuthState,
  type OAuthTokens,
} from './gdrive/oauth.js'

// Google Drive Tokens
export {
  encryptToken,
  decryptToken,
  rotateTokenEncryption,
  isEncryptedToken,
  generateEncryptionKey,
} from './gdrive/tokens.js'

// Google Drive API
export {
  createDriveClient,
  listFiles,
  listFilesRecursively,
  getFile,
  downloadFile,
  getStartPageToken,
  listChanges,
  createWatchChannel,
  stopWatchChannel,
  getFolder,
  isSupportedDriveFile,
  type DriveFile,
  type DriveChange,
  type DriveListResult,
  type DriveChangesResult,
} from './gdrive/api.js'

// Google Drive Sync
export {
  initialSync,
  incrementalSync,
  getActiveConnections,
  getConnectionsForAutoSync,
  type SyncResult,
} from './gdrive/sync.js'

// Google Drive Database
export {
  getConnections,
  getConnectionById,
  createConnection,
  updateConnectionSettings,
  deleteConnection,
  markConnectionNeedsReauth,
  updateWatchChannel,
  clearWatchChannel,
  getFileMappings,
  linkMappingToAsset,
  markMappingFailed,
  markMappingSkipped,
  getConnectionByChannelId,
  getConnectionsWithExpiringChannels,
} from './gdrive/db.js'

// Import Queue
export {
  getQueueItems,
  getQueueItemById,
  createQueueItem,
  updateQueueItemStatus,
  assignQueueItem,
  updateQueueItemPriority,
  bulkUpdateQueueItemStatus,
  cleanupOldQueueItems,
  getQueueStats,
  getNextItemsToProcess,
  isSourceFileQueued,
  type ImportQueueFilters,
} from './import-queue/db.js'

// Search
export {
  searchAssets,
  sanitizeSearchQuery,
  getSearchSuggestions,
  getPopularSearchTerms,
  findSimilarAssets,
  type SearchOptions,
  type SearchResultItem,
  type FullTextSearchResult,
} from './search/full-text.js'

// Tags
export {
  getAllTags,
  getPopularTags,
  getTagSuggestions,
  addTagsToAsset,
  removeTagsFromAsset,
  bulkAddTags,
  bulkRemoveTags,
  renameTag,
  deleteTag,
  getRelatedTags,
  type TagWithCount,
  type TagSuggestion,
} from './search/tags.js'

// Audit Logging
export {
  createAuditLog,
  getAuditLogsForEntity,
  getAuditLogs,
  createUsageLog,
  getUsageLogsForAsset,
  getAssetUsageStats,
  getMostViewedAssets,
  getMostDownloadedAssets,
  cleanupOldAuditLogs,
  cleanupOldUsageLogs,
  type CreateAuditLogInput,
  type CreateUsageLogInput,
} from './audit.js'
