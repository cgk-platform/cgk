#!/bin/bash

# Batch convert all console.* calls to logger.*
# This script processes files in the apps/ and packages/ directories

set -e

echo "Finding all files with console calls..."

# Create temp file with all files to process
TEMP_FILE=$(mktemp)

# Find all files in apps and packages (excluding node_modules, .next, test files)
find apps packages -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  ! -path "*/node_modules/*" \
  ! -path "*/.next/*" \
  ! -name "*.test.*" \
  ! -name "*.spec.*" \
  2>/dev/null > "$TEMP_FILE" || true

# Filter to only files with console calls
CONSOLE_FILES=$(mktemp)
while IFS= read -r file; do
  if grep -q "console\.\(log\|warn\|error\|debug\|info\)(" "$file" 2>/dev/null; then
    echo "$file" >> "$CONSOLE_FILES"
  fi
done < "$TEMP_FILE"

TOTAL=$(wc -l < "$CONSOLE_FILES" | tr -d ' ')
echo "Found $TOTAL files with console calls"
echo ""

if [ "$TOTAL" -eq 0 ]; then
  echo "No files to process"
  rm -f "$TEMP_FILE" "$CONSOLE_FILES"
  exit 0
fi

# Process each file
COUNT=0
CONVERTED=0
SKIPPED=0
ERRORS=0

while IFS= read -r file; do
  ((COUNT++))

  OUTPUT=$(node scripts/convert-single-file.cjs "$file" 2>&1)
  if echo "$OUTPUT" | grep -q "^✓"; then
    ((CONVERTED++))
  elif echo "$OUTPUT" | grep -q "^SKIP"; then
    ((SKIPPED++))
  else
    ((ERRORS++))
    echo "$OUTPUT"
  fi

  # Progress indicator
  if [ $((COUNT % 100)) -eq 0 ]; then
    echo "Progress: $COUNT/$TOTAL files processed (Converted: $CONVERTED, Skipped: $SKIPPED, Errors: $ERRORS)..."
  fi
done < "$CONSOLE_FILES"

# Cleanup
rm -f "$TEMP_FILE" "$CONSOLE_FILES"

echo ""
echo "=========================================="
echo "Conversion Summary"
echo "=========================================="
echo "Total files found:      $TOTAL"
echo "Successfully converted: $CONVERTED"
echo "Skipped (has logger):   $SKIPPED"
echo "Errors:                 $ERRORS"
echo "=========================================="
