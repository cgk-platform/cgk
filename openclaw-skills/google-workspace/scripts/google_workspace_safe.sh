#!/usr/bin/env bash
# Safe wrapper for google_workspace.py
# Validates credentials exist before running. Does NOT require Slack env vars
# (unlike ad-gen scripts) because Workspace output goes to Google, not Slack.
#
# Usage:
#   ./google_workspace_safe.sh slides create "My Presentation"
#   ./google_workspace_safe.sh docs create "My Document"
#   ./google_workspace_safe.sh auth status

set -euo pipefail

PROFILE_ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
CREDS_FILE="$PROFILE_ROOT/credentials/google-workspace-oauth.json"

if [ ! -f "$CREDS_FILE" ]; then
    echo "ERROR: Google Workspace credentials not found at $CREDS_FILE" >&2
    echo "Run: uv run $(dirname "$0")/setup_oauth.py" >&2
    exit 1
fi

exec uv run "$(dirname "$0")/google_workspace.py" "$@"
