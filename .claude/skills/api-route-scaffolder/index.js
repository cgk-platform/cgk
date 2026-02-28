/**
 * API Route Scaffolder Skill
 *
 * Interactive scaffolder for Next.js API routes with:
 * - Proper auth wrapper (requireAuth + checkPermissionOrRespond)
 * - Tenant isolation (withTenant)
 * - Structured logging (request ID, tenant ID, user ID)
 * - Type-safe response helpers
 * - Error handling with proper error types
 *
 * Usage: /api-route-scaffolder --method GET --path /api/orders --permission orders.read
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default {
  name: 'api-route-scaffolder',
  version: '1.0.0',
  description: 'Interactive scaffolder for Next.js API routes with best practices',

  async execute(args = {}) {
    const {
      method = '',
      path: routePath = '',
      permission = '',
      table: tableName = '',
      description: routeDescription = '',
      app = 'admin',
      force = false,
      dryRun = false
    } = args

    console.log('🛠️  API Route Scaffolder\n')

    // Validate required arguments
    const missingArgs = []
    if (!method) missingArgs.push('--method')
    if (!routePath) missingArgs.push('--path')
    if (!permission) missingArgs.push('--permission')

    if (missingArgs.length > 0) {
      console.error('❌ Missing required arguments:', missingArgs.join(', '))
      console.log('\nUsage:')
      console.log('  /api-route-scaffolder \\')
      console.log('    --method GET|POST|PUT|DELETE \\')
      console.log('    --path /api/your-route \\')
      console.log('    --permission your.permission \\')
      console.log('    [--table table_name] \\')
      console.log('    [--description "Route description"] \\')
      console.log('    [--app admin|storefront|orchestrator] \\')
      console.log('    [--force] \\')
      console.log('    [--dry-run]')
      console.log('\nExamples:')
      console.log('  /api-route-scaffolder --method GET --path /api/orders --permission orders.read --table orders')
      console.log('  /api-route-scaffolder --method POST --path /api/projects --permission projects.create --table projects --app creator-portal')
      return { status: 'error', message: 'Missing required arguments' }
    }

    // Validate method
    const validMethods = ['GET', 'POST', 'PUT', 'DELETE']
    const normalizedMethod = method.toUpperCase()
    if (!validMethods.includes(normalizedMethod)) {
      console.error(`❌ Invalid method: ${method}. Must be one of: ${validMethods.join(', ')}`)
      return { status: 'error', message: 'Invalid method' }
    }

    // Normalize path
    const normalizedPath = routePath.startsWith('/') ? routePath : `/${routePath}`

    // Derive route details
    const routeName = normalizedPath
      .split('/')
      .filter(Boolean)
      .pop() || 'resource'

    const inferredTable = tableName || routeName.replace(/-/g, '_')
    const inferredDescription = routeDescription || `${normalizedMethod} ${normalizedPath}`

    // Determine app directory
    const appDir = resolve(process.cwd(), 'apps', app)
    if (!existsSync(appDir)) {
      console.error(`❌ App directory not found: ${appDir}`)
      console.log('\nAvailable apps: admin, storefront, orchestrator, creator-portal, contractor-portal')
      return { status: 'error', message: 'App directory not found' }
    }

    // Determine file path
    // For Next.js 13+ App Router: apps/{app}/app/api/{path}/route.ts
    const apiPath = normalizedPath.replace('/api/', '')
    const routeDir = join(appDir, 'app', 'api', apiPath)
    const routeFile = join(routeDir, 'route.ts')

    // Check if file exists
    if (existsSync(routeFile) && !force) {
      console.error(`❌ Route file already exists: ${routeFile}`)
      console.log('\nUse --force to overwrite')
      return { status: 'error', message: 'Route file already exists' }
    }

    // Select template
    const templateMap = {
      'GET': 'get-route.ts.template',
      'POST': 'post-route.ts.template',
      'PUT': 'put-route.ts.template',
      'DELETE': 'delete-route.ts.template'
    }

    const templateFile = join(__dirname, 'templates', templateMap[normalizedMethod])
    if (!existsSync(templateFile)) {
      console.error(`❌ Template not found: ${templateFile}`)
      return { status: 'error', message: 'Template not found' }
    }

    // Read template
    let template = readFileSync(templateFile, 'utf-8')

    // Replace placeholders
    template = template
      .replace(/\{\{ROUTE_DESCRIPTION\}\}/g, inferredDescription)
      .replace(/\{\{ROUTE_PATH\}\}/g, normalizedPath)
      .replace(/\{\{ROUTE_NAME\}\}/g, routeName)
      .replace(/\{\{PERMISSION\}\}/g, permission)
      .replace(/\{\{TABLE_NAME\}\}/g, inferredTable)
      .replace(/\{\{METHOD\}\}/g, normalizedMethod)

    // Show preview
    console.log('📄 Generated Route:\n')
    console.log(`  App: ${app}`)
    console.log(`  Method: ${normalizedMethod}`)
    console.log(`  Path: ${normalizedPath}`)
    console.log(`  Permission: ${permission}`)
    console.log(`  Table: ${inferredTable}`)
    console.log(`  File: ${routeFile}`)
    console.log('')

    if (dryRun) {
      console.log('🔍 Dry-run mode - Preview:\n')
      console.log('─'.repeat(80))
      console.log(template)
      console.log('─'.repeat(80))
      console.log('\n✅ Dry-run complete. Run without --dry-run to create file.')
      return {
        status: 'success',
        dryRun: true,
        file: routeFile,
        preview: template
      }
    }

    // Create directory if needed
    if (!existsSync(routeDir)) {
      mkdirSync(routeDir, { recursive: true })
      console.log(`📁 Created directory: ${routeDir}`)
    }

    // Write file
    writeFileSync(routeFile, template, 'utf-8')
    console.log(`✅ Route created: ${routeFile}`)

    // Show next steps
    console.log('\n📝 Next Steps:')
    console.log('  1. Review the generated route and replace TODOs')
    console.log('  2. Update SQL query to match your data model')
    console.log('  3. Add validation for request body (POST/PUT)')
    console.log('  4. Test the route with proper authentication')
    console.log('  5. Run type check: pnpm turbo typecheck\n')

    // Show example curl command
    console.log('🧪 Test Command:')
    console.log(`  curl -X ${normalizedMethod} http://localhost:3000${normalizedPath} \\`)
    console.log(`    -H "Authorization: Bearer YOUR_TOKEN" \\`)
    if (normalizedMethod === 'POST' || normalizedMethod === 'PUT') {
      console.log(`    -H "Content-Type: application/json" \\`)
      console.log(`    -d '{"field": "value"}'`)
    } else {
      console.log(`    -H "Content-Type: application/json"`)
    }
    console.log('')

    return {
      status: 'success',
      file: routeFile,
      method: normalizedMethod,
      path: normalizedPath,
      permission,
      table: inferredTable
    }
  }
}
