# Publishing Guide

This guide covers publishing Workflow Agent packages to npm and the VS Code Marketplace.

## Prerequisites

1. **npm Account**: Create account at [npmjs.com](https://www.npmjs.com)
2. **npm Login**: Run `npm login` and authenticate
3. **VS Code Publisher**: Create publisher ID at [VS Code Marketplace](https://marketplace.visualstudio.com/manage)
4. **Access Token**: Generate Personal Access Token from [VS Code Marketplace](https://marketplace.visualstudio.com/manage)

## Pre-Publishing Checklist

- [ ] All tests pass: `pnpm test`
- [ ] Build succeeds: `pnpm build`
- [ ] Version numbers updated in all `package.json` files
- [ ] CHANGELOG.md updated with release notes
- [ ] README.md is accurate and up-to-date
- [ ] LICENSE file exists
- [ ] Git repository is clean (no uncommitted changes)
- [ ] Created git tag: `git tag v1.0.0`

## Publishing to npm

### Option 1: Publish All Packages

```bash
# Build all packages
pnpm build

# Run tests
pnpm test

# Publish everything
pnpm publish:all
```

### Option 2: Publish Individual Packages

```bash
# Core package
pnpm publish:core

# Improvement tracker
pnpm publish:tracker

# All preset packages
pnpm publish:presets
```

### Option 3: Manual Publishing

```bash
# Navigate to package directory
cd packages/core

# Publish with access public (for scoped packages)
npm publish --access public
```

## Publishing VS Code Extension

### Step 1: Package Extension

```bash
# Create .vsix file
pnpm pack:vscode

# This creates workflow-agent-1.0.0.vsix in packages/vscode-extension/
```

### Step 2: Test Locally

```bash
# Install in VS Code
code --install-extension packages/vscode-extension/workflow-agent-1.0.0.vsix

# Test all features
# - Open command palette (Ctrl+Shift+P)
# - Try: "Workflow: Initialize Project"
# - Try: "Workflow: Validate Branch" (Ctrl+Shift+W)
# - Try: "Workflow: Show Configuration"
```

### Step 3: Publish to Marketplace

```bash
# Login to VS Code Marketplace
cd packages/vscode-extension
vsce login <publisher-name>

# Publish extension
vsce publish

# Or publish specific version
vsce publish 1.0.0
```

## Post-Publishing

### 1. Create GitHub Release

```bash
# Tag the release
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0

# Create release on GitHub
# Go to: https://github.com/workflow-agent/workflow-agent/releases/new
# - Tag: v1.0.0
# - Title: Workflow Agent v1.0.0
# - Description: Copy from CHANGELOG.md
# - Attach: workflow-agent-1.0.0.vsix
```

### 2. Verify Published Packages

```bash
# Check npm
npm view @workflow/agent
npm view @workflow/improvement-tracker
npm view @workflow/scopes-saas

# Install and test
npm install -g @workflow/agent
workflow --version
workflow init --help
```

### 3. Update Documentation

- [ ] Update docs site with new version
- [ ] Update README badges with version
- [ ] Tweet/announce release
- [ ] Update project status

## Version Management

### Semantic Versioning

- **Major (1.0.0)**: Breaking changes
- **Minor (1.1.0)**: New features, backwards compatible
- **Patch (1.0.1)**: Bug fixes

### Updating Versions

```bash
# Update version in all packages
# Edit each packages/*/package.json

# Or use changesets
pnpm changeset
pnpm version-packages
```

## Rollback

If you need to unpublish or rollback:

```bash
# Unpublish specific version (within 72 hours)
npm unpublish @workflow/agent@1.0.0

# Deprecate version (preferred over unpublish)
npm deprecate @workflow/agent@1.0.0 "Please upgrade to 1.0.1"
```

## Troubleshooting

### "You do not have permission to publish"

- Ensure you're logged in: `npm whoami`
- Check organization membership
- Use `--access public` for scoped packages

### "Version already exists"

- Increment version number
- Cannot republish same version

### VS Code Extension Fails

- Check `engines.vscode` in package.json
- Ensure all dependencies are listed
- Test .vsix file locally first
- Verify publisher ID matches

## CI/CD Publishing

For automated publishing with GitHub Actions:

```yaml
name: Publish

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      
      - run: pnpm install
      - run: pnpm build
      - run: pnpm test
      - run: pnpm publish:all
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## Support

- **Issues**: https://github.com/workflow-agent/workflow-agent/issues
- **Discussions**: https://github.com/workflow-agent/workflow-agent/discussions
- **Docs**: https://workflow-agent.dev
