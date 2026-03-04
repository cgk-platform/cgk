#!/usr/bin/env python3
"""
Fix all logger type errors in the storefront app.

Handles 3 patterns:
1. logger.error(msg, error) - Cast error to Error type
2. logger.info(msg, {}) - Replace empty object with undefined
3. logger.warn(msg, error) - Wrap error message in Record object
"""

import re
import sys
from pathlib import Path

def fix_logger_error_calls(content: str) -> tuple[str, int]:
    """Fix logger.error calls that pass unknown error type."""
    fixes = 0

    # Pattern: logger.error('message', error) where error is unknown
    # Replace with: logger.error('message', error instanceof Error ? error : new Error(String(error)))

    # Match logger.error with 2 args where second arg is just 'error', 'err', or 'e'
    pattern = r"logger\.error\(([^,]+),\s*(error|err|e)\s*\)"

    def replacer(match):
        nonlocal fixes
        msg = match.group(1)
        var = match.group(2)
        fixes += 1
        return f"logger.error({msg}, {var} instanceof Error ? {var} : new Error(String({var})))"

    content = re.sub(pattern, replacer, content)
    return content, fixes

def fix_logger_info_empty_object(content: str) -> tuple[str, int]:
    """Fix logger.info calls with empty object {}."""
    fixes = 0

    # Pattern: logger.info('message', {}) or similar patterns with data ?? ''
    # Replace with: logger.info('message', data ? { data } : undefined)

    # First, fix the debugLog pattern: logger.info(`[GA4] ${message}`, data ?? '')
    pattern1 = r"logger\.info\(`\[([^\]]+)\] \$\{message\}`, data \?\? ''\)"

    def replacer1(match):
        nonlocal fixes
        prefix = match.group(1)
        fixes += 1
        return f"logger.info(`[{prefix}] ${{message}}`, data ? {{ data }} : undefined)"

    content = re.sub(pattern1, replacer1, content)

    # Also fix direct empty object: logger.info('msg', {})
    pattern2 = r"logger\.info\(([^,]+),\s*\{\}\s*\)"

    def replacer2(match):
        nonlocal fixes
        msg = match.group(1)
        fixes += 1
        return f"logger.info({msg}, undefined)"

    content = re.sub(pattern2, replacer2, content)

    return content, fixes

def fix_logger_warn_error_type(content: str) -> tuple[str, int]:
    """Fix logger.warn calls that pass Error instead of Record."""
    fixes = 0

    # Pattern: logger.warn('message', error) where logger.warn expects Record<string, unknown>
    # Replace with: logger.warn('message', { error: error instanceof Error ? error.message : String(error) })

    # Match logger.warn with 2 args where second arg looks like an error
    pattern = r"logger\.warn\(([^,]+),\s*(error|err|e)\s*\)"

    def replacer(match):
        nonlocal fixes
        msg = match.group(1)
        var = match.group(2)
        fixes += 1
        return f"logger.warn({msg}, {{ error: {var} instanceof Error ? {var}.message : String({var}) }})"

    content = re.sub(pattern, replacer, content)
    return content, fixes

def process_file(file_path: Path) -> bool:
    """Process a single file and return True if changes were made."""
    try:
        content = file_path.read_text()
        original = content

        # Apply all fixes
        content, error_fixes = fix_logger_error_calls(content)
        content, info_fixes = fix_logger_info_empty_object(content)
        content, warn_fixes = fix_logger_warn_error_type(content)

        total_fixes = error_fixes + info_fixes + warn_fixes

        if content != original:
            file_path.write_text(content)
            print(f"✓ {file_path.relative_to(file_path.parents[5])}: {total_fixes} fixes")
            return True

        return False
    except Exception as e:
        print(f"✗ {file_path}: {e}", file=sys.stderr)
        return False

def main():
    storefront_dir = Path("/Users/holdenthemic/Documents/cgk/apps/storefront/src")

    # Find all .ts and .tsx files
    files = list(storefront_dir.rglob("*.ts")) + list(storefront_dir.rglob("*.tsx"))

    print(f"Processing {len(files)} TypeScript files...\n")

    modified = 0
    for file_path in sorted(files):
        if process_file(file_path):
            modified += 1

    print(f"\n✓ Fixed {modified} files")

if __name__ == "__main__":
    main()
