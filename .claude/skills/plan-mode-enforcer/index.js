/**
 * Plan Mode Enforcer Skill
 *
 * Analyzes user requests to determine if EnterPlanMode is required before implementation.
 * Prevents implementation work from starting without proper planning.
 *
 * Usage: /plan-mode-enforcer <user-request>
 */

export default {
  name: 'plan-mode-enforcer',
  version: '1.0.0',
  description: 'Detects tasks requiring EnterPlanMode before implementation',

  async execute(args = {}) {
    const {
      request = '',       // User request text
      verbose = false     // Detailed reasoning output
    } = args

    if (!request || request.trim().length === 0) {
      return {
        error: 'No request provided. Usage: /plan-mode-enforcer "user request text"'
      }
    }

    console.log('🔍 Analyzing request complexity...\n')

    // Analyze the request
    const analysis = analyzeRequest(request)

    // Determine if plan mode is required
    const decision = determineRequirement(analysis)

    // Output results
    if (verbose) {
      console.log('📊 Analysis Results:')
      console.log(`   Request: ${request.substring(0, 100)}...`)
      console.log(`   Complexity: ${analysis.complexity}`)
      console.log(`   File count estimate: ${analysis.fileCountEstimate}`)
      console.log(`   Has architectural decisions: ${analysis.hasArchitecturalDecisions}`)
      console.log(`   Has feature implementation: ${analysis.hasFeatureImplementation}`)
      console.log(`   Has refactoring: ${analysis.hasRefactoring}`)
      console.log(`   Is research/exploration: ${analysis.isResearch}`)
      console.log(`   Is trivial fix: ${analysis.isTrivialFix}`)
      console.log(`   User requested skip: ${analysis.userRequestedSkip}\n`)
    }

    if (decision.requiresPlan) {
      console.log('⚠️  PLAN MODE REQUIRED\n')
      console.log(`Reason: ${decision.reason}\n`)
      console.log('📝 Required Action:')
      console.log('   1. Invoke EnterPlanMode skill')
      console.log('   2. Explore codebase thoroughly')
      console.log('   3. Design approach')
      console.log('   4. Get user approval via ExitPlanMode')
      console.log('   5. Then implement\n')
      console.log('❌ DO NOT proceed with implementation without planning.\n')
    } else {
      console.log('✅ Plan Mode NOT Required\n')
      if (decision.exemption) {
        console.log(`Exemption: ${decision.exemption}\n`)
      }
      console.log('You may proceed with implementation directly.\n')
    }

    return {
      requiresPlan: decision.requiresPlan,
      reason: decision.reason,
      exemption: decision.exemption,
      analysis,
      action: decision.requiresPlan
        ? 'BLOCK_IMPLEMENTATION_UNTIL_PLANNED'
        : 'PROCEED_WITH_IMPLEMENTATION'
    }
  }
}

/**
 * Analyze the user request to extract complexity indicators
 */
function analyzeRequest(request) {
  const lowerRequest = request.toLowerCase()

  // Complexity indicators
  const indicators = {
    // Trivial fix patterns
    isTrivialFix: /\b(typo|spelling|fix\s+obvious|single[- ]line|comment|formatting)\b/.test(lowerRequest),

    // Research/exploration patterns
    isResearch: /\b(read|show|explain|what|how|where|when|tell me|investigate|explore|analyze|find|search|look for)\b/.test(lowerRequest) &&
                !/\b(then|after|implement|create|add|build|refactor)\b/.test(lowerRequest),

    // User explicitly requested skip
    userRequestedSkip: /\b(skip\s+plan|no\s+plan|without\s+plan|just\s+(do\s+it|fix\s+it))\b/.test(lowerRequest),

    // Feature implementation
    hasFeatureImplementation: /\b(create|build|implement|add|new\s+(feature|component|page|route|api|endpoint|service|package))\b/.test(lowerRequest),

    // Multi-file changes
    hasMultiFileIndicator: /\b(across|multiple|all|update\s+(all|every)|refactor|restructure|reorganize)\b/.test(lowerRequest),

    // Architectural decisions
    hasArchitecturalDecisions: /\b(architecture|design|pattern|structure|schema|migration|database|tenant|authentication|authorization|integration)\b/.test(lowerRequest),

    // Refactoring
    hasRefactoring: /\b(refactor|restructure|reorganize|split|extract|consolidate|migrate)\b/.test(lowerRequest),

    // Phase/milestone work
    isPhaseWork: /\b(phase|milestone|epic|track)\b/i.test(lowerRequest),

    // File count estimates (based on keywords)
    fileCountEstimate: estimateFileCount(request)
  }

  // Determine overall complexity
  let complexity = 'trivial'

  if (indicators.isTrivialFix) {
    complexity = 'trivial'
  } else if (indicators.isResearch) {
    complexity = 'research'
  } else if (
    indicators.hasArchitecturalDecisions ||
    indicators.isPhaseWork ||
    indicators.fileCountEstimate > 5
  ) {
    complexity = 'high'
  } else if (
    indicators.hasFeatureImplementation ||
    indicators.hasRefactoring ||
    indicators.hasMultiFileIndicator ||
    indicators.fileCountEstimate >= 3
  ) {
    complexity = 'medium'
  } else {
    complexity = 'low'
  }

  return {
    ...indicators,
    complexity
  }
}

