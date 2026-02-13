import { sql } from '@cgk-platform/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * POST /api/setup/database
 *
 * Tests the database connection and returns connection info.
 */
export async function POST() {
  try {
    // Test connection with a simple query
    const result = await sql`SELECT
      current_database() as database,
      inet_server_addr() as host,
      inet_server_port() as port,
      (SELECT setting FROM pg_settings WHERE name = 'ssl') as ssl
    `

    const row = result.rows[0]

    // Parse connection URL for display (hide credentials)
    const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL || ''
    let parsedHost = 'Unknown'
    let parsedDb = 'Unknown'

    try {
      const url = new URL(dbUrl)
      parsedHost = url.hostname
      parsedDb = url.pathname.slice(1) // Remove leading /
    } catch {
      // URL parsing failed, use query results
      parsedHost = String(row?.host || 'localhost')
      parsedDb = String(row?.database || 'postgres')
    }

    return NextResponse.json({
      success: true,
      connectionInfo: {
        host: parsedHost,
        database: parsedDb,
        ssl: row?.ssl === 'on' || dbUrl.includes('sslmode=require'),
      },
    })
  } catch (error) {
    console.error('Database connection test failed:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Connection failed',
      },
      { status: 400 }
    )
  }
}
