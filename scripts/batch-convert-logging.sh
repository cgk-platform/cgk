#!/bin/bash

# Batch convert console.* calls to structured logging
# Usage: bash scripts/batch-convert-logging.sh [directory]

set -e

DIR="${1:-.}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOTAL=0
CONVERTED=0
SKIPPED=0

echo "Converting console.* calls to logger.* in $DIR..."

# Find all TypeScript/JavaScript files excluding test files and node_modules
while IFS= read -r file; do
  # Skip test files
  if [[ "$file" =~ \.test\. ]] || [[ "$file" =~ \.spec\. ]]; then
    continue
  fi

  # Skip if no console calls
  if ! grep -q "console\.\(log\|warn\|error\|debug\|info\)" "$file"; then
    continue
  fi

  # Skip if already has logger import
  if grep -q "from '@cgk-platform/logging'" "$file"; then
    ((SKIPPED++))
    continue
  fi

  ((TOTAL++))

  # Create temp file
  TEMP_FILE=$(mktemp)

  # Add logger import after last import or at beginning
  awk '
    BEGIN {
      import_added = 0
      last_import_line = 0
      in_multiline_import = 0
    }
    {
      line = $0

      # Track multiline imports
      if (line ~ /^import /) {
        last_import_line = NR
        if (line !~ /}/) {
          in_multiline_import = 1
        }
      }

      # End of multiline import
      if (in_multiline_import && line ~ /}/) {
        in_multiline_import = 0
        last_import_line = NR
      }

      # Replace console calls
      gsub(/console\.log\(/, "logger.info(", line)
      gsub(/console\.warn\(/, "logger.warn(", line)
      gsub(/console\.error\(/, "logger.error(", line)
      gsub(/console\.debug\(/, "logger.debug(", line)
      gsub(/console\.info\(/, "logger.info(", line)

      print line

      # Add import after last import
      if (!import_added && last_import_line > 0 && NR == last_import_line && !in_multiline_import) {
        print "import { logger } from '\''@cgk-platform/logging'\''"
        import_added = 1
      }
    }
    END {
      # If no imports found, we need to add at beginning
      if (!import_added) {
        print "ERROR: No imports found" > "/dev/stderr"
      }
    }
  ' "$file" > "$TEMP_FILE"

  # Check if conversion was successful
  if [ $? -eq 0 ] && [ -s "$TEMP_FILE" ]; then
    mv "$TEMP_FILE" "$file"
    ((CONVERTED++))
    echo "✓ Converted: $file"
  else
    rm -f "$TEMP_FILE"
    echo "✗ Failed: $file"
  fi
done < <(find "$DIR" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -not -path "*/node_modules/*")

echo ""
echo "Summary:"
echo "  Total files processed: $TOTAL"
echo "  Successfully converted: $CONVERTED"
echo "  Skipped (already has logger): $SKIPPED"
