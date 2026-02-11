# PHASE-2AT: A/B Testing Admin Pages

**Status**: COMPLETE (2026-02-11)

**Duration**: 1.5 weeks (Week 13-14)
**Depends On**: PHASE-2AT-ABTESTING-CORE, PHASE-2AT-ABTESTING-STATS
**Parallel With**: PHASE-2AT-ABTESTING-SHIPPING
**Blocks**: None

---

## Goal

Build the complete admin interface for A/B testing including test list, creation wizard, results dashboard, data quality monitoring, and template A/B tests. Enable tenants to create, monitor, and analyze experiments without technical knowledge.

---

## Success Criteria

- [x] Test list shows all tests with status filters and quick stats
- [x] New test wizard guides through multi-step creation
- [x] Test detail page shows real-time results with charts
- [x] Statistical significance is clearly displayed
- [x] Winner recommendation appears when test is conclusive
- [x] Data quality page shows SRM, novelty, and drift alerts
- [x] Template A/B tests work for email template testing
- [x] All pages respect tenant isolation
- [x] Responsive design works on mobile
- [x] `npx tsc --noEmit` passes

---

## Admin Page Structure

```
/admin/ab-tests
├── page.tsx                       # Test list
├── layout.tsx                     # Navigation tabs
├── new/
│   └── page.tsx                   # Create wizard
├── [testId]/
│   ├── page.tsx                   # Test detail/results
│   └── edit/
│       └── page.tsx               # Edit test
├── data-quality/
│   └── page.tsx                   # Quality monitoring
└── components/
    ├── TestList.tsx               # Main list table
    ├── TestCard.tsx               # Card view item
    ├── QuickStats.tsx             # Summary stats bar
    ├── CreateWizard/
    │   ├── index.tsx              # Wizard container
    │   ├── Step1Basics.tsx        # Name, type, hypothesis
    │   ├── Step2Variants.tsx      # Variant configuration
    │   ├── Step3Targeting.tsx     # Audience targeting
    │   ├── Step4Schedule.tsx      # Start/end dates
    │   └── Step5Review.tsx        # Final review
    ├── ResultsDashboard/
    │   ├── index.tsx              # Main results view
    │   ├── SignificanceBanner.tsx # Winner/significance status
    │   ├── VariantTable.tsx       # Variant comparison table
    │   ├── ConversionChart.tsx    # Time series chart
    │   ├── SegmentAnalysis.tsx    # By device, geo, source
    │   ├── FunnelChart.tsx        # Funnel visualization
    │   └── AOVDistribution.tsx    # Revenue distribution
    ├── DataQuality/
    │   ├── SRMAlert.tsx           # Sample ratio mismatch
    │   ├── NoveltyIndicator.tsx   # Novelty effect warning
    │   ├── DriftChart.tsx         # Population drift
    │   └── QualityScoreCard.tsx   # Overall quality score
    ├── TestActions.tsx            # Start/pause/stop/end
    ├── TargetingRuleEditor.tsx    # Rule builder
    ├── GuardrailDashboard.tsx     # Guardrail status
    ├── CUPEDPanel.tsx             # Variance reduction view
    ├── LTVSettingsPanel.tsx       # Long-term tracking
    └── ExportPanel.tsx            # PDF/CSV export

/admin/templates
├── ab-tests/
│   ├── page.tsx                   # Template test list
│   └── [id]/
│       └── page.tsx               # Template test detail
```

---

## Deliverables

### Test List Page (/admin/ab-tests)

**Outcomes:**
- Tenant sees all their A/B tests in one view
- Filter by status (draft, running, paused, completed, archived)
- Quick stats: active tests, avg lift, tests this month
- One-click to create new test
- Bulk actions (archive, delete)

**Components:**

```typescript
// apps/admin/src/app/admin/ab-tests/page.tsx

export default async function ABTestsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="A/B Tests"
        description="Experiment with landing pages, checkout, and emails"
        action={
          <Button href="/admin/ab-tests/new">
            <Plus className="h-4 w-4 mr-2" />
            New Test
          </Button>
        }
      />

      {/* Quick Stats */}
      <ABTestQuickStats />

      {/* Filters */}
      <ABTestFilters />

      {/* Test List */}
      <ABTestList />
    </div>
  )
}
```

```typescript
// Quick Stats Component
export function ABTestQuickStats() {
  const stats = useABTestStats()

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        label="Active Tests"
        value={stats.activeCount}
        icon={<FlaskConical />}
        trend={stats.activeChange}
      />
      <StatCard
        label="Avg. Lift"
        value={`${stats.avgLift.toFixed(1)}%`}
        icon={<TrendingUp />}
        description="Winning variants"
      />
      <StatCard
        label="Tests This Month"
        value={stats.monthlyCount}
        icon={<Calendar />}
      />
      <StatCard
        label="Total Visitors"
        value={formatNumber(stats.totalVisitors)}
        icon={<Users />}
        description="Last 30 days"
      />
    </div>
  )
}
```

