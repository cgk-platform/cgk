# Phase 6: MCP Server Rebuild

**Duration**: 2 weeks
**Focus**: Streamable HTTP transport, multi-tenant tools, Claude Connector integration

---

## Required Reading Before Starting

**Planning docs location**: `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/`

| Document | Full Path |
|----------|-----------|
| INTEGRATIONS | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/CODEBASE-ANALYSIS/INTEGRATIONS-2025-02-10.md` |
| PLAN.md | `/Users/holdenthemic/Documents/cgk/MULTI-TENANT-PLATFORM-PLAN/PLAN.md` |

---

## Required Skills for This Phase

**CRITICAL**: This phase REQUIRES the `mcp-builder` skill for proper MCP development.

| Skill | Usage |
|-------|-------|
| `/mcp-builder` | **REQUIRED** - MCP best practices, tool design, transport patterns |
| Context7 MCP | TypeScript SDK documentation lookup |
| `obra/superpowers@test-driven-development` | TDD for tool implementations |

### Pre-Phase Checklist
```bash
# Verify skills are installed
npx skills list | grep -E "(mcp-builder|documentation-lookup|test-driven)"

# If missing, install:
npx skills add anthropics/skills@mcp-builder -g -y
npx skills add upstash/context7@documentation-lookup -g -y
npx skills add obra/superpowers@test-driven-development -g -y
```

### MCP Development Workflow
1. **MUST invoke `/mcp-builder`** before ANY MCP work
2. Read all reference files in the skill:
   - `reference/mcp_best_practices.md` - Server naming, tool design, transport
   - `reference/node_mcp_server.md` - TypeScript patterns
   - `reference/evaluation.md` - Creating tool evaluations
3. Use Context7 MCP to fetch latest TypeScript SDK docs
4. Follow the 4-phase process: Research → Implementation → Review → Evaluation

### Key MCP Builder Guidelines
- **Transport**: Use Streamable HTTP (SSE deprecated in protocol 2024-11-05)
- **Tool Naming**: `{service}_{action}_{resource}` format (e.g., `platform_list_orders`)
- **Annotations**: Always include `readOnlyHint`, `destructiveHint`, `idempotentHint`
- **Responses**: Support both JSON and Markdown formats
- **Pagination**: Return `has_more`, `next_offset`, `total_count`

---

## Objectives

1. Implement Streamable HTTP transport (deprecate SSE)
2. Rebuild tool organization for multi-tenancy
3. Integrate with Claude Connector
4. Implement proper rate limiting and context management
5. Add tool usage analytics

---

## Why Streamable HTTP

| Feature | SSE (Old) | Streamable HTTP (New) |
|---------|-----------|----------------------|
| Direction | Unidirectional | Bidirectional |
| Auth | Per-connection | Per-request |
| Scaling | Connection-heavy | Stateless |
| Security | Door propped open | Per-request validation |
| Protocol | 2024-11-05 | 2025-03-26+ |

---

## Week 1: Transport & Core

### Streamable HTTP Handler

```typescript
// apps/mcp-server/src/app/api/mcp/route.ts
import { MCPHandler } from '@repo/mcp'
import { authenticateRequest } from '@/lib/auth'

export const runtime = 'edge'

export async function POST(req: Request) {
  // Authenticate every request
  const auth = await authenticateRequest(req)
  if (!auth.success) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { tenantId, userId } = auth

  // Parse MCP message
  const message = await req.json()

  // Handle based on method
  const handler = new MCPHandler({ tenantId, userId })

  switch (message.method) {
    case 'initialize':
      return Response.json(await handler.initialize(message))

    case 'tools/list':
      return Response.json(await handler.listTools(message))

    case 'tools/call':
      // Check if streaming needed
      if (handler.requiresStreaming(message.params.name)) {
        return streamingResponse(handler, message)
      }
      return Response.json(await handler.callTool(message))

    case 'resources/list':
      return Response.json(await handler.listResources(message))

    case 'resources/read':
      return Response.json(await handler.readResource(message))

    default:
      return Response.json({
        jsonrpc: '2.0',
        id: message.id,
        error: { code: -32601, message: 'Method not found' }
      })
  }
}

