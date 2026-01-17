#!/bin/bash
# Pre-commit validation script - ALL checks must pass before commit
# This script is part of the workflow-agent "one-and-done" service commitment
# ZERO EXCEPTIONS - All checks must pass
#
# Uses the verify:fix command which implements fix-and-revalidate pattern:
# - Run check → If fails, fix → Re-run ALL checks from start
# - This ensures fixes don't introduce new issues in earlier checks

set -e  # Exit on first error

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🔍 Running mandatory pre-commit checks..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if workflow-agent CLI is available
if command -v workflow-agent &> /dev/null; then
    # Use the verify:fix command with fix-and-revalidate pattern
    echo -e "${BLUE}🔄 Using workflow-agent verify with auto-fix...${NC}"
    echo ""
    pnpm verify:fix
    exit $?
fi

# Fallback: Run checks sequentially if CLI not available
echo -e "${YELLOW}⚠️  workflow-agent CLI not found, using legacy checks...${NC}"
echo ""

# Track overall success
CHECKS_PASSED=true

# Step 1: Type checking
echo -e "${BLUE}📘 Step 1/5: Type checking...${NC}"
if pnpm typecheck; then
    echo -e "${GREEN}✅ Type check passed${NC}"
    echo ""
else
    echo -e "${RED}❌ Type check failed${NC}"
    echo -e "${YELLOW}Fix all TypeScript errors and run this script again.${NC}"
    echo ""
    CHECKS_PASSED=false
fi

# Step 2: Linting
echo -e "${BLUE}🔍 Step 2/5: Linting...${NC}"
if pnpm lint; then
    echo -e "${GREEN}✅ Lint check passed${NC}"
    echo ""
else
    echo -e "${RED}❌ Lint check failed${NC}"
    echo -e "${YELLOW}Fix all ESLint errors and run this script again.${NC}"
    echo ""
    CHECKS_PASSED=false
fi

# Step 3: Formatting
echo -e "${BLUE}✨ Step 3/5: Formatting...${NC}"
if pnpm format; then
    echo -e "${GREEN}✅ Format check passed${NC}"
    echo ""
else
    echo -e "${RED}❌ Format check failed${NC}"
    echo -e "${YELLOW}Format errors found. Run 'pnpm format' to fix.${NC}"
    echo ""
    CHECKS_PASSED=false
fi

# Step 4: Unit tests
echo -e "${BLUE}🧪 Step 4/5: Unit tests...${NC}"
if pnpm test; then
    echo -e "${GREEN}✅ All tests passed${NC}"
    echo ""
else
    echo -e "${RED}❌ Tests failed${NC}"
    echo -e "${YELLOW}Fix failing tests and run this script again.${NC}"
    echo ""
    CHECKS_PASSED=false
fi

# Step 5: Build verification
echo -e "${BLUE}🏗️  Step 5/5: Build verification...${NC}"
if pnpm build; then
    echo -e "${GREEN}✅ Build successful${NC}"
    echo ""
else
    echo -e "${RED}❌ Build failed${NC}"
    echo -e "${YELLOW}Fix build errors and run this script again.${NC}"
    echo ""
    CHECKS_PASSED=false
fi

# Final summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$CHECKS_PASSED" = true ]; then
    echo -e "${GREEN}✅ ALL PRE-COMMIT CHECKS PASSED!${NC}"
    echo ""
    echo "You are now ready to commit and push your changes."
    echo ""
    echo "Next steps:"
    echo "  1. git add ."
    echo "  2. git commit -m \"<type>(<scope>): <description>\""
    echo "  3. git push origin <branch-name>"
    echo ""
    exit 0
else
    echo -e "${RED}❌ ONE OR MORE CHECKS FAILED${NC}"
    echo ""
    echo "Please fix the errors above and run this script again."
    echo "⚠️  Do NOT commit until all checks pass."
    echo ""
    echo "🔒 ZERO EXCEPTIONS POLICY: No code may be committed"
    echo "   that fails any of these checks."
    echo ""
    exit 1
fi
