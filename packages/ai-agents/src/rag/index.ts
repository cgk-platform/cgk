/**
 * RAG module - Retrieval Augmented Generation for agent context
 */

// Search
export {
  getConversationMemories,
  getMostUsedMemories,
  getRecentMemories,
  getSubjectMemories,
  searchMemories,
  searchMemoriesByText,
} from './search.js'

// Ranking
export {
  calculateRelevanceScore,
  diversifyMemories,
  filterByThresholds,
  groupByType,
  MEMORY_TYPE_PRIORITY,
  MEMORY_TYPE_WEIGHTS,
  rankMemories,
  sortGroupsByPriority,
} from './ranking.js'

// Context Builder
export {
  buildMemoryContext,
  buildQuickContext,
  buildSubjectContext,
} from './context-builder.js'
