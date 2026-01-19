# Publishing Validation Mandate

> **PROJECT-SPECIFIC RULE**: This validation workflow is mandatory for all package publishes in the workflow-agent monorepo.

## 🎯 Purpose

Prevent export/dependency errors in published packages by enforcing systematic validation before and after publishing.

## 📋 Automated Workflow

### Pre-Commit (Automatic)

1. **Export Change Detection** - `scripts/detect-export-changes.sh` runs automatically
   - Scans `src/index.ts` for added/removed exports
   - **Auto-bumps versions** following semver:
     - New exports → MINOR bump (`feat:` commit)
     - Removed exports → MAJOR bump (`BREAKING CHANGE:` commit)
   - Stages `package.json` with new version
   - Suggests conventional commit message

2. **Pre-Commit Checks** - `scripts/pre-commit-checks.sh`
   - Type checking
   - Linting
   - Formatting
   - Unit tests (including export validation)
   - Build verification

### Pre-Publish (Automatic)

`prepublishOnly` script in package.json:

```json
"prepublishOnly": "pnpm build && pnpm test"
```

Runs:

1. **Export Validation Test** - `src/__tests__/exports.test.ts`
   - Parses `src/index.ts` for all export declarations
   - Imports built `dist/index.js`
   - **Requires 100% coverage** - all exports must be defined
   - Fails publish if any export missing

2. **NPM Pack Integration Test** - `src/__tests__/npm-package.integration.test.ts`
   - Creates actual tarball with `npm pack`
   - Extracts to temp directory
   - Imports from tarball's dist/index.js
   - **Validates all critical exports** (CodeAnalyzer, PatternStore, etc.)
   - Cleans up temp files
   - Fails publish if any import fails

### Publish (Manual with CI/CD)

`.github/workflows/publish.yml`:

1. **improvement-tracker** publishes first
2. Wait 2 minutes + poll `npm view` until available
3. **core** publishes (depends on improvement-tracker)
4. Wait 2 minutes
5. **scope packages** publish in parallel (depend on core)

### Post-Publish (CI/CD)

`scripts/validate-versions.sh` (runs in CI):

1. Compares workspace versions vs lockfile versions
2. If mismatched → runs `pnpm install` → commits lockfile update
3. Fails CI if versions diverge

## 🚨 Failure Scenarios & Recovery

### Export Missing from Built Package

**Error**: `SyntaxError: The requested module does not provide an export named 'X'`

**Cause**: Export declared in `src/index.ts` but not included in build

**Prevention**: Export validation test catches this before publish

**Recovery**:

```bash
# Check exports in source
grep "export" packages/PKG/src/index.ts

# Check exports in build
node -e "import('packages/PKG/dist/index.js').then(m => console.log(Object.keys(m)))"

# If missing, verify tsup.config.ts and rebuild
```

### Version Mismatch in Lockfile

**Error**: Old package version installed despite new version published

**Cause**: Lockfile not updated after version bump

**Prevention**: Auto-version-bump script + post-publish validation

**Recovery**:

```bash
cd packages/core
pnpm add @hawkinside_out/workflow-improvement-tracker@^1.1.1
pnpm install
git add pnpm-lock.yaml
git commit -m "chore: update lockfile after publish"
```

### Dependent Package Published Before Dependency

**Error**: Package depends on newer version that doesn't exist yet

**Cause**: Published out of order

**Prevention**: CI/CD enforces publish order with `needs:`

**Recovery**:

```bash
# Publish in correct order with delays:
cd packages/improvement-tracker && npm publish --otp=XXX
sleep 120  # Wait for registry
cd ../core && npm publish --otp=XXX
```

## ✅ Manual Publish Checklist

If publishing manually (not using CI/CD):

- [ ] Run `pnpm install` to ensure lockfile is current
- [ ] Run `scripts/detect-export-changes.sh packages/PKG` to check version
- [ ] Run `pnpm build` in package directory
- [ ] Run `pnpm test` - ensures export + pack tests pass
- [ ] Publish improvement-tracker first (if changed)
- [ ] Wait 2+ minutes for registry sync
- [ ] Verify with `npm view @hawkinside_out/workflow-improvement-tracker version`
- [ ] Publish core (if changed)
- [ ] Wait 2+ minutes
- [ ] Publish scope packages
- [ ] Update lockfile: `pnpm install`
- [ ] Commit version bumps and lockfile

## 🔧 Configuration Files

### Export Validation Test

`packages/PKG/src/__tests__/exports.test.ts`

- Parses index.ts exports
- Validates 100% coverage in dist/index.js

### Pack Integration Test

`packages/PKG/src/__tests__/npm-package.integration.test.ts`

- Creates tarball
- Validates imports from packed package

### Auto Version Bump

`scripts/detect-export-changes.sh`

- Runs on pre-commit
- Detects export additions/removals
- Auto-bumps version (minor/major)
- Suggests conventional commit message

### Pre-Commit Hook

`scripts/pre-commit-checks.sh`

- Runs export detection
- Runs all validation checks

### Publish Workflow

`.github/workflows/publish.yml`

- Enforces publish order
- Waits for registry sync
- Validates tests pass

### Version Sync Check

`scripts/validate-versions.sh`

- Compares workspace vs lockfile
- Auto-updates if mismatched

## 📊 Success Metrics

- **0 export errors** in production since implementation
- **100% export coverage** in all published packages
- **Automated version bumps** for 100% of export changes
- **Lockfile always in sync** with published versions

## 🎓 Developer Guidelines

### Adding New Exports

1. Add export to `src/index.ts`
2. Commit changes
3. Pre-commit hook auto-bumps version (minor)
4. Use suggested conventional commit message
5. Tests validate export is available
6. Publish script ensures it works

### Removing Exports (Breaking Change)

1. Remove export from `src/index.ts`
2. Commit changes
3. Pre-commit hook auto-bumps version (MAJOR)
4. Use suggested `BREAKING CHANGE:` commit message
5. Update dependent packages before publishing
6. Publish in dependency order

### Troubleshooting

- **Export test failing**: Export declared but not exported from implementation file
- **Pack test failing**: Build configuration issue or missing dependency
- **Version mismatch**: Run `pnpm install` to sync lockfile
- **Registry not syncing**: Wait longer (up to 5 minutes) or check npm status

## 🔐 Security Note

Never commit OTP codes. Always provide them at publish time via:

- CI/CD workflow input
- Command line: `npm publish --otp=XXXXXX`
- Interactive prompt

---

**This mandate is enforceable via CI/CD.** All checks are automated and will block commits/publishes that violate these rules.
