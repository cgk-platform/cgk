#!/usr/bin/env bash
set -euo pipefail

# install.sh -- Symlink installer for openCLAW skills
#
# Links skill source code from the cgk-platform monorepo into openCLAW
# profile state directories, so `git pull` instantly updates all skills.
#
# Usage:
#   ./install.sh                             Install all skills to ~/.openclaw
#   ./install.sh --skill video-editor        Install one skill
#   ./install.sh --state-dir ~/.openclaw-rawdog  Install to a specific profile
#   ./install.sh --all-profiles              Auto-detect and install to all profiles
#   ./install.sh --status                    Show link status for all skills
#   ./install.sh --unlink                    Remove symlinks, copy back real files

# ---------------------------------------------------------------------------
# Globals
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DEFAULT_STATE_DIR="$HOME/.openclaw"

# Linkable items (directories and files that get symlinked)
LINKABLE_DIRS="scripts templates references assets hooks snippets"
LINKABLE_FILES="SKILL.md _meta.json"

# Complete skill list (relative to SCRIPT_DIR)
ALL_SKILLS="
  video-editor
  meta-ads
  ad-library-dl
  nano-banana-pro
  veo-video-gen
  video-remix
  klaviyo
  amazon-sp
  youtube-uploader
  youtube-watcher
  google-workspace
  triple-whale
  proactive-agent
  self-improving-agent
  nova/openclaw-manager
  agent-browser
  clawddocs
  desktop-control
  dreaming
  giphy
  github-1
  humanizer
  memory-setup
  model-router
  nano-pdf
  skill-installer
  slack
  summarize
  vertex-ai
"

# Skills excluded from certain profiles
VITAHUSTLE_ONLY="triple-whale"

# ---------------------------------------------------------------------------
# Color support (respects NO_COLOR)
# ---------------------------------------------------------------------------

if [ -n "${NO_COLOR:-}" ] || [ ! -t 1 ]; then
  C_GREEN=""
  C_YELLOW=""
  C_RED=""
  C_BOLD=""
  C_RESET=""
else
  C_GREEN="$(tput setaf 2 2>/dev/null || printf '')"
  C_YELLOW="$(tput setaf 3 2>/dev/null || printf '')"
  C_RED="$(tput setaf 1 2>/dev/null || printf '')"
  C_BOLD="$(tput bold 2>/dev/null || printf '')"
  C_RESET="$(tput sgr0 2>/dev/null || printf '')"
fi

# ---------------------------------------------------------------------------
# Logging helpers
# ---------------------------------------------------------------------------

log_ok()   { printf "%s[ok]%s    %s\n" "$C_GREEN" "$C_RESET" "$1"; }
log_warn() { printf "%s[warn]%s  %s\n" "$C_YELLOW" "$C_RESET" "$1"; }
log_err()  { printf "%s[err]%s   %s\n" "$C_RED" "$C_RESET" "$1" >&2; }
log_info() { printf "%s[info]%s  %s\n" "$C_BOLD" "$C_RESET" "$1"; }

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Resolve the source path for a skill in the repo.
# For "nova/openclaw-manager" this returns the nested path.
skill_repo_path() {
  printf "%s/%s" "$SCRIPT_DIR" "$1"
}

# Resolve the install path for a skill in a state directory.
# For "nova/openclaw-manager" the target is <state>/skills/nova/openclaw-manager
skill_install_path() {
  local state_dir="$1"
  local skill="$2"
  printf "%s/skills/%s" "$state_dir" "$skill"
}

# Return profile name from state dir (for display)
profile_name() {
  local dir="$1"
  local base
  base="$(basename "$dir")"
  case "$base" in
    .openclaw)            printf "CGK" ;;
    .openclaw-rawdog)     printf "RAWDOG" ;;
    .openclaw-vitahustle) printf "VitaHustle" ;;
    *)                    printf "%s" "$base" ;;
  esac
}

# Check if a state dir looks like a valid openCLAW profile
is_valid_profile() {
  local dir="$1"
  [ -d "$dir/skills" ] || [ -f "$dir/openclaw.json" ]
}

# Detect profile type from state dir path
# Returns: cgk, rawdog, vitahustle, or unknown
profile_type() {
  local dir="$1"
  local base
  base="$(basename "$dir")"
  case "$base" in
    .openclaw)            printf "cgk" ;;
    .openclaw-rawdog)     printf "rawdog" ;;
    .openclaw-vitahustle) printf "vitahustle" ;;
    *)                    printf "unknown" ;;
  esac
}

