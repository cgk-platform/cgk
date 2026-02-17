import { Command } from 'commander'
import chalk from 'chalk'
import path from 'path'
import fs from 'fs-extra'

export const migrateCreateCommand = new Command('migrate:create')
  .description('Create a new migration file')
  .argument('<name>', 'Migration name (e.g., add_user_preferences)')
  .option('--public', 'Create public schema migration')
  .option('--tenant', 'Create tenant schema migration (default)')
  .action(async (name: string, options: { public?: boolean; tenant?: boolean }) => {
    // Validate migration name
    if (!/^[a-z][a-z0-9_]*$/.test(name)) {
      console.error(chalk.red('\n❌ Invalid migration name'))
      console.error(chalk.dim('  Must start with a letter and contain only lowercase letters, numbers, and underscores'))
      console.error(chalk.dim('  Example: add_user_preferences, create_orders_table'))
      process.exit(1)
    }

    const isPublic = options.public && !options.tenant
    const schemaDir = isPublic ? 'public' : 'tenant'
    const migrationsDir = path.join(
      process.cwd(),
      'packages/db/src/migrations',
      schemaDir
    )

    // Ensure directory exists
    try {
      await fs.ensureDir(migrationsDir)
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to access migrations directory'))
      console.error(chalk.dim(`  ${migrationsDir}`))
      console.error(chalk.dim(error instanceof Error ? error.message : String(error)))
      process.exit(1)
    }

    // Get next migration number
    let nextNum: number
    try {
      const files = await fs.readdir(migrationsDir)
      const numbers = files
        .filter((f) => /^\d{3}_.*\.sql$/.test(f))
        .map((f) => parseInt(f.slice(0, 3), 10))
        .filter((n) => !isNaN(n))
      nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to read migrations directory'))
      console.error(chalk.dim(error instanceof Error ? error.message : String(error)))
      process.exit(1)
    }

    const padded = String(nextNum).padStart(3, '0')
    const filename = `${padded}_${name}.sql`
    const filepath = path.join(migrationsDir, filename)

    // Check if file already exists
    if (await fs.pathExists(filepath)) {
      console.error(chalk.red(`\n❌ Migration file already exists: ${filename}`))
      process.exit(1)
    }

    const template = generateMigrationTemplate(name, schemaDir)

    try {
      await fs.writeFile(filepath, template)
    } catch (error) {
      console.error(chalk.red('\n❌ Failed to create migration file'))
      console.error(chalk.dim(error instanceof Error ? error.message : String(error)))
      process.exit(1)
    }

    console.log(chalk.green(`\n✓ Created migration: ${filename}`))
    console.log(chalk.dim(`  ${filepath}`))
    console.log('')
    console.log(chalk.cyan('  Next steps:'))
    console.log(chalk.dim('    1. Edit the migration file with your SQL'))
    console.log(chalk.dim('    2. Run: npx @cgk-platform/cli migrate --status'))
    console.log(chalk.dim('    3. Run: npx @cgk-platform/cli migrate' + (isPublic ? '' : ' --tenant <slug>')))
    console.log('')
  })

function generateMigrationTemplate(name: string, schemaDir: string): string {
  const timestamp = new Date().toISOString()
  const humanName = name.replace(/_/g, ' ')

  if (schemaDir === 'public') {
    return `-- Migration: ${name}
-- Schema: public
-- Created: ${timestamp}
-- Description: ${humanName}

-- =============================================================================
-- IMPORTANT: Public schema migrations run once per platform
-- Use IF NOT EXISTS / IF EXISTS for idempotency
-- =============================================================================

-- Example: Create a new table
-- CREATE TABLE IF NOT EXISTS my_table (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   name TEXT NOT NULL,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- Example: Create an enum (wrap in DO block for idempotency)
-- DO $$ BEGIN
--   CREATE TYPE my_enum AS ENUM ('value1', 'value2', 'value3');
-- EXCEPTION
--   WHEN duplicate_object THEN NULL;
-- END $$;

-- Example: Create an index
-- CREATE INDEX IF NOT EXISTS idx_my_table_name ON my_table(name);

-- Example: Add a column to existing table
-- ALTER TABLE my_table ADD COLUMN IF NOT EXISTS new_column TEXT;

-- Example: Create updated_at trigger
-- DROP TRIGGER IF EXISTS update_my_table_updated_at ON my_table;
-- CREATE TRIGGER update_my_table_updated_at
--   BEFORE UPDATE ON my_table
--   FOR EACH ROW
--   EXECUTE FUNCTION update_updated_at_column();

-- Add your migration SQL below:

`
  }

  // Tenant schema template
  return `-- Migration: ${name}
-- Schema: tenant
-- Created: ${timestamp}
-- Description: ${humanName}

-- =============================================================================
-- IMPORTANT: Tenant schema migrations run ONCE PER TENANT
-- - Use IF NOT EXISTS / IF EXISTS for idempotency
-- - Use public.function_name() for trigger functions (e.g., public.update_updated_at_column())
-- - Use public.vector(1536) for pgvector types
-- - Match foreign key types exactly (public.users.id is UUID, most tenant IDs are TEXT)
-- =============================================================================

-- Example: Create a new table
-- CREATE TABLE IF NOT EXISTS my_table (
--   id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
--   name TEXT NOT NULL,
--   user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
--   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
--   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
-- );

-- Example: Create an enum (wrap in DO block for idempotency)
-- DO $$ BEGIN
--   CREATE TYPE my_enum AS ENUM ('value1', 'value2', 'value3');
-- EXCEPTION
--   WHEN duplicate_object THEN NULL;
-- END $$;

-- Example: Create an index
-- CREATE INDEX IF NOT EXISTS idx_my_table_name ON my_table(name);

-- Example: Add a column to existing table
-- ALTER TABLE my_table ADD COLUMN IF NOT EXISTS new_column TEXT;

-- Example: Create updated_at trigger (use public. prefix!)
-- DROP TRIGGER IF EXISTS update_my_table_updated_at ON my_table;
-- CREATE TRIGGER update_my_table_updated_at
--   BEFORE UPDATE ON my_table
--   FOR EACH ROW
--   EXECUTE FUNCTION public.update_updated_at_column();

-- Example: Create a vector column for AI embeddings
-- ALTER TABLE my_table ADD COLUMN IF NOT EXISTS embedding public.vector(1536);
-- CREATE INDEX IF NOT EXISTS idx_my_table_embedding ON my_table
--   USING hnsw (embedding public.vector_cosine_ops);

-- Add your migration SQL below:

`
}
