/**
 * Event Recording
 *
 * Records conversion events for A/B tests.
 * Supports real-time and batched event insertion.
 */

import type { EventType, TrackEventInput, ABEvent } from '../types.js'
import { EVENT_CONFIG } from '../config.js'

/**
 * Event to be queued for batch insertion
 */
interface QueuedEvent {
  tenantId: string
  testId: string
  variantId: string
  visitorId: string
  eventType: EventType
  eventValueCents?: number
  orderId?: string
  pageUrl?: string
  createdAt: Date
}

/**
 * Event batch for submission
 */
export interface EventBatch {
  events: QueuedEvent[]
  tenantId: string
}

/**
 * Event queue for batching
 */
class EventQueue {
  private queue: Map<string, QueuedEvent[]> = new Map()
  private flushCallback?: (batch: EventBatch) => Promise<void>
  private flushTimer?: ReturnType<typeof setTimeout>
  private maxBatchSize: number
  private maxBatchDelayMs: number

  constructor(
    options: {
      maxBatchSize?: number
      maxBatchDelayMs?: number
      onFlush?: (batch: EventBatch) => Promise<void>
    } = {}
  ) {
    this.maxBatchSize = options.maxBatchSize || EVENT_CONFIG.maxBatchSize
    this.maxBatchDelayMs = options.maxBatchDelayMs || EVENT_CONFIG.maxBatchDelayMs
    this.flushCallback = options.onFlush
  }

  /**
   * Add event to queue
   */
  add(tenantId: string, event: QueuedEvent): void {
    const events = this.queue.get(tenantId) || []
    events.push(event)
    this.queue.set(tenantId, events)

    // Flush if batch size reached
    if (events.length >= this.maxBatchSize) {
      this.flushTenant(tenantId)
    } else {
      // Schedule flush if not already scheduled
      this.scheduleFlush()
    }
  }

  /**
   * Schedule a flush after delay
   */
  private scheduleFlush(): void {
    if (this.flushTimer) return

    this.flushTimer = setTimeout(() => {
      this.flushAll()
      this.flushTimer = undefined
    }, this.maxBatchDelayMs)
  }

  /**
   * Flush events for a specific tenant
   */
  async flushTenant(tenantId: string): Promise<void> {
    const events = this.queue.get(tenantId)
    if (!events || events.length === 0) return

    this.queue.delete(tenantId)

    if (this.flushCallback) {
      await this.flushCallback({ tenantId, events })
    }
  }

  /**
   * Flush all queued events
   */
  async flushAll(): Promise<void> {
    const tenantIds = [...this.queue.keys()]
    await Promise.all(tenantIds.map((tenantId) => this.flushTenant(tenantId)))
  }

  /**
   * Get current queue size
   */
  size(): number {
    let total = 0
    for (const events of this.queue.values()) {
      total += events.length
    }
    return total
  }

  /**
   * Set flush callback
   */
  setFlushCallback(callback: (batch: EventBatch) => Promise<void>): void {
    this.flushCallback = callback
  }
}

// Global event queue instance
let globalEventQueue: EventQueue | undefined

/**
 * Get or create the global event queue
 */
export function getEventQueue(): EventQueue {
  if (!globalEventQueue) {
    globalEventQueue = new EventQueue()
  }
  return globalEventQueue
}

/**
 * Create a new event queue with custom options
 */
export function createEventQueue(options: {
  maxBatchSize?: number
  maxBatchDelayMs?: number
  onFlush?: (batch: EventBatch) => Promise<void>
}): EventQueue {
  return new EventQueue(options)
}

/**
 * Create an event record
 */
export function createEvent(
  tenantId: string,
  input: TrackEventInput
): QueuedEvent {
  return {
    tenantId,
    testId: input.testId,
    variantId: input.variantId,
    visitorId: input.visitorId,
    eventType: input.eventType,
    eventValueCents: input.eventValueCents,
    orderId: input.orderId,
    pageUrl: input.pageUrl,
    createdAt: new Date(),
  }
}

/**
 * Queue an event for batch insertion
 */
export function queueEvent(tenantId: string, input: TrackEventInput): void {
  const event = createEvent(tenantId, input)
  getEventQueue().add(tenantId, event)
}

/**
 * Flush all queued events
 */
export async function flushEvents(): Promise<void> {
  await getEventQueue().flushAll()
}

/**
 * Validate event type is in correct funnel order
 *
 * @param previousEvent - Previous event type (if any)
 * @param newEvent - New event type
 * @returns true if event order is valid
 */
export function isValidEventOrder(
  previousEvent: EventType | undefined,
  newEvent: EventType
): boolean {
  if (!previousEvent) return true

  const order = EVENT_CONFIG.funnelOrder
  const previousIndex = order.indexOf(previousEvent)
  const newIndex = order.indexOf(newEvent)

  // Allow same event (e.g., multiple page views)
  // Allow progression forward in funnel
  // Allow skipping steps (e.g., direct to purchase)
  return newIndex >= previousIndex
}

/**
 * Get events that should trigger after a conversion
 *
 * For example, if a purchase happens, we may want to
 * retroactively attribute page_view, add_to_cart, etc.
 */
export function getImpliedEvents(eventType: EventType): EventType[] {
  const order = EVENT_CONFIG.funnelOrder
  const index = order.indexOf(eventType)

  if (index <= 0) return []

  // Return all events before this one in the funnel
  return order.slice(0, index) as EventType[]
}

/**
 * Check if event type is a conversion event
 */
export function isConversionEvent(eventType: EventType): boolean {
  return eventType === 'purchase'
}

/**
 * Check if event type is a revenue event
 */
export function isRevenueEvent(eventType: EventType): boolean {
  return eventType === 'purchase'
}