async function streamingResponse(handler: MCPHandler, message: MCPMessage) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of handler.callToolStreaming(message)) {
          const data = `data: ${JSON.stringify(chunk)}\n\n`
          controller.enqueue(encoder.encode(data))
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    }
  })
}
```

### MCP Handler Class

```typescript
// packages/mcp/src/handler.ts
import { getToolsForTenant, executeToolForTenant } from './tools'

export class MCPHandler {
  private tenantId: string
  private userId: string
  private sessionId: string | null = null

  constructor(config: { tenantId: string; userId: string }) {
    this.tenantId = config.tenantId
    this.userId = config.userId
  }

  async initialize(message: MCPMessage): Promise<MCPResponse> {
    const { protocolVersion } = message.params

    // Validate protocol version
    const supportedVersions = ['2024-11-05', '2025-03-26', '2025-06-18']
    if (!supportedVersions.includes(protocolVersion)) {
      return {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32602,
          message: `Unsupported protocol version: ${protocolVersion}`,
        }
      }
    }

    // Create session
    this.sessionId = await createMCPSession({
      tenantId: this.tenantId,
      userId: this.userId,
      protocolVersion,
    })

    return {
      jsonrpc: '2.0',
      id: message.id,
      result: {
        protocolVersion,
        capabilities: {
          tools: { listChanged: true },
          resources: { subscribe: false, listChanged: false },
        },
        serverInfo: {
          name: 'Multi-Tenant Platform MCP',
          version: '2.0.0',
        }
      }
    }
  }

  async listTools(message: MCPMessage): Promise<MCPResponse> {
    const tools = await getToolsForTenant(this.tenantId)

    // Log token usage
    await logTokenUsage({
      sessionId: this.sessionId,
      event: 'tools_list',
      toolCount: tools.length,
    })

    return {
      jsonrpc: '2.0',
      id: message.id,
      result: { tools }
    }
  }

  async callTool(message: MCPMessage): Promise<MCPResponse> {
    const { name, arguments: args } = message.params
    const startTime = Date.now()

    try {
      const result = await executeToolForTenant(
        name,
        args,
        this.tenantId,
        this.userId
      )

      // Log usage
      await logToolUsage({
        sessionId: this.sessionId,
        tenantId: this.tenantId,
        toolName: name,
        durationMs: Date.now() - startTime,
        success: true,
      })

      return {
        jsonrpc: '2.0',
        id: message.id,
        result: { content: result }
      }
    } catch (error) {
      await logToolUsage({
        sessionId: this.sessionId,
        tenantId: this.tenantId,
        toolName: name,
        durationMs: Date.now() - startTime,
        success: false,
        error: error.message,
      })

      return {
        jsonrpc: '2.0',
        id: message.id,
        error: {
          code: -32603,
          message: error.message,
        }
      }
    }
  }

  requiresStreaming(toolName: string): boolean {
    const streamingTools = [
      'search_orders',
      'export_analytics',
      'bulk_update',
    ]
    return streamingTools.includes(toolName)
  }

  async *callToolStreaming(message: MCPMessage) {
    const { name, arguments: args } = message.params

    const generator = executeToolStreaming(
      name,
      args,
      this.tenantId,
      this.userId
    )

    for await (const chunk of generator) {
      yield {
        type: 'progress',
        data: chunk,
      }
    }
  }
}
```

---

## Week 2: Tools & Integration

### Multi-Tenant Tool Registry

```typescript
// packages/mcp/src/tools/registry.ts
import { commerceTools } from './commerce'
import { contentTools } from './content'
import { creatorTools } from './creators'
import { analyticsTools } from './analytics'
import { operationsTools } from './operations'

export const toolCategories = {
  commerce: commerceTools,
  content: contentTools,
  creators: creatorTools,
  analytics: analyticsTools,
  operations: operationsTools,
} as const

