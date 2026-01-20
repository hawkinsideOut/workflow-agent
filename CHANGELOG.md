# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.8.0] - 2026-01-19

### Added

- **Auto-Install Mandatory Templates**: When the package is installed, mandatory guideline templates are automatically copied to the project's `guidelines/` directory
  - Only installs if `guidelines/` directory doesn't exist (preserves user customizations)
  - Auto-detects project name from `package.json`
  - Uses sensible defaults for template variables when no `workflow.config.json` exists
  - Mandatory templates: AGENT_EDITING_INSTRUCTIONS, BRANCHING_STRATEGY, TESTING_STRATEGY, SELF_IMPROVEMENT_MANDATE, PATTERN_ANALYSIS_WORKFLOW, SINGLE_SOURCE_OF_TRUTH
- **New CLI Command**: `workflow update-templates` for opt-in template updates
  - `--force` flag to overwrite existing template files
  - `--skip` flag to skip updates (useful in CI)
  - Shows list of mandatory vs optional templates
  - Regenerates `.github/copilot-instructions.md` after update
- **New npm Scripts**: Added 2 new scripts (now 34 total)
  - `workflow:update-templates` - Update templates interactively
  - `workflow:update-templates:force` - Force update all templates

### Changed

- **Postinstall Script**: Now installs mandatory templates when `guidelines/` doesn't exist
- **Setup Command**: Now installs mandatory templates for pnpm users when `guidelines/` doesn't exist

## [2.7.0] - 2026-01-19

### Added

- **AI Agent Instructions Generation**: Automatically generate `.github/copilot-instructions.md` from your project's `guidelines/` directory
  - Serves as Single Source of Truth for AI agents (GitHub Copilot, Claude, etc.)
  - Extracts key rules and summaries from each guideline document
  - Includes project scopes and conventions from `workflow.config.json`
  - Links to full guideline documents for detailed reference
  - Preserves custom user content between `<!-- CUSTOM START -->` and `<!-- CUSTOM END -->` markers
  - Regenerates on package install/update to capture new guidelines
- **New CLI Command**: `workflow generate-instructions` for manual regeneration
  - `--force` flag to regenerate without confirmation
- **New npm Script**: `workflow:generate-instructions` added to project on install (now 32 scripts total)

### Changed

- **Init Command**: Now generates `.github/copilot-instructions.md` after creating guidelines
- **Setup Command**: Now generates copilot instructions for pnpm users
- **Postinstall Script**: Now generates copilot instructions if guidelines directory exists

## [2.6.0] - 2026-01-19

### Added

- **Automatic Script Injection**: On package install or update, **31 workflow scripts** are automatically added to your project's `package.json`:
  - Core Commands: `workflow:init`, `workflow:validate`, `workflow:config`, `workflow:suggest`, `workflow:setup`, `workflow:doctor`
  - Scope Commands: `workflow:scope:create`, `workflow:scope:migrate`
  - Verification: `workflow:verify`, `workflow:verify:fix`, `workflow:auto-setup`
  - Learning System: `workflow:learn`, `workflow:learn:record`, `workflow:learn:list`, `workflow:learn:apply`, `workflow:learn:sync`, `workflow:learn:config`, `workflow:learn:deprecate`, `workflow:learn:stats`
  - Solution Patterns: `workflow:solution`, `workflow:solution:capture`, `workflow:solution:search`, `workflow:solution:list`, `workflow:solution:apply`, `workflow:solution:deprecate`, `workflow:solution:stats`
  - Advisory Board: `workflow:advisory`, `workflow:advisory:quick`, `workflow:advisory:standard`, `workflow:advisory:comprehensive`, `workflow:advisory:executive`, `workflow:advisory:ci`
- **Script Update on Package Upgrade**: When updating workflow-agent-cli, any new scripts from newer versions are automatically added to your project
- **Added/Updated Tracking**: Postinstall and setup commands now distinguish between newly added and updated scripts in their output
- **Shared Script Definitions**: New `workflow-scripts.ts` module ensures postinstall and setup commands stay synchronized

### Changed

- **Setup Command**: Now non-interactive and always overwrites/updates all scripts (previously only added 4 scripts with confirmation prompt)
- **Postinstall Behavior**: Now always updates scripts to latest definitions instead of skipping when any workflow script exists

