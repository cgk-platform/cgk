# openCLAW Skills

Custom skills for the [openCLAW](https://openclaw.ai) multi-agent platform, integrated with the CGK Platform.

## Quick Start

```bash
# 1. Install openCLAW
npm install -g openclaw
openclaw onboard --install-daemon

# 2. Link skills to your profile
cd openclaw-skills
./install.sh                           # Single profile (~/.openclaw)
./install.sh --all-profiles            # All detected profiles

# 3. Generate an API key (for skills that call the platform API)
# Go to: /admin/integrations/api-keys/ in your platform admin

# 4. Fill in .env values (install.sh creates them from .env.example)
# Each profile has its own .env — edit ~/.openclaw/skills/<skill>/.env

# 5. Restart your gateway
openclaw restart
```

## Prerequisites

- **Node.js** >= 22
- **Python** >= 3.10
- **FFmpeg** (for video-editor, video-remix)
- **Docker / OrbStack** (required if using sandbox mode)

## Skill Catalog

### Core Platform Skills

| Skill             | Description                                              | Env Vars Needed                                           |
| ----------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| `video-editor`    | AI video production pipeline (FFmpeg + ElevenLabs + DAM) | `PEXELS_API_KEY`, `FREESOUND_API_KEY`                     |
| `meta-ads`        | Meta advertising — campaign staging, creative analysis   | `META_AD_ACCOUNT_ID`, `META_BUSINESS_ID`, `META_PIXEL_ID` |
| `ad-library-dl`   | Competitor intelligence + clone workflow                 | None (uses profile env)                                   |
| `nano-banana-pro` | Image generation (3 aspect ratios per prompt)            | None (uses profile env)                                   |
| `veo-video-gen`   | AI video generation (Veo 3.1, Kling, Sora)               | None (uses profile env)                                   |
| `video-remix`     | Video remixing and adaptation                            | None (uses profile env)                                   |

### Marketing & Commerce Skills

| Skill              | Description                   | Env Vars Needed                                                       |
| ------------------ | ----------------------------- | --------------------------------------------------------------------- |
| `klaviyo`          | Email marketing (Klaviyo API) | `KLAVIYO_API_KEY`                                                     |
| `amazon-sp`        | Amazon Selling Partner API    | `SP_LWA_CLIENT_ID`, `SP_LWA_CLIENT_SECRET`, `SP_SELLER_ID`, ...       |
| `youtube-uploader` | YouTube publishing            | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REFRESH_TOKEN` |
| `youtube-watcher`  | YouTube channel monitoring    | None                                                                  |
| `google-workspace` | Google Drive, Docs, Sheets    | OAuth setup required (see `setup_oauth.py`)                           |
| `triple-whale`     | Triple Whale analytics        | `TRIPLE_WHALE_API_KEY`, `TRIPLE_WHALE_SHOP_DOMAIN`                    |

### Agent Enhancement Skills

| Skill                  | Description                 | Env Vars Needed |
| ---------------------- | --------------------------- | --------------- |
| `proactive-agent`      | Proactive behavior patterns | None            |
| `self-improving-agent` | Self-improvement loops      | None            |

### Platform Management

| Skill                   | Description                            | Env Vars Needed |
| ----------------------- | -------------------------------------- | --------------- |
| `nova/openclaw-manager` | Cross-profile health, parity, patching | None            |

## How Symlink Install Works

The `install.sh` script creates symlinks from your openCLAW profile to the repo source:

```
~/.openclaw/skills/video-editor/
  SKILL.md     -> ~/Documents/cgk-platform/openclaw-skills/video-editor/SKILL.md
  scripts/     -> ~/Documents/cgk-platform/openclaw-skills/video-editor/scripts/
  templates/   -> ~/Documents/cgk-platform/openclaw-skills/video-editor/templates/
  .env         (real file — NOT symlinked, per-profile secrets)
```

After install, `git pull` in the repo instantly updates ALL skill code across ALL linked profiles. No re-run needed.

## Managing Skills

```bash
# Check link status
./install.sh --status

# Install a single skill
./install.sh --skill video-editor

# Install to a specific profile
./install.sh --state-dir ~/.openclaw-rawdog

# Remove symlinks (revert to standalone copies)
./install.sh --unlink
```

## Python Dependencies

Some skills require Python packages:

```bash
pip install -r video-editor/requirements.txt
pip install -r video-remix/requirements.txt
```

## Directory Convention

This directory has no `package.json` and is invisible to pnpm, Turborepo, and Vercel. It exists purely as skill source code that gets symlinked into openCLAW profile directories.

Files that are NOT committed (in `.gitignore`):

- `.env` — per-profile secrets (only `.env.example` templates are in the repo)
- `logs/`, `history/`, `cache/` — runtime data
- `__pycache__/`, `*.pyc` — Python bytecode
- `.state.json`, `.staging.json`, `.token.json` — runtime state
