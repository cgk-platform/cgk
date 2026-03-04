"""
brand.py — Brand context loader for storyboard creation.

Reads workspace/brand/ files to provide brand context for video storyboarding.
Each profile has its own brand system — no cross-profile access.

Files loaded:
  - video-style.md  — Video-specific brand guidelines
  - copy-guidelines.md — Copy/messaging rules
  - imagery.md — Visual style guidelines
  - colors.md — Brand color palette
  - typography.md — Font guidelines
  - design-rules/ — Design system rules (all .md files)
"""

import os
from pathlib import Path


def _read_file(path: str | Path, max_chars: int = 5000) -> str:
    """Read a text file, truncating if too long."""
    path = Path(path)
    if not path.exists():
        return ""
    try:
        content = path.read_text(encoding="utf-8")
        if len(content) > max_chars:
            return content[:max_chars] + f"\n... (truncated, {len(content)} total chars)"
        return content
    except (UnicodeDecodeError, PermissionError):
        return ""


def load_brand_context(brand_dir: str | Path, profile_root: str | Path) -> dict:
    """Load brand context from workspace/brand/ directory.

    Returns dict of context_name → content string.
    """
    brand_dir = Path(brand_dir)
    profile_root = Path(profile_root)
    context = {}

    # Core brand files
    core_files = [
        ("video_style", "video-style.md"),
        ("copy_guidelines", "copy-guidelines.md"),
        ("imagery", "imagery.md"),
        ("colors", "colors.md"),
        ("typography", "typography.md"),
    ]

    for key, filename in core_files:
        content = _read_file(brand_dir / filename)
        if content:
            context[key] = content

    # Design rules directory
    design_rules_dir = brand_dir / "design-rules"
    if design_rules_dir.exists() and design_rules_dir.is_dir():
        rules = []
        for f in sorted(design_rules_dir.glob("*.md")):
            content = _read_file(f, max_chars=2000)
            if content:
                rules.append(f"### {f.stem}\n{content}")
        if rules:
            context["design_rules"] = "\n\n".join(rules)

    # Brand name and category from env
    brand_name = os.environ.get("BRAND_NAME", "")
    brand_category = os.environ.get("BRAND_CATEGORY", "")
    if brand_name:
        context["brand_name"] = brand_name
    if brand_category:
        context["brand_category"] = brand_category

    # MEMORY.md for additional product context (if main session)
    memory_path = profile_root / "workspace" / "MEMORY.md"
    memory_content = _read_file(memory_path, max_chars=3000)
    if memory_content:
        context["memory_highlights"] = memory_content

    # IDENTITY.md for agent persona
    identity_path = profile_root / "workspace" / "IDENTITY.md"
    identity_content = _read_file(identity_path, max_chars=1000)
    if identity_content:
        context["identity"] = identity_content

    return context
