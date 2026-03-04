#!/usr/bin/env python3
"""
Fix multi-line <a> tags that were missed by the previous script.
"""

import re
from pathlib import Path

def fix_multiline_a_tags(content: str) -> tuple[str, int]:
    """Replace multi-line <a href="/..."> with <Link href="/..."> using DOTALL flag."""
    fixes = 0

    # Match opening <a> tags (including multi-line) that have href="/..."
    # DOTALL flag makes . match newlines
    pattern = r'<a\s+([^>]*href="/[^"]*"[^>]*)>'

    def replacer(match):
        nonlocal fixes
        attrs = match.group(1)
        fixes += 1
        return f'<Link {attrs}>'

    # Use DOTALL to match across newlines
    content = re.sub(pattern, replacer, content, flags=re.DOTALL)

    return content, fixes

def has_link_import(content: str) -> bool:
    """Check if file already imports Link from next/link."""
    return "from 'next/link'" in content or 'from "next/link"' in content

def add_link_import(content: str) -> str:
    """Add Link import after other imports."""
    import_pattern = r"^import .+ from ['\"].+['\"]$"
    lines = content.split('\n')
    last_import_idx = -1

    for i, line in enumerate(lines):
        if re.match(import_pattern, line.strip()):
            last_import_idx = i

    if last_import_idx >= 0:
        lines.insert(last_import_idx + 1, "import Link from 'next/link'")
        return '\n'.join(lines)

    return "import Link from 'next/link'\n" + content

def process_file(file_path: Path) -> bool:
    """Process a single file."""
    try:
        content = file_path.read_text()
        original = content

        content, fixes = fix_multiline_a_tags(content)

        if fixes > 0:
            if not has_link_import(content):
                content = add_link_import(content)

            file_path.write_text(content)
            print(f"✓ {file_path.relative_to(file_path.parents[5])}: {fixes} multi-line <a> tags fixed")
            return True

        return False
    except Exception as e:
        print(f"✗ {file_path}: {e}")
        return False

def main():
    storefront_src = Path("/Users/holdenthemic/Documents/cgk/apps/storefront/src")
    files = list(storefront_src.rglob("*.tsx")) + list(storefront_src.rglob("*.ts"))

    print(f"Processing {len(files)} files...\n")

    modified = 0
    for file_path in sorted(files):
        if process_file(file_path):
            modified += 1

    print(f"\n✓ Fixed {modified} files")

if __name__ == "__main__":
    main()
