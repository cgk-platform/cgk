#!/usr/bin/env python3
"""
Fix all remaining <a> tags in storefront by replacing with <Link /> from next/link.
"""

import re
from pathlib import Path

def has_link_import(content: str) -> bool:
    """Check if file already imports Link from next/link."""
    return "from 'next/link'" in content or 'from "next/link"' in content

def add_link_import(content: str) -> str:
    """Add Link import after other imports."""
    # Find the last import statement
    import_pattern = r"^import .+ from ['\"].+['\"]$"
    lines = content.split('\n')
    last_import_idx = -1

    for i, line in enumerate(lines):
        if re.match(import_pattern, line.strip()):
            last_import_idx = i

    if last_import_idx >= 0:
        # Insert after last import
        lines.insert(last_import_idx + 1, "import Link from 'next/link'")
        return '\n'.join(lines)

    # No imports found, add at top
    return "import Link from 'next/link'\n" + content

def fix_a_tags(content: str) -> tuple[str, int]:
    """Replace <a href="/path"> with <Link href="/path"> and </a> with </Link>."""
    fixes = 0

    # Replace opening <a href="/..."> tags with <Link href="/...">
    # This handles various attributes like className, style, etc.
    pattern_open = r'<a\s+href="(/[^"]*)"([^>]*)>'

    def replacer_open(match):
        nonlocal fixes
        href = match.group(1)
        attrs = match.group(2)
        fixes += 1
        return f'<Link href="{href}"{attrs}>'

    content = re.sub(pattern_open, replacer_open, content)

    # Replace closing </a> tags with </Link>
    content = re.sub(r'</a>', '</Link>', content)

    return content, fixes

def remove_unused_imports(content: str) -> str:
    """Remove unused DeliveryEstimate import if present."""
    # Check if DeliveryEstimate is used in the file
    if 'DeliveryEstimate' in content and '<DeliveryEstimate' not in content:
        # Remove from imports
        content = re.sub(r',\s*DeliveryEstimate', '', content)
        content = re.sub(r'DeliveryEstimate,\s*', '', content)
        content = re.sub(r"import\s+\{\s*DeliveryEstimate\s*\}\s+from\s+['\"].*?['\"]\n", '', content)

    return content

def process_file(file_path: Path) -> bool:
    """Process a single file."""
    try:
        content = file_path.read_text()
        original = content

        # Fix <a> tags
        content, fixes = fix_a_tags(content)

        if fixes > 0:
            # Add Link import if not present
            if not has_link_import(content):
                content = add_link_import(content)

            # Remove unused imports
            content = remove_unused_imports(content)

            file_path.write_text(content)
            print(f"✓ {file_path.relative_to(file_path.parents[5])}: {fixes} <a> tags fixed")
            return True

        return False
    except Exception as e:
        print(f"✗ {file_path}: {e}")
        return False

def main():
    storefront_src = Path("/Users/holdenthemic/Documents/cgk/apps/storefront/src")

    # Find all .tsx and .ts files
    files = list(storefront_src.rglob("*.tsx")) + list(storefront_src.rglob("*.ts"))

    print(f"Processing {len(files)} files...\n")

    modified = 0
    for file_path in sorted(files):
        if process_file(file_path):
            modified += 1

    print(f"\n✓ Fixed {modified} files")

if __name__ == "__main__":
    main()
