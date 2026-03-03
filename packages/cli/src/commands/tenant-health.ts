import { Command } from 'commander'
import { tenantHealthCheck } from './tenant-health-check.js'
import { logger } from '@cgk-platform/logging'

export const tenantHealthCommand = new Command('tenant:health')
  .description('Run health check on a tenant')
  .argument('<slug>', 'Tenant slug to check')
  .option('-v, --verbose', 'Show detailed information')
  .action(async (slug: string, options: { verbose?: boolean }) => {
    try {
      await tenantHealthCheck(slug, { verbose: options.verbose })
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      logger.error('Health check failed:', err)
      process.exit(1)
    }
  })
