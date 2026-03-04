#!/bin/bash
set -euo pipefail

# oc-sandbox-check.sh — Sandbox env var validation for all openCLAW profiles
# Ensures every ${VAR} reference in docker.env resolves to a non-empty value

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
RESET='\033[0m'

PROFILES=(
  "$HOME/.openclaw"
  "$HOME/.openclaw-rawdog"
  "$HOME/.openclaw-vitahustle"
)
PROFILE_NAMES=("cgk" "rawdog" "vitahustle")

ISSUES=0

pass() { echo -e "  ${GREEN}✓${RESET} $1"; }
fail() { echo -e "  ${RED}✗${RESET} $1"; ISSUES=$((ISSUES + 1)); }
warn() { echo -e "  ${YELLOW}!${RESET} $1"; }
section() { echo -e "\n${BOLD}$1${RESET}"; }

for i in "${!PROFILES[@]}"; do
  profile="${PROFILES[$i]}"
  name="${PROFILE_NAMES[$i]}"
  config="${profile}/openclaw.json"
  envfile="${profile}/.env"

  section "Profile: ${name}"

  if [[ ! -f "$config" ]]; then
    fail "Missing openclaw.json at ${config}"
    continue
  fi

  if [[ ! -f "$envfile" ]]; then
    fail "Missing .env at ${envfile}"
    continue
  fi

  # Use python3 to parse JSON and extract ${VAR} references, then validate against .env
  result=$(python3 -c "
import json
import re
import os
import sys

config_path = '${config}'
env_path = '${envfile}'

# Parse openclaw.json
with open(config_path) as f:
    cfg = json.load(f)

# Extract docker.env section (try multiple possible locations)
docker_env = cfg.get('sandbox', {}).get('docker', {}).get('env', {})
if not docker_env:
    docker_env = cfg.get('sandbox', {}).get('dockerEnv', {})

if not docker_env:
    print('WARN:No docker.env section found in openclaw.json')
    sys.exit(0)

# Parse .env file into dict
env_vars = {}
with open(env_path) as f:
    for line in f:
        line = line.strip()
        if not line or line.startswith('#'):
            continue
        if '=' in line:
            key, _, value = line.partition('=')
            key = key.strip()
            # Remove surrounding quotes from value
            value = value.strip()
            if (value.startswith('\"') and value.endswith('\"')) or \
               (value.startswith(\"'\") and value.endswith(\"'\")):
                value = value[1:-1]
            env_vars[key] = value

# Extract \${VAR} references from docker.env values
var_pattern = re.compile(r'\\\$\{([^}]+)\}')
missing = []
resolved = []

if isinstance(docker_env, dict):
    items = docker_env.items()
elif isinstance(docker_env, list):
    items = []
    for entry in docker_env:
        if '=' in str(entry):
            k, _, v = str(entry).partition('=')
            items.append((k, v))
        else:
            items.append((str(entry), ''))
else:
    items = []

for key, value in items:
    value_str = str(value)
    refs = var_pattern.findall(value_str)
    for ref in refs:
        env_val = env_vars.get(ref, '')
        if not env_val:
            # Also check os.environ as fallback
            env_val = os.environ.get(ref, '')
        if not env_val:
            missing.append((key, ref))
        else:
            resolved.append((key, ref))

# Report
for key, ref in resolved:
    print(f'PASS:{key} -> \${{{ref}}} resolved')

for key, ref in missing:
    print(f'FAIL:{key} -> \${{{ref}}} is MISSING or EMPTY')

if not missing and not resolved:
    if isinstance(docker_env, dict) and docker_env:
        print(f'PASS:docker.env has {len(docker_env)} entries (no variable references)')
    else:
        print('WARN:docker.env section is empty')
" 2>&1 || echo "FAIL:Python parsing error")

  profile_issues=0
  profile_resolved=0

  while IFS= read -r line; do
    if [[ "$line" == PASS:* ]]; then
      pass "${line#PASS:}"
      profile_resolved=$((profile_resolved + 1))
    elif [[ "$line" == FAIL:* ]]; then
      fail "${line#FAIL:}"
      profile_issues=$((profile_issues + 1))
    elif [[ "$line" == WARN:* ]]; then
      warn "${line#WARN:}"
    fi
  done <<< "$result"

  if [[ "$profile_issues" -eq 0 && "$profile_resolved" -gt 0 ]]; then
    echo -e "  ${GREEN}All ${profile_resolved} variable(s) resolved for ${name}${RESET}"
  fi
done

# --- Summary ---
echo ""
if [[ "$ISSUES" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}All sandbox env var checks passed.${RESET}"
  exit 0
else
  echo -e "${RED}${BOLD}${ISSUES} sandbox env var issue(s) detected.${RESET}"
  exit 1
fi
