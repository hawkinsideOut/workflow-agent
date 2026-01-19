#!/bin/bash
# Validate workspace package versions match lockfile versions
# Run after publishing to ensure lockfile is in sync

set -e

echo "🔍 Validating workspace versions vs lockfile..."

# Get workspace package names and versions
WORKSPACE_PKGS=$(pnpm list -r --depth -1 --json | node -e "
  const data = JSON.parse(require('fs').readFileSync(0, 'utf-8'));
  data.forEach(pkg => {
    if (pkg.name && pkg.version) {
      console.log(pkg.name + '|' + pkg.version);
    }
  });
")

# Check each package against lockfile
MISMATCHES=()

for PKG_INFO in $WORKSPACE_PKGS; do
  PKG_NAME=$(echo "$PKG_INFO" | cut -d'|' -f1)
  WORKSPACE_VERSION=$(echo "$PKG_INFO" | cut -d'|' -f2)
  
  # Get version from lockfile
  LOCKFILE_VERSION=$(grep -A 1 "\"$PKG_NAME\":" pnpm-lock.yaml | grep "version:" | head -1 | sed 's/.*version: //' | tr -d "'")
  
  if [ -n "$LOCKFILE_VERSION" ] && [ "$WORKSPACE_VERSION" != "$LOCKFILE_VERSION" ]; then
    echo "❌ Version mismatch for $PKG_NAME:"
    echo "   Workspace: $WORKSPACE_VERSION"
    echo "   Lockfile:  $LOCKFILE_VERSION"
    MISMATCHES+=("$PKG_NAME")
  else
    echo "✅ $PKG_NAME: $WORKSPACE_VERSION"
  fi
done

if [ ${#MISMATCHES[@]} -gt 0 ]; then
  echo ""
  echo "⚠️  Found ${#MISMATCHES[@]} version mismatch(es)!"
  echo ""
  echo "Running pnpm install to sync lockfile..."
  pnpm install
  
  echo ""
  echo "✅ Lockfile updated. Please commit the changes:"
  echo "   git add pnpm-lock.yaml"
  echo "   git commit -m \"chore: sync lockfile after publish\""
  exit 1
else
  echo ""
  echo "✅ All workspace versions match lockfile"
fi
