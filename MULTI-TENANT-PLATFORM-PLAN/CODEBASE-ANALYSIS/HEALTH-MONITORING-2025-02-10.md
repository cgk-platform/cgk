# RAWDOG Health Monitoring Specification
**Generated**: 2025-02-10
**Purpose**: System monitoring and alerting for multi-tenant platform

---

## Source Codebase Path

**RAWDOG Root**: `/Users/holdenthemic/Documents/rawdog-web/`

---

## Current Implementation

### Existing Health Checks

**Location**: `/Users/holdenthemic/Documents/rawdog-web/src/lib/ops/health/checks/`

| Service | File | Check Method |
|---------|------|--------------|
| Yotpo | `yotpo.ts` | API status endpoint |
| Mux | `mux.ts` | Asset list query |
| Meta | `meta.ts` | Graph API ping |
| AssemblyAI | `assemblyai.ts` | API status |

### Existing Monitoring Tables

From `/src/lib/ops/db/schema.ts`:

```sql
-- Health check results
CREATE TABLE ops_health_checks (
  id UUID PRIMARY KEY,
  service_name TEXT UNIQUE,
  check_type TEXT,
  status TEXT, -- 'healthy', 'degraded', 'unhealthy'
  response_time_ms INT,
  last_check TIMESTAMP,
  last_healthy TIMESTAMP,
  consecutive_failures INT,
  metadata JSONB
);

-- Alert aggregation
CREATE TABLE ops_alerts (
  id UUID PRIMARY KEY,
  alert_type TEXT,
  severity TEXT, -- 'critical', 'warning', 'info'
  title TEXT,
  message TEXT,
  source TEXT,
  related_error_id UUID REFERENCES ops_errors(id),
  related_health_check_id UUID REFERENCES ops_health_checks(id),
  slack_message_ts TEXT,
  slack_channel_id TEXT,
  status TEXT, -- 'active', 'acknowledged', 'resolved'
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP
);
```

---

## Multi-Tenant Health Monitoring Specification

### Health Endpoints

#### Platform-Wide Health
```
GET /api/health
Returns: Overall platform status (public, no auth)

Response:
{
  "status": "healthy" | "degraded" | "unhealthy",
  "timestamp": "2025-02-10T12:00:00Z",
  "services": {
    "database": { "status": "healthy", "latency_ms": 45 },
    "redis": { "status": "healthy", "latency_ms": 12 },
    "inngest": { "status": "healthy", "pending_jobs": 0 }
  }
}
```

#### Component-Specific Health
```
GET /api/health/db
GET /api/health/redis
GET /api/health/inngest
GET /api/health/shopify
GET /api/health/stripe
Returns: Detailed component status (requires auth)
```

#### Tenant-Specific Health
```
GET /api/health/tenant/:tenantId
Returns: Health status for specific brand (requires tenant auth)
```

---

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| API Latency P95 | >500ms | >2000ms |
| API Latency P99 | >1000ms | >5000ms |
| Error Rate | >1% | >5% |
| 5xx Error Rate | >0.5% | >2% |
| DB Connections | >80% pool | >95% pool |
| DB Latency | >100ms | >500ms |
| Redis Latency | >50ms | >200ms |
| Redis Memory | >80% | >95% |
| Failed Jobs (24h) | >10 | >50 |
| Pending Jobs | >100 | >500 |
| Webhook Failures | >5% | >15% |

---

### Service Monitoring Matrix

#### Critical Path Services (1-minute checks)
- PostgreSQL database
- Redis cache
- Inngest job queue
- Vercel functions

#### External Services (5-minute checks)
- Shopify Admin API
- Shopify Storefront API
- Stripe API
- Meta Graph API
- Google Ads API
- TikTok Ads API
- Resend email
- Mux video
- Retell voice/SMS

#### Tenant-Specific Checks
- Shopify store connectivity
- Stripe account status
- OAuth token validity
- Webhook delivery rate

---

### Logging Strategy

#### Log Levels

| Level | Purpose | Example |
|-------|---------|---------|
| ERROR | Failures requiring attention | Database connection failed |
| WARN | Degraded performance | API latency above threshold |
| INFO | Normal operations | Order synced successfully |
| DEBUG | Development only | Query execution details |

