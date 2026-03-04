#!/usr/bin/env bash
set -euo pipefail

# oc-post-update.sh — Automated post-update checklist for openCLAW
# Reapplies patches, verifies scopes, runs doctor, prunes containers, checks system

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
RESET='\033[0m'

PATCHES_DIR="$HOME/.openclaw/patches"
ISSUES=0

pass() { echo -e "  ${GREEN}✓${RESET} $1"; }
fail() { echo -e "  ${RED}✗${RESET} $1"; ISSUES=$((ISSUES + 1)); }
warn() { echo -e "  ${YELLOW}!${RESET} $1"; }
section() { echo -e "\n${BOLD}$1${RESET}"; }

# --- Version ---
section "openCLAW Version"

if command -v openclaw &>/dev/null; then
  VERSION=$(openclaw --version 2>/dev/null || echo "unknown")
  pass "Version: ${VERSION}"
else
  fail "openclaw not found in PATH"
fi

# --- Reapply Patches ---
section "Reapplying Patches"

PATCH_SCRIPTS=(
  "apply-debouncer-fix.sh"
  "apply-callid-fix.sh"
  "apply-sandbox-bind-fix.sh"
  "apply-sandbox-fs-fix.sh"
  "apply-announce-timeout-fix.sh"
  "apply-slack-reconnect-fix.sh"
)

for patch in "${PATCH_SCRIPTS[@]}"; do
  patch_path="${PATCHES_DIR}/${patch}"
  if [[ -f "$patch_path" ]]; then
    if bash "$patch_path" 2>&1; then
      pass "Patch applied: ${patch}"
    else
      fail "Patch FAILED: ${patch}"
    fi
  else
    warn "Patch not found (skipped): ${patch}"
  fi
done

# --- Verify Paired Scopes ---
section "Paired Device Scopes"

SCOPE_SCRIPT="$HOME/.openclaw/scripts/verify-paired-scopes.sh"
if [[ -f "$SCOPE_SCRIPT" ]]; then
  if bash "$SCOPE_SCRIPT" 2>&1; then
    pass "Paired scopes verified"
  else
    fail "Paired scope verification reported issues"
  fi
else
  warn "verify-paired-scopes.sh not found at ${SCOPE_SCRIPT}"
fi

# --- Run Doctor on All Profiles ---
section "Running openclaw doctor"

PROFILE_FLAGS=("" "--profile rawdog" "--profile vitahustle")
PROFILE_NAMES=("cgk" "rawdog" "vitahustle")

for i in "${!PROFILE_NAMES[@]}"; do
  name="${PROFILE_NAMES[$i]}"
  flags="${PROFILE_FLAGS[$i]}"

  echo -e "  Running doctor for ${BOLD}${name}${RESET}..."
  # shellcheck disable=SC2086
  if openclaw $flags doctor 2>&1; then
    pass "Doctor passed: ${name}"
  else
    fail "Doctor reported issues: ${name}"
  fi
  echo ""
done

# --- Prune Old Sandbox Containers ---
section "Pruning Sandbox Containers"

if command -v docker &>/dev/null && docker info &>/dev/null; then
  # Stop running sandbox containers
  RUNNING=$(docker ps -q --filter "name=openclaw-sbx" 2>/dev/null || true)
  if [[ -n "$RUNNING" ]]; then
    echo "$RUNNING" | xargs docker stop 2>/dev/null || true
    pass "Stopped running sandbox containers"
  else
    pass "No running sandbox containers to stop"
  fi

  # Remove all sandbox containers
  ALL_SBX=$(docker ps -aq --filter "name=openclaw-sbx" 2>/dev/null || true)
  if [[ -n "$ALL_SBX" ]]; then
    echo "$ALL_SBX" | xargs docker rm 2>/dev/null || true
    pass "Removed old sandbox containers"
  else
    pass "No old sandbox containers to remove"
  fi
else
  warn "Docker unavailable, skipping container pruning"
fi

# --- OrbStack ---
section "OrbStack Status"

if command -v orbctl &>/dev/null; then
  ORB_STATUS=$(orbctl status 2>&1 || true)
  if echo "$ORB_STATUS" | grep -qi "running"; then
    pass "OrbStack is running"
  else
    fail "OrbStack is NOT running: ${ORB_STATUS}"
    warn "Start with: orbctl start"
  fi
else
  fail "orbctl not found in PATH"
fi

# --- Kernel Limits ---
section "Kernel Limits"

MAXPROC=$(sysctl -n kern.maxprocperuid 2>/dev/null || echo "0")
if [[ "$MAXPROC" -ge 4000 ]]; then
  pass "kern.maxprocperuid = ${MAXPROC} (>= 4000)"
else
  fail "kern.maxprocperuid = ${MAXPROC} (should be >= 4000)"
  warn "Fix with: sudo sysctl -w kern.maxprocperuid=4000"
fi

# --- Summary ---
echo ""
if [[ "$ISSUES" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}Post-update checklist complete. All checks passed.${RESET}"
  exit 0
else
  echo -e "${RED}${BOLD}Post-update checklist complete. ${ISSUES} issue(s) detected.${RESET}"
  exit 1
fi
