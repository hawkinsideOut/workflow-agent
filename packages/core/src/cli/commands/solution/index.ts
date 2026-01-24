/**
 * Solution Command Group
 *
 * Consolidates solution pattern commands under `workflow solution <subcommand>`:
 *   - capture: Capture a solution pattern from working code
 *   - create: Create a new solution pattern manually
 *   - show: Display details of a specific solution
 *   - search: Search for solution patterns
 *   - list: List all solution patterns
 *   - apply: Apply a solution pattern to the current project
 *   - export: Export solutions to a file
 *   - import: Import solutions from a file
 *   - analyze: Analyze codebase for potential solutions
 *   - deprecate: Deprecate a solution pattern
 *   - stats: Show solution pattern statistics
 */

import { Command } from "commander";
import chalk from "chalk";
import {
  solutionCaptureCommand,
  solutionCreateCommand,
  solutionShowCommand,
  solutionSearchCommand,
  solutionListCommand,
  solutionApplyCommand,
  solutionExportCommand,
  solutionImportCommand,
  solutionAnalyzeCommand,
  solutionDeprecateCommand,
  solutionStatsCommand,
  solutionMigrateCommand,
  solutionEditCommand,
} from "../solution.js";

/**
 * Create the solution command group with all subcommands
 */
export function createSolutionCommand(): Command {
  const solutionCmd = new Command("solution")
    .description("Manage solution patterns for code reuse")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow solution capture --path ./src/auth  ${chalk.dim("# Capture from path")}
  $ workflow solution create --name "My Auth"    ${chalk.dim("# Create manually")}
  $ workflow solution show abc123                ${chalk.dim("# Show solution details")}
  $ workflow solution search "jwt auth"          ${chalk.dim("# Search solutions")}
  $ workflow solution list                       ${chalk.dim("# List all solutions")}
  $ workflow solution list --category auth       ${chalk.dim("# List by category")}
  $ workflow solution apply abc123               ${chalk.dim("# Apply a solution")}
  $ workflow solution apply abc123 --dry-run     ${chalk.dim("# Preview application")}
  $ workflow solution export --format json       ${chalk.dim("# Export solutions")}
  $ workflow solution import solutions.json      ${chalk.dim("# Import solutions")}
  $ workflow solution analyze                    ${chalk.dim("# Find opportunities")}
  $ workflow solution stats                      ${chalk.dim("# Show statistics")}
`,
    )
    .action(() => {
      // Show help if no subcommand provided
      solutionCmd.help();
    });

  // capture subcommand
  solutionCmd
    .command("capture")
    .description("Capture a solution pattern from working code")
    .option("--name <name>", "Solution name")
    .option("--description <desc>", "Solution description")
    .option(
      "--category <cat>",
      "Category (auth, api, database, ui, testing, deployment, integrations, performance, security, other)",
    )
    .option("--keywords <kw>", "Comma-separated keywords")
    .option("--path <path>", "Path to the solution directory")
    .option("--anonymize", "Anonymize sensitive data in code")
    .option("--private", "Keep solution private (not synced)")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow solution capture                           ${chalk.dim("# Interactive mode")}
  $ workflow solution capture --path ./src/auth         ${chalk.dim("# Specify path")}
  $ workflow solution capture --name "JWT Auth" \\
    --category auth --keywords jwt,login                ${chalk.dim("# With metadata")}
  $ workflow solution capture --anonymize               ${chalk.dim("# Anonymize secrets")}
  $ workflow solution capture --private                 ${chalk.dim("# Keep private")}
`,
    )
    .action(solutionCaptureCommand);

  // create subcommand
  solutionCmd
    .command("create")
    .description("Create a new solution pattern manually")
    .option("--name <name>", "Solution name")
    .option("--description <desc>", "Solution description")
    .option("--category <cat>", "Category")
    .option("--keywords <kw>", "Comma-separated keywords")
    .option("--framework <fw>", "Target framework")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow solution create                            ${chalk.dim("# Interactive mode")}
  $ workflow solution create --name "Custom Auth"       ${chalk.dim("# With name")}
`,
    )
    .action(solutionCreateCommand);

  // show subcommand
  solutionCmd
    .command("show <solutionId>")
    .description("Display details of a specific solution pattern")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow solution show abc123                       ${chalk.dim("# Show by ID")}
`,
    )
    .action(solutionShowCommand);

  // search subcommand
  solutionCmd
    .command("search <query>")
    .description("Search for solution patterns")
    .option("--category <cat>", "Filter by category")
    .option("--framework <fw>", "Filter by framework")
    .option("--limit <n>", "Maximum results", "10")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow solution search "jwt authentication"       ${chalk.dim("# Search by keywords")}
  $ workflow solution search auth --category security   ${chalk.dim("# With category filter")}
  $ workflow solution search api --framework next       ${chalk.dim("# With framework filter")}
  $ workflow solution search database --limit 5         ${chalk.dim("# Limit results")}
