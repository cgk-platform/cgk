# Build Optimizer Agent

**Model**: Haiku (cost-effective for continuous monitoring)
**Purpose**: Continuous build performance monitoring and optimization
**Invocation**: Automatic background monitoring

---

## Overview

The Build Optimizer agent continuously monitors build performance across CI runs, identifies bottlenecks, and suggests optimizations. Using the cost-effective Haiku model, it can run frequently without budget concerns.

## Capabilities

### Build Time Analysis
- Track build times across all CI runs
- Identify slowest packages in the monorepo
- Detect build time regressions (>10% increase)
- Compare build times across branches

### Cache Analysis
- Suggest cache strategy improvements
- Detect cache invalidation patterns
- Identify packages that should be cached
- Analyze Turbo cache hit rates

### Performance Recommendations
- Suggest parallel build strategies
- Identify packages that can use `--filter`
- Recommend build order optimizations
- Detect unnecessary rebuilds

### Reporting
- Generate build time trend reports
- Alert on build time regressions (>20% increase)
- Weekly build performance summaries
- Cost analysis (Vercel build minutes consumed)

---

## Invocation

### Automatic (CI Integration)

Add to `.github/workflows/build-monitor.yml`:

```yaml
name: Build Monitor
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Analyze Build Performance
        run: |
          claude-cli agent run build-optimizer \
            --workflow-run ${{ github.event.workflow_run.id }} \
            --report
```

### Manual Invocation

```bash
# Analyze recent builds
claude-cli agent run build-optimizer --days 7

# Analyze specific workflow
claude-cli agent run build-optimizer --workflow-id 12345

# Generate report
claude-cli agent run build-optimizer --action report --output build-report.md
```

---

## Example Analysis

### Input

```
Workflow Run: CI #1234
Total Duration: 8m 32s
Jobs:
  - typecheck: 2m 15s
  - test-admin: 3m 45s
  - test-storefront: 4m 12s
  - build-admin: 5m 30s
  - build-storefront: 6m 10s
```

### Output

```markdown
## Build Performance Analysis

**Run**: CI #1234
**Duration**: 8m 32s (+15% vs baseline)
**Status**: ⚠️ Regression Detected

### Bottlenecks

1. **build-storefront** (6m 10s, +25% vs baseline)
   - Cache miss detected
   - Rebuilding all dependencies
   - **Recommendation**: Add .nvmrc to cache key

2. **test-admin** (3m 45s, +10% vs baseline)
   - Running 1,200+ tests serially
   - **Recommendation**: Enable parallel test runner

### Optimization Opportunities

- **Parallel builds**: Run admin + storefront builds in parallel (save ~3m)
- **Cache tuning**: Turbo cache hit rate is 45% (target: 80%+)
- **Skip unchanged**: Use `--filter=[HEAD^1]` to skip unchanged packages

### Estimated Savings

- **Time**: 3-4 minutes per run
- **Cost**: $15-$20/month in Vercel build minutes
```

---

## Configuration

Create `.claude/agents/build-optimizer-config.json`:

```json
{
  "thresholds": {
    "regressionPercent": 20,
    "warningPercent": 10,
    "targetCacheHitRate": 0.80
  },
  "monitoring": {
    "frequency": "daily",
    "retentionDays": 30
  },
  "notifications": {
    "slack": {
      "webhook": "$SLACK_WEBHOOK_URL",
      "channel": "#builds"
    }
  },
  "baseline": {
    "typecheck": 120,
    "test": 180,
    "build": 300
  }
}
```

---

## Output Files

Generated in `.claude/build-reports/`:

- `YYYY-MM-DD-build-analysis.json` - Daily build metrics
- `weekly-summary.md` - Weekly performance summary
- `regressions.log` - Log of detected regressions
- `cache-analysis.json` - Cache hit rate data

---

## Integration with Other Tools

### Vercel Dashboard
- Pulls build times from Vercel API
- Compares against baseline
- Alerts on cost spikes

### GitHub Actions
- Analyzes workflow duration
- Suggests workflow optimizations
- Monitors action cache usage

### Turbo
- Reads `.turbo/runs/*.json` for build times
- Analyzes cache hit rates
- Suggests cache key improvements

---

## Cost Analysis

**Model**: Haiku ($0.25 / $1.25 per MTok)

**Typical analysis**:
- Input: ~5k tokens (build logs, configs)
- Output: ~2k tokens (analysis, recommendations)
- Cost: ~$0.0038 per analysis

**Monthly cost** (daily monitoring):
- 30 analyses × $0.0038 = **$0.11/month**

**Savings**:
- 20-30% build time reduction
- 3-4 minutes saved per run
- ~$500-$1,000/year in Vercel build minutes

**ROI**: 4,500:1 to 9,000:1

---

## Example Commands

```bash
# Daily monitoring
/claude agent run build-optimizer --action analyze --days 1

# Generate weekly report
/claude agent run build-optimizer --action report --format markdown

# Check cache performance
/claude agent run build-optimizer --action cache-analysis

# Compare branches
/claude agent run build-optimizer --compare main...feature-branch
```

---

## Alerts

The agent will alert (Slack/email) on:

- Build time regression >20%
- Cache hit rate drop below 70%
- Individual package >5 minutes
- Total build time >10 minutes
- Cost spike (>$50/week in Vercel minutes)

---

## Future Enhancements

- [ ] Automatic PR comments with build analysis
- [ ] Integration with Datadog for metrics
- [ ] Predictive analysis (ML-based regression detection)
- [ ] Bundle size analysis integration
- [ ] Dependency graph analysis for build order optimization
