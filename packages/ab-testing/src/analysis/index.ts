/**
 * A/B Test Analysis
 *
 * High-level analysis functions for A/B tests including
 * LTV analysis and comprehensive results aggregation.
 */

// LTV Analysis
export {
  calculateLTV,
  compareLTV,
  isLTVAnalysisAvailable,
  getAvailableLTVPeriods,
  calculateLTVTrend,
  type LTVAnalysis,
  type LTVComparison,
  type LTVConfig,
  type CustomerLTVData,
  type LTVTrendPoint,
} from './ltv.js'
