/**
 * Solution Command Group
 *
 * Consolidates solution pattern commands under `workflow solution <subcommand>`:
 *   - capture: Capture a solution pattern from working code
 *   - search: Search for solution patterns
 *   - list: List all solution patterns
 *   - apply: Apply a solution pattern to the current project
 *   - deprecate: Deprecate a solution pattern
 *   - stats: Show solution pattern statistics
 */

import { Command } from "commander";
import chalk from "chalk";
import {
  solutionCaptureCommand,
  solutionSearchCommand,
  solutionListCommand,
  solutionApplyCommand,
  solutionDeprecateCommand,
  solutionStatsCommand,
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
  $ workflow solution capture                    ${chalk.dim("# Interactive solution capture")}
  $ workflow solution capture --path ./src/auth  ${chalk.dim("# Capture from specific path")}
  $ workflow solution search "jwt auth"          ${chalk.dim("# Search solutions")}
  $ workflow solution list                       ${chalk.dim("# List all solutions")}
  $ workflow solution list --category auth       ${chalk.dim("# List by category")}
  $ workflow solution apply abc123               ${chalk.dim("# Apply a solution")}
  $ workflow solution apply abc123 --dry-run     ${chalk.dim("# Preview application")}
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

  return solutionCmd;
}

// Re-export individual commands for backward compatibility
export {
  solutionCaptureCommand,
  solutionSearchCommand,
  solutionListCommand,
  solutionApplyCommand,
  solutionDeprecateCommand,
  solutionStatsCommand,
} from "../solution.js";
