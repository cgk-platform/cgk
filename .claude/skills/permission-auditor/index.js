/**
 * Permission Auditor Skill
 *
 * Audits permission checks across API routes:
 * - Generates report of all routes and required permissions
 * - Identifies routes missing permission checks
 * - Creates permission dependency graph
 * - Suggests fixes for missing checks
 *
 * Usage: /permission-auditor --app admin --report
 */

import { readFileSync, writeFileSync } from 'fs'
import { glob } from 'glob'
import { resolve, relative } from 'path'

export default {
  name: 'permission-auditor',
  version: '1.0.0',
  description: 'Audits permission checks across API routes',

  async execute(args = {}) {
    const {
      app = 'admin',
      report = true,
      outputFormat = 'text', // text, json, csv
      verbose = false
    } = args

    console.log('🔐 Permission Auditor\n')
    console.log(`  App: ${app}`)
    console.log('')

    const appDir = resolve(process.cwd(), 'apps', app)
    const apiDir = resolve(appDir, 'app', 'api')

    // Find all route.ts files
    const routeFiles = await glob('**/route.ts', {
      cwd: apiDir,
      absolute: true
    })

    console.log(`📊 Found ${routeFiles.length} API routes\n`)

    const routes = []
    let routesWithPermissions = 0
    let routesWithoutPermissions = 0

    for (const file of routeFiles) {
      const content = readFileSync(file, 'utf-8')
      const relativePath = relative(apiDir, file)
      const routePath = `/api/${relativePath.replace('/route.ts', '')}`

      // Extract HTTP methods
      const methods = []
      if (/export\s+async\s+function\s+GET/.test(content)) methods.push('GET')
      if (/export\s+async\s+function\s+POST/.test(content)) methods.push('POST')
      if (/export\s+async\s+function\s+PUT/.test(content)) methods.push('PUT')
      if (/export\s+async\s+function\s+DELETE/.test(content)) methods.push('DELETE')
      if (/export\s+async\s+function\s+PATCH/.test(content)) methods.push('PATCH')

      // Check for requireAuth
      const hasAuth = /requireAuth\s*\(/.test(content)

      // Extract permission checks
      const permissionPattern = /checkPermissionOrRespond\s*\([^,]+,\s*[^,]+,\s*['"]([^'"]+)['"]\)/g
      const permissions = []
      let match

      while ((match = permissionPattern.exec(content)) !== null) {
        permissions.push(match[1])
      }

      const route = {
        file: relativePath,
        path: routePath,
        methods,
        hasAuth,
        permissions,
        hasPermissionCheck: permissions.length > 0,
        lineCount: content.split('\n').length
      }

      if (route.hasPermissionCheck) {
        routesWithPermissions++
      } else {
        routesWithoutPermissions++
      }

      routes.push(route)
    }

    // Generate report
    if (report) {
      generateReport(routes, routesWithPermissions, routesWithoutPermissions, outputFormat)
    }

    // Show routes missing permissions
    const missingPermissions = routes.filter(r => !r.hasPermissionCheck)

    if (missingPermissions.length > 0) {
      console.log('\n⚠️  Routes Missing Permission Checks:\n')

      missingPermissions.forEach(route => {
        console.log(`  📄 ${route.path}`)
        console.log(`     Methods: ${route.methods.join(', ')}`)
        console.log(`     File: ${route.file}`)
        console.log(`     Has Auth: ${route.hasAuth ? '✅' : '❌'}`)

        if (route.hasAuth) {
          console.log(`     💡 Add permission check after requireAuth():`)
          console.log(`        const permissionDenied = await checkPermissionOrRespond(`)
          console.log(`          auth.userId,`)
          console.log(`          auth.tenantId || '',`)
          console.log(`          'resource.action'  // TODO: Define permission`)
          console.log(`        )`)
          console.log(`        if (permissionDenied) return permissionDenied`)
        } else {
          console.log(`     💡 Add authentication first, then permission check`)
        }

        console.log('')
      })
    }

    // Permission usage summary
    console.log('📊 Permission Usage Summary:\n')

    const permissionCounts = {}
    routes.forEach(route => {
      route.permissions.forEach(perm => {
        permissionCounts[perm] = (permissionCounts[perm] || 0) + 1
      })
    })

    const sortedPermissions = Object.entries(permissionCounts)
      .sort((a, b) => b[1] - a[1])

    if (sortedPermissions.length > 0) {
      sortedPermissions.forEach(([perm, count]) => {
        console.log(`  ${perm}: ${count} route(s)`)
      })
    } else {
      console.log('  No permissions defined yet')
    }

    console.log('')

    return {
      status: missingPermissions.length === 0 ? 'pass' : 'warn',
      routes,
      summary: {
        total: routes.length,
        withPermissions: routesWithPermissions,
        withoutPermissions: routesWithoutPermissions,
        permissions: sortedPermissions.length
      },
      missingPermissions
    }
  }
}

function generateReport(routes, withPerms, withoutPerms, format) {
  console.log('📊 Permission Audit Report\n')
  console.log(`  Total Routes: ${routes.length}`)
  console.log(`  With Permissions: ${withPerms} (${Math.round(withPerms / routes.length * 100)}%)`)
  console.log(`  Without Permissions: ${withoutPerms} (${Math.round(withoutPerms / routes.length * 100)}%)`)
  console.log('')

  if (format === 'json') {
    const reportFile = resolve(process.cwd(), '.claude', 'reports', 'permission-audit.json')
    writeFileSync(reportFile, JSON.stringify(routes, null, 2), 'utf-8')
    console.log(`📄 Report saved: ${reportFile}\n`)
  } else if (format === 'csv') {
    const reportFile = resolve(process.cwd(), '.claude', 'reports', 'permission-audit.csv')
    const csv = [
      'Path,Methods,Has Auth,Permissions,File',
      ...routes.map(r => `"${r.path}","${r.methods.join(', ')}",${r.hasAuth},"${r.permissions.join(', ')}","${r.file}"`)
    ].join('\n')
    writeFileSync(reportFile, csv, 'utf-8')
    console.log(`📄 Report saved: ${reportFile}\n`)
  }
}
