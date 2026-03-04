#!/usr/bin/env bash
set -euo pipefail

# oc-log-rotate.sh -- Daily log rotation for all openCLAW profiles
# Strategy: copytruncate (copy then truncate in-place; gateway holds open FDs)
# Retention: 7 days of gzip-compressed rotated logs
# Named: {original}.{YYYY-MM-DD}.gz

[[ -d /opt/homebrew/bin ]] && export PATH="/opt/homebrew/bin:$PATH"

TODAY=$(date '+%Y-%m-%d')
KEEP_DAYS=7
ROTATED=0
SKIPPED=0
ERRORS=0

# --- Helpers ---

log() { echo "[$(date '+%H:%M:%S')] $1"; }
warn() { echo "[$(date '+%H:%M:%S')] WARN: $1" >&2; }

# rotate_file <path>
# Copies the file to <path>.YYYY-MM-DD.gz, then truncates the original.
rotate_file() {
  local src="$1"
  local dest="${src}.${TODAY}.gz"

  # Skip if file does not exist
  if [[ ! -f "$src" ]]; then
    return 0
  fi

  # Skip if file is empty (0 bytes)
  if [[ ! -s "$src" ]]; then
    log "  SKIP (empty): $(basename "$src")"
    SKIPPED=$((SKIPPED + 1))
    return 0
  fi

  # Skip if today's rotation already exists (idempotent)
  if [[ -f "$dest" ]]; then
    log "  SKIP (already rotated today): $(basename "$src")"
    SKIPPED=$((SKIPPED + 1))
    return 0
  fi

  # copytruncate: copy then truncate (never move -- gateway holds the FD)
  if gzip -c "$src" > "$dest"; then
    # Truncate in-place so the gateway's open FD keeps writing to the same inode
    : > "$src"
    log "  OK: $(basename "$src") -> $(basename "$dest")"
    ROTATED=$((ROTATED + 1))
  else
    warn "gzip failed for ${src}"
    rm -f "$dest"
    ERRORS=$((ERRORS + 1))
  fi
}

# prune_old <logs_dir>
# Deletes rotated .gz files older than KEEP_DAYS days.
prune_old() {
  local dir="$1"
  local pruned=0

  while IFS= read -r -d '' f; do
    rm -f "$f"
    log "  PRUNED: $(basename "$f")"
    pruned=$((pruned + 1))
  done < <(find "$dir" -maxdepth 1 -name '*.gz' -mtime "+${KEEP_DAYS}" -print0 2>/dev/null)

  if [[ "$pruned" -gt 0 ]]; then
    log "  Pruned ${pruned} file(s) older than ${KEEP_DAYS} days"
  fi
}

# --- Profile definitions ---

PROFILE_NAMES=("cgk" "rawdog" "vitahustle")
PROFILE_DIRS=(
  "$HOME/.openclaw"
  "$HOME/.openclaw-rawdog"
  "$HOME/.openclaw-vitahustle"
)

# Core log files to rotate per profile (relative to logs/)
CORE_LOGS=(
  "gateway.log"
  "gateway.err.log"
  "channel-sync.log"
)

# --- Main rotation loop ---

log "openCLAW log rotation starting (date: ${TODAY})"

for i in "${!PROFILE_NAMES[@]}"; do
  name="${PROFILE_NAMES[$i]}"
  profile_dir="${PROFILE_DIRS[$i]}"
  logs_dir="${profile_dir}/logs"

  echo ""
  log "Profile: ${name} (${logs_dir})"

  if [[ ! -d "$logs_dir" ]]; then
    warn "Logs directory not found, skipping: ${logs_dir}"
    continue
  fi

  # Rotate core logs
  for logfile in "${CORE_LOGS[@]}"; do
    rotate_file "${logs_dir}/${logfile}"
  done

  # Rotate any litellm*.log files that exist
  while IFS= read -r -d '' f; do
    rotate_file "$f"
  done < <(find "$logs_dir" -maxdepth 1 -name 'litellm*.log' -print0 2>/dev/null)

  # Prune rotated files older than retention window
  prune_old "$logs_dir"
done

# --- Disk usage summary ---

echo ""
log "Log disk usage summary:"

for i in "${!PROFILE_NAMES[@]}"; do
  name="${PROFILE_NAMES[$i]}"
  logs_dir="${PROFILE_DIRS[$i]}/logs"

  if [[ -d "$logs_dir" ]]; then
    usage=$(du -sh "$logs_dir" 2>/dev/null | awk '{print $1}')
    log "  ${name}: ${usage} (${logs_dir})"
  fi
done

# --- Final summary ---

echo ""
log "Rotation complete -- rotated: ${ROTATED}, skipped: ${SKIPPED}, errors: ${ERRORS}"

if [[ "$ERRORS" -gt 0 ]]; then
  exit 1
fi

exit 0
