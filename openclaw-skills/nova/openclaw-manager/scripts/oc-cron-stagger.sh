#!/usr/bin/env bash
set -euo pipefail

# oc-cron-stagger.sh -- Cron schedule collision detection and auto-stagger for openCLAW
# Reads all 3 profile jobs.json files, detects same-minute collisions and cross-profile
# near-collisions (within 5 minutes), and optionally suggests or applies stagger fixes.
#
# Usage:
#   oc-cron-stagger.sh [--report|--apply|--json] [--profile cgk|rawdog|vitahustle]
#
# Modes:
#   --report  (default) Print collision report with full sorted timeline
#   --apply   Print suggested stagger fixes; prompt to apply to jobs.json files
#   --json    Output collision data as JSON
#
# Cross-profile collisions are WARNINGS only (gateways run independently).
# Same-profile collisions at the exact same minute are ERRORS.

[[ -d /opt/homebrew/bin ]] && export PATH="/opt/homebrew/bin:$PATH"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# --- Output helpers ---
pass()    { echo -e "  ${GREEN}[OK]${RESET} $1"; }
fail()    { echo -e "  ${RED}[COLLISION]${RESET} $1"; }
warn()    { echo -e "  ${YELLOW}[WARN]${RESET} $1"; }
info()    { echo -e "  ${CYAN}[INFO]${RESET} $1"; }
section() { echo -e "\n${BOLD}$1${RESET}"; }

# --- Usage ---
usage() {
  echo "Usage: $(basename "$0") [--report|--apply|--json] [--profile cgk|rawdog|vitahustle]"
  echo ""
  echo "Detects same-minute collisions and near-collisions (within 5 min) across all"
  echo "openCLAW cron schedules. Cross-profile warnings indicate jobs that fire within"
  echo "5 minutes of each other on different gateways."
  echo ""
  echo "Modes:"
  echo "  --report   (default) Print collision report with full sorted timeline"
  echo "  --apply    Print suggested stagger fixes; prompt to apply to jobs.json"
  echo "  --json     Output collision and timeline data as JSON"
  echo ""
  echo "Options:"
  echo "  --profile  Limit input to a single profile (cgk, rawdog, vitahustle)"
  echo "             Note: cross-profile analysis requires all profiles."
  exit 0
}

# --- Prereqs ---
if ! command -v jq &>/dev/null; then
  echo "Error: jq is required but not found in PATH."
  echo "Install with: brew install jq"
  exit 2
fi

# --- Argument parsing ---
MODE="report"
SELECTED_PROFILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --report) MODE="report"; shift ;;
    --apply)  MODE="apply";  shift ;;
    --json)   MODE="json";   shift ;;
    --profile)
      if [[ $# -lt 2 ]]; then
        echo "Error: --profile requires a value (cgk, rawdog, vitahustle)"
        exit 2
      fi
      SELECTED_PROFILE="$2"
      shift 2
      ;;
    -h|--help) usage ;;
    *)
      echo "Unknown argument: $1"
      usage
      ;;
  esac
done

if [[ -n "$SELECTED_PROFILE" ]] && [[ "$SELECTED_PROFILE" != "cgk" && "$SELECTED_PROFILE" != "rawdog" && "$SELECTED_PROFILE" != "vitahustle" ]]; then
  echo "Error: Unknown profile '${SELECTED_PROFILE}'. Must be cgk, rawdog, or vitahustle."
  exit 2
fi

# --- Profile definitions ---
declare -a ALL_PROFILE_NAMES=("cgk" "rawdog" "vitahustle")
declare -a ALL_PROFILE_DIRS=("$HOME/.openclaw" "$HOME/.openclaw-rawdog" "$HOME/.openclaw-vitahustle")
declare -a ALL_PROFILE_LABELS=("CGK" "RAWDOG" "VH")

# Subset selection
declare -a PROFILE_NAMES=()
declare -a PROFILE_DIRS=()
declare -a PROFILE_LABELS=()

for idx in 0 1 2; do
  pname="${ALL_PROFILE_NAMES[$idx]}"
  if [[ -z "$SELECTED_PROFILE" || "$SELECTED_PROFILE" == "$pname" ]]; then
    PROFILE_NAMES+=("$pname")
    PROFILE_DIRS+=("${ALL_PROFILE_DIRS[$idx]}")
    PROFILE_LABELS+=("${ALL_PROFILE_LABELS[$idx]}")
  fi
done

