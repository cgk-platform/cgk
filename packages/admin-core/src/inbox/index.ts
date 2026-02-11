/**
 * Smart Inbox Exports
 * PHASE-2H-WORKFLOWS
 */

// Contact Operations
export {
  createContact,
  deleteContact,
  getContact,
  getContactByEmail,
  getContactByExternalId,
  getContacts,
  getContactStats,
  getOrCreateContact,
  updateContact,
} from './contacts'

// Thread Operations
export {
  assignThread,
  closeThread,
  createThread,
  getInboxStats,
  getThread,
  getThreadByEntity,
  getThreads,
  markThreadAsRead,
  snoozeThread,
  unsnoozeThreads,
  updateThread,
  updateThreadStatus,
} from './threads'

// Message Operations
export {
  discardDraft,
  generateDraft,
  getMessage,
  getMessages,
  getPendingDraft,
  recordInboundMessage,
  sendDraft,
  sendMessage,
  updateMessageStatus,
} from './messages'

// Types
export type {
  AIDraft,
  AIDraftStatus,
  Contact,
  ContactFilters,
  ContactStats,
  ContactType,
  CreateContactInput,
  CreateThreadInput,
  InboxStats,
  Message,
  MessageChannel,
  MessageDirection,
  MessageStatus,
  SendMessageInput,
  SenderType,
  Thread,
  ThreadFilters,
  ThreadPriority,
  ThreadStatus,
  ThreadType,
  UpdateContactInput,
  UpdateThreadInput,
} from './types'