/**
 * Estimate number of files affected based on request keywords
 */
function estimateFileCount(request) {
  const lowerRequest = request.toLowerCase()

  // High file count indicators
  if (/\b(all\s+(apps|packages|components)|entire|platform[- ]wide|global)\b/.test(lowerRequest)) {
    return 20
  }

  // Medium file count indicators
  if (/\b(multiple|several|many|app|package|module|service)\b/.test(lowerRequest)) {
    return 5
  }

  // Multi-component indicators
  if (/\b(and|plus|also|additionally)\b/.test(lowerRequest)) {
    const parts = lowerRequest.split(/\b(and|plus|also|additionally)\b/)
    return Math.min(parts.length, 10)
  }

  // Single component indicators
  if (/\b(component|page|route|api|endpoint|util|helper)\b/.test(lowerRequest)) {
    return 2
  }

  // Default
  return 1
}

/**
 * Determine if plan mode is required based on analysis
 */
function determineRequirement(analysis) {
  const {
    complexity,
    isTrivialFix,
    isResearch,
    userRequestedSkip,
    hasFeatureImplementation,
    hasArchitecturalDecisions,
    hasRefactoring,
    isPhaseWork,
    fileCountEstimate
  } = analysis

  // Exemptions (plan mode NOT required)
  if (userRequestedSkip) {
    return {
      requiresPlan: false,
      exemption: 'User explicitly requested to skip planning'
    }
  }

  if (isResearch) {
    return {
      requiresPlan: false,
      exemption: 'Simple research/exploration task (reading files, searching code, answering questions)'
    }
  }

  if (isTrivialFix && fileCountEstimate === 1) {
    return {
      requiresPlan: false,
      exemption: 'Trivial single-line fix (typo, obvious bug)'
    }
  }

  // Requirements (plan mode REQUIRED)
  if (isPhaseWork) {
    return {
      requiresPlan: true,
      reason: 'Phase/milestone work requires comprehensive planning'
    }
  }

  if (hasArchitecturalDecisions) {
    return {
      requiresPlan: true,
      reason: 'Task involves architectural decisions (database schema, authentication, integrations, etc.)'
    }
  }

  if (hasFeatureImplementation) {
    return {
      requiresPlan: true,
      reason: 'Feature implementation requires planning to ensure alignment with architecture'
    }
  }

  if (hasRefactoring) {
    return {
      requiresPlan: true,
      reason: 'Refactoring requires careful planning to avoid breaking changes'
    }
  }

  if (fileCountEstimate >= 3) {
    return {
      requiresPlan: true,
      reason: `Multi-file changes (estimated ${fileCountEstimate} files) require planning`
    }
  }

  if (complexity === 'high') {
    return {
      requiresPlan: true,
      reason: 'High complexity task requires planning'
    }
  }

  if (complexity === 'medium') {
    return {
      requiresPlan: true,
      reason: 'Non-trivial task requires planning to ensure quality implementation'
    }
  }

  // Default: simple task, no plan required
  return {
    requiresPlan: false,
    exemption: 'Simple task with low complexity and minimal file changes'
  }
}
