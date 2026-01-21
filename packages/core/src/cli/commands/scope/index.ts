/**
 * Scope Command Group
 *
 * Consolidates scope management commands under `workflow scope <subcommand>`:
 *   - create: Create a custom scope package
 *   - migrate: Migrate inline scopes to a custom package
 */

import { Command } from "commander";
import chalk from "chalk";
import { scopeCreateCommand } from "../scope-create.js";
import { scopeMigrateCommand } from "../scope-migrate.js";

// Re-export for backward compatibility
export { scopeCreateCommand, scopeMigrateCommand };

/**
 * Create the scope command group with all subcommands
 */
export function createScopeCommand(): Command {
  const scopeCmd = new Command("scope")
    .description("Manage custom scope packages")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow scope create --name fintech                ${chalk.dim("# Create fintech scope package")}
  $ workflow scope migrate --name my-scopes             ${chalk.dim("# Migrate inline to package")}
`,
    )
    .action(() => {
      // Show help if no subcommand provided
      scopeCmd.help();
    });

  // create subcommand
  scopeCmd
    .command("create")
    .description("Create a custom scope package")
    .option("--name <name>", 'Package name (e.g., "fintech", "gaming")')
    .option(
      "--scopes <scopes>",
      "Comma-separated scopes (format: name:description:emoji:category)",
    )
    .option("--preset-name <preset>", "Preset display name")
    .option("--output-dir <dir>", "Output directory")
    .option("--no-test", "Skip test file generation")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow scope create --name fintech              ${chalk.dim("# Interactive mode")}
  $ workflow scope create --name fintech \\
    --scopes "trading:Trade logic:📈:core,\\
              risk:Risk mgmt:⚠️:core"                 ${chalk.dim("# With scopes")}
  $ workflow scope create --name gaming \\
    --output-dir ./packages                           ${chalk.dim("# Custom output")}
`,
    )
    .action(scopeCreateCommand);

  // migrate subcommand
  scopeCmd
    .command("migrate")
    .description("Migrate inline scopes to a custom package")
    .option("--name <name>", "Package name for the preset")
    .option("--output-dir <dir>", "Output directory")
    .option("--keep-config", "Keep inline scopes in config after migration")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow scope migrate --name my-scopes           ${chalk.dim("# Migrate to package")}
  $ workflow scope migrate --keep-config              ${chalk.dim("# Keep inline copy")}
`,
    )
    .action(scopeMigrateCommand);

  return scopeCmd;
}
