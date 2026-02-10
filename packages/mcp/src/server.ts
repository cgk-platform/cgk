/**
 * MCP Server factory
 */

import type { PromptDefinition } from './prompts'
import type { ResourceDefinition } from './resources'
import type { ToolDefinition } from './tools'
import type { Tool, Resource, Prompt, ToolResult, ResourceContent, PromptMessage } from './types'

export interface MCPServerConfig {
  name: string
  version: string
  description?: string
}

export interface MCPServer {
  readonly name: string
  readonly version: string

  // Registration
  registerTool(definition: ToolDefinition): void
  registerResource(definition: ResourceDefinition): void
  registerPrompt(definition: PromptDefinition): void

  // Handlers
  listTools(): Tool[]
  listResources(): Resource[]
  listPrompts(): Prompt[]

  callTool(name: string, args: Record<string, unknown>): Promise<ToolResult>
  readResource(uri: string): Promise<ResourceContent>
  getPrompt(name: string, args?: Record<string, unknown>): Promise<PromptMessage[]>

  // Lifecycle
  start(): Promise<void>
  stop(): Promise<void>
}

/**
 * Create an MCP server
 */
export function createMCPServer(config: MCPServerConfig): MCPServer {
  const tools = new Map<string, ToolDefinition>()
  const resources = new Map<string, ResourceDefinition>()
  const prompts = new Map<string, PromptDefinition>()

  return {
    name: config.name,
    version: config.version,

    registerTool(definition) {
      tools.set(definition.name, definition)
    },

    registerResource(definition) {
      resources.set(definition.uri, definition)
    },

    registerPrompt(definition) {
      prompts.set(definition.name, definition)
    },

    listTools() {
      return Array.from(tools.values()).map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      }))
    },

    listResources() {
      return Array.from(resources.values()).map((r) => ({
        uri: r.uri,
        name: r.name,
        description: r.description,
        mimeType: r.mimeType,
      }))
    },

    listPrompts() {
      return Array.from(prompts.values()).map((p) => ({
        name: p.name,
        description: p.description,
        arguments: p.arguments,
      }))
    },

    async callTool(name, args) {
      const tool = tools.get(name)
      if (!tool) {
        return {
          content: [{ type: 'text', text: `Tool not found: ${name}` }],
          isError: true,
        }
      }

      try {
        return await tool.handler(args)
      } catch (error) {
        return {
          content: [{ type: 'text', text: `Tool error: ${error instanceof Error ? error.message : String(error)}` }],
          isError: true,
        }
      }
    },

    async readResource(uri) {
      const resource = resources.get(uri)
      if (!resource) {
        throw new Error(`Resource not found: ${uri}`)
      }

      return resource.handler()
    },

    async getPrompt(name, args) {
      const prompt = prompts.get(name)
      if (!prompt) {
        throw new Error(`Prompt not found: ${name}`)
      }

      return prompt.handler(args ?? {})
    },

    async start() {
      // TODO: Start stdio transport or HTTP server
      console.log(`MCP Server ${config.name} v${config.version} starting...`)
    },

    async stop() {
      console.log(`MCP Server ${config.name} stopping...`)
    },
  }
}
