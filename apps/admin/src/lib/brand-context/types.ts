/**
 * Brand context document types for the admin content section
 */

export type DocumentCategory =
  | 'brand_voice'
  | 'product_info'
  | 'faq'
  | 'policies'
  | 'guidelines'
  | 'templates'

export interface BrandContextDocument {
  id: string
  slug: string
  title: string
  content: string
  category: DocumentCategory
  tags: string[]
  version: number
  is_active: boolean
  created_at: string
  updated_at: string
  created_by: string | null
  updated_by: string | null
}

export interface BrandContextDocumentRow extends BrandContextDocument {
  created_by_name: string | null
  updated_by_name: string | null
}

export interface DocumentVersion {
  id: string
  document_id: string
  version: number
  content: string
  created_at: string
  created_by: string | null
  created_by_name: string | null
}

export interface DocumentFilters {
  page: number
  limit: number
  offset: number
  search: string
  category: string
  sort: string
  dir: 'asc' | 'desc'
}

export interface CreateDocumentInput {
  slug: string
  title: string
  content: string
  category: DocumentCategory
  tags?: string[]
}

export interface UpdateDocumentInput {
  id: string
  slug?: string
  title?: string
  content?: string
  category?: DocumentCategory
  tags?: string[]
  is_active?: boolean
}

export const DOCUMENT_CATEGORIES: { id: DocumentCategory; name: string; description: string }[] = [
  {
    id: 'brand_voice',
    name: 'Brand Voice',
    description: 'Tone, messaging, and communication guidelines',
  },
  {
    id: 'product_info',
    name: 'Product Information',
    description: 'Product descriptions, specifications, and details',
  },
  {
    id: 'faq',
    name: 'FAQs',
    description: 'Frequently asked questions and answers',
  },
  {
    id: 'policies',
    name: 'Policies',
    description: 'Return, shipping, privacy, and terms policies',
  },
  {
    id: 'guidelines',
    name: 'Guidelines',
    description: 'Brand, content, and style guidelines',
  },
  {
    id: 'templates',
    name: 'Templates',
    description: 'Email, response, and content templates',
  },
]
