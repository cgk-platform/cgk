# openCLAW Integration Setup

Connect your CGK Platform to [openCLAW](https://openclaw.ai) for AI-powered agent automation — video editing, ad creative generation, competitor intelligence, email marketing, and more.

## Prerequisites

- **Node.js** >= 22 (LTS)
- **Python** >= 3.10 (for video-editor, ad-library-dl, and other Python skills)
- **FFmpeg** (for video-editor and video-remix skills)
- **Docker / OrbStack** (required if using sandbox mode, recommended for production)
- A deployed CGK Platform instance (local or Vercel)

## Step 1: Deploy the Platform

If you haven't already, deploy the platform:

**Option A — One-click Vercel deploy:**

Click the "Deploy with Vercel" button in the root README. Vercel auto-provisions your database and cache. Wait 5 minutes.

**Option B — Local development:**

```bash
git clone https://github.com/your-org/cgk-platform.git
cd cgk-platform
pnpm install
pnpm db:migrate
pnpm dev
```

## Step 2: Install openCLAW

```bash
npm install -g openclaw
openclaw onboard --install-daemon
```

This installs the openCLAW gateway and starts the daemon. See [openclaw.ai/docs](https://openclaw.ai/docs) for detailed setup.

## Step 3: Link Skills

The platform ships with 15 custom skills in `openclaw-skills/`. Link them to your openCLAW profile:

```bash
cd cgk-platform/openclaw-skills

# Single profile (default ~/.openclaw)
./install.sh

# Multiple profiles
./install.sh --all-profiles
```

The script creates symlinks from your openCLAW profile to the repo, so `git pull` instantly updates all skill code. Your `.env` files are never overwritten.

Check link status:

```bash
./install.sh --status
```

## Step 4: Generate an API Key

1. Open your platform admin: `https://your-platform.vercel.app/admin`
2. Navigate to **Integrations > API Keys** (`/admin/integrations/api-keys`)
3. Click **Create API Key**
4. Select purpose: **openCLAW Agent**
5. Copy the key — it's shown only once

The create dialog shows the exact `.env` block to paste into your skill configuration.

## Step 5: Configure Skill Environment

The install script creates `.env` files from `.env.example` templates. Fill in the values:

```bash
# Platform API key (from Step 4)
vi ~/.openclaw/skills/video-editor/.env
# Set CGK_PLATFORM_API_KEY, CGK_PLATFORM_API_URL, CGK_PLATFORM_TENANT_SLUG

# Meta Ads (if using meta-ads skill)
vi ~/.openclaw/skills/meta-ads/.env
# Set META_AD_ACCOUNT_ID, META_BUSINESS_ID, META_PIXEL_ID
```

Each profile has its own `.env` — different API keys, different ad accounts, etc.

## Step 6: Enable Platform Features

1. Open **Admin > Platform Config** (`/admin/platform-config`)
2. Under **AI Agent Integration**, enable:
   - **openCLAW Integration** — enables agent API endpoints
   - **Command Center** — enables the operations dashboard
   - **Creative Studio** — enables the video editing UI

Or add to `platform.config.ts`:

```typescript
features: {
  openclawIntegration: true,
  commandCenter: true,
  creativeStudio: true,
}
```

## Step 7: Restart Gateway

```bash
openclaw restart
```

## Step 8: Verify

1. **Command Center** — Open `/command-center` in your browser. You should see your gateway status.
2. **Creative Studio** — Open `/admin/creative-studio`. The video editor UI should load.
3. **Skills** — In the Command Center, check the Skills tab. All 15 linked skills should appear.
4. **API Key** — Test connectivity:
   ```bash
   curl -H "x-api-key: YOUR_KEY" https://your-platform.vercel.app/api/admin/api-keys
   ```

## Skill Catalog

| Skill                   | Description                                     | Env Vars                                                  |
| ----------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| `video-editor`          | AI video production (FFmpeg + ElevenLabs + DAM) | `PEXELS_API_KEY`, `FREESOUND_API_KEY`                     |
| `meta-ads`              | Meta ad campaign staging and creative analysis  | `META_AD_ACCOUNT_ID`, `META_BUSINESS_ID`, `META_PIXEL_ID` |
| `ad-library-dl`         | Competitor ad intelligence + clone workflow     | None (uses profile env)                                   |
| `nano-banana-pro`       | Image generation (3 aspect ratios per prompt)   | None                                                      |
| `veo-video-gen`         | AI video generation (Veo, Kling, Sora)          | None                                                      |
| `video-remix`           | Video remixing and adaptation                   | None                                                      |
| `klaviyo`               | Email marketing via Klaviyo API                 | `KLAVIYO_API_KEY`                                         |
| `amazon-sp`             | Amazon Selling Partner API                      | `SP_LWA_CLIENT_ID`, `SP_LWA_CLIENT_SECRET`, ...           |
| `youtube-uploader`      | YouTube video publishing                        | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, ...         |
| `youtube-watcher`       | YouTube channel monitoring                      | None                                                      |
| `google-workspace`      | Google Drive, Docs, Sheets                      | OAuth setup (run `setup_oauth.py`)                        |
| `triple-whale`          | Triple Whale analytics                          | `TRIPLE_WHALE_API_KEY`                                    |
| `proactive-agent`       | Proactive behavior patterns                     | None                                                      |
| `self-improving-agent`  | Self-improvement loops                          | None                                                      |
| `nova/openclaw-manager` | Cross-profile health and parity checking        | None                                                      |

## Multi-Profile Setup

For agencies managing multiple brands, each brand gets its own openCLAW profile with separate credentials:

```bash
# Install skills to all profiles
./openclaw-skills/install.sh --all-profiles

# Generate separate API keys for each brand in the admin UI
# Configure each profile's .env with its own keys
```

Environment variables like `OPENCLAW_CGK_PORT`, `OPENCLAW_RAWDOG_PORT` configure the Command Center to discover multiple profiles automatically.

## Troubleshooting

**Skills not appearing in Command Center:**

- Verify symlinks: `./openclaw-skills/install.sh --status`
- Restart the gateway: `openclaw restart`

**API key authentication failing:**

- Ensure the key is not expired or revoked
- Check the key is in the correct profile's `.env`
- Verify `CGK_PLATFORM_API_URL` points to your deployed instance

**Command Center shows "Setup Required":**

- Enable `features.commandCenter: true` in platform config
- Restart your development server

**Creative Studio shows "Setup Required":**

- Enable `features.creativeStudio: true` in platform config
