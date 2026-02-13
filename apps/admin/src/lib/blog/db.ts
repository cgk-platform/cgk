/**
 * Blog database operations
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk-platform/db'

import type {
  BlogPost,
  BlogPostRow,
  BlogCategory,
  BlogAuthor,
  BlogFilters,
  CreatePostInput,
  UpdatePostInput,
  CreateCategoryInput,
  CreateAuthorInput,
} from './types'

// Post operations

const POST_SORT_COLUMNS: Record<string, string> = {
  created_at: 'p.created_at',
  updated_at: 'p.updated_at',
  published_at: 'p.published_at',
  title: 'p.title',
  status: 'p.status',
}

export async function getPosts(filters: BlogFilters): Promise<{ rows: BlogPostRow[]; totalCount: number }> {
  const conditions: string[] = []
  const values: unknown[] = []
  let paramIndex = 0

  if (filters.search) {
    paramIndex++
    conditions.push(`(p.title ILIKE $${paramIndex} OR p.excerpt ILIKE $${paramIndex} OR p.slug ILIKE $${paramIndex})`)
    values.push(`%${filters.search}%`)
  }
  if (filters.status) {
    paramIndex++
    conditions.push(`p.status = $${paramIndex}::post_status`)
    values.push(filters.status)
  }
  if (filters.category) {
    paramIndex++
    conditions.push(`p.category_id = $${paramIndex}`)
    values.push(filters.category)
  }
  if (filters.author) {
    paramIndex++
    conditions.push(`p.author_id = $${paramIndex}`)
    values.push(filters.author)
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''
  const sortCol = POST_SORT_COLUMNS[filters.sort] || 'p.created_at'
  const sortDir = filters.dir === 'asc' ? 'ASC' : 'DESC'

  paramIndex++
  const limitParam = paramIndex
  paramIndex++
  const offsetParam = paramIndex
  values.push(filters.limit, filters.offset)

  const dataResult = await sql.query(
    `SELECT p.id, p.slug, p.title, p.excerpt, p.content, p.featured_image_url,
            p.status, p.published_at, p.scheduled_at, p.author_id, p.category_id,
            p.tags, p.meta_title, p.meta_description, p.og_image_url, p.canonical_url,
            p.created_at, p.updated_at,
            a.name as author_name, c.name as category_name
     FROM blog_posts p
     LEFT JOIN blog_authors a ON p.author_id = a.id
     LEFT JOIN blog_categories c ON p.category_id = c.id
     ${whereClause}
     ORDER BY ${sortCol} ${sortDir} NULLS LAST
     LIMIT $${limitParam} OFFSET $${offsetParam}`,
    values,
  )

  const countValues = values.slice(0, -2)
  const countResult = await sql.query(
    `SELECT COUNT(*) as count FROM blog_posts p ${whereClause}`,
    countValues,
  )

  return {
    rows: dataResult.rows as BlogPostRow[],
    totalCount: Number(countResult.rows[0]?.count || 0),
  }
}

export async function getPostById(id: string): Promise<BlogPost | null> {
  const result = await sql<BlogPost>`
    SELECT id, slug, title, excerpt, content, featured_image_url,
           status, published_at, scheduled_at, author_id, category_id,
           tags, meta_title, meta_description, og_image_url, canonical_url,
           created_at, updated_at
    FROM blog_posts
    WHERE id = ${id}
  `
  return result.rows[0] || null
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const result = await sql<BlogPost>`
    SELECT id, slug, title, excerpt, content, featured_image_url,
           status, published_at, scheduled_at, author_id, category_id,
           tags, meta_title, meta_description, og_image_url, canonical_url,
           created_at, updated_at
    FROM blog_posts
    WHERE slug = ${slug}
  `
  return result.rows[0] || null
}

export async function createPost(input: CreatePostInput): Promise<BlogPost> {
  const publishedAt = input.status === 'published' ? new Date().toISOString() : null
  const tagsArray = input.tags || []
  const tagsJson = JSON.stringify(tagsArray)

  const result = await sql<BlogPost>`
    INSERT INTO blog_posts (
      slug, title, excerpt, content, featured_image_url,
      status, published_at, scheduled_at, author_id, category_id,
      tags, meta_title, meta_description, og_image_url, canonical_url
    ) VALUES (
      ${input.slug}, ${input.title}, ${input.excerpt || null}, ${input.content},
      ${input.featured_image_url || null}, ${input.status}::post_status,
      ${publishedAt}::timestamptz, ${input.scheduled_at || null}::timestamptz,
      ${input.author_id || null}, ${input.category_id || null},
      ${tagsJson}::jsonb, ${input.meta_title || null}, ${input.meta_description || null},
      ${input.og_image_url || null}, ${input.canonical_url || null}
    )
    RETURNING id, slug, title, excerpt, content, featured_image_url,
              status, published_at, scheduled_at, author_id, category_id,
              tags, meta_title, meta_description, og_image_url, canonical_url,
              created_at, updated_at
  `
  return result.rows[0]!
}

export async function updatePost(input: UpdatePostInput): Promise<BlogPost | null> {
  const current = await getPostById(input.id)
  if (!current) return null

  const slug = input.slug ?? current.slug
  const title = input.title ?? current.title
  const excerpt = input.excerpt !== undefined ? input.excerpt : current.excerpt
  const content = input.content ?? current.content
  const featuredImageUrl = input.featured_image_url !== undefined ? input.featured_image_url : current.featured_image_url
  const status = input.status ?? current.status
  const scheduledAt = input.scheduled_at !== undefined ? input.scheduled_at : current.scheduled_at
  const authorId = input.author_id !== undefined ? input.author_id : current.author_id
  const categoryId = input.category_id !== undefined ? input.category_id : current.category_id
  const tags = input.tags ?? current.tags
  const metaTitle = input.meta_title !== undefined ? input.meta_title : current.meta_title
  const metaDescription = input.meta_description !== undefined ? input.meta_description : current.meta_description
  const ogImageUrl = input.og_image_url !== undefined ? input.og_image_url : current.og_image_url
  const canonicalUrl = input.canonical_url !== undefined ? input.canonical_url : current.canonical_url

  // Update published_at if transitioning to published
  let publishedAt = current.published_at
  if (status === 'published' && current.status !== 'published') {
    publishedAt = new Date().toISOString()
  }

  const tagsJson = JSON.stringify(tags)

  const result = await sql<BlogPost>`
    UPDATE blog_posts SET
      slug = ${slug}, title = ${title}, excerpt = ${excerpt}, content = ${content},
      featured_image_url = ${featuredImageUrl}, status = ${status}::post_status,
      published_at = ${publishedAt}::timestamptz, scheduled_at = ${scheduledAt}::timestamptz,
      author_id = ${authorId}, category_id = ${categoryId},
      tags = ${tagsJson}::jsonb, meta_title = ${metaTitle}, meta_description = ${metaDescription},
      og_image_url = ${ogImageUrl}, canonical_url = ${canonicalUrl},
      updated_at = NOW()
    WHERE id = ${input.id}
    RETURNING id, slug, title, excerpt, content, featured_image_url,
              status, published_at, scheduled_at, author_id, category_id,
              tags, meta_title, meta_description, og_image_url, canonical_url,
              created_at, updated_at
  `
  return result.rows[0] || null
}

export async function deletePost(id: string): Promise<boolean> {
  const result = await sql`DELETE FROM blog_posts WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}

// Category operations

export async function getCategories(): Promise<BlogCategory[]> {
  const result = await sql<BlogCategory>`
    SELECT c.id, c.slug, c.name, c.description, c.parent_id, c.created_at, c.updated_at,
           COUNT(p.id)::int as post_count
    FROM blog_categories c
    LEFT JOIN blog_posts p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name ASC
  `
  return result.rows
}

export async function getCategoryById(id: string): Promise<BlogCategory | null> {
  const result = await sql<BlogCategory>`
    SELECT c.id, c.slug, c.name, c.description, c.parent_id, c.created_at, c.updated_at,
           COUNT(p.id)::int as post_count
    FROM blog_categories c
    LEFT JOIN blog_posts p ON p.category_id = c.id
    WHERE c.id = ${id}
    GROUP BY c.id
  `
  return result.rows[0] || null
}

export async function createCategory(input: CreateCategoryInput): Promise<BlogCategory> {
  const result = await sql<Omit<BlogCategory, 'post_count'>>`
    INSERT INTO blog_categories (slug, name, description, parent_id)
    VALUES (${input.slug}, ${input.name}, ${input.description || null}, ${input.parent_id || null})
    RETURNING id, slug, name, description, parent_id, created_at, updated_at
  `
  const row = result.rows[0]!
  return { ...row, post_count: 0 }
}

export async function updateCategory(id: string, input: Partial<CreateCategoryInput>): Promise<BlogCategory | null> {
  const current = await getCategoryById(id)
  if (!current) return null

  const result = await sql<Omit<BlogCategory, 'post_count'>>`
    UPDATE blog_categories SET
      slug = ${input.slug ?? current.slug},
      name = ${input.name ?? current.name},
      description = ${input.description !== undefined ? input.description : current.description},
      parent_id = ${input.parent_id !== undefined ? input.parent_id : current.parent_id},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, slug, name, description, parent_id, created_at, updated_at
  `
  return result.rows[0] ? { ...result.rows[0], post_count: current.post_count } : null
}

export async function deleteCategory(id: string): Promise<boolean> {
  // First, unset category_id on any posts using this category
  await sql`UPDATE blog_posts SET category_id = NULL WHERE category_id = ${id}`
  const result = await sql`DELETE FROM blog_categories WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}

// Author operations

export async function getAuthors(): Promise<BlogAuthor[]> {
  const result = await sql<BlogAuthor>`
    SELECT a.id, a.name, a.bio, a.avatar_url, a.email, a.social_links,
           a.created_at, a.updated_at, COUNT(p.id)::int as post_count
    FROM blog_authors a
    LEFT JOIN blog_posts p ON p.author_id = a.id
    GROUP BY a.id
    ORDER BY a.name ASC
  `
  return result.rows
}

export async function getAuthorById(id: string): Promise<BlogAuthor | null> {
  const result = await sql<BlogAuthor>`
    SELECT a.id, a.name, a.bio, a.avatar_url, a.email, a.social_links,
           a.created_at, a.updated_at, COUNT(p.id)::int as post_count
    FROM blog_authors a
    LEFT JOIN blog_posts p ON p.author_id = a.id
    WHERE a.id = ${id}
    GROUP BY a.id
  `
  return result.rows[0] || null
}

export async function createAuthor(input: CreateAuthorInput): Promise<BlogAuthor> {
  const socialLinks = input.social_links || {}
  const result = await sql<Omit<BlogAuthor, 'post_count'>>`
    INSERT INTO blog_authors (name, bio, avatar_url, email, social_links)
    VALUES (${input.name}, ${input.bio || null}, ${input.avatar_url || null},
            ${input.email || null}, ${JSON.stringify(socialLinks)}::jsonb)
    RETURNING id, name, bio, avatar_url, email, social_links, created_at, updated_at
  `
  const row = result.rows[0]!
  return { ...row, post_count: 0 }
}

export async function updateAuthor(id: string, input: Partial<CreateAuthorInput>): Promise<BlogAuthor | null> {
  const current = await getAuthorById(id)
  if (!current) return null

  const socialLinks = input.social_links !== undefined ? input.social_links : current.social_links

  const result = await sql<Omit<BlogAuthor, 'post_count'>>`
    UPDATE blog_authors SET
      name = ${input.name ?? current.name},
      bio = ${input.bio !== undefined ? input.bio : current.bio},
      avatar_url = ${input.avatar_url !== undefined ? input.avatar_url : current.avatar_url},
      email = ${input.email !== undefined ? input.email : current.email},
      social_links = ${JSON.stringify(socialLinks)}::jsonb,
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING id, name, bio, avatar_url, email, social_links, created_at, updated_at
  `
  return result.rows[0] ? { ...result.rows[0], post_count: current.post_count } : null
}

export async function deleteAuthor(id: string): Promise<boolean> {
  // First, unset author_id on any posts using this author
  await sql`UPDATE blog_posts SET author_id = NULL WHERE author_id = ${id}`
  const result = await sql`DELETE FROM blog_authors WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}
