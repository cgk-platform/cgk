import chalk from 'chalk'
import { Command } from 'commander'
import path from 'path'
import fs from 'fs-extra'

/**
 * Parse a CHANGELOG.md file and extract version sections
 */
interface VersionEntry {
  version: string
  date?: string
  content: string
  sections: {
    type: string
    items: string[]
  }[]
}

function parseChangelog(content: string): VersionEntry[] {
  const entries: VersionEntry[] = []
  const lines = content.split('\n')

  let currentEntry: VersionEntry | null = null
  let currentSection: { type: string; items: string[] } | null = null
  let contentLines: string[] = []

  for (const line of lines) {
    // Match version headers like: ## [1.0.0] - 2025-02-10 or ## 1.0.0 or ## v1.0.0
    const versionMatch = line.match(/^##\s+\[?v?(\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?)\]?\s*(?:-\s*(.+))?/)

    if (versionMatch) {
      // Save previous entry
      if (currentEntry) {
        currentEntry.content = contentLines.join('\n').trim()
        if (currentSection && currentSection.items.length > 0) {
          currentEntry.sections.push(currentSection)
        }
        entries.push(currentEntry)
      }

      // Start new entry
      currentEntry = {
        version: versionMatch[1] ?? '',
        date: versionMatch[2]?.trim(),
        content: '',
        sections: [],
      }
      currentSection = null
      contentLines = []
      continue
    }

    // Match section headers like: ### Added, ### Changed, ### Fixed, etc.
    const sectionMatch = line.match(/^###\s+(.+)/)
    if (sectionMatch && currentEntry) {
      if (currentSection && currentSection.items.length > 0) {
        currentEntry.sections.push(currentSection)
      }
      currentSection = {
        type: sectionMatch[1]?.trim() ?? '',
        items: [],
      }
      contentLines.push(line)
      continue
    }

    // Match list items
    const itemMatch = line.match(/^[-*]\s+(.+)/)
    if (itemMatch && currentSection) {
      currentSection.items.push(itemMatch[1]?.trim() ?? '')
    }

    if (currentEntry) {
      contentLines.push(line)
    }
  }

  // Save last entry
  if (currentEntry) {
    currentEntry.content = contentLines.join('\n').trim()
    if (currentSection && currentSection.items.length > 0) {
      currentEntry.sections.push(currentSection)
    }
    entries.push(currentEntry)
  }

  return entries
}

/**
 * Get section icon/color based on type
 */
function getSectionStyle(type: string): { icon: string; color: (s: string) => string } {
  const lowerType = type.toLowerCase()

  if (lowerType === 'added' || lowerType === 'new' || lowerType === 'features') {
    return { icon: '+', color: chalk.green }
  }
  if (lowerType === 'changed' || lowerType === 'updated' || lowerType === 'improved') {
    return { icon: '~', color: chalk.yellow }
  }
  if (lowerType === 'fixed' || lowerType === 'bugfixes' || lowerType === 'fixes') {
    return { icon: '*', color: chalk.cyan }
  }
  if (lowerType === 'deprecated') {
    return { icon: '!', color: chalk.yellow }
  }
  if (lowerType === 'removed' || lowerType === 'breaking') {
    return { icon: '-', color: chalk.red }
  }
  if (lowerType === 'security') {
    return { icon: '!', color: chalk.red }
  }

  return { icon: ' ', color: chalk.dim }
}

/**
 * changelog command
 * View changelog for a version
 */
export const changelogCommand = new Command('changelog')
  .description('View changelog for a version')
  .argument('[version]', 'Version to view (default: latest)')
  .option('--json', 'Output as JSON')
  .option('--all', 'Show all versions')
  .option('--count <n>', 'Show last N versions', '5')
  .action(async (version: string | undefined, options) => {
    // Find CHANGELOG.md in the project root
    const possiblePaths = [
      path.join(process.cwd(), 'CHANGELOG.md'),
      path.join(process.cwd(), 'changelog.md'),
      path.join(process.cwd(), 'CHANGES.md'),
      path.join(process.cwd(), 'HISTORY.md'),
    ]

    let changelogPath: string | null = null
    for (const p of possiblePaths) {
      if (await fs.pathExists(p)) {
        changelogPath = p
        break
      }
    }

    if (!changelogPath) {
      console.log(chalk.yellow('\n[INFO] No changelog found\n'))
      console.log('  Looked for:')
      for (const p of possiblePaths) {
        console.log(chalk.dim(`    - ${p}`))
      }
      console.log('')
      console.log('  Create a CHANGELOG.md file in your project root.')
      console.log('  See https://keepachangelog.com for format guidelines.')
      console.log('')

      // If in CGK monorepo, show platform version info
      const packageJsonPath = path.join(process.cwd(), 'package.json')
      if (await fs.pathExists(packageJsonPath)) {
        try {
          const packageJson = await fs.readJson(packageJsonPath)
          if (packageJson.version) {
            console.log(chalk.dim(`  Current project version: ${packageJson.version}`))
          }
        } catch {
          // Ignore package.json read errors
        }
      }
      console.log('')
      return
    }

    // Read and parse changelog
    const content = await fs.readFile(changelogPath, 'utf-8')
    const entries = parseChangelog(content)

    if (entries.length === 0) {
      console.log(chalk.yellow('\n[INFO] Changelog is empty or has no version entries\n'))
      console.log('  Expected format:')
      console.log(chalk.dim('    ## [1.0.0] - 2025-02-10'))
      console.log(chalk.dim('    ### Added'))
      console.log(chalk.dim('    - New feature description'))
      console.log('')
      return
    }

    // JSON output
    if (options.json) {
      if (version) {
        const entry = entries.find((e) => e.version === version)
        if (!entry) {
          console.log(JSON.stringify({ error: `Version ${version} not found` }))
          process.exit(1)
        }
        console.log(JSON.stringify(entry, null, 2))
      } else if (options.all) {
        console.log(JSON.stringify(entries, null, 2))
      } else {
        const count = parseInt(options.count, 10) || 5
        console.log(JSON.stringify(entries.slice(0, count), null, 2))
      }
      return
    }

    // Console output
    console.log(chalk.cyan('\n[CHANGELOG] CGK Platform\n'))

    let entriesToShow: VersionEntry[]

    if (version) {
      // Find specific version
      const entry = entries.find((e) => e.version === version)
      if (!entry) {
        console.log(chalk.red(`  Version ${version} not found\n`))
        console.log('  Available versions:')
        for (const e of entries.slice(0, 10)) {
          console.log(chalk.dim(`    - ${e.version}${e.date ? ` (${e.date})` : ''}`))
        }
        if (entries.length > 10) {
          console.log(chalk.dim(`    ... and ${entries.length - 10} more`))
        }
        console.log('')
        process.exit(1)
      }
      entriesToShow = [entry]
    } else if (options.all) {
      entriesToShow = entries
    } else {
      const count = parseInt(options.count, 10) || 5
      entriesToShow = entries.slice(0, count)
    }

    // Display entries
    for (const entry of entriesToShow) {
      console.log(chalk.bold(`  v${entry.version}`) + (entry.date ? chalk.dim(` - ${entry.date}`) : ''))

      if (entry.sections.length > 0) {
        for (const section of entry.sections) {
          const { icon, color } = getSectionStyle(section.type)
          console.log('')
          console.log(color(`    ${icon} ${section.type}`))

          for (const item of section.items.slice(0, 10)) {
            console.log(chalk.dim(`      - ${item}`))
          }
          if (section.items.length > 10) {
            console.log(chalk.dim(`      ... and ${section.items.length - 10} more`))
          }
        }
      } else if (entry.content) {
        // Show raw content if no structured sections
        const contentLines = entry.content.split('\n').filter((l) => l.trim())
        for (const line of contentLines.slice(0, 10)) {
          console.log(chalk.dim(`    ${line.trim()}`))
        }
        if (contentLines.length > 10) {
          console.log(chalk.dim(`    ... (${contentLines.length - 10} more lines)`))
        }
      }

      console.log('')
      console.log(chalk.dim('    ' + '-'.repeat(50)))
      console.log('')
    }

    // Show navigation help
    if (!version && entries.length > entriesToShow.length) {
      console.log(chalk.dim(`  Showing ${entriesToShow.length} of ${entries.length} versions.`))
      console.log(chalk.dim('  Use --all to show all versions, or specify a version number.'))
      console.log('')
    }
  })
