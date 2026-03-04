#!/bin/bash
set -euo pipefail

# oc-parity.sh — Cross-profile parity check for openCLAW configuration drift
# Compares: skills, sandbox env keys, .env keys, paired.json scopes, port spacing

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

# --- Skills Parity ---
section "Skills Parity"

declare -a SKILL_LISTS=()
for i in "${!PROFILES[@]}"; do
  profile="${PROFILES[$i]}"
  name="${PROFILE_NAMES[$i]}"
  skills_dir="${profile}/skills"

  if [[ -d "$skills_dir" ]]; then
    # List all skills including nested (nova/xxx)
    skill_list=$(cd "$skills_dir" && find . -maxdepth 2 -name 'SKILL.md' -exec dirname {} \; 2>/dev/null | sed 's|^\./||' | sort)
    SKILL_LISTS+=("$skill_list")
  else
    SKILL_LISTS+=("")
    warn "Profile '${name}' has no skills directory"
  fi
done

# Compare each pair
ALL_SKILLS=$(printf '%s\n' "${SKILL_LISTS[@]}" | sort -u | grep -v '^$' || true)
PARITY_OK=true

if [[ -n "$ALL_SKILLS" ]]; then
  while IFS= read -r skill; do
    present_in=()
    missing_from=()
    for i in "${!PROFILE_NAMES[@]}"; do
      if echo "${SKILL_LISTS[$i]}" | grep -qx "$skill"; then
        present_in+=("${PROFILE_NAMES[$i]}")
      else
        missing_from+=("${PROFILE_NAMES[$i]}")
      fi
    done
    if [[ ${#missing_from[@]} -gt 0 ]]; then
      fail "Skill '${skill}' missing from: ${missing_from[*]} (present in: ${present_in[*]})"
      PARITY_OK=false
    fi
  done <<< "$ALL_SKILLS"
fi

if $PARITY_OK; then
  count=$(echo "$ALL_SKILLS" | grep -c . || echo "0")
  pass "All ${count} skills present in all 3 profiles"
fi

# --- Sandbox docker.env Key Parity ---
section "Sandbox docker.env Key Parity"

declare -a ENV_KEY_LISTS=()
DOCKER_ENV_PARITY=true

for i in "${!PROFILES[@]}"; do
  profile="${PROFILES[$i]}"
  name="${PROFILE_NAMES[$i]}"
  config="${profile}/openclaw.json"

  if [[ -f "$config" ]]; then
    # Extract docker.env keys using python3 for reliable JSON parsing
    keys=$(python3 -c "
import json, sys
with open('${config}') as f:
    cfg = json.load(f)
docker_env = cfg.get('sandbox', {}).get('docker', {}).get('env', {})
if not docker_env:
    docker_env = cfg.get('sandbox', {}).get('dockerEnv', {})
if isinstance(docker_env, dict):
    for k in sorted(docker_env.keys()):
        print(k)
elif isinstance(docker_env, list):
    for item in sorted(docker_env):
        if '=' in item:
            print(item.split('=', 1)[0])
        else:
            print(item)
" 2>/dev/null || true)
    ENV_KEY_LISTS+=("$keys")
  else
    ENV_KEY_LISTS+=("")
    warn "Profile '${name}' missing openclaw.json"
  fi
done

ALL_ENV_KEYS=$(printf '%s\n' "${ENV_KEY_LISTS[@]}" | sort -u | grep -v '^$' || true)

if [[ -n "$ALL_ENV_KEYS" ]]; then
  while IFS= read -r key; do
    present_in=()
    missing_from=()
    for i in "${!PROFILE_NAMES[@]}"; do
      if echo "${ENV_KEY_LISTS[$i]}" | grep -qx "$key"; then
        present_in+=("${PROFILE_NAMES[$i]}")
      else
        missing_from+=("${PROFILE_NAMES[$i]}")
      fi
    done
    if [[ ${#missing_from[@]} -gt 0 ]]; then
      fail "docker.env key '${key}' missing from: ${missing_from[*]}"
      DOCKER_ENV_PARITY=false
    fi
  done <<< "$ALL_ENV_KEYS"
fi

if $DOCKER_ENV_PARITY; then
  count=$(echo "$ALL_ENV_KEYS" | grep -c . || echo "0")
  pass "All ${count} docker.env keys consistent across profiles"
fi

# --- .env Variable Name Parity ---
section ".env Variable Name Parity"

declare -a DOTENV_KEY_LISTS=()
DOTENV_PARITY=true

for i in "${!PROFILES[@]}"; do
  profile="${PROFILES[$i]}"
  name="${PROFILE_NAMES[$i]}"
  envfile="${profile}/.env"

  if [[ -f "$envfile" ]]; then
    # Extract variable names only (skip comments and blank lines)
    keys=$(grep -E '^[A-Za-z_][A-Za-z0-9_]*=' "$envfile" 2>/dev/null | sed 's/=.*//' | sort || true)
    DOTENV_KEY_LISTS+=("$keys")
  else
    DOTENV_KEY_LISTS+=("")
    warn "Profile '${name}' missing .env"
  fi
done

ALL_DOTENV_KEYS=$(printf '%s\n' "${DOTENV_KEY_LISTS[@]}" | sort -u | grep -v '^$' || true)

if [[ -n "$ALL_DOTENV_KEYS" ]]; then
  while IFS= read -r key; do
    present_in=()
    missing_from=()
    for i in "${!PROFILE_NAMES[@]}"; do
      if echo "${DOTENV_KEY_LISTS[$i]}" | grep -qx "$key"; then
        present_in+=("${PROFILE_NAMES[$i]}")
      else
        missing_from+=("${PROFILE_NAMES[$i]}")
      fi
    done
    if [[ ${#missing_from[@]} -gt 0 ]]; then
      fail ".env key '${key}' missing from: ${missing_from[*]}"
      DOTENV_PARITY=false
    fi
  done <<< "$ALL_DOTENV_KEYS"
fi

if $DOTENV_PARITY; then
  count=$(echo "$ALL_DOTENV_KEYS" | grep -c . || echo "0")
  pass "All ${count} .env variable names consistent across profiles"
fi

# --- paired.json Scope Validation ---
section "paired.json Scopes"

for i in "${!PROFILES[@]}"; do
  profile="${PROFILES[$i]}"
  name="${PROFILE_NAMES[$i]}"
  paired="${profile}/devices/paired.json"

  if [[ -f "$paired" ]]; then
    scopes=$(python3 -c "
import json
with open('${paired}') as f:
    data = json.load(f)
# paired.json can be a dict or list
if isinstance(data, list):
    items = data
elif isinstance(data, dict):
    items = list(data.values()) if not any(k in data for k in ['scopes', 'operator']) else [data]
else:
    items = []

all_scopes = set()
for item in items:
    if isinstance(item, dict):
        # Check various possible structures
        for scope_key in ['scopes', 'operator']:
            val = item.get(scope_key, [])
            if isinstance(val, list):
                all_scopes.update(val)
            elif isinstance(val, dict):
                all_scopes.update(val.keys())
        # Also check nested devices
        if 'devices' in item:
            for dev in (item['devices'] if isinstance(item['devices'], list) else [item['devices']]):
                if isinstance(dev, dict):
                    for scope_key in ['scopes', 'operator']:
                        val = dev.get(scope_key, [])
                        if isinstance(val, list):
                            all_scopes.update(val)
for s in sorted(all_scopes):
    print(s)
" 2>/dev/null || true)

    has_read=false
    has_write=false
    if echo "$scopes" | grep -qE '(operator\.read|read)'; then
      has_read=true
    fi
    if echo "$scopes" | grep -qE '(operator\.write|write)'; then
      has_write=true
    fi

    if $has_read && $has_write; then
      pass "Profile '${name}' paired.json has operator.read + operator.write"
    else
      details=""
      if ! $has_read; then details="missing operator.read"; fi
      if ! $has_write; then
        if [[ -n "$details" ]]; then details="$details, "; fi
        details="${details}missing operator.write"
      fi
      fail "Profile '${name}' paired.json: ${details}"
    fi
  else
    fail "Profile '${name}' missing paired.json at ${paired}"
  fi
done

# --- Port Spacing ---
section "Port Spacing"

declare -a GATEWAY_PORTS=()
PORT_SPACING_OK=true

for i in "${!PROFILES[@]}"; do
  profile="${PROFILES[$i]}"
  name="${PROFILE_NAMES[$i]}"
  config="${profile}/openclaw.json"

  if [[ -f "$config" ]]; then
    port=$(python3 -c "
import json
with open('${config}') as f:
    cfg = json.load(f)
gw = cfg.get('gateway', {})
print(gw.get('port', 'unknown'))
" 2>/dev/null || echo "unknown")
    GATEWAY_PORTS+=("$port")
    pass "Profile '${name}' gateway port: ${port}"
  else
    GATEWAY_PORTS+=("unknown")
    warn "Profile '${name}' missing openclaw.json"
  fi
done

# Check minimum 20-port gap between all pairs
for i in "${!GATEWAY_PORTS[@]}"; do
  for j in "${!GATEWAY_PORTS[@]}"; do
    if [[ "$i" -lt "$j" ]]; then
      p1="${GATEWAY_PORTS[$i]}"
      p2="${GATEWAY_PORTS[$j]}"
      if [[ "$p1" != "unknown" && "$p2" != "unknown" ]]; then
        gap=$(( p2 - p1 ))
        if [[ "$gap" -lt 0 ]]; then gap=$(( -gap )); fi
        if [[ "$gap" -lt 20 ]]; then
          fail "Port gap between ${PROFILE_NAMES[$i]} (${p1}) and ${PROFILE_NAMES[$j]} (${p2}) is only ${gap} (minimum 20)"
          PORT_SPACING_OK=false
        fi
      fi
    fi
  done
done

if $PORT_SPACING_OK; then
  pass "All port gaps >= 20"
fi

# --- Summary ---
echo ""
if [[ "$ISSUES" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}All parity checks passed.${RESET}"
  exit 0
else
  echo -e "${RED}${BOLD}${ISSUES} parity issue(s) detected.${RESET}"
  exit 1
fi
