import { Command } from 'commander'
import { tenantHealthCheck } from './tenant-health-check.js'

export const tenantHealthCommand = new Command('tenant:health')
  .description('Run health check on a tenant')
  .argument('<slug>', 'Tenant slug to check')
  .option('-v, --verbose', 'Show detailed information')
  .action(async (slug: string, options: { verbose?: boolean }) => {
    try {
      await tenantHealthCheck(slug, { verbose: options.verbose })
    } catch (error) {
      console.error('Health check failed:', error)
      process.exit(1)
    }
  })