`,
    )
    .action(solutionSearchCommand);

  // list subcommand
  solutionCmd
    .command("list")
    .description("List all solution patterns")
    .option("--category <cat>", "Filter by category")
    .option("--framework <fw>", "Filter by framework")
    .option("--deprecated", "Include deprecated solutions")
    .option("--limit <n>", "Maximum results", "20")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow solution list                              ${chalk.dim("# List all solutions")}
  $ workflow solution list --category auth              ${chalk.dim("# Filter by category")}
  $ workflow solution list --deprecated                 ${chalk.dim("# Include deprecated")}
  $ workflow solution list --limit 50                   ${chalk.dim("# More results")}
`,
    )
    .action(solutionListCommand);

  // apply subcommand
  solutionCmd
    .command("apply <solutionId>")
    .description("Apply a solution pattern to the current project")
    .option("--output <dir>", "Output directory")
    .option("--dry-run", "Preview without applying")
    .option("--include-tests", "Include test files")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow solution apply abc123                      ${chalk.dim("# Apply solution")}
  $ workflow solution apply abc123 --dry-run            ${chalk.dim("# Preview changes")}
  $ workflow solution apply abc123 --output ./src       ${chalk.dim("# Custom output dir")}
  $ workflow solution apply abc123 --include-tests      ${chalk.dim("# Include test files")}
`,
    )
    .action(solutionApplyCommand);

  // export subcommand
  solutionCmd
    .command("export")
    .description("Export solution patterns to a file")
    .option("-o, --output <path>", "Output file path", "solutions-export.json")
    .option("-f, --format <format>", "Output format (json, yaml)", "json")
    .option("--category <cat>", "Filter by category")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow solution export                            ${chalk.dim("# Export all as JSON")}
  $ workflow solution export --format yaml              ${chalk.dim("# Export as YAML")}
  $ workflow solution export --category auth            ${chalk.dim("# Export auth only")}
  $ workflow solution export -o backup.json             ${chalk.dim("# Custom output path")}
`,
    )
    .action(solutionExportCommand);

  // import subcommand
  solutionCmd
    .command("import <file>")
    .description("Import solution patterns from a file")
    .option("-f, --format <format>", "Input format (json, yaml)", "json")
    .option("--dry-run", "Preview import without making changes")
    .option("--no-merge", "Skip existing solutions instead of merging")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow solution import solutions.json             ${chalk.dim("# Import from JSON")}
  $ workflow solution import backup.json --dry-run      ${chalk.dim("# Preview import")}
`,
    )
    .action(solutionImportCommand);

  // analyze subcommand
  solutionCmd
    .command("analyze")
    .description("Analyze codebase for potential solution patterns")
    .addHelpText(
      "after",
      `
${chalk.bold("Details:")}
  Scans your codebase for common patterns that could be
  captured as reusable solutions, such as:
  - Authentication modules
  - API layers
  - Database utilities
  - UI component libraries
`,
    )
    .action(solutionAnalyzeCommand);

  // deprecate subcommand
  solutionCmd
    .command("deprecate <solutionId> <reason>")
    .description("Deprecate a solution pattern")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow solution deprecate abc123 "Replaced by better approach"
  $ workflow solution deprecate xyz789 "Framework no longer supported"
`,
    )
    .action(solutionDeprecateCommand);

  // stats subcommand
  solutionCmd
    .command("stats")
    .description("Show solution pattern statistics")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow solution stats                             ${chalk.dim("# Show all statistics")}
`,
    )
    .action(solutionStatsCommand);

  // migrate subcommand
  solutionCmd
    .command("migrate")
    .description("Migrate solution patterns (make public/private)")
    .option("--public", "Make all solutions public (syncable)")
    .option("--private", "Make all solutions private")
    .option("--dry-run", "Preview changes without applying")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow solution migrate --public                  ${chalk.dim("# Make all public")}
  $ workflow solution migrate --private                 ${chalk.dim("# Make all private")}
  $ workflow solution migrate --public --dry-run        ${chalk.dim("# Preview changes")}
`,
    )
    .action(solutionMigrateCommand);

  // edit subcommand
  solutionCmd
    .command("edit <solutionId>")
    .description("Edit a solution pattern's properties")
    .option("--name <name>", "Update solution name")
    .option("--description <desc>", "Update description")
    .option("--public", "Make solution public (syncable)")
    .option("--private", "Make solution private")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow solution edit abc123 --public              ${chalk.dim("# Make public")}
  $ workflow solution edit abc123 --private             ${chalk.dim("# Make private")}
  $ workflow solution edit abc123 --name "New Name"     ${chalk.dim("# Rename")}
`,
    )
    .action(solutionEditCommand);

  return solutionCmd;
}

// Re-export individual commands for backward compatibility
export {
  solutionCaptureCommand,
  solutionCreateCommand,
  solutionShowCommand,
  solutionSearchCommand,
  solutionListCommand,
  solutionApplyCommand,
  solutionExportCommand,
  solutionImportCommand,
  solutionAnalyzeCommand,
  solutionDeprecateCommand,
  solutionStatsCommand,
  solutionMigrateCommand,
  solutionEditCommand,
} from "../solution.js";
