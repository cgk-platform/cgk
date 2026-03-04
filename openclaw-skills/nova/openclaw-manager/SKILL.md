# openCLAW Manager

Cross-profile health, parity, post-update, and sandbox validation scripts for managing all three openCLAW gateway profiles from Claude Code.

## Scripts

### oc-health.sh — Cross-Profile Health Check

Validates that all three gateways, OrbStack, Docker, sandbox containers, delivery queues, kernel limits, and port bindings are healthy.

```bash
bash ~/.openclaw/skills/nova/openclaw-manager/scripts/oc-health.sh
```

**Checks performed:**

- All 3 gateway processes running (via launchctl)
- OrbStack status
- Docker daemon reachable
- Sandbox containers inventory
- Stale delivery queue entries across all profiles
- `kern.maxprocperuid` >= 4000
- Ports 18789, 19001, 19002 bound and listening

**Exit codes:** 0 = all healthy, 1 = one or more issues detected.

---

### oc-parity.sh — Cross-Profile Parity Check

Detects configuration drift between the three profiles.

```bash
bash ~/.openclaw/skills/nova/openclaw-manager/scripts/oc-parity.sh
```

**Checks performed:**

- Skills list comparison (missing/extra skills per profile)
- Sandbox docker.env key comparison across openclaw.json files
- `.env` variable name comparison (values excluded)
- `paired.json` scope validation (operator.read + operator.write)
- Gateway port spacing (minimum 20-port gap)

---

### oc-post-update.sh — Automated Post-Update Checklist

Runs every step from the post-update checklist after `openclaw update`.

```bash
bash ~/.openclaw/skills/nova/openclaw-manager/scripts/oc-post-update.sh
```

**Steps performed:**

1. Reapplies all 6 idempotent patches
2. Verifies paired device scopes
3. Runs `openclaw doctor` on all 3 profiles
4. Prunes old sandbox containers
5. Verifies OrbStack
6. Checks `kern.maxprocperuid`

---

### oc-sandbox-check.sh — Sandbox Env Var Validation

Ensures every `${VAR}` reference in each profile's `openclaw.json` docker.env resolves to a non-empty value in the corresponding `.env` file.

```bash
bash ~/.openclaw/skills/nova/openclaw-manager/scripts/oc-sandbox-check.sh
```

**Checks performed:**

- Parses docker.env from each profile's openclaw.json
- Extracts `${VAR}` references
- Validates each resolves to a non-empty value in the profile's `.env`
- Reports any missing or empty variables that would break sandbox execution

---

### oc-slack-watchdog.sh — Slack DNS Reconnect Watchdog

Checks all 3 gateways for dead Slack sockets (DNS ENOTFOUND with no recovery) and auto-restarts via launchctl.

```bash
bash ~/.openclaw/skills/nova/openclaw-manager/scripts/oc-slack-watchdog.sh
```

**Checks performed:**

- Gateway HTTP health endpoint reachable
- Slack socket connected (no unrecovered ENOTFOUND/RequestError in recent logs)
- 60-second cooldown between restarts (prevents restart loops)
- Auto-restarts dead gateways via `launchctl kickstart -k gui/$(id -u)/<label>`

**Runs via:** `com.openclaw.slack-watchdog.plist` (every 5 min)

---

### oc-log-rotate.sh — Cross-Profile Log Rotation

Rotates gateway logs across all 3 profiles using copytruncate semantics (preserves file descriptors for running processes).

```bash
bash ~/.openclaw/skills/nova/openclaw-manager/scripts/oc-log-rotate.sh
```

**Behavior:**

- Rotates: `gateway.log`, `gateway.err.log`, `channel-sync.log`, `litellm*.log`
- 7-day retention with gzip compression
- Idempotent: skips if today's rotation already exists
- Reports total log disk usage after rotation

**Runs via:** `com.openclaw.log-rotate.plist` (daily at 23:30)

---

### oc-cron-stagger.sh — Cross-Profile Cron Collision Detector

Reads all 3 `jobs.json` files, resolves next-run times, and detects schedule collisions.

```bash
# Report mode (default) — show collisions
bash ~/.openclaw/skills/nova/openclaw-manager/scripts/oc-cron-stagger.sh --report

# Apply mode — auto-stagger colliding jobs
bash ~/.openclaw/skills/nova/openclaw-manager/scripts/oc-cron-stagger.sh --apply

# JSON output
bash ~/.openclaw/skills/nova/openclaw-manager/scripts/oc-cron-stagger.sh --json
```

**Detection rules:**

- Same-profile, same-minute = collision (flagged)
- Cross-profile within 3 minutes = warning
- Uses jq for JSON parsing; respects human-visible job time preferences

---

## Installation

This skill is installed manually under the `nova/` namespace. No ClawhHub entry required.

## Notes

- All scripts are brand-neutral — no hardcoded brand names or identifiers.
- Color output: green checkmarks for pass, red X for fail.
- Profile paths are fixed: `~/.openclaw`, `~/.openclaw-rawdog`, `~/.openclaw-vitahustle`.
