# @cgk/mcp - AI Development Guide

> **Package Version**: 0.0.0
> **Last Updated**: 2025-02-10

---

## Purpose

MCP (Model Context Protocol) server utilities for the CGK platform. Enables building AI assistant tools that interact with commerce data, orders, and platform functionality.

---

## Quick Reference

```typescript
import { createMCPServer, defineTool, defineResource, definePrompt } from '@cgk/mcp'
```

---

## Key Patterns

### Pattern 1: Creating an MCP Server

```typescript
import { createMCPServer } from '@cgk/mcp'

const server = createMCPServer({
  name: 'cgk-commerce',
  version: '1.0.0',
  description: 'CGK Commerce MCP Server',
})

// Register tools, resources, prompts...

await server.start()
```

### Pattern 2: Defining Tools

```typescript
import { defineTool, textResult, jsonResult } from '@cgk/mcp'

const getOrdersTool = defineTool({
  name: 'get_orders',
  description: 'Get recent orders for the current tenant',
  inputSchema: {
    type: 'object',
    properties: {
      limit: { type: 'number', description: 'Max orders to return' },
      status: { type: 'string', enum: ['pending', 'shipped', 'delivered'] },
    },
  },
  async handler(args) {
    const orders = await fetchOrders(args.limit, args.status)
    return jsonResult(orders)
  },
})

server.registerTool(getOrdersTool)
```

### Pattern 3: Defining Resources

```typescript
import { defineResource } from '@cgk/mcp'

const platformConfigResource = defineResource({
  uri: 'cgk://config/platform',
  name: 'Platform Configuration',
  description: 'Current platform settings',
  mimeType: 'application/json',
  async handler() {
    const config = await getConfig()
    return {
      uri: 'cgk://config/platform',
      mimeType: 'application/json',
      text: JSON.stringify(config, null, 2),
    }
  },
})

server.registerResource(platformConfigResource)
```

### Pattern 4: Defining Prompts

```typescript
import { definePrompt } from '@cgk/mcp'

const analyzeOrdersPrompt = definePrompt({
  name: 'analyze_orders',
  description: 'Analyze order patterns and trends',
  arguments: [
    { name: 'timeframe', description: 'Analysis period' },
  ],
  async handler(args) {
    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Analyze orders for the last ${args.timeframe}...`,
        },
      },
    ]
  },
})

server.registerPrompt(analyzeOrdersPrompt)
```

---

## File Map

| File | Purpose | Key Exports |
|------|---------|-------------|
| `index.ts` | Public exports | All exports |
| `types.ts` | MCP types | `Tool`, `Resource`, `Prompt` |
| `server.ts` | Server factory | `createMCPServer` |
| `tools.ts` | Tool utilities | `defineTool`, `textResult` |
| `resources.ts` | Resource utilities | `defineResource` |
| `prompts.ts` | Prompt utilities | `definePrompt` |
| `context.ts` | Context management | `createContext`, `withContext` |

---

## Exports Reference

### Factory Functions

```typescript
createMCPServer(config: MCPServerConfig): MCPServer
defineTool(definition: ToolDefinition): ToolDefinition
defineResource(definition: ResourceDefinition): ResourceDefinition
definePrompt(definition: PromptDefinition): PromptDefinition
```

### Result Helpers

```typescript
textResult(text: string): ToolResult
jsonResult(data: unknown): ToolResult
errorResult(message: string): ToolResult
```

---

## Dependencies

| Dependency | Why |
|------------|-----|
| `@modelcontextprotocol/sdk` | MCP protocol implementation |
| `@cgk/core` | Shared types |
| `@cgk/db` | Data access |
| `@cgk/auth` | Authentication context |

---

## Common Gotchas

### 1. Tool schemas must be valid JSON Schema

```typescript
// WRONG - Missing type
inputSchema: { properties: { name: {} } }

// CORRECT - Include type
inputSchema: {
  type: 'object',
  properties: { name: { type: 'string' } },
}
```

### 2. Always handle errors gracefully

```typescript
async handler(args) {
  try {
    const data = await fetchData(args)
    return jsonResult(data)
  } catch (error) {
    return errorResult(`Failed: ${error.message}`)
  }
}
```

### 3. Use context for tenant isolation

```typescript
import { withContext, getContext } from '@cgk/mcp'

async handler(args) {
  const { tenant } = getContext()
  // Use tenant context for data access
}
```

---

## Integration Points

### Used by:
- AI assistants (Claude, etc.)
- Developer tools

### Uses:
- `@cgk/core` - Types
- `@cgk/db` - Data access
- `@cgk/auth` - User context
