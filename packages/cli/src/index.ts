#!/usr/bin/env node
/**
 * @cgk/cli - CLI tool for CGK platform
 *
 * Commands:
 * - create <name>  : Create a new brand site
 * - init           : Initialize CGK in existing project
 * - doctor         : Check system requirements
 * - setup          : Run platform setup wizard
 * - migrate        : Run database migrations
 */

import { Command } from 'commander'

import { createCommand } from './commands/create.js'
import { doctorCommand } from './commands/doctor.js'
import { initCommand } from './commands/init.js'
import { migrateCommand } from './commands/migrate.js'
import { setupCommand } from './commands/setup.js'

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
program.addCommand(migrateCommand)

program.parse()
