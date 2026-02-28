#!/bin/bash
#
# Migration Validator
#
# Validates SQL migration files for common issues:
# - Missing IF NOT EXISTS on CREATE statements
# - ID type compatibility on foreign keys (UUID vs TEXT)
# - Missing public. prefix for functions in tenant schemas
# - Missing public. prefix for vector types in tenant schemas
#
# Usage:
#   ./scripts/validate-migration.sh [migration_file.sql]
#   ./scripts/validate-migration.sh packages/db/src/migrations/tenant/
#
# Exit codes:
#   0 - No violations found
#   1 - Violations found

set -eo pipefail

# Colors
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
total_files=0
files_with_violations=0
total_violations=0

# Violation storage
declare -a violations

# Check if a migration is in tenant schema
is_tenant_migration() {
  local file="$1"
  [[ "$file" == *"/tenant/"* ]]
}

# Rule 1: Check IF NOT EXISTS on CREATE statements
check_if_not_exists() {
  local file="$1"
  local content=$(cat "$file")
  local line_num=0

  while IFS= read -r line; do
    ((line_num++))

    # Check CREATE TABLE without IF NOT EXISTS
    if echo "$line" | grep -qi "CREATE TABLE" && ! echo "$line" | grep -qi "IF NOT EXISTS"; then
      violations+=("$file:$line_num:critical:missing-if-not-exists:CREATE TABLE without IF NOT EXISTS:$line")
      ((total_violations++))
    fi

    # Check CREATE INDEX without IF NOT EXISTS
    if echo "$line" | grep -qi "CREATE INDEX" && ! echo "$line" | grep -qi "IF NOT EXISTS"; then
      violations+=("$file:$line_num:critical:missing-if-not-exists:CREATE INDEX without IF NOT EXISTS:$line")
      ((total_violations++))
    fi

    # Check DROP TRIGGER without IF EXISTS
    if echo "$line" | grep -qi "DROP TRIGGER" && ! echo "$line" | grep -qi "IF EXISTS"; then
      violations+=("$file:$line_num:critical:missing-if-exists:DROP TRIGGER without IF EXISTS:$line")
      ((total_violations++))
    fi
  done < "$file"
}

# Rule 2: Check ID type compatibility on foreign keys
check_fk_type_mismatch() {
  local file="$1"
  local line_num=0

  while IFS= read -r line; do
    ((line_num++))

    # Check for REFERENCES public.users(id) with wrong type
    if echo "$line" | grep -qi "REFERENCES public.users(id)"; then
      # Check if the column is TEXT instead of UUID
      if echo "$line" | grep -qE "\s+TEXT\s+.*REFERENCES public.users"; then
        violations+=("$file:$line_num:critical:type-mismatch:TEXT column referencing public.users(id) - should be UUID:$line")
        ((total_violations++))
      fi
    fi

    # Check for REFERENCES public.organizations(id) with wrong type
    if echo "$line" | grep -qi "REFERENCES public.organizations(id)"; then
      if echo "$line" | grep -qE "\s+TEXT\s+.*REFERENCES public.organizations"; then
        violations+=("$file:$line_num:critical:type-mismatch:TEXT column referencing public.organizations(id) - should be UUID:$line")
        ((total_violations++))
      fi
    fi
  done < "$file"
}

# Rule 3: Check public. prefix for functions in tenant schemas
check_function_prefix() {
  local file="$1"
  local line_num=0

  # Only check tenant migrations
  if ! is_tenant_migration "$file"; then
    return
  fi

  while IFS= read -r line; do
    ((line_num++))

    # Check EXECUTE FUNCTION without public. prefix
    if echo "$line" | grep -qi "EXECUTE FUNCTION" && ! echo "$line" | grep -qi "EXECUTE FUNCTION public\."; then
      # Common functions that should have public. prefix
      if echo "$line" | grep -qiE "update_updated_at_column|gen_random_uuid"; then
        violations+=("$file:$line_num:critical:missing-public-prefix:EXECUTE FUNCTION missing public. prefix:$line")
        ((total_violations++))
      fi
    fi
  done < "$file"
}

