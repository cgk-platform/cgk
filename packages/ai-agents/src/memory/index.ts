/**
 * Memory module - Persistent storage and retrieval for agent memories
 */

// Types
export type {
  AgentFeedback,
  AgentMemory,
  AgentPattern,
  ConfidenceFactors,
  ConsolidationResult,
  CreateFeedbackInput,
  CreateFailureLearningInput,
  CreateMemoryInput,
  CreatePatternInput,
  CreateTrainingSessionInput,
  FailureLearning,
  FailureType,
  FeedbackType,
  MemoryListFilters,
  MemorySearchFilters,
  MemorySearchResult,
  MemorySource,
  MemoryType,
  RAGContextOptions,
  RAGContextResult,
  TrainingExample,
  TrainingSession,
  TrainingType,
  UpdateMemoryInput,
} from './types.js'

export { SOURCE_WEIGHTS, TRAINING_TO_MEMORY_TYPE } from './types.js'

// Embeddings
export {
  cosineSimilarity,
  EMBEDDING_CONFIG,
  estimateTokens,
  generateEmbedding,
  generateEmbeddings,
  generateMemoryEmbedding,
} from './embeddings.js'

// Storage
export {
  countMemories,
  createMemory,
  deactivateMemory,
  deleteMemory,
  getAverageConfidence,
  getMemoriesBySubject,
  getMemoriesByType,
  getMemoriesWithoutEmbeddings,
  getMemory,
  listMemories,
  recordMemoryAccess,
  updateMemory,
  updateMemoryEmbedding,
} from './storage.js'

// Confidence
export {
  applyAgeDecay,
  calculateConfidence,
  contradictMemory,
  deactivateLowConfidenceMemories,
  getLowConfidenceMemories,
  recalculateAllConfidence,
  reinforceMemory,
  supersedeMemory,
} from './confidence.js'

// Consolidation
export {
  cleanupExpiredMemories,
  consolidateMemories,
  findDuplicateMemories,
  findSimilarMemories,
  getConsolidationCandidates,
  mergeMemories,
} from './consolidation.js'