# ==============================================================================
# CRON EXPRESSION PARSER
# Handles common patterns: M H * * * and M H * * DOW
# Returns: "minute hour dow_spec parseable"
# dow_spec: "*" for daily, "1" for Monday, etc., "1-5" for range, "1,3" for list
# If the expression is complex or multi-value in minute/hour fields, returns
# one entry per expanded value (comma-separated hours -> multiple entries).
# ==============================================================================

# parse_cron EXPR JOB_NAME PROFILE_LABEL
# Appends to global JOB_* arrays. Returns number of entries added.
# Each entry: JOB_KEYS+=("PROFILE:name:key"), JOB_MINUTES+=("M"), JOB_HOURS+=("H"), JOB_DOWS+=("DOW")
# JOB_PARSEABLE+=("1" or "0"), JOB_EXPRS+=("original expr")
declare -a JOB_PROFILES=()
declare -a JOB_NAMES=()
declare -a JOB_MINUTES=()
declare -a JOB_HOURS=()
declare -a JOB_DOWS=()
declare -a JOB_PARSEABLE=()
declare -a JOB_EXPRS=()
declare -a JOB_ENABLED=()

# interval-based jobs (kind: every)
declare -a EVERY_JOB_PROFILES=()
declare -a EVERY_JOB_NAMES=()
declare -a EVERY_JOB_INTERVALS=()

parse_cron_expr() {
  local profile_label="$1"
  local job_name="$2"
  local expr="$3"
  local enabled="$4"

  # Split into fields
  local f_min f_hour f_dom f_month f_dow
  f_min=$(echo "$expr"   | awk '{print $1}')
  f_hour=$(echo "$expr"  | awk '{print $2}')
  f_dom=$(echo "$expr"   | awk '{print $3}')
  f_month=$(echo "$expr" | awk '{print $4}')
  f_dow=$(echo "$expr"   | awk '{print $5}')

  # Mark as unparseable if dom or month are not wildcards
  if [[ "$f_dom" != "*" || "$f_month" != "*" ]]; then
    JOB_PROFILES+=("$profile_label")
    JOB_NAMES+=("$job_name")
    JOB_MINUTES+=("-")
    JOB_HOURS+=("-")
    JOB_DOWS+=("-")
    JOB_PARSEABLE+=("0")
    JOB_EXPRS+=("$expr")
    JOB_ENABLED+=("$enabled")
    return
  fi

  # Validate minute is a single integer (not a range or list or wildcard)
  if ! echo "$f_min" | grep -qE '^[0-9]+$'; then
    JOB_PROFILES+=("$profile_label")
    JOB_NAMES+=("$job_name")
    JOB_MINUTES+=("-")
    JOB_HOURS+=("-")
    JOB_DOWS+=("-")
    JOB_PARSEABLE+=("0")
    JOB_EXPRS+=("$expr")
    JOB_ENABLED+=("$enabled")
    return
  fi

  # Handle comma-separated hours: expand into multiple entries
  # e.g., "9,12,15,18" -> 4 separate entries
  if echo "$f_hour" | grep -q ","; then
    local hour_val
    for hour_val in $(echo "$f_hour" | tr "," "\n"); do
      if echo "$hour_val" | grep -qE '^[0-9]+$'; then
        JOB_PROFILES+=("$profile_label")
        JOB_NAMES+=("$job_name")
        JOB_MINUTES+=("$f_min")
        JOB_HOURS+=("$hour_val")
        JOB_DOWS+=("$f_dow")
        JOB_PARSEABLE+=("1")
        JOB_EXPRS+=("$expr")
        JOB_ENABLED+=("$enabled")
      else
        # Non-integer hour in list -- mark whole job unparseable
        JOB_PROFILES+=("$profile_label")
        JOB_NAMES+=("$job_name")
        JOB_MINUTES+=("-")
        JOB_HOURS+=("-")
        JOB_DOWS+=("-")
        JOB_PARSEABLE+=("0")
        JOB_EXPRS+=("$expr")
        JOB_ENABLED+=("$enabled")
        return
      fi
    done
    return
  fi

  # Validate hour is a single integer or wildcard
  if ! echo "$f_hour" | grep -qE '^[0-9]+$'; then
    JOB_PROFILES+=("$profile_label")
    JOB_NAMES+=("$job_name")
    JOB_MINUTES+=("-")
    JOB_HOURS+=("-")
    JOB_DOWS+=("-")
    JOB_PARSEABLE+=("0")
    JOB_EXPRS+=("$expr")
    JOB_ENABLED+=("$enabled")
    return
  fi

  # Parseable: single minute, single hour, any DOW spec
  JOB_PROFILES+=("$profile_label")
  JOB_NAMES+=("$job_name")
  JOB_MINUTES+=("$f_min")
  JOB_HOURS+=("$f_hour")
  JOB_DOWS+=("$f_dow")
  JOB_PARSEABLE+=("1")
  JOB_EXPRS+=("$expr")
  JOB_ENABLED+=("$enabled")
}

