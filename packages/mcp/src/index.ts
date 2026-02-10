/**
 * @cgk/mcp - MCP (Model Context Protocol) server utilities
 *
 * @ai-pattern mcp-server
 * @ai-note Tools for building MCP servers for AI assistants
 */

// Server factory
export { createMCPServer, type MCPServer, type MCPServerConfig } from './server'

// Tool definition
export { defineTool, type ToolDefinition, type ToolHandler } from './tools'

// Resource definition
export { defineResource, type ResourceDefinition, type ResourceHandler } from './resources'

// Prompt definition
export { definePrompt, type PromptDefinition, type PromptHandler } from './prompts'

// Context helpers
export { createContext, type MCPContext } from './context'

// Types
export type {
  Tool,
  Resource,
  Prompt,
  ToolResult,
  ResourceContent,
  PromptMessage,
} from './types'
