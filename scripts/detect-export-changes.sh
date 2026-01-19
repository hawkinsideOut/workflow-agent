#!/bin/bash
# Auto-detect export changes and bump version following semver + conventional commits
# - New exports = minor bump
# - Removed exports = major bump
# - No export changes = no bump

set -e

PACKAGE_DIR="$1"

if [ -z "$PACKAGE_DIR" ]; then
  echo "Usage: $0 <package-dir>"
  exit 1
fi

cd "$PACKAGE_DIR"

PACKAGE_NAME=$(node -p "require('./package.json').name")
INDEX_FILE="src/index.ts"

if [ ! -f "$INDEX_FILE" ]; then
  echo "No $INDEX_FILE found in $PACKAGE_DIR, skipping export detection"
  exit 0
fi

# Check if index.ts has uncommitted changes
if ! git diff --quiet HEAD -- "$INDEX_FILE" 2>/dev/null; then
  echo "🔍 Detecting export changes in $PACKAGE_NAME..."
  
  # Get old exports
  OLD_EXPORTS=$(git show HEAD:"$INDEX_FILE" 2>/dev/null | grep -oP 'export\s+{\s*\K[^}]+' | tr ',' '\n' | sed 's/^\s*//;s/\s*$//' | grep -v '^type ' | sort || echo "")
  
  # Get new exports
  NEW_EXPORTS=$(cat "$INDEX_FILE" | grep -oP 'export\s+{\s*\K[^}]+' | tr ',' '\n' | sed 's/^\s*//;s/\s*$//' | grep -v '^type ' | sort)
  
  # Find added exports
  ADDED=$(comm -13 <(echo "$OLD_EXPORTS") <(echo "$NEW_EXPORTS") | wc -l)
  
  # Find removed exports
  REMOVED=$(comm -23 <(echo "$OLD_EXPORTS") <(echo "$NEW_EXPORTS") | wc -l)
  
  if [ "$REMOVED" -gt 0 ]; then
    echo "❗ $REMOVED export(s) removed - bumping MAJOR version"
    REMOVED_LIST=$(comm -23 <(echo "$OLD_EXPORTS") <(echo "$NEW_EXPORTS"))
    echo "  Removed exports:"
    echo "$REMOVED_LIST" | sed 's/^/    - /'
    
    CURRENT_VERSION=$(node -p "require('./package.json').version")
    npm version major --no-git-tag-version
    NEW_VERSION=$(node -p "require('./package.json').version")
    
    git add package.json
    echo "✅ Version bumped: $CURRENT_VERSION → $NEW_VERSION"
    echo ""
    echo "📝 Commit message suggestion:"
    echo "chore($PACKAGE_NAME): bump to v$NEW_VERSION for breaking changes"
    echo ""
    echo "BREAKING CHANGE: Removed exports:"
    echo "$REMOVED_LIST" | sed 's/^/- /'
    
  elif [ "$ADDED" -gt 0 ]; then
    echo "✨ $ADDED export(s) added - bumping MINOR version"
    ADDED_LIST=$(comm -13 <(echo "$OLD_EXPORTS") <(echo "$NEW_EXPORTS"))
    echo "  New exports:"
    echo "$ADDED_LIST" | sed 's/^/    - /'
    
    CURRENT_VERSION=$(node -p "require('./package.json').version")
    npm version minor --no-git-tag-version
    NEW_VERSION=$(node -p "require('./package.json').version")
    
    git add package.json
    echo "✅ Version bumped: $CURRENT_VERSION → $NEW_VERSION"
    echo ""
    echo "📝 Commit message suggestion:"
    echo "feat($PACKAGE_NAME): bump to v$NEW_VERSION for new exports"
    echo ""
    echo "New exports:"
    echo "$ADDED_LIST" | sed 's/^/- /'
  else
    echo "✓ No export changes detected in $PACKAGE_NAME"
  fi
else
  echo "✓ No changes to $INDEX_FILE in $PACKAGE_NAME"
fi
