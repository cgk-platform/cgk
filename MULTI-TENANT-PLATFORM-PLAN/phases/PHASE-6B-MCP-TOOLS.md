# PHASE-6B: MCP Tools & Integration

> **STATUS**: ✅ COMPLETE (2026-02-12)
> **Completed By**: 4 parallel agents (Commerce, Creators, Analytics, System)

**Duration**: 1 week (Week 23)
**Depends On**: PHASE-6A (MCP Transport Layer)
**Parallel With**: None
**Blocks**: PHASE-7A (Migration Data)

---

## ⚠️ MANDATORY: Tenant Isolation

**READ FIRST**: [TENANT-ISOLATION.md](../TENANT-ISOLATION.md)

MCP tools are AI-accessible, making tenant isolation CRITICAL. An AI could accidentally query wrong tenant data.

Key requirements for this phase:
- Every MCP tool receives `tenantId` from authenticated session
- Tool implementations MUST use `withTenant()` for all data access
- `getToolsForTenant()` filters available tools based on tenant config
- Rate limits are per-tenant (not platform-wide)
- Audit logs capture which tenant each tool invocation accessed

---

## Goal

Build the multi-tenant tool registry with 70+ tools, implement Claude Connector OAuth integration, and add rate limiting with usage analytics. Tools must filter based on tenant configuration and feature flags.

---

## Success Criteria

- [ ] Tool registry with 5 categories: commerce, content, creators, analytics, operations
- [ ] All 70+ tools migrated from existing MCP server
- [ ] `getToolsForTenant()` filters tools based on tenant config
- [ ] `isToolEnabledForTenant()` checks feature flags and integrations
- [ ] Claude Connector OAuth flow complete (authorize + token endpoints)
- [ ] PKCE validation for OAuth security
- [ ] Rate limiting enforced at tenant, tool, and AI cost levels
- [ ] Usage analytics dashboard functional

---

## Deliverables

### Tool Registry
- `packages/mcp/src/tools/registry.ts` - toolCategories, getToolsForTenant, isToolEnabledForTenant
- `packages/mcp/src/tools/commerce/index.ts` - Commerce tools and handlers
- `packages/mcp/src/tools/content/index.ts` - Content tools
- `packages/mcp/src/tools/creators/index.ts` - Creator tools
- `packages/mcp/src/tools/analytics/index.ts` - Analytics tools
- `packages/mcp/src/tools/operations/index.ts` - Operations tools

### Claude Connector
- `apps/mcp-server/src/lib/claude-connector.ts` - Manifest, handleAuthorize, handleToken
- `apps/mcp-server/src/app/api/mcp/oauth/authorize/route.ts` - OAuth authorize endpoint
- `apps/mcp-server/src/app/api/mcp/oauth/token/route.ts` - OAuth token endpoint
- `apps/mcp-server/src/app/api/mcp/manifest/route.ts` - Connector manifest

### Rate Limiting
- `packages/mcp/src/rate-limit.ts` - Rate limiters and checkRateLimit function

### Analytics
- `packages/mcp/src/analytics.ts` - Usage tracking and aggregation

---

## Constraints

- MUST follow tool naming convention: `{service}_{action}_{resource}` (e.g., `platform_list_orders`)
- MUST include tool annotations: readOnlyHint, destructiveHint, idempotentHint
- MUST support both JSON and Markdown response formats
- MUST implement pagination: has_more, next_offset, total_count
- MUST validate PKCE for all OAuth flows (code_challenge_method: S256)
- MUST validate redirect URIs against allowlist

---

## Pattern References

**Skills to invoke:**
- `/mcp-builder` - Tool design patterns, annotations, response formats
- Context7 MCP: "Upstash Ratelimit token bucket sliding window"

**RAWDOG code to reference:**
- `src/app/api/mcp/tools/` - Existing tool implementations
- `src/lib/rate-limit.ts` - Rate limiting patterns with Upstash
- `src/app/api/admin/orders/route.ts` - Order query patterns for commerce tools

**Spec documents:**
- `ARCHITECTURE.md` - withTenant() usage for database queries
- `CODEBASE-ANALYSIS/INTEGRATIONS-2025-02-10.md` - Integration requirements

---

## AI Discretion Areas

The implementing agent should determine the best approach for:
1. Tool categorization for tools that span multiple domains
2. Rate limit thresholds per tier (free, pro, enterprise)
3. AI cost calculation methodology (token estimation)
4. OAuth token expiration and refresh strategy
5. Analytics aggregation granularity (minute, hour, day)

---

## Tasks

### [PARALLEL] Tool Implementation
- [ ] Create tool registry structure with toolCategories object
- [ ] Implement commerce tools: list_orders, get_order, search_customers, get_revenue_summary
- [ ] Implement commerce handlers with withTenant() database queries
- [ ] Implement content tools (landing pages, blog posts, reviews)
- [ ] Implement creator tools (directory, payouts, projects)
- [ ] Implement analytics tools (metrics, dashboards, exports)
- [ ] Implement operations tools (health, logs, feature flags)

### [PARALLEL] Tool Filtering
- [ ] Implement `getToolsForTenant()` function
- [ ] Implement `isToolEnabledForTenant()` with feature flag checks
- [ ] Add integration requirement checking (shopify, stripe)
- [ ] Add tool annotations to all tools

### [SEQUENTIAL after Tool Implementation] Claude Connector
- [ ] Create connector manifest with schema_version 1.0
- [ ] Define OAuth scopes (read, write, admin)
- [ ] Implement `handleAuthorize()` with PKCE validation
- [ ] Implement `handleToken()` with code_verifier check
- [ ] Create createAuthorizationCode function
- [ ] Create createAccessToken and createRefreshToken functions
- [ ] Implement redirect URI validation (isValidRedirectUri)
- [ ] Wire up OAuth route handlers

### [SEQUENTIAL after Tool Implementation] Rate Limiting
- [ ] Create tenant rate limiter (100/min sliding window)
- [ ] Create tool rate limiter (20/min sliding window)
- [ ] Create AI cost limiter (500 cents/day token bucket)
- [ ] Implement `checkRateLimit()` combining all limiters
- [ ] Integrate rate limiting into MCPHandler.callTool()

### [SEQUENTIAL after all above] Analytics
- [ ] Define usage event schema (sessionId, tenantId, toolName, durationMs, success, error)
- [ ] Implement logToolUsage function
- [ ] Create usage aggregation queries
- [ ] Build analytics dashboard data endpoints

---

## Definition of Done

- [ ] All 70+ tools registered and functional
- [ ] Tools filtered correctly per tenant configuration
- [ ] Claude Connector OAuth flow works end-to-end
- [ ] Rate limiting rejects excessive requests with appropriate errors
- [ ] Usage analytics visible in admin dashboard
- [ ] `npx tsc --noEmit` passes
- [ ] Integration tests verify tool execution with tenant isolation
