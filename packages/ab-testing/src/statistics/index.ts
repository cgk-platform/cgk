/**
 * A/B Testing Statistical Methods
 *
 * Comprehensive statistical analysis for A/B test evaluation including:
 * - Significance testing (Z-test, Welch's t-test)
 * - Bootstrap confidence intervals
 * - CUPED variance reduction
 * - SRM detection
 * - Novelty effect detection
 * - Population drift detection
 * - Multiple testing correction
 */

// Core statistical methods
export {
  calculateSignificance,
  calculateRevenueSignificance,
  calculateSampleSize,
  calculatePower,
  normalCDF,
  normalQuantile,
  chiSquaredCDF,
  studentTCDF,
  mean,
  variance,
  standardDeviation,
  covariance,
  correlation,
  type SignificanceResult,
  type ConversionData,
  type RevenueData,
} from './core.js'

// Bootstrap confidence intervals
export {
  bootstrapConfidenceInterval,
  bootstrapDifference,
  bootstrapRatio,
  bootstrapConversionRate,
  resampleWithReplacement,
  type BootstrapResult,
  type BootstrapOptions,
} from './bootstrap.js'

// CUPED variance reduction
export {
  applyCUPED,
  applyCUPEDComparison,
  calculateAdjustedValues,
  selectBestCovariate,
  estimateVarianceReduction,
  generateCUPEDReport,
  type CUPEDResult,
  type CUPEDConfig,
  type CUPEDReport,
  type PreExperimentData,
} from './cuped.js'

// SRM detection
export {
  detectSRM,
  calculateExpectedVisitors,
  analyzeSRMTrend,
  detectSegmentSRM,
  SRM_PATTERNS,
  type SRMResult,
  type SRMVariantData,
  type SRMConfig,
} from './srm.js'

// Novelty effect detection
export {
  detectNoveltyEffect,
  detectLearningEffect,
  type NoveltyResult,
  type NoveltyConfig,
  type DailyLiftData,
} from './novelty.js'

// Drift detection
export {
  detectDrift,
  detectTimeDrift,
  type DriftResult,
  type DriftDimension,
  type DriftConfig,
  type VisitorData,
} from './drift.js'

// Multiple testing correction
export {
  holmBonferroniCorrection,
  bonferroniCorrection,
  benjaminiHochbergCorrection,
  calculatePairwiseComparisons,
  calculateControlComparisons,
  generatePairwiseComparisons,
  generateControlComparisons,
  requiresMultipleTestingCorrection,
  recommendCorrectionMethod,
  applyRecommendedCorrection,
  type HolmResult,
  type HolmComparison,
  type ComparisonInput,
} from './multiple-testing.js'