# Rule 4: Check public. prefix for vector types in tenant schemas
check_vector_prefix() {
  local file="$1"
  local line_num=0

  # Only check tenant migrations
  if ! is_tenant_migration "$file"; then
    return
  fi

  while IFS= read -r line; do
    ((line_num++))

    # Check for vector type without public. prefix
    if echo "$line" | grep -qiE "\svector\(|vector_cosine_ops" && ! echo "$line" | grep -qi "public\.vector"; then
      violations+=("$file:$line_num:critical:missing-public-prefix:vector type missing public. prefix:$line")
      ((total_violations++))
    fi
  done < "$file"
}

# Validate a single migration file
validate_migration() {
  local file="$1"

  ((total_files++))

  local violations_before=$total_violations

  check_if_not_exists "$file"
  check_fk_type_mismatch "$file"
  check_function_prefix "$file"
  check_vector_prefix "$file"

  if [ $total_violations -gt $violations_before ]; then
    ((files_with_violations++))
  fi
}

# Print violations grouped by rule
print_violations() {
  if [ ${#violations[@]} -eq 0 ]; then
    return
  fi

  echo -e "\n${RED}❌ Migration Violations Found:${NC}\n"

  # Group by rule
  declare -A by_rule

  for violation in "${violations[@]}"; do
    IFS=':' read -r file line severity rule message snippet <<< "$violation"
    rule_key="$rule"
    by_rule[$rule_key]="${by_rule[$rule_key]}$violation"$'\n'
  done

  # Print each rule group
  for rule in "${!by_rule[@]}"; do
    local count=$(echo -n "${by_rule[$rule]}" | grep -c '^')
    local icon="⚠️"
    local title="$rule"

    case "$rule" in
      missing-if-not-exists)
        icon="📝"
        title="Missing IF NOT EXISTS / IF EXISTS"
        ;;
      type-mismatch)
        icon="🔤"
        title="Foreign Key Type Mismatch"
        ;;
      missing-public-prefix)
        icon="🔧"
        title="Missing public. Prefix"
        ;;
    esac

    echo -e "\n  ${icon} ${YELLOW}${title}${NC} (${count})"

    # Print first 5 violations for this rule
    local printed=0
    while IFS= read -r violation; do
      [ -z "$violation" ] && continue
      ((printed++))
      [ $printed -gt 5 ] && break

      IFS=':' read -r file line severity rule message snippet <<< "$violation"
      local relative_file=$(echo "$file" | sed "s|$(pwd)/||")
      echo -e "    ${relative_file}:${line}"
      echo -e "      ${message}"
      echo -e "      ${snippet}"
      echo ""
    done <<< "${by_rule[$rule]}"

    if [ $count -gt 5 ]; then
      echo -e "    ... and $((count - 5)) more\n"
    fi
  done

  echo -e "\n${BLUE}📝 Remediation:${NC}"
  echo "  1. Add IF NOT EXISTS to CREATE TABLE and CREATE INDEX statements"
  echo "  2. Add IF EXISTS to DROP TRIGGER statements"
  echo "  3. Match foreign key types (UUID for public.users, public.organizations)"
  echo "  4. Use public.update_updated_at_column() in tenant schemas"
  echo "  5. Use public.vector(1536) for pgvector types in tenant schemas"
  echo ""
}

# Main execution
main() {
  local target="${1:-.}"

  echo "🔍 Scanning SQL migrations for violations..."
  echo ""

  if [ -f "$target" ]; then
    # Single file
    validate_migration "$target"
  elif [ -d "$target" ]; then
    # Directory - find all .sql files
    while IFS= read -r file; do
      validate_migration "$file"
    done < <(find "$target" -name "*.sql" -type f)
  else
    echo -e "${RED}Error: $target is not a file or directory${NC}"
    exit 1
  fi

  # Print summary
  echo -e "\n${BLUE}📊 Scan Results:${NC}"
  echo "   Files scanned: $total_files"
  echo "   Files with violations: $files_with_violations"
  echo "   Total violations: $total_violations"

  # Print violations
  print_violations

  # Exit with appropriate code
  if [ $total_violations -gt 0 ]; then
    exit 1
  else
    echo -e "\n${GREEN}✅ No migration violations found!${NC}\n"
    exit 0
  fi
}

# Run main with all arguments
main "$@"
