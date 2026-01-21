/**
 * Shared workflow scripts definition
 * Used by postinstall.ts and setup.ts to ensure consistency
 *
 * Version 2.19.0: CLI consolidation - commands now use subcommand syntax (space instead of colon)
 */

/**
 * Current version of the workflow scripts schema
 * Used for tracking which version installed the scripts
 */
export const WORKFLOW_SCRIPTS_VERSION = "2.19.0";

/**
 * Deprecated scripts that should be removed from package.json
 * These are old colon-style commands replaced by the new subcommand structure
 */
export const DEPRECATED_SCRIPTS = [
  // Old colon-style scope commands
  "workflow:scope:create",
  "workflow:scope:migrate",

  // Old colon-style learn commands
  "workflow:learn",
  "workflow:learn:record",
  "workflow:learn:list",
  "workflow:learn:apply",
  "workflow:learn:publish",
  "workflow:learn:sync",
  "workflow:learn:sync:push",
  "workflow:learn:sync:pull",
  "workflow:learn:config",
  "workflow:learn:deprecate",
  "workflow:learn:stats",

  // Old colon-style solution commands
  "workflow:solution",
  "workflow:solution:capture",
  "workflow:solution:search",
  "workflow:solution:list",
  "workflow:solution:apply",
  "workflow:solution:deprecate",
  "workflow:solution:stats",

  // Old advisory commands (now under docs)
  "workflow:advisory",
  "workflow:advisory:quick",
  "workflow:advisory:standard",
  "workflow:advisory:comprehensive",
  "workflow:advisory:executive",
  "workflow:advisory:ci",

  // Old standalone commands (now under docs)
  "workflow:generate-instructions",
  "workflow:update-templates",
  "workflow:update-templates:force",

  // Old colon-style docs commands
  "workflow:docs:validate",
  "workflow:docs:validate:fix",

  // Old verify shortcuts without prefix
  "verify",
  "verify:fix",
  "pre-commit",

  // Old colon-style verify
  "workflow:verify:fix",
] as const;

export type DeprecatedScriptName = (typeof DEPRECATED_SCRIPTS)[number];

export const WORKFLOW_SCRIPTS = {
  // Version marker for tracking
  "workflow:version": `echo "workflow-agent scripts v${WORKFLOW_SCRIPTS_VERSION}"`,

  // Core Commands
  "workflow:init": "workflow-agent init",
  "workflow:validate": "workflow-agent validate",
  "workflow:config": "workflow-agent config show",
  "workflow:config-show": "workflow-agent config show",
  "workflow:config-set": "workflow-agent config set",
  "workflow:suggest": "workflow-agent suggest",
  "workflow:setup": "workflow-agent setup",
  "workflow:doctor": "workflow-agent doctor",

  // Scope Commands (new subcommand syntax)
  "workflow:scope": "workflow-agent scope list",
  "workflow:scope-create": "workflow-agent scope create",
  "workflow:scope-migrate": "workflow-agent scope migrate",
  "workflow:scope-add": "workflow-agent scope add",
  "workflow:scope-remove": "workflow-agent scope remove",
  "workflow:scope-sync": "workflow-agent scope sync",
  "workflow:scope-analyze": "workflow-agent scope analyze",

  // Verification & Auto-Setup
  "workflow:verify": "workflow-agent verify",
  "workflow:verify-fix": "workflow-agent verify --fix",
  "workflow:pre-commit": "workflow-agent verify --fix",
  "workflow:auto-setup": "workflow-agent auto-setup",

  // Hooks Commands (new subcommand syntax)
  "workflow:hooks": "workflow-agent hooks status",
  "workflow:hooks-install": "workflow-agent hooks install",
  "workflow:hooks-uninstall": "workflow-agent hooks uninstall",
  "workflow:hooks-test": "workflow-agent hooks test",

  // Learning System Commands (new subcommand syntax)
  "workflow:learn-list": "workflow-agent learn list",
  "workflow:learn-analyze": "workflow-agent learn analyze",
  "workflow:learn-capture": "workflow-agent learn capture",
  "workflow:learn-apply": "workflow-agent learn apply",
  "workflow:learn-export": "workflow-agent learn export",
  "workflow:learn-import": "workflow-agent learn import",
  "workflow:learn-status": "workflow-agent learn status",
  "workflow:learn-stats": "workflow-agent learn stats",
  "workflow:learn-clean": "workflow-agent learn clean",
  "workflow:learn-config": "workflow-agent learn config --show",
  "workflow:learn-config-enable": "workflow-agent learn config --enable-sync",
  "workflow:learn-config-disable": "workflow-agent learn config --disable-sync",
  "workflow:learn-sync": "workflow-agent learn sync",
  "workflow:learn-sync-push": "workflow-agent learn sync --push",
  "workflow:learn-sync-pull": "workflow-agent learn sync --pull",

  // Solution Pattern Commands (new subcommand syntax)
  "workflow:solution-list": "workflow-agent solution list",
  "workflow:solution-create": "workflow-agent solution create",
  "workflow:solution-show": "workflow-agent solution show",
  "workflow:solution-search": "workflow-agent solution search",
  "workflow:solution-apply": "workflow-agent solution apply",
  "workflow:solution-export": "workflow-agent solution export",
  "workflow:solution-import": "workflow-agent solution import",
  "workflow:solution-analyze": "workflow-agent solution analyze",

  // Sync Commands (new unified sync)
  "workflow:sync": "workflow-agent sync status",
  "workflow:sync-push": "workflow-agent sync push",
  "workflow:sync-pull": "workflow-agent sync pull",

  // Docs Commands (new subcommand syntax)
  "workflow:docs": "workflow-agent docs validate",
  "workflow:docs-validate": "workflow-agent docs validate",
  "workflow:docs-validate-fix": "workflow-agent docs validate --fix",
  "workflow:docs-advisory": "workflow-agent docs advisory",
  "workflow:docs-advisory-quick": "workflow-agent docs advisory --depth quick",
  "workflow:docs-advisory-standard": "workflow-agent docs advisory --depth standard",
  "workflow:docs-advisory-comprehensive": "workflow-agent docs advisory --depth comprehensive",
  "workflow:docs-advisory-executive": "workflow-agent docs advisory --depth executive",
  "workflow:docs-advisory-ci": "workflow-agent docs advisory --ci",
  "workflow:docs-generate": "workflow-agent docs generate",
  "workflow:docs-update": "workflow-agent docs update",
  "workflow:docs-update-force": "workflow-agent docs update --force",
} as const;

