#!/usr/bin/env node

/**
 * Batch convert console.* calls to structured logging
 * Handles TypeScript/JavaScript import edge cases properly
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all files with console calls using grep
const files = execSync(
  'grep -r -l "console\\.(log|warn|error|debug|info)" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" --exclude-dir=node_modules apps packages 2>/dev/null || true',
  { encoding: 'utf8', cwd: process.cwd(), maxBuffer: 10 * 1024 * 1024 }
)
  .trim()
  .split('\n')
  .filter(Boolean)
  .filter(file => !file.includes('.test.') && !file.includes('.spec.'));

console.log(`Found ${files.length} files with console calls`);

let converted = 0;
let skipped = 0;
let errors = 0;

for (const file of files) {
  try {
    const content = fs.readFileSync(file, 'utf8');

    // Skip if already has logger import
    if (content.includes("from '@cgk-platform/logging'")) {
      skipped++;
      continue;
    }

    // Skip if no actual console calls (might be in comments)
    const consoleMatches = content.match(/console\.(log|warn|error|debug|info)\(/g);
    if (!consoleMatches || consoleMatches.length === 0) {
      skipped++;
      continue;
    }

    let newContent = content;

    // Replace console calls
    newContent = newContent.replace(/console\.log\(/g, 'logger.info(');
    newContent = newContent.replace(/console\.warn\(/g, 'logger.warn(');
    newContent = newContent.replace(/console\.error\(/g, 'logger.error(');
    newContent = newContent.replace(/console\.debug\(/g, 'logger.debug(');
    newContent = newContent.replace(/console\.info\(/g, 'logger.info(');

    // Add import - find the right place
    const lines = newContent.split('\n');
    let insertIndex = -1;

    // Find last import statement
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Check if this is an import line
      if (line.startsWith('import ') || line.startsWith('import{')) {
        insertIndex = i;

        // Handle multiline imports
        if (!line.includes('}') && !line.includes("from '") && !line.includes('from "')) {
          // Find the closing line
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].includes('}')) {
              insertIndex = j;
              break;
            }
          }
        }
      }
    }

    // Insert logger import
    const loggerImport = "import { logger } from '@cgk-platform/logging'";

    if (insertIndex >= 0) {
      lines.splice(insertIndex + 1, 0, loggerImport);
    } else {
      // No imports found - add at the beginning after comments/directives
      let firstCodeLine = 0;
      for (let i = 0; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (
          trimmed &&
          !trimmed.startsWith('//') &&
          !trimmed.startsWith('/*') &&
          !trimmed.startsWith('*') &&
          !trimmed.startsWith('"use ') &&
          !trimmed.startsWith("'use ")
        ) {
          firstCodeLine = i;
          break;
        }
      }
      lines.splice(firstCodeLine, 0, loggerImport);
    }

    newContent = lines.join('\n');

    // Write back
    fs.writeFileSync(file, newContent, 'utf8');
    converted++;

    if (converted % 50 === 0) {
      console.log(`Processed ${converted} files...`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
    errors++;
  }
}

console.log('\n=== Summary ===');
console.log(`Total files found: ${files.length}`);
console.log(`Successfully converted: ${converted}`);
console.log(`Skipped (already has logger): ${skipped}`);
console.log(`Errors: ${errors}`);
console.log('\nReplacements made:');
console.log('  console.log() → logger.info()');
console.log('  console.warn() → logger.warn()');
console.log('  console.error() → logger.error()');
console.log('  console.debug() → logger.debug()');
console.log('  console.info() → logger.info()');