# ==============================================================================
# LOAD ALL JOBS
# ==============================================================================

load_profile_jobs() {
  local label="$1"
  local jobs_file="$2"

  if [[ ! -f "$jobs_file" ]]; then
    warn "Jobs file not found: ${jobs_file}"
    return
  fi

  if ! jq empty "$jobs_file" 2>/dev/null; then
    warn "Invalid JSON: ${jobs_file}"
    return
  fi

  local job_count
  job_count=$(jq '.jobs | length' "$jobs_file")

  local i=0
  while [[ $i -lt $job_count ]]; do
    local jname jenabled jkind jexpr jevery_ms
    jname=$(jq -r ".jobs[$i].name" "$jobs_file")
    jenabled=$(jq -r ".jobs[$i].enabled // true" "$jobs_file")
    jkind=$(jq -r ".jobs[$i].schedule.kind // \"null\"" "$jobs_file")
    jexpr=$(jq -r ".jobs[$i].schedule.expr // \"null\"" "$jobs_file")
    jevery_ms=$(jq -r ".jobs[$i].schedule.everyMs // \"null\"" "$jobs_file")

    if [[ "$jkind" == "every" ]]; then
      EVERY_JOB_PROFILES+=("$label")
      EVERY_JOB_NAMES+=("$jname")
      EVERY_JOB_INTERVALS+=("$jevery_ms")
    elif [[ "$jkind" == "cron" && "$jexpr" != "null" ]]; then
      parse_cron_expr "$label" "$jname" "$jexpr" "$jenabled"
    fi

    i=$((i + 1))
  done
}

for pidx in "${!PROFILE_NAMES[@]}"; do
  pname="${PROFILE_NAMES[$pidx]}"
  pdir="${PROFILE_DIRS[$pidx]}"
  plabel="${PROFILE_LABELS[$pidx]}"
  load_profile_jobs "$plabel" "${pdir}/cron/jobs.json"
done

# ==============================================================================
# COLLISION DETECTION
#
# For collision analysis, DOW semantics:
#   - "*" jobs run every day (can collide with any DOW)
#   - A specific DOW (e.g., "1") runs only on that day
#   - A range (e.g., "1-5") runs on matching days
#   - Two jobs overlap on their DOW if both are daily ("*") OR if their DOW specs
#     could resolve to a common day. For simplicity: a specific-DOW job only
#     collides with another specific-DOW job if they share the same DOW value,
#     or if either is "*". Ranges are treated conservatively as "could overlap".
#
# We compute a "time key" as HHMM (zero-padded) for sorting and distance math.
# ==============================================================================

# dow_can_overlap DOW_A DOW_B
# Returns 0 (true) if the two DOW specs could share a day, 1 (false) if not.
dow_can_overlap() {
  local a="$1" b="$2"
  # Both daily
  if [[ "$a" == "*" && "$b" == "*" ]]; then return 0; fi
  # One daily, one specific
  if [[ "$a" == "*" || "$b" == "*" ]]; then return 0; fi
  # Both specific single digits
  if echo "$a" | grep -qE '^[0-9]$' && echo "$b" | grep -qE '^[0-9]$'; then
    if [[ "$a" == "$b" ]]; then return 0; else return 1; fi
  fi
  # One or both is a range or list -- treat conservatively as "could overlap"
  return 0
}

# time_key HOUR MINUTE -> integer key for sort comparison (H*100+M, no leading zeros)
# Lexicographic and numeric order match, so this works for both string and integer compare.
time_key() {
  echo $(($1 * 100 + $2))
}

# time_diff_minutes KEY_A KEY_B -> absolute minute difference
# Keys are integers of the form H*100+M (e.g., 630 for 06:30, 900 for 09:00).
time_diff_minutes() {
  local a="$1" b="$2"
  local ha ma hb mb total_a total_b diff
  ha=$((a / 100))
  ma=$((a % 100))
  hb=$((b / 100))
  mb=$((b % 100))
  total_a=$((ha * 60 + ma))
  total_b=$((hb * 60 + mb))
  diff=$((total_a - total_b))
  if [[ $diff -lt 0 ]]; then diff=$((-diff)); fi
  echo "$diff"
}

# Storage for collisions and warnings
declare -a COLLISION_DESCS=()
declare -a WARNING_DESCS=()

