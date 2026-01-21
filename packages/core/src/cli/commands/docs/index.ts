/**
 * Docs Command Group
 *
 * Consolidates documentation-related commands under `workflow docs <subcommand>`:
 *   - validate: Validate document references in markdown files
 *   - generate: Generate .github/copilot-instructions.md from guidelines
 *   - update: Update guideline templates from the latest package version
 *   - advisory: Generate advisory board analysis and documentation
 */

import { Command } from "commander";
import chalk from "chalk";
import { docsValidateCommand } from "./validate.js";
import { docsGenerateCommand } from "./generate.js";
import { docsUpdateCommand } from "./update.js";
import { advisoryCommand } from "../advisory.js";

/**
 * Create the docs command group with all subcommands
 */
export function createDocsCommand(): Command {
  const docsCmd = new Command("docs")
    .description("Manage documentation and guidelines")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow docs validate              ${chalk.dim("# Check for broken references")}
  $ workflow docs validate --fix        ${chalk.dim("# Interactive fix mode")}
  $ workflow docs generate              ${chalk.dim("# Generate copilot-instructions.md")}
  $ workflow docs generate --force      ${chalk.dim("# Regenerate without confirmation")}
  $ workflow docs update                ${chalk.dim("# Update guideline templates")}
  $ workflow docs update --force        ${chalk.dim("# Overwrite existing templates")}
  $ workflow docs advisory              ${chalk.dim("# Generate advisory analysis")}
  $ workflow docs advisory --depth quick ${chalk.dim("# Quick analysis scan")}
`,
    )
    .action(() => {
      // Show help if no subcommand provided
      docsCmd.help();
    });

  // validate subcommand
  docsCmd
    .command("validate")
    .description("Validate document references in markdown files")
    .option("--fix", "Interactively fix broken references")
    .option(
      "--patterns <patterns>",
      "Glob patterns to scan (comma-separated, default: **/*.md)",
    )
    .option("--ignore <patterns>", "Glob patterns to ignore (comma-separated)")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow docs validate                          ${chalk.dim("# Scan all markdown files")}
  $ workflow docs validate --fix                    ${chalk.dim("# Interactive fix mode")}
  $ workflow docs validate --patterns "docs/**"     ${chalk.dim("# Only scan docs folder")}
  $ workflow docs validate --ignore "node_modules"  ${chalk.dim("# Ignore patterns")}
`,
    )
    .action((options) => {
      const patterns = options.patterns
        ? options.patterns.split(",").map((p: string) => p.trim())
        : undefined;
      const ignore = options.ignore
        ? options.ignore.split(",").map((p: string) => p.trim())
        : undefined;

      return docsValidateCommand({
        fix: options.fix,
        patterns,
        ignore,
      });
    });

  // generate subcommand
  docsCmd
    .command("generate")
    .description("Generate .github/copilot-instructions.md from guidelines")
    .option("--force", "Regenerate without confirmation")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow docs generate          ${chalk.dim("# Generate with confirmation if exists")}
  $ workflow docs generate --force  ${chalk.dim("# Force regeneration")}
`,
    )
    .action(docsGenerateCommand);

  // update subcommand
  docsCmd
    .command("update")
    .description("Update guideline templates from the latest package version")
    .option("--force", "Overwrite existing template files")
    .option("--skip", "Skip the update (useful in CI)")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow docs update          ${chalk.dim("# Update templates (skip existing)")}
  $ workflow docs update --force  ${chalk.dim("# Overwrite all templates")}
  $ workflow docs update --skip   ${chalk.dim("# Skip update in CI")}
`,
    )
    .action(docsUpdateCommand);

  // advisory subcommand
  docsCmd
    .command("advisory")
    .description("Generate advisory board analysis and documentation")
    .option(
      "--depth <level>",
      "Analysis depth: executive, quick, standard, comprehensive",
    )
    .option("--output <path>", "Output directory (default: docs/advisory)")
    .option("--interactive", "Enable interactive mode")
    .option("--dry-run", "Preview analysis without writing files")
    .option("--format <type>", "Output format: markdown, json (default: markdown)")
    .option("--timestamp", "Append timestamp to filenames")
    .option("--include-health", "Include code health metrics from verify/doctor")
    .option("--ci", "CI mode with exit codes on high-risk findings")
    .option("--compare <path>", "Compare with previous report")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow docs advisory                           ${chalk.dim("# Interactive mode")}
  $ workflow docs advisory --depth quick             ${chalk.dim("# Quick scan")}
  $ workflow docs advisory --depth executive         ${chalk.dim("# Executive summary")}
  $ workflow docs advisory --include-health          ${chalk.dim("# Include health metrics")}
  $ workflow docs advisory --compare docs/advisory/  ${chalk.dim("# Compare with previous")}
  $ workflow docs advisory --ci                      ${chalk.dim("# CI mode with exit codes")}
`,
    )
    .action(advisoryCommand);

  return docsCmd;
}

// Re-export individual commands for backward compatibility
export { docsValidateCommand } from "./validate.js";
export { docsGenerateCommand } from "./generate.js";
export { docsUpdateCommand } from "./update.js";
