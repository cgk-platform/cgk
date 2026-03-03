#!/usr/bin/env node

/**
 * Convert console.* calls to logger.* in a single file
 * Usage: node scripts/convert-single-file.cjs <filepath>
 */

const fs = require('fs');

const filepath = process.argv[2];

if (!filepath) {
  console.error('Usage: node scripts/convert-single-file.cjs <filepath>');
  process.exit(1);
}

try {
  const content = fs.readFileSync(filepath, 'utf8');

  // Skip if already has logger import
  if (content.includes("from '@cgk-platform/logging'")) {
    console.log(`SKIP: ${filepath} (already has logger)`);
    process.exit(0);
  }

  // Count console calls
  const consoleMatches = content.match(/console\.(log|warn|error|debug|info)\(/g);
  if (!consoleMatches || consoleMatches.length === 0) {
    console.log(`SKIP: ${filepath} (no console calls)`);
    process.exit(0);
  }

  let newContent = content;

  // Replace console calls
  newContent = newContent.replace(/console\.log\(/g, 'logger.info(');
  newContent = newContent.replace(/console\.warn\(/g, 'logger.warn(');
  newContent = newContent.replace(/console\.error\(/g, 'logger.error(');
  newContent = newContent.replace(/console\.debug\(/g, 'logger.debug(');
  newContent = newContent.replace(/console\.info\(/g, 'logger.info(');

  // Add import
  const lines = newContent.split('\n');
  let insertIndex = -1;

  // Find last import
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('import ') || line.startsWith('import{')) {
      insertIndex = i;
      // Handle multiline imports
      if (!line.includes('}') && !line.includes("from '") && !line.includes('from "')) {
        for (let j = i + 1; j < lines.length; j++) {
          if (lines[j].includes('}')) {
            insertIndex = j;
            break;
          }
        }
      }
    }
  }

  const loggerImport = "import { logger } from '@cgk-platform/logging'";

  if (insertIndex >= 0) {
    lines.splice(insertIndex + 1, 0, loggerImport);
  } else {
    // Add at beginning after directives/comments
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
  fs.writeFileSync(filepath, newContent, 'utf8');

  console.log(`✓ ${filepath} (${consoleMatches.length} replacements)`);
} catch (error) {
  console.error(`✗ ${filepath}: ${error.message}`);
  process.exit(1);
}
