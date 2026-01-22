/**
 * Shared workflow scripts definition
 * Used by postinstall.ts and setup.ts to ensure consistency
 *
 * Version 2.22.0: Simplified to single "workflow" script
 * Users run commands directly: npm run workflow -- init
 */

/**
 * Current version of the workflow scripts schema
 * Used for tracking which version installed the scripts
 */
export const WORKFLOW_SCRIPTS_VERSION = "2.22.0";

/**
 * The valid top-level commands for the workflow CLI
 * Run with: npm run workflow -- <command> [subcommand] [options]
 */
export const VALID_COMMANDS = [
  "version",
  "init",
  "validate",
  "config",
  "suggest",
  "setup",
  "doctor",
  "scope",
  "verify",
  "pre-commit",
  "learn",
  "solution",
  "sync",
  "docs",
] as const;

export type ValidCommand = (typeof VALID_COMMANDS)[number];

/**
 * Validates that a script name is the expected "workflow" script
 * @param scriptName - The script name to validate
 * @returns true if valid, false otherwise
 */
export function validateScriptName(scriptName: string): boolean {
  return scriptName === "workflow";
}

/**
 * Finds old workflow scripts that should be removed
 * @param scripts - Object with script names as keys
 * @returns Array of old workflow script names that should be removed
 */
export function validateAllScripts(scripts: Record<string, string>): string[] {
  return Object.keys(scripts).filter(
    (name) =>
      (name.startsWith("workflow:") || name.startsWith("workflow-")) &&
      name !== "workflow"
  );
}

/**
 * Deprecated scripts that should be removed from package.json
 * These are replaced by the single "workflow" script
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

  // Old advisory commands
  "workflow:advisory",
  "workflow:advisory:quick",
  "workflow:advisory:standard",
  "workflow:advisory:comprehensive",
  "workflow:advisory:executive",
  "workflow:advisory:ci",

  // Old standalone commands
  "workflow:generate-instructions",
  "workflow:update-templates",
  "workflow:update-templates:force",

  // Old colon-style docs commands
  "workflow:docs:validate",
  "workflow:docs:validate:fix",

  // Old verify shortcuts
  "verify",
  "verify:fix",
  "pre-commit",

  // Old colon-style verify
  "workflow:verify:fix",

  // Old hooks commands
  "workflow:hooks",
  "workflow:hooks-install",
  "workflow:hooks-uninstall",
  "workflow:hooks-test",
  "workflow:hooks:install",
  "workflow:hooks:uninstall",
  "workflow:hooks:status",

  // Old auto-setup
  "workflow:auto-setup",

  // v2.21.x dash-style scripts (deprecated in favor of single "workflow" command)
  "workflow:version",
  "workflow:init",
  "workflow:validate",
  "workflow:config",
  "workflow:config-show",
  "workflow:config-set",
  "workflow:suggest",
  "workflow:setup",
  "workflow:setup-auto",
  "workflow:doctor",
  "workflow:scope",
  "workflow:scope-list",
  "workflow:scope-create",
  "workflow:scope-migrate",
  "workflow:scope-add",
  "workflow:scope-remove",
  "workflow:scope-sync",
  "workflow:scope-analyze",
  "workflow:scope-hooks",
  "workflow:scope-hooks-status",
  "workflow:scope-hooks-install",
  "workflow:scope-hooks-uninstall",
  "workflow:scope-hooks-test",
  "workflow:verify",
  "workflow:verify-fix",
  "workflow:pre-commit",
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
  "workflow:solution-list",
  "workflow:solution-create",
  "workflow:solution-show",
  "workflow:solution-search",
  "workflow:solution-apply",
  "workflow:solution-export",
  "workflow:solution-import",
  "workflow:solution-analyze",
  "workflow:sync",
  "workflow:sync-status",
  "workflow:sync-push",
  "workflow:sync-pull",
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
] as const;

export type DeprecatedScriptName = (typeof DEPRECATED_SCRIPTS)[number];

/**
 * The only script that should be added to package.json
 * Users run commands with: npm run workflow -- init
 */
export const WORKFLOW_SCRIPTS = {
  workflow: "workflow-agent",
} as const;

export type WorkflowScriptName = keyof typeof WORKFLOW_SCRIPTS;

/**
 * Script categories - simplified
 */
export const SCRIPT_CATEGORIES = {
  Main: ["workflow"],
} as const;

export const TOTAL_SCRIPTS = Object.keys(WORKFLOW_SCRIPTS).length;