export type WorkflowScriptName = keyof typeof WORKFLOW_SCRIPTS;

/**
 * Script categories for organized console output
 */
export const SCRIPT_CATEGORIES = {
  "Core Commands": [
    "workflow:init",
    "workflow:validate",
    "workflow:config",
    "workflow:config-show",
    "workflow:config-set",
    "workflow:suggest",
    "workflow:setup",
    "workflow:doctor",
  ],
  "Scope Commands": [
    "workflow:scope",
    "workflow:scope-create",
    "workflow:scope-migrate",
    "workflow:scope-add",
    "workflow:scope-remove",
    "workflow:scope-sync",
    "workflow:scope-analyze",
  ],
  Verification: [
    "workflow:verify",
    "workflow:verify-fix",
    "workflow:pre-commit",
    "workflow:auto-setup",
  ],
  Hooks: [
    "workflow:hooks",
    "workflow:hooks-install",
    "workflow:hooks-uninstall",
    "workflow:hooks-test",
  ],
  "Learning System": [
    "workflow:learn-list",
    "workflow:learn-analyze",
    "workflow:learn-capture",
    "workflow:learn-apply",
    "workflow:learn-export",
    "workflow:learn-import",
    "workflow:learn-status",
    "workflow:learn-stats",
    "workflow:learn-clean",
    "workflow:learn-config",
    "workflow:learn-config-enable",
    "workflow:learn-config-disable",
    "workflow:learn-sync",
    "workflow:learn-sync-push",
    "workflow:learn-sync-pull",
  ],
  "Solution Patterns": [
    "workflow:solution-list",
    "workflow:solution-create",
    "workflow:solution-show",
    "workflow:solution-search",
    "workflow:solution-apply",
    "workflow:solution-export",
    "workflow:solution-import",
    "workflow:solution-analyze",
  ],
  Sync: ["workflow:sync", "workflow:sync-push", "workflow:sync-pull"],
  Documentation: [
    "workflow:docs",
    "workflow:docs-validate",
    "workflow:docs-validate-fix",
    "workflow:docs-advisory",
    "workflow:docs-advisory-quick",
    "workflow:docs-advisory-standard",
    "workflow:docs-advisory-comprehensive",
    "workflow:docs-advisory-executive",
    "workflow:docs-advisory-ci",
    "workflow:docs-generate",
    "workflow:docs-update",
    "workflow:docs-update-force",
  ],
  Meta: ["workflow:version"],
} as const;

export const TOTAL_SCRIPTS = Object.keys(WORKFLOW_SCRIPTS).length;