### New Test Wizard (/admin/ab-tests/new)

**Outcomes:**
- Step-by-step guided test creation
- Define hypothesis and success metrics
- Configure variants with traffic allocation
- Set targeting rules
- Configure advanced settings
- Launch immediately or schedule

**Wizard Steps:**

```typescript
// Step 1: Basics
interface Step1Data {
  name: string
  description: string
  testType: 'landing_page' | 'shipping' | 'email'
  hypothesis: string
  goalEvent: 'page_view' | 'add_to_cart' | 'begin_checkout' | 'purchase'
  optimizationMetric: 'revenue_per_visitor' | 'conversion_rate'
  confidenceLevel: 0.9 | 0.95 | 0.99
}

// Step 2: Variants
interface Step2Data {
  variants: Array<{
    name: string
    url?: string  // For landing page tests
    urlType?: 'static' | 'landing_page'
    landingPageId?: string
    trafficAllocation: number
    isControl: boolean
    // For shipping tests
    shippingSuffix?: string
    shippingPriceCents?: number
  }>
  mode: 'manual' | 'mab' | 'thompson'
}

// Step 3: Targeting
interface Step3Data {
  targetingRules: TargetingRule[]
  exclusionGroups: string[]
}

// Step 4: Schedule
interface Step4Data {
  startOption: 'now' | 'scheduled'
  scheduledStartAt?: Date
  endOption: 'manual' | 'scheduled' | 'auto_significance'
  scheduledEndAt?: Date
  timezone: string
  guardrails: Guardrail[]
}
```

**Wizard UI:**

```typescript
// CreateWizard component
export function CreateWizard() {
  const [step, setStep] = useState(1)
  const [data, setData] = useState<WizardData>({})

  const steps = [
    { number: 1, title: 'Basics', component: Step1Basics },
    { number: 2, title: 'Variants', component: Step2Variants },
    { number: 3, title: 'Targeting', component: Step3Targeting },
    { number: 4, title: 'Schedule', component: Step4Schedule },
    { number: 5, title: 'Review', component: Step5Review },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      {/* Progress indicator */}
      <WizardProgress steps={steps} currentStep={step} />

      {/* Step content */}
      <div className="mt-8 p-6 bg-white rounded-lg border">
        {steps[step - 1].component({ data, setData })}
      </div>

      {/* Navigation */}
      <WizardNavigation
        step={step}
        totalSteps={5}
        onBack={() => setStep(s => s - 1)}
        onNext={() => setStep(s => s + 1)}
        onSubmit={handleCreate}
      />
    </div>
  )
}
```

### Test Detail Page (/admin/ab-tests/[testId])

**Outcomes:**
- See real-time test results
- Statistical significance clearly displayed
- Winner recommendation when significant
- Segment breakdown (by device, geo, etc.)
- Charts showing trends over time
- Quick actions (pause, stop, declare winner)

**Layout:**

```typescript
export default async function TestDetailPage({ params }: { params: { testId: string } }) {
  return (
    <div className="space-y-6">
      {/* Header with test info and actions */}
      <TestHeader testId={params.testId} />

      {/* Significance banner */}
      <SignificanceBanner testId={params.testId} />

      {/* Main results */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          {/* Variant comparison table */}
          <VariantTable testId={params.testId} />

          {/* Time series chart */}
          <ConversionChart testId={params.testId} />

          {/* Funnel visualization */}
          <FunnelChart testId={params.testId} />
        </div>

        <div className="space-y-6">
          {/* Test config summary */}
          <TestConfigCard testId={params.testId} />

          {/* Data quality alerts */}
          <DataQualityCard testId={params.testId} />

          {/* Guardrail status */}
          <GuardrailStatus testId={params.testId} />

          {/* Actions */}
          <TestActions testId={params.testId} />
        </div>
      </div>

      {/* Segment analysis tabs */}
      <SegmentAnalysisTabs testId={params.testId} />
    </div>
  )
}
```

**Significance Banner:**

