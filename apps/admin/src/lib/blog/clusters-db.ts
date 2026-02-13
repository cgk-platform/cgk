/**
 * Blog cluster database operations
 * All operations must be called within withTenant() context
 */
import { sql } from '@cgk-platform/db'

import type {
  BlogCluster,
  BlogPostCluster,
  ClusterWithPosts,
  CreateClusterInput,
  UpdateClusterInput,
  BlogPostRow,
  ClusterGraphData,
  ClusterNode,
  ClusterEdge,
} from './types'
import { extractLinksFromContent } from './link-analyzer'

// ============================================
// Cluster CRUD Operations
// ============================================

/**
 * Get all clusters with post counts
 */
export async function getClusters(): Promise<BlogCluster[]> {
  const result = await sql<BlogCluster & { post_count: number }>`
    SELECT c.id, c.name, c.slug, c.description, c.target_keywords,
           c.color, c.pillar_post_id, c.created_at, c.updated_at,
           COUNT(pc.post_id)::int as post_count
    FROM blog_clusters c
    LEFT JOIN blog_post_clusters pc ON pc.cluster_id = c.id
    GROUP BY c.id
    ORDER BY c.name ASC
  `
  return result.rows.map((row) => ({
    ...row,
    target_keywords: row.target_keywords || [],
  }))
}

/**
 * Get a cluster by ID with its posts
 */
export async function getClusterById(id: string): Promise<ClusterWithPosts | null> {
  const clusterResult = await sql<BlogCluster>`
    SELECT id, name, slug, description, target_keywords,
           color, pillar_post_id, created_at, updated_at
    FROM blog_clusters
    WHERE id = ${id}
  `

  if (clusterResult.rows.length === 0) return null

  const cluster = clusterResult.rows[0]!

  // Get posts in this cluster
  const postsResult = await sql<BlogPostRow & { role: string }>`
    SELECT p.id, p.slug, p.title, p.excerpt, p.content, p.featured_image_url,
           p.status, p.published_at, p.scheduled_at, p.author_id, p.category_id,
           p.tags, p.meta_title, p.meta_description, p.og_image_url, p.canonical_url,
           p.created_at, p.updated_at, p.is_ai_generated, p.ai_source,
           p.original_content, p.human_edit_percentage, p.ai_tracking_calculated_at,
           p.quality_score, p.quality_breakdown, p.quality_calculated_at,
           a.name as author_name, c.name as category_name, pc.role
    FROM blog_posts p
    JOIN blog_post_clusters pc ON pc.post_id = p.id
    LEFT JOIN blog_authors a ON p.author_id = a.id
    LEFT JOIN blog_categories c ON p.category_id = c.id
    WHERE pc.cluster_id = ${id}
    ORDER BY pc.role DESC, p.title ASC
  `

  const posts = postsResult.rows as BlogPostRow[]
  const pillarPost = cluster.pillar_post_id
    ? posts.find((p) => p.id === cluster.pillar_post_id) || null
    : null

  return {
    ...cluster,
    target_keywords: cluster.target_keywords || [],
    posts,
    pillar_post: pillarPost,
  }
}

/**
 * Get a cluster by slug
 */
export async function getClusterBySlug(slug: string): Promise<BlogCluster | null> {
  const result = await sql<BlogCluster>`
    SELECT id, name, slug, description, target_keywords,
           color, pillar_post_id, created_at, updated_at
    FROM blog_clusters
    WHERE slug = ${slug}
  `
  return result.rows[0] || null
}

/**
 * Create a new cluster
 */
export async function createCluster(input: CreateClusterInput): Promise<BlogCluster> {
  const keywordsJson = JSON.stringify(input.target_keywords || [])

  const result = await sql<BlogCluster>`
    INSERT INTO blog_clusters (name, slug, description, target_keywords, color, pillar_post_id)
    VALUES (
      ${input.name},
      ${input.slug},
      ${input.description || null},
      ${keywordsJson}::jsonb,
      ${input.color || 'blue'},
      ${input.pillar_post_id || null}
    )
    RETURNING id, name, slug, description, target_keywords, color, pillar_post_id,
              created_at, updated_at
  `
  return result.rows[0]!
}

/**
 * Update a cluster
 */
export async function updateCluster(input: UpdateClusterInput): Promise<BlogCluster | null> {
  const current = await getClusterById(input.id)
  if (!current) return null

  const name = input.name ?? current.name
  const slug = input.slug ?? current.slug
  const description = input.description !== undefined ? input.description : current.description
  const targetKeywords = input.target_keywords ?? current.target_keywords
  const color = input.color ?? current.color
  const pillarPostId = input.pillar_post_id !== undefined ? input.pillar_post_id : current.pillar_post_id

  const keywordsJson = JSON.stringify(targetKeywords)

  const result = await sql<BlogCluster>`
    UPDATE blog_clusters SET
      name = ${name},
      slug = ${slug},
      description = ${description},
      target_keywords = ${keywordsJson}::jsonb,
      color = ${color},
      pillar_post_id = ${pillarPostId},
      updated_at = NOW()
    WHERE id = ${input.id}
    RETURNING id, name, slug, description, target_keywords, color, pillar_post_id,
              created_at, updated_at
  `
  return result.rows[0] || null
}

/**
 * Delete a cluster
 */
export async function deleteCluster(id: string): Promise<boolean> {
  // First remove post-cluster associations
  await sql`DELETE FROM blog_post_clusters WHERE cluster_id = ${id}`

  const result = await sql`DELETE FROM blog_clusters WHERE id = ${id}`
  return (result.rowCount ?? 0) > 0
}

