/**
 * Personality prompt builder
 * Builds system prompt sections from personality traits
 */

import type { AgentPersonality } from '../types.js'

/**
 * Trait level thresholds
 */
type TraitLevel = 'low' | 'mid' | 'high'

function getTraitLevel(value: number): TraitLevel {
  if (value < 0.33) return 'low'
  if (value > 0.66) return 'high'
  return 'mid'
}

/**
 * Trait descriptions by level
 */
const TRAIT_DESCRIPTIONS = {
  formality: {
    low: 'casual and conversational, using everyday language and contractions',
    mid: 'professional but approachable, balancing formality with friendliness',
    high: 'formal and business-like, using proper grammar and structured sentences',
  },
  verbosity: {
    low: 'brief and to the point, giving concise answers without unnecessary detail',
    mid: 'balanced in detail, providing enough context without being overwhelming',
    high: 'thorough and comprehensive, explaining things in full detail',
  },
  proactivity: {
    low: 'responsive rather than proactive, answering questions as asked',
    mid: 'occasionally offering suggestions when relevant',
    high: 'proactively suggesting improvements and next steps without being asked',
  },
  humor: {
    low: 'serious and focused, maintaining a professional tone',
    mid: 'occasionally using light touches of humor when appropriate',
    high: 'playful and witty, incorporating humor naturally into responses',
  },
  emojiUsage: {
    low: 'using no emojis, keeping communication text-only',
    mid: 'using occasional emojis to add warmth and clarity',
    high: 'expressive with emojis, using them frequently to convey emotion',
  },
  assertiveness: {
    low: 'deferential, asking for guidance and confirmation before acting',
    mid: 'confident but open, stating opinions while remaining flexible',
    high: 'direct and decisive, making clear recommendations with conviction',
  },
} as const

/**
 * Build the personality section of a system prompt
 */
export function buildPersonalityPromptSection(personality: AgentPersonality): string {
  const traits: string[] = []

  // Build trait descriptions
  const formalityLevel = getTraitLevel(personality.traitFormality)
  traits.push(`- Communication style: ${TRAIT_DESCRIPTIONS.formality[formalityLevel]}`)

  const verbosityLevel = getTraitLevel(personality.traitVerbosity)
  traits.push(`- Response length: ${TRAIT_DESCRIPTIONS.verbosity[verbosityLevel]}`)

  const proactivityLevel = getTraitLevel(personality.traitProactivity)
  traits.push(`- Initiative: ${TRAIT_DESCRIPTIONS.proactivity[proactivityLevel]}`)

  const humorLevel = getTraitLevel(personality.traitHumor)
  traits.push(`- Tone: ${TRAIT_DESCRIPTIONS.humor[humorLevel]}`)

  const emojiLevel = getTraitLevel(personality.traitEmojiUsage)
  traits.push(`- Emoji usage: ${TRAIT_DESCRIPTIONS.emojiUsage[emojiLevel]}`)

  const assertivenessLevel = getTraitLevel(personality.traitAssertiveness)
  traits.push(`- Decision style: ${TRAIT_DESCRIPTIONS.assertiveness[assertivenessLevel]}`)

  // Build the prompt section
  let section = `## Your Personality\n\n${traits.join('\n')}`

  // Add preferred greeting
  if (personality.preferredGreeting) {
    section += `\n\n### Greeting\nUse this greeting style: "${personality.preferredGreeting}"`
  }

  // Add signature
  if (personality.signature) {
    section += `\n\n### Signature\nSign off with: "${personality.signature}"`
  }

  // Add go-to emojis
  if (personality.goToEmojis && personality.goToEmojis.length > 0) {
    section += `\n\n### Preferred Emojis\nWhen using emojis, prefer: ${personality.goToEmojis.join(' ')}`
  }

  // Add behavioral controls
  const behaviors: string[] = []
  if (personality.alwaysConfirmActions) {
    behaviors.push('- Always confirm before taking any action')
  }
  if (personality.offerAlternatives) {
    behaviors.push('- Offer alternative approaches when relevant')
  }
  if (personality.explainReasoning) {
    behaviors.push('- Explain your reasoning when making recommendations')
  }

  if (behaviors.length > 0) {
    section += `\n\n### Behavioral Guidelines\n${behaviors.join('\n')}`
  }

  // Add forbidden topics
  if (personality.forbiddenTopics && personality.forbiddenTopics.length > 0) {
    section += `\n\n### Topics to Avoid\nDo not discuss: ${personality.forbiddenTopics.join(', ')}`
  }

  return section
}

/**
 * Generate a sample response to preview personality
 */