# Back up a file or directory with a timestamped suffix
backup_item() {
  local path="$1"
  local ts
  ts="$(date +%Y%m%d%H%M%S)"
  local backup="${path}.bak.${ts}"
  mv "$path" "$backup"
  log_warn "Backed up existing $(basename "$path") -> $(basename "$backup")"
}

# Discover all openCLAW profile directories
discover_profiles() {
  local dir
  for dir in "$HOME"/.openclaw*; do
    [ -d "$dir" ] || continue
    is_valid_profile "$dir" && printf "%s\n" "$dir"
  done
}

# Get the list of skills appropriate for a profile type.
# triple-whale is excluded from non-vitahustle profiles in --all-profiles mode.
# When installing to a specific --state-dir, all skills are available.
skills_for_profile() {
  local ptype="$1"
  local restrict="$2"  # "yes" = apply profile restrictions, "no" = install all
  local skill
  for skill in $ALL_SKILLS; do
    skill="$(printf "%s" "$skill" | xargs)"  # trim whitespace
    [ -z "$skill" ] && continue
    if [ "$restrict" = "yes" ] && [ "$ptype" != "vitahustle" ]; then
      if [ "$skill" = "$VITAHUSTLE_ONLY" ]; then
        continue
      fi
    fi
    printf "%s\n" "$skill"
  done
}

# ---------------------------------------------------------------------------
# Core: install a single skill into a state directory
# ---------------------------------------------------------------------------

install_skill() {
  local state_dir="$1"
  local skill="$2"
  local src
  local dest

  src="$(skill_repo_path "$skill")"
  dest="$(skill_install_path "$state_dir" "$skill")"

  if [ ! -d "$src" ]; then
    log_err "Source not found: $src"
    return 1
  fi

  # Create parent directories (handles nova/openclaw-manager nesting)
  mkdir -p "$(dirname "$dest")"
  mkdir -p "$dest"

  # --- Symlink directories ---
  local item
  for item in $LINKABLE_DIRS; do
    local src_item="$src/$item"
    local dest_item="$dest/$item"

    [ -d "$src_item" ] || continue

    if [ -L "$dest_item" ]; then
      # Already a symlink -- check if it points to the right place
      local current_target
      current_target="$(readlink "$dest_item")"
      if [ "$current_target" = "$src_item" ]; then
        continue  # Already correct
      fi
      rm "$dest_item"
    elif [ -d "$dest_item" ]; then
      backup_item "$dest_item"
    elif [ -e "$dest_item" ]; then
      backup_item "$dest_item"
    fi

    ln -s "$src_item" "$dest_item"
    log_ok "$skill/$item -> repo"
  done

  # --- Symlink files ---
  for item in $LINKABLE_FILES; do
    local src_item="$src/$item"
    local dest_item="$dest/$item"

    [ -f "$src_item" ] || continue

    if [ -L "$dest_item" ]; then
      local current_target
      current_target="$(readlink "$dest_item")"
      if [ "$current_target" = "$src_item" ]; then
        continue
      fi
      rm "$dest_item"
    elif [ -f "$dest_item" ]; then
      backup_item "$dest_item"
    elif [ -e "$dest_item" ]; then
      backup_item "$dest_item"
    fi

    ln -s "$src_item" "$dest_item"
    log_ok "$skill/$item -> repo"
  done

  # --- .env.example -> .env (copy, never symlink, never overwrite) ---
  if [ -f "$src/.env.example" ]; then
    if [ -f "$dest/.env" ]; then
      log_warn "$skill/.env already exists, skipping .env.example copy"
    else
      cp "$src/.env.example" "$dest/.env"
      log_ok "$skill/.env created from .env.example"
    fi
  fi
}

# ---------------------------------------------------------------------------
# Core: unlink a single skill (revert symlinks to real copies)
# ---------------------------------------------------------------------------