# Storage for all parseable entries (for timeline and --apply)
# Parallel to JOB_* arrays, just the parseable ones
declare -a TL_PROFILE=()
declare -a TL_NAME=()
declare -a TL_HOUR=()
declare -a TL_MINUTE=()
declare -a TL_DOW=()
declare -a TL_KEY=()    # HHMM for sorting
declare -a TL_EXPR=()

# Build timeline from parseable entries
for jidx in "${!JOB_PARSEABLE[@]}"; do
  if [[ "${JOB_PARSEABLE[$jidx]}" == "1" ]]; then
    h="${JOB_HOURS[$jidx]}"
    m="${JOB_MINUTES[$jidx]}"
    TL_PROFILE+=("${JOB_PROFILES[$jidx]}")
    TL_NAME+=("${JOB_NAMES[$jidx]}")
    TL_HOUR+=("$h")
    TL_MINUTE+=("$m")
    TL_DOW+=("${JOB_DOWS[$jidx]}")
    TL_KEY+=("$(time_key "$h" "$m")")
    TL_EXPR+=("${JOB_EXPRS[$jidx]}")
  fi
done

# Run collision detection: compare all pairs
tl_count="${#TL_KEY[@]}"
_ci=0
while [[ $_ci -lt $tl_count ]]; do
  _cj=$((_ci + 1))
  while [[ $_cj -lt $tl_count ]]; do
    p_i="${TL_PROFILE[$_ci]}"
    p_j="${TL_PROFILE[$_cj]}"
    n_i="${TL_NAME[$_ci]}"
    n_j="${TL_NAME[$_cj]}"
    k_i="${TL_KEY[$_ci]}"
    k_j="${TL_KEY[$_cj]}"
    d_i="${TL_DOW[$_ci]}"
    d_j="${TL_DOW[$_cj]}"

    # Only analyze pairs that could share a day
    if dow_can_overlap "$d_i" "$d_j"; then
      diff=$(time_diff_minutes "$k_i" "$k_j")

      if [[ "$diff" -eq 0 ]]; then
        # Exact same minute
        h_disp="${TL_HOUR[$_ci]}"
        m_disp="${TL_MINUTE[$_ci]}"
        time_str=$(printf "%02d:%02d" "$h_disp" "$m_disp")
        if [[ "$p_i" == "$p_j" ]]; then
          COLLISION_DESCS+=("SAME-PROFILE COLLISION at ${time_str} [${p_i}]: ${n_i} vs ${n_j}")
        else
          COLLISION_DESCS+=("CROSS-PROFILE COLLISION at ${time_str} [${p_i} vs ${p_j}]: ${n_i} vs ${n_j}")
        fi
      elif [[ "$diff" -le 5 ]]; then
        # Within 5 minutes -- warning
        h_i="${TL_HOUR[$_ci]}"; m_i="${TL_MINUTE[$_ci]}"
        h_j="${TL_HOUR[$_cj]}"; m_j="${TL_MINUTE[$_cj]}"
        time_i=$(printf "%02d:%02d" "$h_i" "$m_i")
        time_j=$(printf "%02d:%02d" "$h_j" "$m_j")
        if [[ "$p_i" == "$p_j" ]]; then
          WARNING_DESCS+=("Near-collision (${diff}m apart) [${p_i}]: ${n_i} @ ${time_i} vs ${n_j} @ ${time_j}")
        else
          WARNING_DESCS+=("Cross-profile near-collision (${diff}m apart) [${p_i} vs ${p_j}]: ${n_i} @ ${time_i} vs ${n_j} @ ${time_j}")
        fi
      fi
    fi

    _cj=$((_cj + 1))
  done
  _ci=$((_ci + 1))
done

# ==============================================================================
# STAGGER SUGGESTIONS
# For each same-profile collision, suggest moving the second job by +5 minutes.
# For near-collisions within the same profile (< 5 min gap), suggest expanding to 5 min.
# ==============================================================================

declare -a SUGGEST_JOBS=()       # job name
declare -a SUGGEST_PROFILES=()   # profile label (CGK/RAWDOG/VH)
declare -a SUGGEST_OLD_EXPR=()   # current cron expr
declare -a SUGGEST_NEW_MIN=()    # suggested new minute
declare -a SUGGEST_NEW_HOUR=()   # suggested new hour (may change if wraps :60)

