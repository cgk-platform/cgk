/**
 * MCP Tool definition utilities
 */

import type { JSONSchema, ToolResult } from './types'

export type ToolHandler = (args: Record<string, unknown>) => Promise<ToolResult>

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: JSONSchema
  handler: ToolHandler
}

/**
 * Define an MCP tool
 */
export function defineTool(definition: ToolDefinition): ToolDefinition {
  return definition
}

/**
 * Helper to create a text result
 */
export function textResult(text: string): ToolResult {
  return {
    content: [{ type: 'text', text }],
  }
}

/**
 * Helper to create an error result
 */
export function errorResult(message: string): ToolResult {
  return {
    content: [{ type: 'text', text: message }],
    isError: true,
  }
}

/**
 * Helper to create a JSON result
 */
export function jsonResult(data: unknown): ToolResult {
  return {
    content: [{ type: 'text', text: JSON.stringify(data, null, 2) }],
  }
}

/**
 * Example tool definitions
 */
export const exampleTools = {
  getOrders: defineTool({
    name: 'get_orders',
    description: 'Get recent orders for the current tenant',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum number of orders to return',
          default: 10,
        },
        status: {
          type: 'string',
          description: 'Filter by order status',
          enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
        },
      },
    },
    async handler(args) {
      // TODO: Implement with tenant context
      return textResult(`Would fetch ${args.limit ?? 10} orders with status: ${args.status ?? 'any'}`)
    },
  }),

  getProducts: defineTool({
    name: 'get_products',
    description: 'Get products from the catalog',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of products to return',
          default: 10,
        },
      },
    },
    async handler(args) {
      // TODO: Implement with commerce client
      return textResult(`Would search products for: "${args.query ?? ''}" (limit: ${args.limit ?? 10})`)
    },
  }),
}