unlink_skill() {
  local state_dir="$1"
  local skill="$2"
  local src
  local dest

  src="$(skill_repo_path "$skill")"
  dest="$(skill_install_path "$state_dir" "$skill")"

  if [ ! -d "$dest" ]; then
    log_warn "$skill not installed in $(profile_name "$state_dir"), skipping"
    return 0
  fi

  local item
  local unlinked_any=0

  # Unlink directories
  for item in $LINKABLE_DIRS; do
    local dest_item="$dest/$item"
    local src_item="$src/$item"

    [ -L "$dest_item" ] || continue

    local target
    target="$(readlink "$dest_item")"
    if [ "$target" = "$src_item" ]; then
      rm "$dest_item"
      if [ -d "$src_item" ]; then
        cp -R "$src_item" "$dest_item"
        log_ok "$skill/$item unlinked (copied back)"
        unlinked_any=1
      fi
    fi
  done

  # Unlink files
  for item in $LINKABLE_FILES; do
    local dest_item="$dest/$item"
    local src_item="$src/$item"

    [ -L "$dest_item" ] || continue

    local target
    target="$(readlink "$dest_item")"
    if [ "$target" = "$src_item" ]; then
      rm "$dest_item"
      if [ -f "$src_item" ]; then
        cp "$src_item" "$dest_item"
        log_ok "$skill/$item unlinked (copied back)"
        unlinked_any=1
      fi
    fi
  done

  if [ "$unlinked_any" -eq 0 ]; then
    log_warn "$skill in $(profile_name "$state_dir"): no symlinks to remove"
  fi
}

# ---------------------------------------------------------------------------
# Core: check status of a single skill in a state directory
# ---------------------------------------------------------------------------

# Returns one of: linked, partial, unlinked, missing, broken
check_skill_status() {
  local state_dir="$1"
  local skill="$2"
  local src
  local dest

  src="$(skill_repo_path "$skill")"
  dest="$(skill_install_path "$state_dir" "$skill")"

  if [ ! -d "$dest" ]; then
    printf "missing"
    return
  fi

  local total=0
  local linked=0
  local broken=0
  local real=0

  local item
  for item in $LINKABLE_DIRS $LINKABLE_FILES; do
    local src_item="$src/$item"

    # Only count items that exist in the repo source
    if [ -e "$src_item" ]; then
      total=$((total + 1))
      local dest_item="$dest/$item"

      if [ -L "$dest_item" ]; then
        local target
        target="$(readlink "$dest_item")"
        if [ "$target" = "$src_item" ] && [ -e "$dest_item" ]; then
          linked=$((linked + 1))
        else
          broken=$((broken + 1))
        fi
      elif [ -e "$dest_item" ]; then
        real=$((real + 1))
      fi
    fi
  done

  if [ "$total" -eq 0 ]; then
    printf "missing"
  elif [ "$broken" -gt 0 ]; then
    printf "broken"
  elif [ "$linked" -eq "$total" ]; then
    printf "linked"
  elif [ "$linked" -gt 0 ]; then
    printf "partial"
  elif [ "$real" -gt 0 ]; then
    printf "unlinked"
  else
    printf "missing"
  fi
}

# ---------------------------------------------------------------------------
# Ensure the veo -> veo-video-gen alias symlink exists
# ---------------------------------------------------------------------------

ensure_veo_alias() {
  local state_dir="$1"
  local skills_dir="$state_dir/skills"
  local alias_path="$skills_dir/veo"

  if [ -L "$alias_path" ]; then
    local target
    target="$(readlink "$alias_path")"
    if [ "$target" = "veo-video-gen" ]; then
      return 0
    fi
    rm "$alias_path"
  elif [ -e "$alias_path" ]; then
    backup_item "$alias_path"
  fi

  ln -s "veo-video-gen" "$alias_path"
  log_ok "veo -> veo-video-gen alias created"
}

# Remove veo alias (for --unlink)
remove_veo_alias() {
  local state_dir="$1"
  local alias_path="$state_dir/skills/veo"

  if [ -L "$alias_path" ]; then
    local target
    target="$(readlink "$alias_path")"
    if [ "$target" = "veo-video-gen" ]; then
      rm "$alias_path"
      log_ok "veo -> veo-video-gen alias removed"
    fi
  fi
}

# ---------------------------------------------------------------------------
# Mode: install skills to one state directory
# ---------------------------------------------------------------------------

