/**
 * Communication Preferences - Manage learned preferences for relationships
 */

import {
  getCommunicationPreferences as dbGetPreferences,
  getRelationship,
  updateRelationship,
} from '../db/relationships-queries.js'
import type { CommunicationPreferences, PersonType } from '../types/teams.js'

/**
 * Get communication preferences for a relationship
 */
export async function getPreferences(
  agentId: string,
  personType: PersonType,
  personId: string
): Promise<CommunicationPreferences> {
  return dbGetPreferences(agentId, personType, personId)
}

/**
 * Set preferred communication channel
 */
export async function setPreferredChannel(
  agentId: string,
  personType: PersonType,
  personId: string,
  channel: 'slack' | 'email' | 'sms'
): Promise<void> {
  await updateRelationship(agentId, personType, personId, {
    communicationPreferences: { preferredChannel: channel },
  })
}

/**
 * Set preferred response style
 */
export async function setResponseStyle(
  agentId: string,
  personType: PersonType,
  personId: string,
  style: 'concise' | 'detailed' | 'friendly'
): Promise<void> {
  await updateRelationship(agentId, personType, personId, {
    communicationPreferences: { responseStyle: style },
  })
}

/**
 * Add a topic to the topics discussed
 */
export async function addTopicDiscussed(
  agentId: string,
  personType: PersonType,
  personId: string,
  topic: string
): Promise<void> {
  const prefs = await dbGetPreferences(agentId, personType, personId)
  const topics = prefs.topicsDiscussed || []

  if (!topics.includes(topic)) {
    topics.push(topic)
    await updateRelationship(agentId, personType, personId, {
      communicationPreferences: { topicsDiscussed: topics },
    })
  }
}

/**
 * Get all topics discussed with a person
 */
export async function getTopicsDiscussed(
  agentId: string,
  personType: PersonType,
  personId: string
): Promise<string[]> {
  const prefs = await dbGetPreferences(agentId, personType, personId)
  return prefs.topicsDiscussed || []
}

/**
 * Update multiple preferences at once
 */
export async function updatePreferences(
  agentId: string,
  personType: PersonType,
  personId: string,
  preferences: Partial<CommunicationPreferences>
): Promise<void> {
  await updateRelationship(agentId, personType, personId, {
    communicationPreferences: preferences,
  })
}

/**
 * Get effective communication style for an interaction
 */
export async function getEffectiveCommunicationStyle(
  agentId: string,
  personType: PersonType,
  personId: string
): Promise<{
  responseStyle: 'concise' | 'detailed' | 'friendly'
  greeting: 'formal' | 'friendly' | 'casual'
  shouldElaborate: boolean
}> {
  const relationship = await getRelationship(agentId, personType, personId)
  const prefs = await dbGetPreferences(agentId, personType, personId)

  // Default to friendly if no preference set
  const responseStyle = prefs.responseStyle || 'friendly'

  // Determine greeting based on familiarity
  let greeting: 'formal' | 'friendly' | 'casual' = 'formal'
  if (relationship) {
    if (relationship.familiarityScore > 0.6) {
      greeting = 'casual'
    } else if (relationship.familiarityScore > 0.25) {
      greeting = 'friendly'
    }
  }

  // Should elaborate based on response style preference
  const shouldElaborate = responseStyle === 'detailed'

  return {
    responseStyle,
    greeting,
    shouldElaborate,
  }
}

/**
 * Learn preference from feedback
 */
export async function learnFromFeedback(
  agentId: string,
  personType: PersonType,
  personId: string,
  feedback: {
    wasResponseTooLong?: boolean
    wasResponseTooShort?: boolean
    preferredMoreDetail?: boolean
    preferredLessFormality?: boolean
  }
): Promise<void> {
  const currentPrefs = await dbGetPreferences(agentId, personType, personId)
  const updates: Partial<CommunicationPreferences> = {}

  if (feedback.wasResponseTooLong || feedback.preferredMoreDetail === false) {
    updates.responseStyle = 'concise'
  } else if (feedback.wasResponseTooShort || feedback.preferredMoreDetail) {
    updates.responseStyle = 'detailed'
  }

  // Note: We don't have a direct formality preference in CommunicationPreferences,
  // but we could add it or use this to influence other settings

  if (Object.keys(updates).length > 0) {
    await updateRelationship(agentId, personType, personId, {
      communicationPreferences: { ...currentPrefs, ...updates },
    })
  }
}

/**
 * Build communication context for prompts
 */
export async function buildCommunicationContext(
  agentId: string,
  personType: PersonType,
  personId: string
): Promise<string> {
  const relationship = await getRelationship(agentId, personType, personId)
  const prefs = await dbGetPreferences(agentId, personType, personId)

  const lines: string[] = []

  if (relationship) {
    // Familiarity context
    if (relationship.familiarityScore < 0.15) {
      lines.push('This is a new contact you have not interacted with before.')
    } else if (relationship.familiarityScore > 0.6) {
      lines.push('You know this person well from many past interactions.')
    } else {
      lines.push(`You have had ${relationship.interactionCount} interactions with this person.`)
    }

    // Last interaction
    if (relationship.lastInteractionAt) {
      const daysSince = Math.floor(
        (Date.now() - new Date(relationship.lastInteractionAt).getTime()) / (1000 * 60 * 60 * 24)
      )
      if (daysSince > 30) {
        lines.push(`It has been ${daysSince} days since your last interaction.`)
      }
    }

    // Summary if available
    if (relationship.relationshipSummary) {
      lines.push(`Context: ${relationship.relationshipSummary}`)
    }
  }

  // Communication preferences
  if (prefs.responseStyle) {
    switch (prefs.responseStyle) {
      case 'concise':
        lines.push('This person prefers brief, to-the-point responses.')
        break
      case 'detailed':
        lines.push('This person appreciates detailed explanations.')
        break
      case 'friendly':
        lines.push('This person responds well to a friendly, conversational tone.')
        break
    }
  }

  // Topics discussed
  if (prefs.topicsDiscussed && prefs.topicsDiscussed.length > 0) {
    lines.push(`Past topics discussed: ${prefs.topicsDiscussed.slice(-5).join(', ')}`)
  }

  return lines.join('\n')
}
