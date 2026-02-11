/**
 * Learning module - Training, correction detection, feedback processing
 */

// Trainer
export {
  acknowledgeTraining,
  addTrainingMemory,
  countTrainingByType,
  deleteTrainingSession,
  getTrainingSession,
  getUnacknowledgedTraining,
  listTrainingSessions,
  startTrainingSession,
} from './trainer.js'

// Correction Detection
export {
  acknowledgeFailureLearning,
  applyFailureLearning,
  countFailuresByType,
  createFailureLearning,
  deleteFailureLearning,
  detectCorrection,
  getFailureLearning,
  getUnacknowledgedFailures,
  isCorrection,
  isNegativeReaction,
  listFailureLearnings,
} from './correction-detector.js'

// Feedback
export {
  deleteFeedback,
  getFeedback,
  getFeedbackByConversation,
  getFeedbackStats,
  getUnprocessedFeedback,
  listFeedback,
  processAllFeedback,
  processFeedback,
  submitFeedback,
} from './feedback.js'

// Patterns
export {
  cleanupLowPerformingPatterns,
  createPattern,
  deletePattern,
  findSimilarPatterns,
  getPattern,
  getPatternCategories,
  getPatternsByCategory,
  getPatternStats,
  getTopPatterns,
  listPatterns,
  recordPatternUsage,
  updatePatternCategory,
  updatePatternFeedback,
} from './patterns.js'
