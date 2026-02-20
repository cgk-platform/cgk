import { runPublicMigrations, runTenantMigrations } from './packages/db/src/migrations/runner.js';
import { sql } from './packages/db/src/client.js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from apps/admin/.env.local
dotenv.config({ path: path.join(process.cwd(), 'apps/admin/.env.local') });

async function main() {
  console.log('🚀 Starting Database Migrations...');

  try {
    // 1. Run Public Migrations
    console.log('\n--- Public Schema ---');
    const publicResults = await runPublicMigrations();
    if (publicResults.length === 0) {
      console.log('✅ Public schema is up to date.');
    } else {
      publicResults.forEach(r => {
        if (r.success) {
          console.log(`✅ Applied: ${r.migration.name}`);
        } else {
          console.error(`❌ Failed: ${r.migration.name} - ${r.error}`);
          process.exit(1);
        }
      });
    }

    // 2. Run Tenant Migrations for each organization
    console.log('\n--- Tenant Schemas ---');
    const orgs = await sql`SELECT slug FROM public.organizations`;
    
    for (const org of orgs.rows) {
      const slug = org.slug as string;
      console.log(`\nProcessing Tenant: ${slug}`);
      const tenantResults = await runTenantMigrations(slug);
      
      if (tenantResults.length === 0) {
        console.log(`✅ Tenant "${slug}" is up to date.`);
      } else {
        tenantResults.forEach(r => {
          if (r.success) {
            console.log(`✅ Applied: ${r.migration.name}`);
          } else {
            console.error(`❌ Failed: ${r.migration.name} - ${r.error}`);
            process.exit(1);
          }
        });
      }
    }

    console.log('\n🎉 All migrations completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Migration Fatal Error:', error);
    process.exit(1);
  }
}

main();