### Documentation

- Added prominent pnpm warning callout in all installation documentation
- Updated all READMEs and getting-started guide with complete list of 31 scripts
- Added note about automatic script updates on package upgrade

## [2.5.0] - 2026-01-19

### Added

- **Advisory Board Analysis Command**: New `workflow advisory` command for generating comprehensive project analysis reports:
  - 4 analysis depth levels: `executive`, `quick`, `standard`, `comprehensive`
  - Generates markdown reports: Executive Summary, Technology Audit, Strategic Roadmap, Board Questions
  - JSON output format for programmatic access
  - Comparison feature (`--compare`) to track changes over time with diff reports
  - CI mode (`--ci`) with exit codes based on risk thresholds
  - Dry-run mode (`--dry-run`) to preview analysis without writing files
  - Timestamp option (`--timestamp`) for versioned report output
  - Interactive mode for guided analysis configuration
  - Health metrics integration (`--include-health`)
- **AdvisoryAnalyzer**: Core analysis engine with technology stack detection, package categorization, risk assessment, and opportunity identification
- **QuestionGenerator**: Transforms technical findings into strategic board questions with priorities and recommendations
- **ReportComparator**: Compares two analysis reports to identify changes in risks, opportunities, packages, and technology
- **GitHub Actions Template**: `GITHUB_ACTIONS_ADVISORY.yml` workflow template for automated weekly advisory reports
- **Config Schema**: New `advisory` section in workflow.config.json for customizing analysis settings

## [2.1.0] - 2026-01-15

### Added

- **Configurable Reserved Scope Names**: New `reservedScopeNames` field in workflow.config.json to customize which scope names are reserved (defaults to: init, create, build, test, config, docs, ci, deps)
- **Full Config Command**: Complete `workflow config` command with subcommands:
  - `workflow config validate`: Validate configuration with friendly error messages
  - `workflow config add scope`: Interactive scope creation with upfront validation and suggestions
  - `workflow config remove scope <name>`: Remove a scope from configuration
  - `workflow config list [type]`: List scopes, reserved names, or all config items
  - `workflow config get <path>`: Get a configuration value by path
  - `workflow config set <path> <value>`: Set a configuration value
- **Scope Name Validation**: New `validateScopeName()` helper function with intelligent suggestions for reserved words
- **Force Flag**: `--force` flag for config command to bypass validation checks
- **Pre-commit Scope Validation**: New `validate-scopes` hook check type
- **Interactive Prompts**: Full interactive scope creation with prompts for name, description, types, and guidelines
- **User-Friendly Error Messages**: Error messages now show scope names instead of array indices and include helpful suggestions

### Fixed

- **Reserved Word Errors**: Scope validation now happens upfront during `workflow config add scope` instead of only at config load time
- **Error Message Quality**: Zod errors are now formatted to show `Scope "name"` instead of `scopes[2].name`
- **Validation Timing**: Reserved word validation now respects custom `reservedScopeNames` configuration

### Changed

- **Config Schema**: Scope validation moved from individual scope level to config level using `superRefine`
- **Config Index**: Added `validateConfig()` function and improved error formatting in `loadConfig()`
- **Hooks Generation**: Added support for `validate-scopes` command in pre-commit hooks

### Dependencies

- Added `prompts@^2.4.2` for interactive CLI prompts
- Added `@types/prompts@^2.4.9` for TypeScript support

## [2.0.1] - 2026-01-14

### Fixed

- **Fallback Scopes**: Fixed default fallback scopes to use valid names instead of reserved words

## [2.0.0] - 2026-01-14

### Added

- **Mandatory Guidelines Enforcement System**: Comprehensive enforcement of template guidelines
- **Guideline Metadata**: New metadata.json for tracking mandatory vs optional templates
- **Doctor Command Enhancements**: New `--check-guidelines-only` flag for focused checks
- **Pre-commit Hooks**: Automatic git hook installation with guideline validation
- **GitHub Actions Integration**: Generate `.github/workflows/workflow-check.yml` for CI/CD
- All existing features from 1.0.0

## [1.0.0] - 2026-01-14

### Added

#### Core Package (@hawkinside_out/workflow-agent)

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

[1.0.0]: https://github.com/hawkinsideOut/workflow-agent/releases/tag/v1.0.0
