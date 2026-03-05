#!/usr/bin/env python3
"""Install one or more ClawHub skills by slug or URL into the current workspace.

Usage:
    install_skills.py [--workdir DIR [--workdir DIR ...]] <slug-or-url> [<slug-or-url> ...]

Installs skills into all specified workdirs (defaults to both ~/.openclaw and
~/.openclaw-rawdog if they exist). Skill code/SKILL.md/scripts are synced across
workspaces, but .env, .token.json, and other config files are NOT copied between
workspaces — each workspace keeps its own secrets.

Outputs a JSON object with per-workspace install results.
"""

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path


CLAWHUB_URL_PATTERNS = [
    re.compile(r"https?://(?:www\.)?clawhub\.(?:ai|com)/(?:skills?|s)/([a-zA-Z0-9_-]+)"),
    re.compile(r"<https?://(?:www\.)?clawhub\.(?:ai|com)/(?:skills?|s)/([a-zA-Z0-9_-]+)[|>]"),
]

# Files/dirs that are workspace-specific (secrets, tokens, state) — never synced
PRIVATE_FILES = {".env", ".token.json", ".staging.json", ".state.json", "logs", "history"}


def extract_slug(arg: str) -> str:
    """Extract a skill slug from a URL or return the arg as-is if it's already a slug."""
    for pat in CLAWHUB_URL_PATTERNS:
        m = pat.search(arg)
        if m:
            return m.group(1)
    cleaned = re.sub(r"[<>]", "", arg).strip()
    if "/" not in cleaned and cleaned:
        return cleaned
    return arg


def read_frontmatter(skill_dir: Path) -> dict:
    """Read YAML frontmatter from a SKILL.md file."""
    skill_md = skill_dir / "SKILL.md"
    if not skill_md.exists():
        return {}
    text = skill_md.read_text(encoding="utf-8")
    if not text.startswith("---"):
        return {"raw_body_preview": text[:500]}
    end = text.find("---", 3)
    if end == -1:
        return {}
    fm_text = text[3:end].strip()
    result = {}
    for line in fm_text.split("\n"):
        if ":" in line:
            key, _, val = line.partition(":")
            key = key.strip()
            val = val.strip().strip('"').strip("'")
            if key in ("name", "description", "homepage"):
                result[key] = val
    meta_match = re.search(r'"requires"\s*:\s*\{([^}]+)\}', fm_text)
    if meta_match:
        reqs_raw = meta_match.group(1)
        bins_match = re.search(r'"bins"\s*:\s*\[([^\]]+)\]', reqs_raw)
        env_match = re.search(r'"env"\s*:\s*\[([^\]]+)\]', reqs_raw)
        config_match = re.search(r'"config"\s*:\s*\[([^\]]+)\]', reqs_raw)
        reqs = {}
        if bins_match:
            reqs["bins"] = [s.strip().strip('"').strip("'") for s in bins_match.group(1).split(",")]
        if env_match:
            reqs["env"] = [s.strip().strip('"').strip("'") for s in env_match.group(1).split(",")]
        if config_match:
            reqs["config"] = [s.strip().strip('"').strip("'") for s in config_match.group(1).split(",")]
        if reqs:
            result["requires"] = reqs
    body = text[end + 3:].strip()
    if body:
        result["body_preview"] = body[:500]
    return result


def sync_skill(source_dir: Path, dest_dir: Path) -> bool:
    """Sync a skill from source to dest, skipping private/config files.

    Copies SKILL.md, scripts/, references/, assets/, _meta.json, .clawhub/.
    Skips .env, .token.json, .staging.json, logs/, history/ etc.
    """
    if not source_dir.exists():
        return False

    dest_dir.mkdir(parents=True, exist_ok=True)

    for item in source_dir.iterdir():
        if item.name in PRIVATE_FILES:
            continue
        dest_item = dest_dir / item.name
        if item.is_dir():
            if dest_item.exists():
                shutil.rmtree(dest_item)
            shutil.copytree(item, dest_item)
        else:
            shutil.copy2(item, dest_item)
    return True