do_install() {
  local state_dir="$1"
  shift
  local skills_to_install="$*"

  if [ ! -d "$state_dir" ]; then
    log_err "State directory does not exist: $state_dir"
    exit 1
  fi

  mkdir -p "$state_dir/skills"

  local pname
  pname="$(profile_name "$state_dir")"
  log_info "Installing to $pname ($state_dir)"
  printf "\n"

  local skill
  for skill in $skills_to_install; do
    install_skill "$state_dir" "$skill"
  done

  ensure_veo_alias "$state_dir"
  printf "\n"
  log_info "Done. $pname is now linked to repo source."
}

# ---------------------------------------------------------------------------
# Mode: --all-profiles
# ---------------------------------------------------------------------------

do_all_profiles() {
  local profiles
  profiles="$(discover_profiles)"

  if [ -z "$profiles" ]; then
    log_err "No openCLAW profiles found in $HOME"
    exit 1
  fi

  local profile
  printf "%s\n" "$profiles" | while IFS= read -r profile; do
    [ -z "$profile" ] && continue

    local ptype
    ptype="$(profile_type "$profile")"

    local skills
    skills="$(skills_for_profile "$ptype" "yes")"

    do_install "$profile" $skills
  done
}

# ---------------------------------------------------------------------------
# Mode: --status
# ---------------------------------------------------------------------------

do_status() {
  local profiles
  profiles="$(discover_profiles)"

  if [ -z "$profiles" ]; then
    log_err "No openCLAW profiles found in $HOME"
    exit 1
  fi

  # Header
  printf "\n"
  printf "%s%-28s %-14s %s%s\n" "$C_BOLD" "Skill" "Profile" "Status" "$C_RESET"
  printf "%-28s %-14s %s\n" "----------------------------" "--------------" "----------"

  local skill
  for skill in $ALL_SKILLS; do
    skill="$(printf "%s" "$skill" | xargs)"
    [ -z "$skill" ] && continue

    printf "%s\n" "$profiles" | while IFS= read -r profile; do
      [ -z "$profile" ] && continue

      local pname
      pname="$(profile_name "$profile")"
      local status
      status="$(check_skill_status "$profile" "$skill")"

      local color=""
      case "$status" in
        linked)   color="$C_GREEN" ;;
        partial)  color="$C_YELLOW" ;;
        unlinked) color="$C_YELLOW" ;;
        missing)  color="" ;;
        broken)   color="$C_RED" ;;
      esac

      printf "%-28s %-14s %s%s%s\n" "$skill" "$pname" "$color" "$status" "$C_RESET"
    done
  done

  # Also show veo alias status
  printf "\n"
  printf "%s%-28s %-14s %s%s\n" "$C_BOLD" "Alias" "Profile" "Status" "$C_RESET"
  printf "%-28s %-14s %s\n" "----------------------------" "--------------" "----------"

  printf "%s\n" "$profiles" | while IFS= read -r profile; do
    [ -z "$profile" ] && continue
    local pname
    pname="$(profile_name "$profile")"
    local alias_path="$profile/skills/veo"
    local status="missing"
    if [ -L "$alias_path" ]; then
      local target
      target="$(readlink "$alias_path")"
      if [ "$target" = "veo-video-gen" ]; then
        status="linked"
      else
        status="broken"
      fi
    elif [ -e "$alias_path" ]; then
      status="unlinked"
    fi
    local color=""
    case "$status" in
      linked) color="$C_GREEN" ;;
      broken) color="$C_RED" ;;
      *)      color="$C_YELLOW" ;;
    esac
    printf "%-28s %-14s %s%s%s\n" "veo -> veo-video-gen" "$pname" "$color" "$status" "$C_RESET"
  done

  printf "\n"
}

# ---------------------------------------------------------------------------
# Mode: --unlink
# ---------------------------------------------------------------------------

do_unlink() {
  local state_dir="$1"
  shift
  local skills_to_unlink="$*"

  if [ ! -d "$state_dir" ]; then
    log_err "State directory does not exist: $state_dir"
    exit 1
  fi

  local pname
  pname="$(profile_name "$state_dir")"
  log_info "Unlinking from $pname ($state_dir)"
  printf "\n"

  local skill
  for skill in $skills_to_unlink; do
    unlink_skill "$state_dir" "$skill"
  done

  remove_veo_alias "$state_dir"
  printf "\n"
  log_info "Done. $pname skills are now standalone copies."
}