compute_stagger_suggestions() {
  local idx_i="$1" idx_j="$2" gap_needed="$3"
  # We suggest moving job j to be at least gap_needed minutes after job i
  local h_i="${TL_HOUR[$idx_i]}"
  local m_i="${TL_MINUTE[$idx_i]}"
  local h_j="${TL_HOUR[$idx_j]}"
  local m_j="${TL_MINUTE[$idx_j]}"
  local k_i="${TL_KEY[$idx_i]}"
  local k_j="${TL_KEY[$idx_j]}"

  # Determine which job runs first (or pick j if equal)
  local first_idx second_idx
  if [[ "$k_i" -le "$k_j" ]]; then
    first_idx="$idx_i"
    second_idx="$idx_j"
  else
    first_idx="$idx_j"
    second_idx="$idx_i"
  fi

  local h_first="${TL_HOUR[$first_idx]}"
  local m_first="${TL_MINUTE[$first_idx]}"
  local new_min=$((m_first + gap_needed))
  local new_hour="$h_first"
  if [[ "$new_min" -ge 60 ]]; then
    new_min=$((new_min - 60))
    new_hour=$((new_hour + 1))
    if [[ "$new_hour" -ge 24 ]]; then
      new_hour=0
    fi
  fi

  SUGGEST_JOBS+=("${TL_NAME[$second_idx]}")
  SUGGEST_PROFILES+=("${TL_PROFILE[$second_idx]}")
  SUGGEST_OLD_EXPR+=("${TL_EXPR[$second_idx]}")
  SUGGEST_NEW_MIN+=("$new_min")
  SUGGEST_NEW_HOUR+=("$new_hour")
}

# Generate suggestions for same-profile collisions and near-collisions
_si=0
while [[ $_si -lt $tl_count ]]; do
  _sj=$((_si + 1))
  while [[ $_sj -lt $tl_count ]]; do
    p_i="${TL_PROFILE[$_si]}"
    p_j="${TL_PROFILE[$_sj]}"
    d_i="${TL_DOW[$_si]}"
    d_j="${TL_DOW[$_sj]}"

    if [[ "$p_i" == "$p_j" ]] && dow_can_overlap "$d_i" "$d_j"; then
      diff=$(time_diff_minutes "${TL_KEY[$_si]}" "${TL_KEY[$_sj]}")

      if [[ "$diff" -eq 0 ]]; then
        compute_stagger_suggestions "$_si" "$_sj" 5
      elif [[ "$diff" -gt 0 && "$diff" -lt 5 ]]; then
        compute_stagger_suggestions "$_si" "$_sj" $((5 - diff + 1))
      fi
    fi

    _sj=$((_sj + 1))
  done
  _si=$((_si + 1))
done

# ==============================================================================
# SORT TIMELINE (bubble sort on HHMM keys -- small list, acceptable)
# ==============================================================================

sort_timeline() {
  local n="${#TL_KEY[@]}"
  local _ti _tj _tnext tmp_key tmp_prof tmp_name tmp_hour tmp_min tmp_dow tmp_expr
  _ti=0
  while [[ $_ti -lt $((n - 1)) ]]; do
    _tj=0
    while [[ $_tj -lt $((n - _ti - 1)) ]]; do
      _tnext=$((_tj + 1))
      if [[ "${TL_KEY[$_tj]}" -gt "${TL_KEY[$_tnext]}" ]]; then
        # Swap all parallel arrays
        tmp_key="${TL_KEY[$_tj]}";      TL_KEY[$_tj]="${TL_KEY[$_tnext]}";          TL_KEY[$_tnext]="$tmp_key"
        tmp_prof="${TL_PROFILE[$_tj]}"; TL_PROFILE[$_tj]="${TL_PROFILE[$_tnext]}";  TL_PROFILE[$_tnext]="$tmp_prof"
        tmp_name="${TL_NAME[$_tj]}";    TL_NAME[$_tj]="${TL_NAME[$_tnext]}";        TL_NAME[$_tnext]="$tmp_name"
        tmp_hour="${TL_HOUR[$_tj]}";    TL_HOUR[$_tj]="${TL_HOUR[$_tnext]}";        TL_HOUR[$_tnext]="$tmp_hour"
        tmp_min="${TL_MINUTE[$_tj]}";   TL_MINUTE[$_tj]="${TL_MINUTE[$_tnext]}";    TL_MINUTE[$_tnext]="$tmp_min"
        tmp_dow="${TL_DOW[$_tj]}";      TL_DOW[$_tj]="${TL_DOW[$_tnext]}";          TL_DOW[$_tnext]="$tmp_dow"
        tmp_expr="${TL_EXPR[$_tj]}";    TL_EXPR[$_tj]="${TL_EXPR[$_tnext]}";        TL_EXPR[$_tnext]="$tmp_expr"
      fi
      _tj=$((_tj + 1))
    done
    _ti=$((_ti + 1))
  done
}

