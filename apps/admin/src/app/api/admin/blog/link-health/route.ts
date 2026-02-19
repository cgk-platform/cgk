export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * GET /api/admin/blog/link-health
 * Returns link health status for all blog posts.
 * Stub — data pipeline runs as a background job.
 */
export async function GET() {
  return Response.json({ entries: [] })
}