do_unlink_all_profiles() {
  local profiles
  profiles="$(discover_profiles)"

  if [ -z "$profiles" ]; then
    log_err "No openCLAW profiles found in $HOME"
    exit 1
  fi

  local profile
  printf "%s\n" "$profiles" | while IFS= read -r profile; do
    [ -z "$profile" ] && continue
    local all_skills
    all_skills="$(skills_for_profile "vitahustle" "no")"
    do_unlink "$profile" $all_skills
  done
}

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------

usage() {
  printf "Usage: %s [OPTIONS]\n" "$(basename "$0")"
  printf "\n"
  printf "Symlink openCLAW skills from the cgk-platform repo into profile state dirs.\n"
  printf "\n"
  printf "Options:\n"
  printf "  --skill <name>        Install a single skill (e.g. video-editor)\n"
  printf "  --state-dir <path>    Target profile state dir (default: %s)\n" "$DEFAULT_STATE_DIR"
  printf "  --all-profiles        Auto-detect and install to all profiles\n"
  printf "  --status              Show link status for all skills and profiles\n"
  printf "  --unlink              Remove symlinks, copy back real files\n"
  printf "  -h, --help            Show this help\n"
  printf "\n"
  printf "Examples:\n"
  printf "  %s                                    # all skills -> ~/.openclaw\n" "$(basename "$0")"
  printf "  %s --skill video-editor               # one skill -> ~/.openclaw\n" "$(basename "$0")"
  printf "  %s --state-dir ~/.openclaw-rawdog      # all skills -> rawdog profile\n" "$(basename "$0")"
  printf "  %s --all-profiles                      # all skills -> all profiles\n" "$(basename "$0")"
  printf "  %s --status                            # check link status everywhere\n" "$(basename "$0")"
  printf "  %s --unlink                            # revert to standalone copies\n" "$(basename "$0")"
  printf "  %s --unlink --state-dir ~/.openclaw-rawdog\n" "$(basename "$0")"
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------

main() {
  local mode="install"
  local state_dir="$DEFAULT_STATE_DIR"
  local single_skill=""
  local use_all_profiles=0
  local state_dir_set=0

  while [ $# -gt 0 ]; do
    case "$1" in
      --skill)
        [ $# -ge 2 ] || { log_err "--skill requires an argument"; exit 1; }
        single_skill="$2"
        shift 2
        ;;
      --state-dir)
        [ $# -ge 2 ] || { log_err "--state-dir requires an argument"; exit 1; }
        state_dir="$2"
        state_dir_set=1
        shift 2
        ;;
      --all-profiles)
        use_all_profiles=1
        shift
        ;;
      --status)
        mode="status"
        shift
        ;;
      --unlink)
        mode="unlink"
        shift
        ;;
      -h|--help)
        usage
        exit 0
        ;;
      *)
        log_err "Unknown option: $1"
        usage
        exit 1
        ;;
    esac
  done

  # Validate conflicting options
  if [ "$use_all_profiles" -eq 1 ] && [ "$state_dir_set" -eq 1 ]; then
    log_err "--all-profiles and --state-dir are mutually exclusive"
    exit 1
  fi

  case "$mode" in
    status)
      do_status
      ;;
    unlink)
      if [ "$use_all_profiles" -eq 1 ]; then
        do_unlink_all_profiles
      else
        local skills
        if [ -n "$single_skill" ]; then
          skills="$single_skill"
        else
          skills="$(skills_for_profile "vitahustle" "no")"
        fi
        do_unlink "$state_dir" $skills
      fi
      ;;
    install)
      if [ "$use_all_profiles" -eq 1 ]; then
        do_all_profiles
      else
        local skills
        if [ -n "$single_skill" ]; then
          # Validate skill name
          local src
          src="$(skill_repo_path "$single_skill")"
          if [ ! -d "$src" ]; then
            log_err "Unknown skill: $single_skill"
            log_err "Source directory not found: $src"
            printf "\nAvailable skills:\n"
            local s
            for s in $ALL_SKILLS; do
              s="$(printf "%s" "$s" | xargs)"
              [ -z "$s" ] && continue
              printf "  %s\n" "$s"
            done
            exit 1
          fi
          skills="$single_skill"
        else
          local ptype
          ptype="$(profile_type "$state_dir")"
          # When targeting a specific --state-dir, install all skills
          # (no profile restrictions unless --all-profiles)
          skills="$(skills_for_profile "$ptype" "no")"
        fi
        do_install "$state_dir" $skills
      fi
      ;;
  esac
}

main "$@"