```typescript
export function SignificanceBanner({ testId }: { testId: string }) {
  const { results, isLoading } = useTestResults(testId)

  if (isLoading) return <Skeleton />

  const status = results.isSignificant
    ? results.winnerVariantId
      ? 'winner'
      : 'significant'
    : results.currentProgress >= 100
    ? 'inconclusive'
    : 'in_progress'

  return (
    <div className={cn(
      'rounded-lg p-4 flex items-center justify-between',
      status === 'winner' && 'bg-green-50 border border-green-200',
      status === 'significant' && 'bg-blue-50 border border-blue-200',
      status === 'inconclusive' && 'bg-amber-50 border border-amber-200',
      status === 'in_progress' && 'bg-gray-50 border border-gray-200',
    )}>
      <div className="flex items-center gap-3">
        {status === 'winner' && <Trophy className="h-5 w-5 text-green-600" />}
        {status === 'significant' && <CheckCircle className="h-5 w-5 text-blue-600" />}
        {status === 'inconclusive' && <AlertTriangle className="h-5 w-5 text-amber-600" />}
        {status === 'in_progress' && <Clock className="h-5 w-5 text-gray-500" />}

        <div>
          <p className="font-medium">
            {status === 'winner' && `${getWinnerName(results)} is the winner!`}
            {status === 'significant' && 'Statistical significance reached'}
            {status === 'inconclusive' && 'Test complete - no clear winner'}
            {status === 'in_progress' && `${results.currentProgress}% to significance`}
          </p>
          <p className="text-sm text-gray-600">
            {status === 'winner' && `${results.variants.find(v => v.isWinner)?.improvement?.toFixed(1)}% improvement at ${results.confidenceLevel * 100}% confidence`}
            {status === 'in_progress' && `${results.totalVisitors.toLocaleString()} visitors so far`}
          </p>
        </div>
      </div>

      {status === 'winner' && (
        <Button onClick={() => declareWinner(results.winnerVariantId)}>
          Implement Winner
        </Button>
      )}
    </div>
  )
}
```

**Variant Table:**

```typescript
export function VariantTable({ testId }: { testId: string }) {
  const { results } = useTestResults(testId)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Variant Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Variant</TableHead>
              <TableHead className="text-right">Visitors</TableHead>
              <TableHead className="text-right">Conversions</TableHead>
              <TableHead className="text-right">Conv. Rate</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">RPV</TableHead>
              <TableHead className="text-right">Improvement</TableHead>
              <TableHead className="text-right">Significance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {results.variants.map(variant => (
              <TableRow key={variant.variantId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {variant.isControl && (
                      <Badge variant="outline">Control</Badge>
                    )}
                    {variant.isWinner && (
                      <Badge variant="success">Winner</Badge>
                    )}
                    {variant.variantName}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {variant.visitors.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {variant.conversions.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {(variant.conversionRate * 100).toFixed(2)}%
                </TableCell>
                <TableCell className="text-right">
                  ${variant.revenue.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  ${variant.revenuePerVisitor.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {variant.isControl ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <span className={variant.improvement! > 0 ? 'text-green-600' : 'text-red-600'}>
                      {variant.improvement! > 0 ? '+' : ''}{variant.improvement?.toFixed(1)}%
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {variant.isControl ? (
                    <span className="text-gray-400">—</span>
                  ) : (
                    <SignificanceIndicator
                      pValue={variant.pValue}
                      isSignificant={variant.isSignificant}
                    />
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
```

### Data Quality Page (/admin/ab-tests/data-quality)

**Outcomes:**
- Monitor data integrity across all tests
- SRM alerts when traffic split is off
- Novelty effect detection
- Drift detection
- Quality score per test

**Layout:**

```typescript
export default function DataQualityPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Data Quality"
        description="Monitor experiment integrity across all tests"
      />

      {/* Overall health */}
      <DataQualityOverview />

      {/* Tests with issues */}
      <Card>
        <CardHeader>
          <CardTitle>Tests Requiring Attention</CardTitle>
        </CardHeader>
        <CardContent>
          <QualityIssuesList />
        </CardContent>
      </Card>

      {/* SRM Detection */}
      <Card>
        <CardHeader>
          <CardTitle>Sample Ratio Mismatch</CardTitle>
          <CardDescription>
            Detects when traffic split differs from expected allocation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SRMDashboard />
        </CardContent>
      </Card>

      {/* Novelty Effects */}
      <Card>
        <CardHeader>
          <CardTitle>Novelty Effect Detection</CardTitle>
          <CardDescription>
            Identifies temporary lift that may decay over time
          </CardDescription>
        </CardHeader>
        <CardContent>
          <NoveltyDashboard />
        </CardContent>
      </Card>

      {/* Population Drift */}
      <Card>
        <CardHeader>
          <CardTitle>Population Drift</CardTitle>
          <CardDescription>
            Monitors for changes in visitor composition during tests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DriftDashboard />
        </CardContent>
      </Card>
    </div>
  )
}
```

### Template A/B Tests (/admin/templates/ab-tests)

**Outcomes:**
- Test email templates against each other
- Track open rates and click rates
- Statistical results on template performance

**Pages:**

