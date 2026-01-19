/**
 * Shared workflow scripts definition
 * Used by postinstall.ts and setup.ts to ensure consistency
 */

export const WORKFLOW_SCRIPTS = {
  // Core Commands
  "workflow:init": "workflow-agent init",
  "workflow:validate": "workflow-agent validate",
  "workflow:config": "workflow-agent config",
  "workflow:suggest": "workflow-agent suggest",
  "workflow:setup": "workflow-agent setup",
  "workflow:doctor": "workflow-agent doctor",

  // Scope Commands
  "workflow:scope:create": "workflow-agent scope:create",
  "workflow:scope:migrate": "workflow-agent scope:migrate",

  // Verification & Auto-Setup
  "workflow:verify": "workflow-agent verify",
  "workflow:verify:fix": "workflow-agent verify --fix",
  "workflow:auto-setup": "workflow-agent auto-setup",

  // Learning System Commands
  "workflow:learn": "workflow-agent learn:list",
  "workflow:learn:record": "workflow-agent learn:record",
  "workflow:learn:list": "workflow-agent learn:list",
  "workflow:learn:apply": "workflow-agent learn:apply",
  "workflow:learn:sync": "workflow-agent learn:sync",
  "workflow:learn:config": "workflow-agent learn:config",
  "workflow:learn:deprecate": "workflow-agent learn:deprecate",
  "workflow:learn:stats": "workflow-agent learn:stats",

  // Solution Pattern Commands
  "workflow:solution": "workflow-agent solution:list",
  "workflow:solution:capture": "workflow-agent solution:capture",
  "workflow:solution:search": "workflow-agent solution:search",
  "workflow:solution:list": "workflow-agent solution:list",
  "workflow:solution:apply": "workflow-agent solution:apply",
  "workflow:solution:deprecate": "workflow-agent solution:deprecate",
  "workflow:solution:stats": "workflow-agent solution:stats",

  // Advisory Board Commands
  "workflow:advisory": "workflow-agent advisory",
  "workflow:advisory:quick": "workflow-agent advisory --depth quick",
  "workflow:advisory:standard": "workflow-agent advisory --depth standard",
  "workflow:advisory:comprehensive":
    "workflow-agent advisory --depth comprehensive",
  "workflow:advisory:executive": "workflow-agent advisory --depth executive",
  "workflow:advisory:ci": "workflow-agent advisory --ci",
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
    "workflow:suggest",
    "workflow:setup",
    "workflow:doctor",
  ],
  "Scope Commands": ["workflow:scope:create", "workflow:scope:migrate"],
  Verification: [
    "workflow:verify",
    "workflow:verify:fix",
    "workflow:auto-setup",
  ],
  "Learning System": [
    "workflow:learn",
    "workflow:learn:record",
    "workflow:learn:list",
    "workflow:learn:apply",
    "workflow:learn:sync",
    "workflow:learn:config",
    "workflow:learn:deprecate",
    "workflow:learn:stats",
  ],
  "Solution Patterns": [
    "workflow:solution",
    "workflow:solution:capture",
    "workflow:solution:search",
    "workflow:solution:list",
    "workflow:solution:apply",
    "workflow:solution:deprecate",
    "workflow:solution:stats",
  ],
  "Advisory Board": [
    "workflow:advisory",
    "workflow:advisory:quick",
    "workflow:advisory:standard",
    "workflow:advisory:comprehensive",
    "workflow:advisory:executive",
    "workflow:advisory:ci",
  ],
} as const;

export const TOTAL_SCRIPTS = Object.keys(WORKFLOW_SCRIPTS).length;