export function generatePersonalityPreview(
  personality: AgentPersonality,
  scenario: 'greeting' | 'confirmation' | 'suggestion' | 'error' = 'greeting'
): string {
  const formalityLevel = getTraitLevel(personality.traitFormality)
  const humorLevel = getTraitLevel(personality.traitHumor)
  const emojiLevel = getTraitLevel(personality.traitEmojiUsage)
  const assertivenessLevel = getTraitLevel(personality.traitAssertiveness)

  // Build greeting
  let greeting = ''
  if (personality.preferredGreeting) {
    greeting = personality.preferredGreeting
  } else {
    const greetings = {
      low: ['Hey!', 'Hi there', "What's up"],
      mid: ['Hello', 'Hi', 'Good day'],
      high: ['Good morning', 'Good afternoon', 'Greetings'],
    }
    greeting = greetings[formalityLevel]?.[0] ?? 'Hello'
  }

  // Add emoji if appropriate
  const waveEmoji = emojiLevel !== 'low' ? ' ' + (personality.goToEmojis?.[0] || '') : ''

  // Build response based on scenario
  switch (scenario) {
    case 'greeting':
      return buildGreetingPreview(greeting, waveEmoji, formalityLevel, humorLevel, personality)

    case 'confirmation':
      return buildConfirmationPreview(assertivenessLevel, emojiLevel, personality)

    case 'suggestion':
      return buildSuggestionPreview(assertivenessLevel, formalityLevel, personality)

    case 'error':
      return buildErrorPreview(formalityLevel, emojiLevel, personality)

    default:
      return `${greeting}${waveEmoji}`
  }
}

function buildGreetingPreview(
  greeting: string,
  emoji: string,
  formality: TraitLevel,
  _humor: TraitLevel,
  personality: AgentPersonality
): string {
  let message = `${greeting}${emoji}\n\n`

  if (formality === 'low') {
    message +=
      "Just checking in! Wanted to see how things are going and if there's anything I can help with."
  } else if (formality === 'mid') {
    message +=
      'I hope this message finds you well. I wanted to touch base and see if there is anything you need assistance with.'
  } else {
    message +=
      'I trust you are doing well. I am reaching out to inquire whether there is any matter that requires my attention.'
  }

  if (personality.signature) {
    message += `\n\n${personality.signature}`
  }

  return message
}

function buildConfirmationPreview(
  assertiveness: TraitLevel,
  emojiLevel: TraitLevel,
  personality: AgentPersonality
): string {
  const checkEmoji = emojiLevel !== 'low' ? ' ' : ''

  if (assertiveness === 'low') {
    return `I was thinking we could proceed with option A, but I wanted to check with you first. What do you think?${checkEmoji}${personality.signature ? `\n\n${personality.signature}` : ''}`
  } else if (assertiveness === 'mid') {
    return `Based on my analysis, I recommend we go with option A. Does that work for you?${checkEmoji}${personality.signature ? `\n\n${personality.signature}` : ''}`
  } else {
    return `I've reviewed the situation and we should go with option A - it's clearly the best path forward.${checkEmoji}${personality.signature ? `\n\n${personality.signature}` : ''}`
  }
}

function buildSuggestionPreview(
  assertiveness: TraitLevel,
  formality: TraitLevel,
  personality: AgentPersonality
): string {
  if (assertiveness === 'low' && formality === 'low') {
    return `Hey, just a thought - what if we tried a different approach? No pressure though!${personality.signature ? `\n\n${personality.signature}` : ''}`
  } else if (assertiveness === 'high' && formality === 'high') {
    return `I strongly recommend implementing the following changes immediately. This will significantly improve outcomes.${personality.signature ? `\n\n${personality.signature}` : ''}`
  } else {
    return `I have a suggestion that might help. We could consider adjusting our approach to achieve better results.${personality.signature ? `\n\n${personality.signature}` : ''}`
  }
}

function buildErrorPreview(
  formality: TraitLevel,
  emojiLevel: TraitLevel,
  personality: AgentPersonality
): string {
  const errorEmoji = emojiLevel !== 'low' ? '' : ''

  if (formality === 'low') {
    return `Oops! Something went wrong on my end.${errorEmoji} Let me try that again.${personality.signature ? `\n\n${personality.signature}` : ''}`
  } else if (formality === 'mid') {
    return `I apologize, but I encountered an issue.${errorEmoji} I'm working on resolving it now.${personality.signature ? `\n\n${personality.signature}` : ''}`
  } else {
    return `I regret to inform you that an error has occurred.${errorEmoji} I am taking immediate steps to address this matter.${personality.signature ? `\n\n${personality.signature}` : ''}`
  }
}

/**
 * Get a description of a trait at a given value
 */
export function getTraitDescription(
  trait: keyof typeof TRAIT_DESCRIPTIONS,
  value: number
): string {
  const level = getTraitLevel(value)
  return TRAIT_DESCRIPTIONS[trait][level]
}

/**
 * Get trait endpoints (low and high descriptions)
 */
export function getTraitEndpoints(
  trait: keyof typeof TRAIT_DESCRIPTIONS
): { low: string; high: string } {
  return {
    low: TRAIT_DESCRIPTIONS[trait].low,
    high: TRAIT_DESCRIPTIONS[trait].high,
  }
}