```typescript
// Template test list
export default function TemplateABTestsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Template A/B Tests"
        description="Test email templates for better engagement"
        action={
          <Button href="/admin/templates/ab-tests/new">
            New Template Test
          </Button>
        }
      />

      <TemplateTestList />
    </div>
  )
}

// Template test detail
export default function TemplateTestDetailPage({ params }: { params: { id: string } }) {
  return (
    <div className="space-y-6">
      <TemplateTestHeader testId={params.id} />

      <div className="grid grid-cols-2 gap-6">
        {/* Template A preview */}
        <TemplatePreviewCard variant="A" testId={params.id} />

        {/* Template B preview */}
        <TemplatePreviewCard variant="B" testId={params.id} />
      </div>

      {/* Results comparison */}
      <TemplateResultsTable testId={params.id} />

      {/* Engagement chart */}
      <TemplateEngagementChart testId={params.id} />
    </div>
  )
}
```

---

## API Routes

```
/api/admin/ab-tests
├── route.ts                    # GET list, POST create
├── [testId]/
│   ├── route.ts                # GET detail, PATCH update, DELETE
│   ├── start/route.ts          # POST start test
│   ├── pause/route.ts          # POST pause test
│   ├── end/route.ts            # POST end test
│   ├── results/route.ts        # GET results
│   ├── segments/route.ts       # GET segment breakdown
│   ├── srm/route.ts            # GET SRM analysis
│   ├── cuped/route.ts          # GET CUPED analysis
│   ├── bootstrap/route.ts      # GET bootstrap CIs
│   ├── guardrails/route.ts     # GET/POST guardrails
│   ├── ltv/route.ts            # GET LTV analysis
│   ├── attribution/route.ts    # GET attribution breakdown
│   └── export/route.ts         # GET PDF/CSV export
├── data-quality/route.ts       # GET quality overview
├── exclusion-groups/route.ts   # CRUD exclusion groups
└── webhooks/route.ts           # POST webhook handlers

/api/admin/templates
├── ab-tests/route.ts           # GET/POST template tests
└── ab-tests/[id]/route.ts      # GET/PATCH/DELETE
```

---

## Constraints

- All pages MUST use `/frontend-design` skill before implementation
- Charts should use Recharts (already in stack)
- Export PDF should include tenant branding
- Mobile responsiveness required for quick checks
- Real-time updates via polling (not WebSocket)
- All data queries must be tenant-scoped

---

## Pattern References

**Skills to invoke:**
- `/frontend-design` - ALL pages and components in this phase

**MCPs to consult:**
- Context7 MCP: Recharts configuration, React Table patterns

**RAWDOG code to reference:**
- `src/app/admin/ab-tests/` - All admin pages
- `src/components/admin/ab-tests/` - All components
- `src/app/admin/templates/ab-tests/` - Template tests
- `src/components/admin/ab-tests/ConversionChart.tsx` - Chart patterns
- `src/components/admin/ab-tests/VariantTable.tsx` - Table patterns

---

## Tasks

### [PARALLEL] Test List Page
- [ ] Create page layout with filters
- [ ] Build TestList component with pagination
- [ ] Add QuickStats summary bar
- [ ] Implement bulk actions (archive, delete)

### [PARALLEL] Create Wizard
- [ ] Build wizard container with progress
- [ ] Implement Step1Basics (name, type, goal)
- [ ] Implement Step2Variants (variant config)
- [ ] Implement Step3Targeting (rules builder)
- [ ] Implement Step4Schedule (dates, guardrails)
- [ ] Implement Step5Review (summary)

### [PARALLEL] Results Dashboard
- [ ] Create TestHeader with status
- [ ] Build SignificanceBanner
- [ ] Implement VariantTable
- [ ] Create ConversionChart (time series)
- [ ] Build FunnelChart visualization
- [ ] Add SegmentAnalysisTabs

### [PARALLEL] Data Quality Page
- [ ] Create quality overview cards
- [ ] Build SRMAlert component
- [ ] Implement NoveltyIndicator
- [ ] Create DriftChart visualization
- [ ] Add QualityScoreCard

### [SEQUENTIAL after Results] Advanced Panels
- [ ] Build GuardrailDashboard
- [ ] Create CUPEDPanel
- [ ] Implement LTVSettingsPanel
- [ ] Add ExportPanel (PDF/CSV)

### [PARALLEL] Template A/B Tests
- [ ] Create template test list
- [ ] Build template test detail page
- [ ] Add template preview cards
- [ ] Implement template results table

### [SEQUENTIAL after all] API Routes
- [ ] Create all admin API routes
- [ ] Add proper error handling
- [ ] Implement tenant isolation
- [ ] Add cache-busting exports

---

## Definition of Done

- [ ] Test list shows all tests with correct filters
- [ ] Create wizard successfully creates tests
- [ ] Results page shows accurate statistics
- [ ] Significance banner displays correctly
- [ ] Charts render with real data
- [ ] Data quality page alerts on issues
- [ ] Template tests work end-to-end
- [ ] All pages responsive on mobile
- [ ] Tenant isolation verified
- [ ] `npx tsc --noEmit` passes
