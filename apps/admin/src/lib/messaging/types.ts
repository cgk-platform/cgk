/**
 * Messaging/inbox types for the admin portal
 */

export type ThreadStatus = 'open' | 'pending' | 'closed'
export type MessageChannel = 'email' | 'sms' | 'internal'
export type MessageDirection = 'inbound' | 'outbound'

export interface Thread {
  id: string
  creator_id: string
  creator_name: string
  creator_email: string
  creator_avatar_url: string | null
  subject: string
  status: ThreadStatus
  unread_count: number
  last_message_at: string
  last_message_preview: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  thread_id: string
  direction: MessageDirection
  channel: MessageChannel
  sender_name: string
  sender_id: string | null
  content: string
  delivered_at: string | null
  read_at: string | null
  created_at: string
}

export interface ThreadFilters {
  page: number
  limit: number
  offset: number
  status: string
  search: string
}

export interface SendMessagePayload {
  threadId: string
  content: string
  channel: MessageChannel
}

export const THREAD_STATUSES: ThreadStatus[] = ['open', 'pending', 'closed']
export const MESSAGE_CHANNELS: MessageChannel[] = ['email', 'sms', 'internal']
