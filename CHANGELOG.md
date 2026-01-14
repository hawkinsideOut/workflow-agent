# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-14

### Added

#### Core Package (@workflow/agent)
- **CLI Commands**: `init`, `validate`, `suggest`, `doctor`
- **Non-Interactive Mode**: Support for `--preset`, `--name`, `--yes` flags
- **Validation Engine**: Branch names and commit messages validation
- **Template System**: Mustache-based guideline generation
- **Configuration System**: Cosmiconfig-based workflow.config.json support
- **Did-You-Mean Suggestions**: Helpful suggestions for typos in scopes

#### Preset Packages
- **@workflow/scopes-saas**: 10 scopes for SaaS applications
- **@workflow/scopes-library**: 8 scopes for npm packages
- **@workflow/scopes-api**: 10 scopes for API services
- **@workflow/scopes-ecommerce**: 10 scopes for e-commerce platforms
- **@workflow/scopes-cms**: 10 scopes for content management systems

#### Framework Adapters
- **Next.js Adapter**: Detects App Router, Pages Router, Turbopack
- **Vite Adapter**: Detects React, Vue, Svelte configurations
- **Remix Adapter**: Detects routes and configuration
- **Astro Adapter**: Detects integrations and content collections
- **SvelteKit Adapter**: Detects routes and configuration

#### Improvement Tracker (@workflow/improvement-tracker)
- **Suggestion System**: Community-driven improvement suggestions
- **Trust Score System**: Weighted contributions (PRs: +10, Reviews: +5)
- **Moderation System**: Spam filtering, rate limiting (5/day), content validation
- **Storage System**: File-based JSON storage in `.workflow/improvements/`

#### VS Code Extension (workflow-agent)
- **Real-Time Validation**: Commit messages and branch names
- **Status Bar Integration**: Shows current branch and enforcement mode
- **Command Palette Commands**: 5 commands (init, validate, suggest, doctor, showConfig)
- **Configuration Webview**: Beautiful UI for viewing workflow settings
- **IntelliSense**: Scope autocomplete in commit messages

#### Documentation
- **Documentation Site**: Next.js + MDX site with 3 pages
- **Comprehensive README**: 366 lines covering all features
- **Getting Started Guide**: Quick start for new users
- **Presets Documentation**: Detailed preset scope listings
- **Configuration Reference**: Complete config options

### Technical Details

- **Build System**: tsup 8.5.1 for fast builds
- **Testing**: Vitest 1.6.1 with 14 tests (71% pass rate)
- **Monorepo**: pnpm workspaces with 8 packages
- **TypeScript**: Strict mode with full type safety
- **CLI Framework**: Commander.js for robust CLI
- **Validation**: Zod schemas for configuration
- **Module Support**: ES Modules (core) + CommonJS (VS Code extension)

### Tested

- ✅ CLI initialization with all presets
- ✅ Branch validation with valid/invalid scopes
- ✅ Commit message validation
- ✅ Doctor command health checks
- ✅ Suggestion submission
- ✅ Template generation (11 guideline files)

## [Unreleased]

### Planned

- GitHub App for automated PR checks
- JetBrains plugin for IntelliJ-based IDEs
- CI/CD integrations (GitHub Actions, GitLab CI)
- Web dashboard for team analytics
- Migration tools from other systems
- Multi-language support expansion

---

[1.0.0]: https://github.com/workflow-agent/workflow-agent/releases/tag/v1.0.0
