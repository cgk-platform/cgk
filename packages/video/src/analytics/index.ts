/**
 * @cgk/video/analytics - Analytics exports
 */

export {
  trackView,
  updateView,
  getVideoViews,
  getLastView,
} from './views.js'

export {
  getVideoAnalytics,
  getViewCount,
  getUniqueViewerCount,
  getViewsOverTime,
  getTopVideos,
  getWatchTimeDistribution,
} from './aggregates.js'
