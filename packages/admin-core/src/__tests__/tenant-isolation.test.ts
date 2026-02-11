/**
 * Tenant Isolation Tests for Workflow Engine
 * PHASE-2H-WORKFLOWS
 *
 * Verifies that workflow rules, executions, and data
 * are properly isolated between tenants
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock the database module
const mockSql = vi.fn()
const mockWithTenant = vi.fn()

vi.mock('@cgk/db', () => ({
  sql: mockSql,
  withTenant: mockWithTenant,
}))

// Import after mocking
import { WorkflowEngine } from '../workflow/engine'

describe('Tenant Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset WorkflowEngine instances between tests
    // @ts-expect-error - Accessing private static for testing
    WorkflowEngine.instances = new Map()

    // Default mock implementation
    mockWithTenant.mockImplementation(async (tenantId: string, fn: () => Promise<unknown>) => {
      // Verify tenantId is provided
      if (!tenantId) {
        throw new Error('tenantId is required for withTenant')
      }
      return fn()
    })

    mockSql.mockResolvedValue({ rows: [] })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('WorkflowEngine singleton per tenant', () => {
    it('should create separate engine instances for different tenants', () => {
      const tenantA = WorkflowEngine.getInstance('tenant-a')
      const tenantB = WorkflowEngine.getInstance('tenant-b')

      expect(tenantA).not.toBe(tenantB)
    })

    it('should return same instance for same tenant', () => {
      const instance1 = WorkflowEngine.getInstance('tenant-a')
      const instance2 = WorkflowEngine.getInstance('tenant-a')

      expect(instance1).toBe(instance2)
    })

    it('should track tenant ID correctly', () => {
      const engine = WorkflowEngine.getInstance('tenant-test')
      expect(engine['tenantId']).toBe('tenant-test')
    })
  })

  describe('Rule loading isolation', () => {
    it('should load rules with tenant context', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [
          {
            id: 'rule-1',
            name: 'Test Rule',
            is_active: true,
            priority: 10,
            trigger_type: 'status_change',
            trigger_config: { from: ['draft'], to: ['active'] },
            conditions: [],
            actions: [],
            cooldown_hours: null,
            max_executions: null,
            requires_approval: false,
            approver_role: null,
          },
        ],
      })

      const engine = WorkflowEngine.getInstance('tenant-load')
      await engine.loadRules()

      // Verify withTenant was called with correct tenant
      expect(mockWithTenant).toHaveBeenCalledWith('tenant-load', expect.any(Function))
    })

    it('should not share rules between tenants', async () => {
      // Setup rules for tenant A
      mockSql.mockResolvedValueOnce({
        rows: [
          { id: 'rule-a', name: 'Tenant A Rule', is_active: true, priority: 1, trigger_type: 'manual', trigger_config: {}, conditions: [], actions: [] },
        ],
      })

      const engineA = WorkflowEngine.getInstance('tenant-a')
      await engineA.loadRules()

      // Setup rules for tenant B
      mockSql.mockResolvedValueOnce({
        rows: [
          { id: 'rule-b', name: 'Tenant B Rule', is_active: true, priority: 1, trigger_type: 'manual', trigger_config: {}, conditions: [], actions: [] },
        ],
      })

      const engineB = WorkflowEngine.getInstance('tenant-b')
      await engineB.loadRules()

      // Verify rules are isolated
      const rulesA = engineA.getRules()
      const rulesB = engineB.getRules()

      expect(rulesA).toHaveLength(1)
      expect(rulesB).toHaveLength(1)
      expect(rulesA[0].id).toBe('rule-a')
      expect(rulesB[0].id).toBe('rule-b')
    })
  })

  describe('Status change handler isolation', () => {
    it('should execute within tenant context', async () => {
      mockSql.mockResolvedValue({ rows: [] })

      const engine = WorkflowEngine.getInstance('tenant-status')
      await engine.loadRules()

      await engine.handleStatusChange({
        entityType: 'project',
        entityId: 'project-123',
        oldStatus: 'draft',
        newStatus: 'active',
        entity: { id: 'project-123', status: 'active' },
      })

      // Verify all database operations used tenant context
      const withTenantCalls = mockWithTenant.mock.calls
      expect(withTenantCalls.length).toBeGreaterThan(0)
      expect(withTenantCalls.every((call) => call[0] === 'tenant-status')).toBe(true)
    })
  })

  describe('Manual trigger isolation', () => {
    it('should require tenant context for manual triggers', async () => {
      mockSql
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'rule-manual',
              name: 'Manual Rule',
              is_active: true,
              priority: 10,
              trigger_type: 'manual',
              trigger_config: {},
              conditions: [],
              actions: [{ type: 'slack_notify', config: { channel: '#test', message: 'Test' } }],
              cooldown_hours: null,
              max_executions: null,
              requires_approval: false,
              approver_role: null,
            },
          ],
        })
        .mockResolvedValue({ rows: [] })

      const engine = WorkflowEngine.getInstance('tenant-manual')
      await engine.loadRules()

      await engine.triggerManually({
        ruleId: 'rule-manual',
        entityType: 'project',
        entityId: 'project-456',
        entity: { id: 'project-456', title: 'Test Project' },
      })

      // All withTenant calls should be for the correct tenant
      mockWithTenant.mock.calls.forEach((call) => {
        expect(call[0]).toBe('tenant-manual')
      })
    })
  })

  describe('Approval workflow isolation', () => {
    it('should scope pending approvals to tenant', async () => {
      mockSql.mockResolvedValueOnce({
        rows: [
          { id: 'exec-1', rule_name: 'Test', entity_type: 'project', entity_id: '123' },
        ],
      })

      const engine = WorkflowEngine.getInstance('tenant-approval')
      await engine.loadRules()
      await engine.getPendingApprovals()

      expect(mockWithTenant).toHaveBeenCalledWith('tenant-approval', expect.any(Function))
    })

    it('should execute approval within tenant context', async () => {
      mockSql
        .mockResolvedValueOnce({ rows: [] }) // loadRules
        .mockResolvedValueOnce({
          rows: [{ id: 'exec-1', rule_id: 'rule-1', actions: [], conditions_passed: true }],
        })
        .mockResolvedValue({ rows: [] })

      const engine = WorkflowEngine.getInstance('tenant-approve')
      await engine.loadRules()
      await engine.approveExecution('exec-1', 'user-123')

      mockWithTenant.mock.calls.forEach((call) => {
        expect(call[0]).toBe('tenant-approve')
      })
    })
  })

  describe('Scheduled actions isolation', () => {
    it('should process scheduled actions within tenant context', async () => {
      mockSql.mockResolvedValue({ rows: [] })

      const engine = WorkflowEngine.getInstance('tenant-scheduled')
      await engine.loadRules()
      await engine.processScheduledActions()

      mockWithTenant.mock.calls.forEach((call) => {
        expect(call[0]).toBe('tenant-scheduled')
      })
    })
  })

  describe('Execution logging isolation', () => {
    it('should log executions in tenant schema', async () => {
      mockSql
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'rule-log',
              name: 'Log Rule',
              is_active: true,
              priority: 10,
              trigger_type: 'status_change',
              trigger_config: { from: ['draft'], to: ['active'] },
              conditions: [],
              actions: [],
              cooldown_hours: null,
              max_executions: null,
              requires_approval: false,
              approver_role: null,
            },
          ],
        })
        .mockResolvedValue({ rows: [{ id: 'exec-123' }] })

      const engine = WorkflowEngine.getInstance('tenant-log')
      await engine.loadRules()

      await engine.handleStatusChange({
        entityType: 'project',
        entityId: 'project-789',
        oldStatus: 'draft',
        newStatus: 'active',
        entity: { id: 'project-789', status: 'active' },
      })

      // Verify execution was logged with tenant context
      const insertCalls = mockWithTenant.mock.calls.filter((call) =>
        call[0] === 'tenant-log'
      )
      expect(insertCalls.length).toBeGreaterThan(0)
    })
  })

  describe('Entity workflow state isolation', () => {
    it('should track state per tenant', async () => {
      mockSql.mockResolvedValue({ rows: [] })

      const engine = WorkflowEngine.getInstance('tenant-state')
      await engine.loadRules()

      // This would typically update entity_workflow_state table
      // within the tenant schema
      await engine.handleStatusChange({
        entityType: 'project',
        entityId: 'project-state',
        oldStatus: 'draft',
        newStatus: 'active',
        entity: { id: 'project-state', status: 'active' },
      })

      expect(mockWithTenant).toHaveBeenCalledWith('tenant-state', expect.any(Function))
    })
  })

  describe('Cross-tenant access prevention', () => {
    it('should not allow cross-tenant rule access', async () => {
      // Load rules for tenant A
      mockSql.mockResolvedValueOnce({
        rows: [{ id: 'rule-a', name: 'Tenant A Only', is_active: true, priority: 1, trigger_type: 'manual', trigger_config: {}, conditions: [], actions: [] }],
      })

      const engineA = WorkflowEngine.getInstance('tenant-a')
      await engineA.loadRules()

      // Load rules for tenant B (different rules)
      mockSql.mockResolvedValueOnce({
        rows: [{ id: 'rule-b', name: 'Tenant B Only', is_active: true, priority: 1, trigger_type: 'manual', trigger_config: {}, conditions: [], actions: [] }],
      })

      const engineB = WorkflowEngine.getInstance('tenant-b')
      await engineB.loadRules()

      // Tenant A should only see their rules
      const rulesA = engineA.getRules()
      expect(rulesA.some((r) => r.id === 'rule-b')).toBe(false)
      expect(rulesA.some((r) => r.id === 'rule-a')).toBe(true)

      // Tenant B should only see their rules
      const rulesB = engineB.getRules()
      expect(rulesB.some((r) => r.id === 'rule-a')).toBe(false)
      expect(rulesB.some((r) => r.id === 'rule-b')).toBe(true)
    })
  })
})

describe('Inbox Tenant Isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockWithTenant.mockImplementation(async (tenantId: string, fn: () => Promise<unknown>) => {
      if (!tenantId) {
        throw new Error('tenantId is required for withTenant')
      }
      return fn()
    })

    mockSql.mockResolvedValue({ rows: [] })
  })

  it('should require tenant context for contact operations', async () => {
    const { getContacts } = await import('../inbox/contacts')

    await getContacts('tenant-contacts', {})

    expect(mockWithTenant).toHaveBeenCalledWith('tenant-contacts', expect.any(Function))
  })

  it('should require tenant context for thread operations', async () => {
    const { getThreads } = await import('../inbox/threads')

    await getThreads('tenant-threads', {})

    expect(mockWithTenant).toHaveBeenCalledWith('tenant-threads', expect.any(Function))
  })

  it('should require tenant context for message operations', async () => {
    const { getMessages } = await import('../inbox/messages')

    mockSql.mockResolvedValueOnce({ rows: [] })

    await getMessages('tenant-messages', 'thread-123')

    expect(mockWithTenant).toHaveBeenCalledWith('tenant-messages', expect.any(Function))
  })
})
