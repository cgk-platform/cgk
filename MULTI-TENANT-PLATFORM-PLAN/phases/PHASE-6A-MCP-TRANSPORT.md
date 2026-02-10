# PHASE-6A: MCP Transport Layer

**Duration**: 1 week (Week 22)
**Depends On**: PHASE-5E (Jobs scheduled tasks complete)
**Parallel With**: None
**Blocks**: PHASE-6B (MCP Tools)

---

## Goal

Implement Streamable HTTP transport for the MCP server, replacing the deprecated SSE transport. This enables per-request authentication, stateless scaling, and bidirectional communication required by protocol version 2025-03-26+.

---

## Success Criteria

- [ ] POST `/api/mcp` endpoint handles all MCP message types
- [ ] Per-request authentication validates tenant and user on every call
- [ ] Protocol version validation rejects unsupported versions
- [ ] Streaming responses work for long-running tools
- [ ] Session management tracks active MCP sessions
- [ ] Token usage logging captures all tool invocations
- [ ] Edge runtime compatible (no Node.js-only APIs)

---

## Deliverables

### API Route
- `apps/mcp-server/src/app/api/mcp/route.ts` - Main POST handler

### Core Package
- `packages/mcp/src/handler.ts` - MCPHandler class
- `packages/mcp/src/session.ts` - Session management (createMCPSession)
- `packages/mcp/src/streaming.ts` - Streaming response utilities
- `packages/mcp/src/types.ts` - MCP protocol types

### Authentication
- `apps/mcp-server/src/lib/auth.ts` - authenticateRequest function

---

## Constraints

- MUST use Streamable HTTP transport (NOT SSE - deprecated in protocol 2024-11-05)
- MUST authenticate every request (no session-based auth)
- MUST support protocol versions: 2024-11-05, 2025-03-26, 2025-06-18
- MUST use Edge runtime for global deployment
- MUST NOT block on streaming tools (use async generators)

---

## Pattern References

**Skills to invoke:**
- `/mcp-builder` - REQUIRED before any MCP work; contains transport patterns, tool naming conventions, response formats

**MCPs to consult:**
- Context7 MCP: "MCP TypeScript SDK streamable HTTP transport"
- Context7 MCP: "MCP protocol version 2025-03-26 specification"

**RAWDOG code to reference:**
- `src/app/api/mcp/route.ts` - Current MCP implementation patterns
- `src/lib/auth/debug.ts` - Authentication wrapper pattern (getAuthUserId)

**Spec documents:**
- `ARCHITECTURE.md` - Multi-tenant context injection patterns

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Session storage strategy (Redis vs in-memory with TTL)
2. Token usage log schema and storage location
3. Error response formatting (JSON-RPC 2.0 compliant)
4. Streaming chunk format and termination signaling
5. Protocol version negotiation strategy

---

## Tasks

### [PARALLEL] Foundation Setup
- [ ] Create `packages/mcp/` package structure with package.json
- [ ] Define MCP protocol types (MCPMessage, MCPResponse, MCPError)
- [ ] Create session types and createMCPSession function
- [ ] Implement authenticateRequest with tenant/user extraction

### [SEQUENTIAL after Foundation] Handler Implementation
- [ ] Implement MCPHandler class with constructor (tenantId, userId)
- [ ] Add `initialize()` method with protocol version validation
- [ ] Add `listTools()` method with token usage logging
- [ ] Add `callTool()` method with timing and error handling
- [ ] Add `listResources()` method
- [ ] Add `readResource()` method

### [SEQUENTIAL after Handler] Streaming Support
- [ ] Define STREAMING_TOOLS list (search_orders, export_analytics, bulk_update)
- [ ] Implement `requiresStreaming()` method
- [ ] Implement `callToolStreaming()` async generator
- [ ] Create `streamingResponse()` helper for ReadableStream construction

### [SEQUENTIAL after Streaming] Route Assembly
- [ ] Create POST handler at `/api/mcp/route.ts`
- [ ] Wire up message routing (switch on message.method)
- [ ] Add streaming response branching for applicable tools
- [ ] Add error handling for unknown methods (code: -32601)
- [ ] Configure Edge runtime

---

## Definition of Done

- [ ] All MCP message types handled correctly (initialize, tools/list, tools/call, resources/list, resources/read)
- [ ] Authentication fails gracefully with 401 for invalid requests
- [ ] Streaming responses deliver chunks without blocking
- [ ] Session IDs generated and tracked per client connection
- [ ] Token usage logged for analytics
- [ ] `npx tsc --noEmit` passes
- [ ] Manual testing confirms protocol compliance
