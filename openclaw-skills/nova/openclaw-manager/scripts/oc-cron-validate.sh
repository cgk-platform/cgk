#!/usr/bin/env bash
set -euo pipefail

# oc-cron-validate.sh -- Validate cron job JSON schema across openCLAW profiles
# Checks: sessionTarget, announce delivery, agentId, timezone, duplicate schedules, notify flag

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BOLD='\033[1m'
RESET='\033[0m'

ISSUES=0

pass() { echo -e "  ${GREEN}[OK]${RESET} $1"; }
fail() { echo -e "  ${RED}[FAIL]${RESET} $1"; ISSUES=$((ISSUES + 1)); }
warn() { echo -e "  ${YELLOW}!${RESET} $1"; }
section() { echo -e "\n${BOLD}$1${RESET}"; }

usage() {
  echo "Usage: $(basename "$0") [--profile cgk|rawdog|vitahustle]"
  echo ""
  echo "Validates cron job JSON schema across openCLAW profiles."
  echo "Without --profile, validates all three profiles."
  exit 0
}

# --- Parse arguments ---
SELECTED_PROFILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile)
      if [[ $# -lt 2 ]]; then
        echo "Error: --profile requires a value (cgk, rawdog, vitahustle)"
        exit 2
      fi
      SELECTED_PROFILE="$2"
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      echo "Unknown argument: $1"
      usage
      ;;
  esac
done

# --- Build profile list ---
declare -a PROFILE_NAMES=()
declare -a PROFILE_DIRS=()
declare -a JOBS_FILES=()

add_profile() {
  local name="$1" dir="$2"
  PROFILE_NAMES+=("$name")
  PROFILE_DIRS+=("$dir")
  JOBS_FILES+=("${dir}/cron/jobs.json")
}

case "$SELECTED_PROFILE" in
  "")
    add_profile "cgk" "$HOME/.openclaw"
    add_profile "rawdog" "$HOME/.openclaw-rawdog"
    add_profile "vitahustle" "$HOME/.openclaw-vitahustle"
    ;;
  cgk)
    add_profile "cgk" "$HOME/.openclaw"
    ;;
  rawdog)
    add_profile "rawdog" "$HOME/.openclaw-rawdog"
    ;;
  vitahustle)
    add_profile "vitahustle" "$HOME/.openclaw-vitahustle"
    ;;
  *)
    echo "Error: Unknown profile '${SELECTED_PROFILE}'. Must be cgk, rawdog, or vitahustle."
    exit 2
    ;;
esac

# --- Prereq check ---
if ! command -v jq &>/dev/null; then
  echo "Error: jq is required but not found in PATH."
  exit 2
fi

echo -e "${BOLD}openCLAW Cron Job Validator${RESET}"

