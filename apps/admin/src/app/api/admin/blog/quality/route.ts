export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/blog/quality
 * Returns content quality scores for blog posts.
 * Stub — data pipeline runs as a background job.
 */
export async function GET() {
  return Response.json({ posts: [] })
}