if [[ "${#TL_KEY[@]}" -gt 1 ]]; then
  sort_timeline
fi

# ==============================================================================
# COUNT UNPARSEABLE
# ==============================================================================
UNPARSEABLE_COUNT=0
declare -a UNPARSEABLE_DESCS=()
for jidx in "${!JOB_PARSEABLE[@]}"; do
  if [[ "${JOB_PARSEABLE[$jidx]}" == "0" ]]; then
    UNPARSEABLE_COUNT=$((UNPARSEABLE_COUNT + 1))
    UNPARSEABLE_DESCS+=("[${JOB_PROFILES[$jidx]}] ${JOB_NAMES[$jidx]}: ${JOB_EXPRS[$jidx]}")
  fi
done

# ==============================================================================
# OUTPUT: --report
# ==============================================================================

print_report() {
  echo -e "${BOLD}openCLAW Cron Stagger Report${RESET}"
  echo ""

  # Interval jobs
  if [[ "${#EVERY_JOB_NAMES[@]}" -gt 0 ]]; then
    section "Interval-Based Jobs (skipped -- no schedule collisions possible)"
    for i in "${!EVERY_JOB_NAMES[@]}"; do
      local_ms="${EVERY_JOB_INTERVALS[$i]}"
      local_sec=$((local_ms / 1000))
      local_min=$((local_sec / 60))
      info "[${EVERY_JOB_PROFILES[$i]}] ${EVERY_JOB_NAMES[$i]}: every ${local_min}m"
    done
  fi

  # Full sorted timeline
  section "Full Schedule Timeline (sorted by time, America/Los_Angeles)"
  if [[ "${#TL_KEY[@]}" -eq 0 ]]; then
    warn "No parseable cron jobs found."
  else
    local prev_key=""
    for tidx in "${!TL_KEY[@]}"; do
      local cur_key="${TL_KEY[$tidx]}"
      local h="${TL_HOUR[$tidx]}"
      local m="${TL_MINUTE[$tidx]}"
      local time_str
      time_str=$(printf "%02d:%02d" "$h" "$m")
      local dow_str=""
      if [[ "${TL_DOW[$tidx]}" != "*" ]]; then
        dow_str=" (DOW:${TL_DOW[$tidx]})"
      fi

      # Flag if same time as previous entry
      local marker="  "
      if [[ -n "$prev_key" && "$cur_key" == "$prev_key" ]]; then
        marker="${RED}!!${RESET}"
      fi
      echo -e "  ${marker} ${CYAN}${time_str}${RESET}  [${TL_PROFILE[$tidx]}]  ${TL_NAME[$tidx]}${dow_str}"
      prev_key="$cur_key"
    done
  fi

  # Unparseable jobs
  if [[ "$UNPARSEABLE_COUNT" -gt 0 ]]; then
    section "Unparseable Expressions (complex patterns -- manual review needed)"
    for desc in "${UNPARSEABLE_DESCS[@]}"; do
      warn "$desc"
    done
  fi

  # Collisions
  section "Collisions (same-minute -- immediate fix required)"
  if [[ "${#COLLISION_DESCS[@]}" -eq 0 ]]; then
    pass "No same-minute collisions detected."
  else
    for desc in "${COLLISION_DESCS[@]}"; do
      fail "$desc"
    done
  fi

  # Warnings
  section "Near-Collisions (within 5 minutes -- consider staggering)"
  if [[ "${#WARNING_DESCS[@]}" -eq 0 ]]; then
    pass "No near-collisions detected."
  else
    for desc in "${WARNING_DESCS[@]}"; do
      warn "$desc"
    done
  fi

  # Stagger suggestions
  if [[ "${#SUGGEST_JOBS[@]}" -gt 0 ]]; then
    section "Suggested Stagger Fixes"
    for sidx in "${!SUGGEST_JOBS[@]}"; do
      local new_expr
      local old_expr="${SUGGEST_OLD_EXPR[$sidx]}"
      local old_min
      local old_hour
      old_min=$(echo "$old_expr" | awk '{print $1}')
      old_hour=$(echo "$old_expr" | awk '{print $2}')
      new_expr=$(echo "$old_expr" | awk -v nm="${SUGGEST_NEW_MIN[$sidx]}" -v nh="${SUGGEST_NEW_HOUR[$sidx]}" \
        '{$1=nm; $2=nh; print}')
      echo -e "  [${SUGGEST_PROFILES[$sidx]}] ${SUGGEST_JOBS[$sidx]}:"
      echo -e "    was: ${old_expr}"
      echo -e "    now: ${new_expr}"
    done
    echo ""
    echo -e "  Run with ${BOLD}--apply${RESET} to apply these fixes interactively."
  fi

  # Summary
  echo ""
  local total_collisions="${#COLLISION_DESCS[@]}"
  local total_warnings="${#WARNING_DESCS[@]}"

  if [[ "$total_collisions" -eq 0 && "$total_warnings" -eq 0 ]]; then
    echo -e "${GREEN}${BOLD}No issues detected. All schedules are well-staggered.${RESET}"
  else
    if [[ "$total_collisions" -gt 0 ]]; then
      echo -e "${RED}${BOLD}${total_collisions} collision(s) detected.${RESET} Run with --apply to fix."
    fi
    if [[ "$total_warnings" -gt 0 ]]; then
      echo -e "${YELLOW}${BOLD}${total_warnings} near-collision warning(s).${RESET} Run with --apply to stagger."
    fi
  fi
}