export async function getToolsForTenant(tenantId: string) {
  const config = await getTenantConfig(tenantId)
  const allTools: Tool[] = []

  for (const [category, tools] of Object.entries(toolCategories)) {
    // Filter based on tenant features
    for (const tool of tools) {
      if (isToolEnabledForTenant(tool, config)) {
        allTools.push({
          ...tool,
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })
      }
    }
  }

  return allTools
}

function isToolEnabledForTenant(tool: Tool, config: TenantConfig): boolean {
  // Check feature flags
  if (tool.requiredFeature && !config.features[tool.requiredFeature]) {
    return false
  }

  // Check integrations
  if (tool.requiredIntegration) {
    if (tool.requiredIntegration === 'shopify' && !config.shopify) {
      return false
    }
    if (tool.requiredIntegration === 'stripe' && !config.stripe) {
      return false
    }
  }

  return true
}
```

### Commerce Tools

```typescript
// packages/mcp/src/tools/commerce/index.ts
export const commerceTools: Tool[] = [
  {
    name: 'list_orders',
    description: 'List orders with filtering options',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['all', 'paid', 'pending', 'refunded'] },
        dateFrom: { type: 'string', format: 'date' },
        dateTo: { type: 'string', format: 'date' },
        limit: { type: 'number', default: 50 },
      },
    },
    requiredIntegration: 'shopify',
  },
  {
    name: 'get_order',
    description: 'Get detailed order information',
    inputSchema: {
      type: 'object',
      properties: {
        orderId: { type: 'string' },
      },
      required: ['orderId'],
    },
    requiredIntegration: 'shopify',
  },
  {
    name: 'search_customers',
    description: 'Search customers by email, name, or phone',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        limit: { type: 'number', default: 20 },
      },
      required: ['query'],
    },
  },
  {
    name: 'get_revenue_summary',
    description: 'Get revenue summary for a date range',
    inputSchema: {
      type: 'object',
      properties: {
        dateFrom: { type: 'string', format: 'date' },
        dateTo: { type: 'string', format: 'date' },
      },
    },
  },
]

export const commerceHandlers: Record<string, ToolHandler> = {
  list_orders: async (args, tenantId) => {
    return withTenant(tenantId, async () => {
      const orders = await sql`
        SELECT * FROM orders
        WHERE
          CASE WHEN ${args.status}::text != 'all'
            THEN financial_status = ${args.status}
            ELSE TRUE
          END
          AND CASE WHEN ${args.dateFrom}::date IS NOT NULL
            THEN created_at >= ${args.dateFrom}
            ELSE TRUE
          END
          AND CASE WHEN ${args.dateTo}::date IS NOT NULL
            THEN created_at <= ${args.dateTo}
            ELSE TRUE
          END
        ORDER BY created_at DESC
        LIMIT ${args.limit || 50}
      `

      return [{
        type: 'text',
        text: JSON.stringify(orders, null, 2),
      }]
    })
  },

  get_order: async (args, tenantId) => {
    return withTenant(tenantId, async () => {
      const [order] = await sql`
        SELECT o.*, json_agg(li) as line_items
        FROM orders o
        LEFT JOIN line_items li ON o.id = li.order_id
        WHERE o.id = ${args.orderId}
        GROUP BY o.id
      `

      if (!order) {
        return [{ type: 'text', text: 'Order not found' }]
      }

      return [{
        type: 'text',
        text: JSON.stringify(order, null, 2),
      }]
    })
  },
}
```

### Claude Connector Integration

```typescript
// apps/mcp-server/src/lib/claude-connector.ts
export const connectorManifest = {
  schema_version: '1.0',
  name: 'Multi-Tenant Platform',
  description: 'Manage your e-commerce brands',
  authentication: {
    type: 'oauth2',
    authorization_url: '/api/mcp/oauth/authorize',
    token_url: '/api/mcp/oauth/token',
    scopes: {
      read: 'Read data',
      write: 'Write data',
      admin: 'Admin access',
    },
  },
  transport: {
    type: 'streamable-http',
    url: '/api/mcp',
  },
}

