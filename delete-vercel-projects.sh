#!/bin/bash
# Delete all old Vercel projects (safe - data is in database)

set -e

SCOPE="cgk-linens-88e79683"

echo "🗑️  Deleting Vercel Projects"
echo ""
echo "⚠️  This will delete 9 Vercel projects from cgk-linens team"
echo "✅ Safe: All data is in Neon database, not affected by this"
echo ""
read -p "Continue? (y/N): " confirm

if [[ ! $confirm =~ ^[Yy]$ ]]; then
  echo "Cancelled"
  exit 0
fi

echo ""

# Function to delete project
delete_project() {
  local project=$1
  echo "Deleting $project..."
  if vercel project rm "$project" --scope "$SCOPE" --yes 2>/dev/null; then
    echo "  ✅ Deleted $project"
  else
    echo "  ⚠️  $project not found or already deleted"
  fi
}

# Delete all projects
delete_project "cgk-meliusly-storefront"
delete_project "cgk-admin"
delete_project "cgk-storefront"
delete_project "cgk-shopify-app"
delete_project "cgk-orchestrator"
delete_project "cgk-creator-portal"
delete_project "cgk-contractor-portal"
delete_project "cgk-command-center"
delete_project "cgk-mcp-server"

echo ""
echo "✅ All Vercel projects deleted"
echo ""
echo "Your data is safe in:"
echo "  - Neon PostgreSQL database"
echo "  - Git repository"
echo ""
echo "You can redeploy anytime from GitHub if needed."