# --- Validate each profile ---
for idx in "${!PROFILE_NAMES[@]}"; do
  name="${PROFILE_NAMES[$idx]}"
  jobs_file="${JOBS_FILES[$idx]}"

  section "Profile: ${name}"

  if [[ ! -f "$jobs_file" ]]; then
    fail "Jobs file not found: ${jobs_file}"
    continue
  fi

  if ! jq empty "$jobs_file" 2>/dev/null; then
    fail "Jobs file is not valid JSON: ${jobs_file}"
    continue
  fi

  job_count=$(jq '.jobs | length' "$jobs_file")

  if [[ "$job_count" -eq 0 ]]; then
    warn "No jobs defined"
    continue
  fi

  echo -e "  Found ${job_count} job(s)"

  # --- Rule 1: Every job has sessionTarget: "isolated" ---
  section "  [1] sessionTarget must be \"isolated\""

  for i in $(seq 0 $((job_count - 1))); do
    job_name=$(jq -r ".jobs[$i].name" "$jobs_file")
    session_target=$(jq -r ".jobs[$i].sessionTarget // \"null\"" "$jobs_file")

    if [[ "$session_target" == "isolated" ]]; then
      pass "${job_name}: sessionTarget = isolated"
    elif [[ "$session_target" == "null" ]]; then
      fail "${job_name}: sessionTarget is missing (must be \"isolated\")"
    else
      fail "${job_name}: sessionTarget = \"${session_target}\" (must be \"isolated\")"
    fi
  done

  # --- Rule 2: Every announce-mode job has explicit delivery.channel ---
  section "  [2] announce mode requires explicit delivery.channel"

  for i in $(seq 0 $((job_count - 1))); do
    job_name=$(jq -r ".jobs[$i].name" "$jobs_file")
    delivery_mode=$(jq -r ".jobs[$i].delivery.mode // \"null\"" "$jobs_file")

    if [[ "$delivery_mode" != "announce" ]]; then
      pass "${job_name}: delivery.mode = \"${delivery_mode}\" (not announce, skip)"
      continue
    fi

    delivery_channel=$(jq -r ".jobs[$i].delivery.channel // \"null\"" "$jobs_file")
    delivery_to=$(jq -r ".jobs[$i].delivery.to // \"null\"" "$jobs_file")

    if [[ "$delivery_channel" != "null" && "$delivery_to" != "null" ]]; then
      pass "${job_name}: announce with channel=\"${delivery_channel}\", to=\"${delivery_to}\""
    else
      if [[ "$delivery_channel" == "null" ]]; then
        fail "${job_name}: announce mode but delivery.channel is missing"
      fi
      if [[ "$delivery_to" == "null" ]]; then
        fail "${job_name}: announce mode but delivery.to is missing"
      fi
    fi
  done

  # --- Rule 3: Every job has agentId set ---
  section "  [3] agentId must be set"

  for i in $(seq 0 $((job_count - 1))); do
    job_name=$(jq -r ".jobs[$i].name" "$jobs_file")
    agent_id=$(jq -r ".jobs[$i].agentId // \"null\"" "$jobs_file")

    if [[ "$agent_id" != "null" && -n "$agent_id" ]]; then
      pass "${job_name}: agentId = \"${agent_id}\""
    else
      fail "${job_name}: agentId is missing"
    fi
  done

  # --- Rule 4: Timezone is America/Los_Angeles ---
  section "  [4] Timezone must be America/Los_Angeles"

  for i in $(seq 0 $((job_count - 1))); do
    job_name=$(jq -r ".jobs[$i].name" "$jobs_file")
    schedule_kind=$(jq -r ".jobs[$i].schedule.kind // \"null\"" "$jobs_file")

    if [[ "$schedule_kind" == "every" ]]; then
      pass "${job_name}: interval-based schedule (no timezone needed)"
      continue
    fi

    tz=$(jq -r ".jobs[$i].schedule.tz // \"null\"" "$jobs_file")

    if [[ "$tz" == "America/Los_Angeles" ]]; then
      pass "${job_name}: tz = America/Los_Angeles"
    elif [[ "$tz" == "null" ]]; then
      fail "${job_name}: schedule.tz is missing (must be \"America/Los_Angeles\")"
    else
      fail "${job_name}: schedule.tz = \"${tz}\" (must be \"America/Los_Angeles\")"
    fi
  done

  # --- Rule 5: No duplicate schedules (same minute) ---
  section "  [5] No duplicate cron schedules (same minute)"

  # Extract cron expressions (skip interval-based jobs)
  cron_exprs=()
  cron_names=()
  for i in $(seq 0 $((job_count - 1))); do
    schedule_kind=$(jq -r ".jobs[$i].schedule.kind // \"null\"" "$jobs_file")
    if [[ "$schedule_kind" != "cron" ]]; then
      continue
    fi
    expr=$(jq -r ".jobs[$i].schedule.expr // \"null\"" "$jobs_file")
    job_name=$(jq -r ".jobs[$i].name" "$jobs_file")
    if [[ "$expr" != "null" ]]; then
      cron_exprs+=("$expr")
      cron_names+=("$job_name")
    fi
  done

  if [[ ${#cron_exprs[@]} -eq 0 ]]; then
    pass "No cron-type jobs to check"
  else
    # Check for duplicates by comparing all pairs
    dup_found=false
    seen_exprs=()
    seen_names=()
    for i in "${!cron_exprs[@]}"; do
      expr="${cron_exprs[$i]}"
      current_name="${cron_names[$i]}"
      duplicate=false

      for j in "${!seen_exprs[@]}"; do
        if [[ "${seen_exprs[$j]}" == "$expr" ]]; then
          fail "Duplicate schedule \"${expr}\": ${seen_names[$j]} and ${current_name}"
          duplicate=true
          dup_found=true
          break
        fi
      done

      if [[ "$duplicate" == "false" ]]; then
        seen_exprs+=("$expr")
        seen_names+=("$current_name")
      fi
    done

    if [[ "$dup_found" == "false" ]]; then
      pass "All ${#cron_exprs[@]} cron schedule(s) are unique"
    fi
  fi

  # --- Rule 6: notify: false on all CGK jobs ---
  if [[ "$name" == "cgk" ]]; then
    section "  [6] notify must be false (CGK only)"

    for i in $(seq 0 $((job_count - 1))); do
      job_name=$(jq -r ".jobs[$i].name" "$jobs_file")
      has_notify=$(jq ".jobs[$i] | has(\"notify\")" "$jobs_file")
      notify_val=$(jq ".jobs[$i].notify" "$jobs_file")

      if [[ "$has_notify" == "true" && "$notify_val" == "false" ]]; then
        pass "${job_name}: notify = false"
      elif [[ "$has_notify" != "true" ]]; then
        fail "${job_name}: notify field is missing (must be false)"
      else
        fail "${job_name}: notify = ${notify_val} (must be false)"
      fi
    done
  fi

done

# --- Summary ---
echo ""
if [[ "$ISSUES" -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}All validations passed.${RESET}"
  exit 0
else
  echo -e "${RED}${BOLD}${ISSUES} issue(s) detected.${RESET}"
  exit 1
fi
