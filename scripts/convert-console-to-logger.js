#!/usr/bin/env node

/**
 * Script to convert console.* calls to structured logging
 *
 * Usage: node scripts/convert-console-to-logger.js <file-path>
 */

const fs = require('fs');
const path = require('path');

function convertFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;

  // Skip if already imports logger
  if (content.includes("from '@cgk-platform/logging'")) {
    return { converted: 0, skipped: true };
  }

  // Count console calls
  const consoleMatches = content.match(/console\.(log|warn|error|debug|info)/g) || [];
  if (consoleMatches.length === 0) {
    return { converted: 0, skipped: true };
  }

  let newContent = content;

  // Replace console calls
  newContent = newContent.replace(/console\.log\(/g, 'logger.info(');
  newContent = newContent.replace(/console\.warn\(/g, 'logger.warn(');
  newContent = newContent.replace(/console\.error\(/g, 'logger.error(');
  newContent = newContent.replace(/console\.debug\(/g, 'logger.debug(');
  newContent = newContent.replace(/console\.info\(/g, 'logger.info(');

  // Add import at the top (after other imports)
  const importStatement = "import { logger } from '@cgk-platform/logging'\n";

  // Find the last import statement
  const lines = newContent.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('import ') || lines[i].trim().startsWith('import{')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex >= 0) {
    // Insert after last import
    lines.splice(lastImportIndex + 1, 0, importStatement);
    newContent = lines.join('\n');
  } else {
    // No imports found, add at the beginning after any comments
    let firstCodeLine = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed && !trimmed.startsWith('//') && !trimmed.startsWith('/*') && !trimmed.startsWith('*')) {
        firstCodeLine = i;
        break;
      }
    }
    lines.splice(firstCodeLine, 0, importStatement);
    newContent = lines.join('\n');
  }

  // Write back
  fs.writeFileSync(filePath, newContent, 'utf8');

  return { converted: consoleMatches.length, skipped: false };
}

// Main
const filePath = process.argv[2];
if (!filePath) {
  console.error('Usage: node scripts/convert-console-to-logger.js <file-path>');
  process.exit(1);
}

const result = convertFile(filePath);
console.log(JSON.stringify(result));
