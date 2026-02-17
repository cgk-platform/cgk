#!/usr/bin/env node
/**
 * @cgk-platform/cli - CLI tool for CGK platform
 *
 * Commands:
 * - create <name>     : Create a new brand site
 * - init              : Initialize CGK in existing project
 * - doctor            : Check system requirements
 * - setup             : Run platform setup wizard
 * - setup:database    : Setup database only
 * - setup:jobs        : Setup background jobs provider
 * - migrate           : Run database migrations
 * - migrate:create    : Create a new migration file
 * - tenant:create     : Create a new tenant
 * - tenant:list       : List all tenants
 * - tenant:export     : Export tenant data to SQL file
 * - tenant:import     : Import tenant data from SQL file
 * - check-updates     : Check for available package updates
 * - update            : Update packages to latest versions
 * - changelog         : View changelog for a version
 */

import { Command } from 'commander'

import { changelogCommand } from './commands/changelog.js'
import { checkUpdatesCommand } from './commands/check-updates.js'
import { createCommand } from './commands/create.js'
import { doctorCommand } from './commands/doctor.js'
import { initCommand } from './commands/init.js'
import { migrateCommand } from './commands/migrate.js'
import { migrateCreateCommand } from './commands/migrate-create.js'
import { setupCommand, setupDatabaseCommand } from './commands/setup.js'
import { setupJobsCommand } from './commands/setup-jobs.js'
import { createTenantCommand, listTenantsCommand } from './commands/tenant.js'
import { tenantExportCommand } from './commands/tenant-export.js'
import { tenantImportCommand } from './commands/tenant-import.js'
import { updateCommand } from './commands/update.js'

const program = new Command()

program
  .name('cgk')
  .description('CGK - Commerce Growth Kit CLI')
  .version('0.0.0')

// Register commands
program.addCommand(createCommand)
program.addCommand(initCommand)
program.addCommand(doctorCommand)
program.addCommand(setupCommand)
program.addCommand(setupDatabaseCommand)
program.addCommand(setupJobsCommand)
program.addCommand(migrateCommand)
program.addCommand(migrateCreateCommand)
program.addCommand(createTenantCommand)
program.addCommand(listTenantsCommand)
program.addCommand(tenantExportCommand)
program.addCommand(tenantImportCommand)
program.addCommand(checkUpdatesCommand)
program.addCommand(updateCommand)
program.addCommand(changelogCommand)

program.parse()