#### Required Context

Every log entry must include:
```json
{
  "timestamp": "2025-02-10T12:00:00.000Z",
  "level": "error",
  "tenantId": "rawdog",
  "userId": "user_123",
  "requestId": "req_abc",
  "action": "order.sync",
  "message": "Failed to sync order",
  "error": {
    "code": "SHOPIFY_API_ERROR",
    "message": "Rate limited"
  },
  "metadata": {
    "orderId": "order_456",
    "attempt": 3
  }
}
```

---

### Alert Routing

#### Severity-Based Routing

| Severity | Channels | Response Time |
|----------|----------|---------------|
| Critical | Slack (#rawdog-critical), SMS, PagerDuty | Immediate |
| Warning | Slack (#admin-alerts) | 15 minutes |
| Info | Slack (#ops-logs) | Best effort |

#### Tenant-Specific Routing

Each tenant can configure:
- Alert email recipients
- Slack workspace/channel
- Escalation contacts
- Business hours for non-critical alerts

---

### Dashboard Components

#### Platform Orchestrator Dashboard
```
┌─────────────────────────────────────────┐
│ System Health Overview                   │
├─────────────────────────────────────────┤
│ ✅ Database    │ 45ms  │ Healthy        │
│ ✅ Redis       │ 12ms  │ Healthy        │
│ ✅ Inngest     │ 89ms  │ Healthy        │
│ ⚠️ Meta API    │ 1.2s  │ Slow           │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Active Alerts                            │
├─────────────────────────────────────────┤
│ 🔴 [CRITICAL] Webhook failures (12)     │
│ ⚠️ [WARNING] High latency on Brand X    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Job Queue Status                         │
├─────────────────────────────────────────┤
│ Pending: 23    │ Running: 5   │ Failed: 0│
└─────────────────────────────────────────┘
```

#### Tenant Dashboard (Simplified)
```
┌─────────────────────────────────────────┐
│ Store Health                             │
├─────────────────────────────────────────┤
│ ✅ Shopify Connected                     │
│ ✅ Payments Active                       │
│ ✅ Email Delivery Normal                 │
│ ✅ Pixel Tracking Active                 │
└─────────────────────────────────────────┘
```

---

### Incident Management

#### Incident Lifecycle
1. **Detection** - Automated alert or manual report
2. **Triage** - Severity assessment and assignment
3. **Investigation** - Root cause analysis
4. **Mitigation** - Immediate fix or workaround
5. **Resolution** - Permanent fix deployed
6. **Post-mortem** - Review and prevention

#### Incident Table Schema
```sql
CREATE TABLE ops_incidents (
  id UUID PRIMARY KEY,
  alert_id UUID REFERENCES ops_alerts(id),
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT, -- 'critical', 'major', 'minor'
  status TEXT, -- 'investigating', 'identified', 'monitoring', 'resolved'
  affected_tenants TEXT[], -- tenant IDs
  timeline JSONB, -- array of status updates
  root_cause TEXT,
  resolution TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  started_at TIMESTAMP,
  resolved_at TIMESTAMP,
  post_mortem_url TEXT
);
```

---

### Metrics Collection

#### Key Performance Indicators

**Platform Metrics**
- Total active tenants
- Platform-wide revenue (MTD)
- Total API requests (24h)
- Error rate (24h)
- Uptime percentage (30d)

**Per-Tenant Metrics**
- Orders processed
- Revenue (MTD)
- API calls
- Webhook success rate
- Email delivery rate

#### Time-Series Data

Store hourly aggregates for:
- Request count
- Error count
- P50/P95/P99 latency
- Job queue depth
- Database connections

---

### Implementation Checklist

#### Phase 1: Core Monitoring
- [ ] Health endpoint for all critical services
- [ ] Basic alerting to Slack
- [ ] Error aggregation and fingerprinting
- [ ] Log aggregation with tenant context

#### Phase 2: Advanced Monitoring
- [ ] Tenant-specific health endpoints
- [ ] Custom alert thresholds per tenant
- [ ] Incident management workflow
- [ ] Post-mortem templates

#### Phase 3: Analytics
- [ ] Historical metrics dashboard
- [ ] Trend analysis
- [ ] Anomaly detection
- [ ] Capacity planning reports