def install_skill_to_workdir(slug: str, workdir: Path) -> dict:
    """Install a single skill via clawhub CLI and return result dict."""
    skills_dir = workdir / "skills"
    skill_path = skills_dir / slug
    result = {"slug": slug, "workdir": str(workdir), "status": "error", "message": ""}

    if skill_path.exists() and (skill_path / "SKILL.md").exists():
        fm = read_frontmatter(skill_path)
        result["status"] = "already_installed"
        result["message"] = f"Already installed in {workdir.name}"
        result["path"] = str(skill_path)
        result["frontmatter"] = fm
        return result

    cmd = ["clawhub", "install", slug, "--workdir", str(workdir), "--force"]
    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=60,
            env={**os.environ, "NO_COLOR": "1"},
        )
        if proc.returncode != 0:
            stderr = proc.stderr.strip() or proc.stdout.strip()
            result["message"] = f"Install failed: {stderr}"
            return result
    except subprocess.TimeoutExpired:
        result["message"] = "Install timed out (60s)"
        return result
    except FileNotFoundError:
        result["message"] = "clawhub CLI not found. Install with: npm i -g clawhub"
        return result

    if not skill_path.exists():
        result["message"] = f"Install succeeded but '{slug}' directory not found in {workdir.name}"
        return result

    fm = read_frontmatter(skill_path)
    result["status"] = "installed"
    result["message"] = f"Installed in {workdir.name}"
    result["path"] = str(skill_path)
    result["frontmatter"] = fm
    return result


def install_skill(slug: str, workdirs: list[Path]) -> dict:
    """Install a skill to the primary workdir, then sync to others."""
    primary = workdirs[0]
    others = workdirs[1:]

    # Install to primary first
    primary_result = install_skill_to_workdir(slug, primary)

    skill_result = {
        "slug": slug,
        "primary": primary_result,
        "synced": [],
    }

    # Determine source for syncing
    source_path = None
    if primary_result["status"] in ("installed", "already_installed"):
        source_path = Path(primary_result["path"])

    # Sync to other workdirs
    for wd in others:
        dest_path = wd / "skills" / slug
        if source_path and source_path.exists():
            # If already installed in dest, just sync the non-private files
            already_there = dest_path.exists() and (dest_path / "SKILL.md").exists()
            synced = sync_skill(source_path, dest_path)
            if synced:
                fm = read_frontmatter(dest_path)
                skill_result["synced"].append({
                    "workdir": str(wd),
                    "status": "synced" if not already_there else "updated",
                    "message": f"{'Synced' if not already_there else 'Updated'} in {wd.name}",
                    "path": str(dest_path),
                    "frontmatter": fm,
                })
            else:
                skill_result["synced"].append({
                    "workdir": str(wd),
                    "status": "sync_failed",
                    "message": f"Failed to sync to {wd.name}",
                })
        else:
            # Primary failed — try installing directly to this workdir
            direct = install_skill_to_workdir(slug, wd)
            skill_result["synced"].append(direct)

    return skill_result


def resolve_workdirs(args_workdirs: list[str] | None) -> list[Path]:
    """Resolve the list of workdirs to install into."""
    if args_workdirs:
        return [Path(w) for w in args_workdirs if Path(w).exists()]

    workdirs = []

    # Auto-detect from OPENCLAW_HOME
    env_home = os.environ.get("OPENCLAW_HOME")
    if env_home:
        workdirs.append(Path(env_home))

    # Resolve workspace root from this script's location (never cross-workspace)
    script_root = Path(__file__).parent.parent.parent.parent  # no .resolve() -- breaks profile isolation
    if script_root.exists() and script_root not in workdirs:
        workdirs.insert(0, script_root)

    if not workdirs:
        workdirs.append(Path.home() / ".openclaw")  # fallback

    return workdirs


def main():
    parser = argparse.ArgumentParser(description="Install ClawHub skills to all workspaces")
    parser.add_argument("slugs", nargs="+", help="Skill slugs or ClawHub URLs")
    parser.add_argument("--workdir", action="append", dest="workdirs", help="Workspace dir(s)")
    args = parser.parse_args()

    workdirs = resolve_workdirs(args.workdirs)

    # Ensure skills dirs exist
    for wd in workdirs:
        (wd / "skills").mkdir(exist_ok=True)

    slugs = [extract_slug(s) for s in args.slugs]

    results = {
        "workspaces": [str(w) for w in workdirs],
        "skills": [],
    }

    for slug in slugs:
        skill_result = install_skill(slug, workdirs)
        results["skills"].append(skill_result)

    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
