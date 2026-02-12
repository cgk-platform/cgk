/**
 * @cgk/video - Playback URL generation
 *
 * Generates URLs for video streaming, thumbnails, and storyboards.
 */

/**
 * Thumbnail generation options
 */
export interface ThumbnailOptions {
  /**
   * Width in pixels (default: 640)
   */
  width?: number

  /**
   * Height in pixels (auto-calculated if not specified)
   */
  height?: number

  /**
   * Time offset in seconds for the thumbnail (default: 0)
   */
  time?: number

  /**
   * Fit mode for the thumbnail
   */
  fit?: 'contain' | 'cover' | 'crop' | 'smartcrop'

  /**
   * Flip the image horizontally
   */
  flipH?: boolean

  /**
   * Flip the image vertically
   */
  flipV?: boolean

  /**
   * Rotation in degrees (90, 180, 270)
   */
  rotate?: 90 | 180 | 270
}

/**
 * Animated thumbnail (GIF) options
 */
export interface AnimatedThumbnailOptions {
  /**
   * Start time in seconds (default: 0)
   */
  start?: number

  /**
   * End time in seconds (default: 5)
   */
  end?: number

  /**
   * Width in pixels (default: 320)
   */
  width?: number

  /**
   * Frames per second (default: 15)
   */
  fps?: number
}

/**
 * Storyboard options
 */
export interface StoryboardOptions {
  /**
   * Thumbnail width in pixels (default: 100)
   */
  thumbnailWidth?: number

  /**
   * Number of columns in the sprite sheet (default: 10)
   */
  columns?: number
}

/**
 * Get the HLS streaming URL for a video
 *
 * @param playbackId - Mux playback ID
 * @returns HLS streaming URL (.m3u8)
 */
export function getStreamUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`
}

/**
 * Get a thumbnail URL for a video
 *
 * @param playbackId - Mux playback ID
 * @param options - Thumbnail options
 * @returns Thumbnail URL
 */
export function getThumbnailUrl(
  playbackId: string,
  options: ThumbnailOptions = {},
): string {
  const params = new URLSearchParams()

  if (options.width) {
    params.set('width', String(options.width))
  }
  if (options.height) {
    params.set('height', String(options.height))
  }
  if (options.time !== undefined) {
    params.set('time', String(options.time))
  }
  if (options.fit) {
    params.set('fit_mode', options.fit)
  }
  if (options.flipH) {
    params.set('flip_h', 'true')
  }
  if (options.flipV) {
    params.set('flip_v', 'true')
  }
  if (options.rotate) {
    params.set('rotate', String(options.rotate))
  }

  const queryString = params.toString()
  return `https://image.mux.com/${playbackId}/thumbnail.jpg${queryString ? `?${queryString}` : ''}`
}

/**
 * Get an animated thumbnail (GIF) URL for a video
 *
 * @param playbackId - Mux playback ID
 * @param options - Animation options
 * @returns Animated GIF URL
 */
export function getAnimatedThumbnailUrl(
  playbackId: string,
  options: AnimatedThumbnailOptions = {},
): string {
  const params = new URLSearchParams()

  if (options.start !== undefined) {
    params.set('start', String(options.start))
  }
  if (options.end !== undefined) {
    params.set('end', String(options.end))
  }
  if (options.width) {
    params.set('width', String(options.width))
  }
  if (options.fps) {
    params.set('fps', String(options.fps))
  }

  const queryString = params.toString()
  return `https://image.mux.com/${playbackId}/animated.gif${queryString ? `?${queryString}` : ''}`
}

/**
 * Get a storyboard VTT file URL for video scrubbing
 *
 * @param playbackId - Mux playback ID
 * @param options - Storyboard options
 * @returns Storyboard VTT URL
 */
export function getStoryboardUrl(
  playbackId: string,
  options: StoryboardOptions = {},
): string {
  const params = new URLSearchParams()

  if (options.thumbnailWidth) {
    params.set('thumbnail_width', String(options.thumbnailWidth))
  }
  if (options.columns) {
    params.set('columns', String(options.columns))
  }

  const queryString = params.toString()
  return `https://image.mux.com/${playbackId}/storyboard.vtt${queryString ? `?${queryString}` : ''}`
}

/**
 * Get a poster image URL (alias for thumbnail at time 0)
 *
 * @param playbackId - Mux playback ID
 * @param width - Image width in pixels
 * @returns Poster image URL
 */
export function getPosterUrl(playbackId: string, width = 1920): string {
  return getThumbnailUrl(playbackId, { width, time: 0 })
}

/**
 * Generate a signed playback URL (for signed playback policies)
 *
 * Note: This requires a signing key configured in Mux
 *
 * @param playbackId - Mux playback ID
 * @param signingKeyId - Mux signing key ID
 * @param privateKey - Private key for signing
 * @param options - Signing options
 * @returns Signed playback URL
 */
export function getSignedStreamUrl(
  _playbackId: string,
  _signingKeyId: string,
  _privateKey: string,
  _options: {
    expiration?: number // Unix timestamp
    viewerId?: string
  } = {},
): string {
  // For now, we only support public playback
  // Signed URLs would require JWT generation with the private key
  // This is a placeholder for future implementation
  throw new Error(
    'Signed playback URLs are not yet implemented. Use public playback instead.',
  )
}

/**
 * Get embed URL for iframe embedding
 *
 * @param playbackId - Mux playback ID
 * @returns Embed URL
 */
export function getEmbedUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}`
}

/**
 * Get all playback URLs for a video
 *
 * @param playbackId - Mux playback ID
 * @returns Object with all URL types
 */
export function getAllPlaybackUrls(playbackId: string): {
  stream: string
  thumbnail: string
  poster: string
  animatedPreview: string
  storyboard: string
  embed: string
} {
  return {
    stream: getStreamUrl(playbackId),
    thumbnail: getThumbnailUrl(playbackId, { width: 400 }),
    poster: getPosterUrl(playbackId),
    animatedPreview: getAnimatedThumbnailUrl(playbackId, {
      start: 0,
      end: 5,
      width: 320,
    }),
    storyboard: getStoryboardUrl(playbackId),
    embed: getEmbedUrl(playbackId),
  }
}