# ==============================================================================
# OUTPUT: --apply
# Apply stagger suggestions by rewriting jobs.json files (gateway must be stopped)
# ==============================================================================

print_apply() {
  print_report

  if [[ "${#SUGGEST_JOBS[@]}" -eq 0 ]]; then
    echo ""
    echo "No fixes to apply."
    return
  fi

  echo ""
  section "Applying Stagger Fixes"
  echo ""
  echo -e "  ${YELLOW}WARNING:${RESET} Gateways must be stopped before editing jobs.json."
  echo -e "  Stop with: openclaw stop (or openclaw --profile rawdog stop, etc.)"
  echo ""
  echo -n "  Apply ${#SUGGEST_JOBS[@]} fix(es)? [y/N] "
  read -r answer

  if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
    echo "  Aborted -- no changes made."
    return
  fi

  # Build profile -> jobs.json path mapping (no declare -A, use parallel arrays)
  declare -a PMAP_LABELS=("CGK" "RAWDOG" "VH")
  declare -a PMAP_DIRS=("$HOME/.openclaw" "$HOME/.openclaw-rawdog" "$HOME/.openclaw-vitahustle")

  local applied=0
  local failed=0

  for sidx in "${!SUGGEST_JOBS[@]}"; do
    local sjob="${SUGGEST_JOBS[$sidx]}"
    local sprof="${SUGGEST_PROFILES[$sidx]}"
    local sold_expr="${SUGGEST_OLD_EXPR[$sidx]}"
    local snew_min="${SUGGEST_NEW_MIN[$sidx]}"
    local snew_hour="${SUGGEST_NEW_HOUR[$sidx]}"

    # Find jobs.json path for this profile
    local jobs_file=""
    for pmidx in "${!PMAP_LABELS[@]}"; do
      if [[ "${PMAP_LABELS[$pmidx]}" == "$sprof" ]]; then
        jobs_file="${PMAP_DIRS[$pmidx]}/cron/jobs.json"
        break
      fi
    done

    if [[ -z "$jobs_file" || ! -f "$jobs_file" ]]; then
      echo -e "  ${RED}[FAIL]${RESET} Could not find jobs.json for profile ${sprof}"
      failed=$((failed + 1))
      continue
    fi

    # Build new cron expression by replacing minute and hour fields
    local old_dom old_month old_dow_field
    old_dom=$(echo "$sold_expr"   | awk '{print $3}')
    old_month=$(echo "$sold_expr" | awk '{print $4}')
    old_dow_field=$(echo "$sold_expr" | awk '{print $5}')
    local new_expr="${snew_min} ${snew_hour} ${old_dom} ${old_month} ${old_dow_field}"

    # Backup first
    local backup_file="${jobs_file}.bak.$(date +%Y%m%d%H%M%S)"
    cp "$jobs_file" "$backup_file"

    # Apply using jq -- find the job by name and update schedule.expr
    local tmp_file="${jobs_file}.tmp"
    if jq --arg jname "$sjob" --arg nexpr "$new_expr" \
      '(.jobs[] | select(.name == $jname) | .schedule.expr) = $nexpr' \
      "$jobs_file" > "$tmp_file" 2>/dev/null; then
      mv "$tmp_file" "$jobs_file"
      echo -e "  ${GREEN}[OK]${RESET} [${sprof}] ${sjob}: \"${sold_expr}\" -> \"${new_expr}\""
      echo -e "       Backup: ${backup_file}"
      applied=$((applied + 1))
    else
      rm -f "$tmp_file"
      echo -e "  ${RED}[FAIL]${RESET} [${sprof}] ${sjob}: jq update failed. Backup at: ${backup_file}"
      failed=$((failed + 1))
    fi
  done

  echo ""
  if [[ "$applied" -gt 0 ]]; then
    echo -e "  ${GREEN}${BOLD}${applied} fix(es) applied.${RESET} Restart gateways to take effect."
  fi
  if [[ "$failed" -gt 0 ]]; then
    echo -e "  ${RED}${BOLD}${failed} fix(es) failed.${RESET}"
  fi
}

