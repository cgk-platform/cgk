/**
 * MCP Prompt definition utilities
 */

import type { PromptArgument, TextContent, ImageContent, EmbeddedResource, PromptRole } from './types'

/**
 * Prompt message for handler return type
 * Uses specific content types for type safety
 */
export interface PromptHandlerMessage {
  role: PromptRole
  content: TextContent | ImageContent | EmbeddedResource
}

/**
 * Prompt handler function type
 */
export type PromptHandler = (args: Record<string, unknown>) => Promise<PromptHandlerMessage[]>

/**
 * Prompt definition
 */
export interface PromptDefinition {
  name: string
  description?: string
  arguments?: PromptArgument[]
  handler: PromptHandler
}

/**
 * Define an MCP prompt
 */
export function definePrompt(definition: PromptDefinition): PromptDefinition {
  return definition
}

/**
 * Example prompt definitions
 */
export const examplePrompts = {
  analyzeOrders: definePrompt({
    name: 'analyze_orders',
    description: 'Analyze recent order patterns',
    arguments: [
      { name: 'timeframe', description: 'Time period to analyze', required: false },
    ],
    async handler(args) {
      const timeframe = (args.timeframe as string) ?? '7d'
      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Analyze order patterns for the last ${timeframe}. Look for trends in:
- Order volume
- Average order value
- Popular products
- Geographic distribution
- Time of day patterns

Provide actionable insights and recommendations.`,
          },
        },
      ]
    },
  }),

  generateProductDescription: definePrompt({
    name: 'generate_product_description',
    description: 'Generate a product description',
    arguments: [
      { name: 'productId', description: 'The product ID', required: true },
      { name: 'tone', description: 'Desired tone (professional, casual, luxury)', required: false },
    ],
    async handler(args) {
      const tone = (args.tone as string) ?? 'professional'
      return [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `Generate a ${tone} product description for product ${args.productId}.

Include:
- Key features and benefits
- Target audience appeal
- Call to action
- SEO-friendly keywords

Keep it concise but compelling.`,
          },
        },
      ]
    },
  }),
}