// OAuth endpoints
export async function handleAuthorize(req: Request) {
  const params = new URL(req.url).searchParams
  const clientId = params.get('client_id')
  const redirectUri = params.get('redirect_uri')
  const scope = params.get('scope')
  const state = params.get('state')
  const codeChallenge = params.get('code_challenge')

  // Validate PKCE
  if (!codeChallenge || params.get('code_challenge_method') !== 'S256') {
    return Response.json({ error: 'PKCE required' }, { status: 400 })
  }

  // Validate redirect URI
  if (!isValidRedirectUri(redirectUri)) {
    return Response.json({ error: 'Invalid redirect_uri' }, { status: 400 })
  }

  // Generate authorization code
  const code = await createAuthorizationCode({
    clientId,
    codeChallenge,
    scope,
    tenantId: await getTenantFromSession(req),
    userId: await getUserFromSession(req),
  })

  // Redirect back to Claude
  const redirect = new URL(redirectUri)
  redirect.searchParams.set('code', code)
  redirect.searchParams.set('state', state)

  return Response.redirect(redirect.toString())
}

export async function handleToken(req: Request) {
  const body = await req.formData()
  const grantType = body.get('grant_type')
  const code = body.get('code')
  const codeVerifier = body.get('code_verifier')

  // Validate code
  const authCode = await getAuthorizationCode(code as string)
  if (!authCode) {
    return Response.json({ error: 'Invalid code' }, { status: 400 })
  }

  // Verify PKCE
  const challenge = await sha256(codeVerifier as string)
  if (challenge !== authCode.codeChallenge) {
    return Response.json({ error: 'Invalid code_verifier' }, { status: 400 })
  }

  // Generate tokens
  const accessToken = await createAccessToken(authCode)
  const refreshToken = await createRefreshToken(authCode)

  return Response.json({
    access_token: accessToken,
    token_type: 'Bearer',
    expires_in: 7 * 24 * 60 * 60, // 7 days
    refresh_token: refreshToken,
    scope: authCode.scope,
  })
}
```

### Rate Limiting

```typescript
// packages/mcp/src/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

const rateLimiters = {
  // Per-tenant limits
  tenant: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, '1 m'),
    prefix: 'mcp:tenant',
  }),

  // Per-tool limits
  tool: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, '1 m'),
    prefix: 'mcp:tool',
  }),

  // AI cost limits
  ai: new Ratelimit({
    redis,
    limiter: Ratelimit.tokenBucket(500, '1 d', 100), // 500 cents/day
    prefix: 'mcp:ai',
  }),
}

export async function checkRateLimit(
  tenantId: string,
  toolName: string,
  aiCost?: number
): Promise<{ allowed: boolean; remaining: number }> {
  // Check tenant limit
  const tenantResult = await rateLimiters.tenant.limit(tenantId)
  if (!tenantResult.success) {
    return { allowed: false, remaining: 0 }
  }

  // Check tool limit
  const toolKey = `${tenantId}:${toolName}`
  const toolResult = await rateLimiters.tool.limit(toolKey)
  if (!toolResult.success) {
    return { allowed: false, remaining: 0 }
  }

  // Check AI cost limit if applicable
  if (aiCost) {
    const aiResult = await rateLimiters.ai.limit(tenantId, aiCost)
    if (!aiResult.success) {
      return { allowed: false, remaining: 0 }
    }
  }

  return { allowed: true, remaining: tenantResult.remaining }
}
```

---

## Success Criteria

- [ ] Streamable HTTP transport working
- [ ] All 70+ tools migrated
- [ ] Claude Connector integration working
- [ ] Rate limiting in place
- [ ] Analytics dashboard functional
- [ ] Per-tenant tool filtering working

---

## Dependencies for Next Phase

Phase 7 (Migration) requires:
- [x] All systems rebuilt
- [x] Multi-tenancy working
