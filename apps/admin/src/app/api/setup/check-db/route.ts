import { sql } from '@vercel/postgres'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    // Health check query - tests public schema connectivity during setup
    // This route runs BEFORE tenants exist, so withTenant() is not applicable
    // Explicitly query public schema to verify database is accessible
    const result =
      await sql`SELECT COUNT(*) as count FROM information_schema.schemata WHERE schema_name = 'public'`

    if (result.rows.length > 0 && result.rows[0].count > 0) {
      return NextResponse.json({
        success: true,
        message: 'Database connection successful',
      })
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Database query returned no results',
      },
      { status: 500 }
    )
  } catch (error) {
    console.error('Database connection error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown database error',
      },
      { status: 500 }
    )
  }
}