// ============================================
// Post-Cluster Association Operations
// ============================================

/**
 * Add a post to a cluster
 */
export async function addPostToCluster(
  postId: string,
  clusterId: string,
  role: 'pillar' | 'spoke' = 'spoke'
): Promise<BlogPostCluster> {
  const result = await sql<BlogPostCluster>`
    INSERT INTO blog_post_clusters (post_id, cluster_id, role)
    VALUES (${postId}, ${clusterId}, ${role})
    ON CONFLICT (post_id, cluster_id) DO UPDATE SET role = ${role}
    RETURNING id, post_id, cluster_id, role, created_at
  `

  // If this is the pillar, update the cluster
  if (role === 'pillar') {
    await sql`
      UPDATE blog_clusters SET pillar_post_id = ${postId}, updated_at = NOW()
      WHERE id = ${clusterId}
    `
  }

  return result.rows[0]!
}

/**
 * Remove a post from a cluster
 */
export async function removePostFromCluster(
  postId: string,
  clusterId: string
): Promise<boolean> {
  // Check if this was the pillar post
  const clusterResult = await sql<{ pillar_post_id: string | null }>`
    SELECT pillar_post_id FROM blog_clusters WHERE id = ${clusterId}
  `
  const cluster = clusterResult.rows[0]

  if (cluster?.pillar_post_id === postId) {
    await sql`
      UPDATE blog_clusters SET pillar_post_id = NULL, updated_at = NOW()
      WHERE id = ${clusterId}
    `
  }

  const result = await sql`
    DELETE FROM blog_post_clusters
    WHERE post_id = ${postId} AND cluster_id = ${clusterId}
  `
  return (result.rowCount ?? 0) > 0
}

/**
 * Get all clusters for a post
 */
export async function getPostClusters(postId: string): Promise<(BlogCluster & { role: string })[]> {
  const result = await sql<BlogCluster & { role: string }>`
    SELECT c.id, c.name, c.slug, c.description, c.target_keywords,
           c.color, c.pillar_post_id, c.created_at, c.updated_at, pc.role
    FROM blog_clusters c
    JOIN blog_post_clusters pc ON pc.cluster_id = c.id
    WHERE pc.post_id = ${postId}
    ORDER BY c.name ASC
  `
  return result.rows.map((row) => ({
    ...row,
    target_keywords: row.target_keywords || [],
  }))
}

/**
 * Get post-cluster mapping for all posts
 */
export async function getPostClusterMap(): Promise<Map<string, { clusterId: string; role: string; pillarPostId?: string }>> {
  const result = await sql<{ post_id: string; cluster_id: string; role: string; pillar_post_id: string | null }>`
    SELECT pc.post_id, pc.cluster_id, pc.role, c.pillar_post_id
    FROM blog_post_clusters pc
    JOIN blog_clusters c ON c.id = pc.cluster_id
  `

  const map = new Map<string, { clusterId: string; role: string; pillarPostId?: string }>()
  for (const row of result.rows) {
    map.set(row.post_id, {
      clusterId: row.cluster_id,
      role: row.role,
      pillarPostId: row.pillar_post_id || undefined,
    })
  }
  return map
}

// ============================================
// Visualization Data
// ============================================

/**
 * Generate cluster graph data for visualization
 */
export async function getClusterGraphData(
  posts: BlogPostRow[],
  clusters: BlogCluster[],
  baseDomain?: string
): Promise<ClusterGraphData> {
  const postClusterMap = await getPostClusterMap()
  const clusterMap = new Map(clusters.map((c) => [c.id, c]))

  const nodes: ClusterNode[] = []
  const edges: ClusterEdge[] = []

  // Create nodes for all posts
  for (const post of posts) {
    const clusterInfo = postClusterMap.get(post.id)
    const cluster = clusterInfo ? clusterMap.get(clusterInfo.clusterId) : null

    let nodeType: 'pillar' | 'spoke' | 'unclustered' = 'unclustered'
    if (clusterInfo) {
      nodeType = clusterInfo.role === 'pillar' ? 'pillar' : 'spoke'
    }

    nodes.push({
      id: post.id,
      label: post.title,
      type: nodeType,
      clusterId: clusterInfo?.clusterId || null,
      clusterColor: cluster?.color || null,
      url: `/admin/blog/${post.id}`,
    })
  }

  // Create edges based on internal links
  const processedPairs = new Set<string>()

  for (const post of posts) {
    const links = extractLinksFromContent(post.content, baseDomain)
    const internalLinks = links.filter((l) => l.isInternal)

    for (const link of internalLinks) {
      // Try to find the target post by slug
      const targetPost = posts.find(
        (p) =>
          link.url.includes(p.slug) ||
          link.url.endsWith(`/${p.slug}`) ||
          link.url.endsWith(`/${p.slug}/`)
      )

      if (targetPost && targetPost.id !== post.id) {
        const pairKey = [post.id, targetPost.id].sort().join('-')
        if (!processedPairs.has(pairKey)) {
          processedPairs.add(pairKey)

          const sourceCluster = postClusterMap.get(post.id)?.clusterId
          const targetCluster = postClusterMap.get(targetPost.id)?.clusterId
          const isCrossCluster =
            sourceCluster && targetCluster && sourceCluster !== targetCluster

          edges.push({
            source: post.id,
            target: targetPost.id,
            isCrossCluster: !!isCrossCluster,
          })
        }
      }
    }
  }

  return { nodes, edges }
}