# ==============================================================================
# OUTPUT: --json
# ==============================================================================

print_json() {
  # Build timeline JSON array
  local timeline_json="["
  local first_tl=1
  for tidx in "${!TL_KEY[@]}"; do
    local h="${TL_HOUR[$tidx]}"
    local m="${TL_MINUTE[$tidx]}"
    local time_str
    time_str=$(printf "%02d:%02d" "$h" "$m")
    if [[ "$first_tl" -eq 0 ]]; then timeline_json+=","; fi
    first_tl=0
    timeline_json+="{\"time\":\"${time_str}\","
    timeline_json+="\"profile\":\"${TL_PROFILE[$tidx]}\","
    timeline_json+="\"name\":\"${TL_NAME[$tidx]}\","
    timeline_json+="\"dow\":\"${TL_DOW[$tidx]}\","
    timeline_json+="\"expr\":\"${TL_EXPR[$tidx]}\"}"
  done
  timeline_json+="]"

  # Build collisions JSON array
  local collisions_json="["
  local first_col=1
  for desc in "${COLLISION_DESCS[@]}"; do
    # Escape double quotes in desc
    local esc_desc
    esc_desc=$(echo "$desc" | sed 's/"/\\"/g')
    if [[ "$first_col" -eq 0 ]]; then collisions_json+=","; fi
    first_col=0
    collisions_json+="{\"type\":\"collision\",\"description\":\"${esc_desc}\"}"
  done
  for desc in "${WARNING_DESCS[@]}"; do
    local esc_desc
    esc_desc=$(echo "$desc" | sed 's/"/\\"/g')
    if [[ "$first_col" -eq 0 ]]; then collisions_json+=","; fi
    first_col=0
    collisions_json+="{\"type\":\"warning\",\"description\":\"${esc_desc}\"}"
  done
  collisions_json+="]"

  # Build suggestions JSON array
  local suggestions_json="["
  local first_sug=1
  for sidx in "${!SUGGEST_JOBS[@]}"; do
    local old_expr="${SUGGEST_OLD_EXPR[$sidx]}"
    local new_min="${SUGGEST_NEW_MIN[$sidx]}"
    local new_hour="${SUGGEST_NEW_HOUR[$sidx]}"
    local old_dom old_month old_dow_f
    old_dom=$(echo "$old_expr"   | awk '{print $3}')
    old_month=$(echo "$old_expr" | awk '{print $4}')
    old_dow_f=$(echo "$old_expr" | awk '{print $5}')
    local new_expr="${new_min} ${new_hour} ${old_dom} ${old_month} ${old_dow_f}"
    if [[ "$first_sug" -eq 0 ]]; then suggestions_json+=","; fi
    first_sug=0
    suggestions_json+="{\"profile\":\"${SUGGEST_PROFILES[$sidx]}\","
    suggestions_json+="\"job\":\"${SUGGEST_JOBS[$sidx]}\","
    suggestions_json+="\"old_expr\":\"${old_expr}\","
    suggestions_json+="\"new_expr\":\"${new_expr}\"}"
  done
  suggestions_json+="]"

  # Build interval jobs JSON
  local every_json="["
  local first_ev=1
  for i in "${!EVERY_JOB_NAMES[@]}"; do
    local ev_ms="${EVERY_JOB_INTERVALS[$i]}"
    local ev_min=$((ev_ms / 60000))
    if [[ "$first_ev" -eq 0 ]]; then every_json+=","; fi
    first_ev=0
    every_json+="{\"profile\":\"${EVERY_JOB_PROFILES[$i]}\","
    every_json+="\"name\":\"${EVERY_JOB_NAMES[$i]}\","
    every_json+="\"every_minutes\":${ev_min}}"
  done
  every_json+="]"

  printf '{"timeline":%s,"issues":%s,"suggestions":%s,"interval_jobs":%s}\n' \
    "$timeline_json" "$collisions_json" "$suggestions_json" "$every_json" \
    | jq .
}

# ==============================================================================
# DISPATCH
# ==============================================================================

case "$MODE" in
  report) print_report ;;
  apply)  print_apply  ;;
  json)   print_json   ;;
esac
