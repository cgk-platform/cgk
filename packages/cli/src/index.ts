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
 * - tenant:create     : Create a new tenant
 * - tenant:list       : List all tenants
 */

import { Command } from 'commander'

import { createCommand } from './commands/create.js'
import { doctorCommand } from './commands/doctor.js'
import { initCommand } from './commands/init.js'
import { migrateCommand } from './commands/migrate.js'
import { setupCommand, setupDatabaseCommand } from './commands/setup.js'
import { setupJobsCommand } from './commands/setup-jobs.js'
import { createTenantCommand, listTenantsCommand } from './commands/tenant.js'

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
program.addCommand(createTenantCommand)
program.addCommand(listTenantsCommand)

program.parse()
