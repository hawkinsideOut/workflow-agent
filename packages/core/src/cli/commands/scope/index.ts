/**
 * Scope Command Group
 *
 * Consolidates scope management commands under `workflow scope <subcommand>`:
 *   - list: List available scopes
 *   - create: Create a custom scope package
 *   - migrate: Migrate inline scopes to a custom package
 *   - add: Add a scope to the project
 *   - remove: Remove a scope from the project
 *   - sync: Sync scopes with the registry
 *   - analyze: Analyze scope usage in the project
 */

import { Command } from "commander";
import chalk from "chalk";
import { scopeCreateCommand } from "../scope-create.js";
import { scopeMigrateCommand } from "../scope-migrate.js";
import { loadConfig } from "../../../config/index.js";

// Re-export for backward compatibility
export { scopeCreateCommand, scopeMigrateCommand };

/**
 * List available scopes from config and installed packages
 */
async function scopeListCommand(): Promise<void> {
  console.log(chalk.bold.cyan("\n📋 Available Scopes\n"));

  const config = await loadConfig();
  const scopes = config?.scopes || [];

  if (scopes.length === 0) {
    console.log(chalk.yellow("  No scopes configured."));
    console.log(chalk.dim("\n  Add scopes with: workflow scope add <name>"));
    console.log(chalk.dim("  Or create a custom scope: workflow scope create"));
    return;
  }

  // Group by category
  const byCategory: Record<string, typeof scopes> = {};
  for (const scope of scopes) {
    const cat = scope.category || "other";
    if (!byCategory[cat]) byCategory[cat] = [];
    byCategory[cat].push(scope);
  }

  for (const [category, categoryScopes] of Object.entries(byCategory)) {
    console.log(
      chalk.bold(`  ${category.charAt(0).toUpperCase() + category.slice(1)}:`),
    );
    for (const scope of categoryScopes) {
      const emoji = scope.emoji || "📦";
      console.log(
        `    ${emoji} ${chalk.green(scope.name)} - ${scope.description || "No description"}`,
      );
    }
    console.log("");
  }

  console.log(chalk.dim(`  Total: ${scopes.length} scopes`));
}

/**
 * Add a scope to the project configuration
 */
async function scopeAddCommand(
  name: string,
  options: { description?: string; emoji?: string; category?: string },
): Promise<void> {
  console.log(chalk.bold.cyan(`\n➕ Adding Scope: ${name}\n`));

  const fs = await import("fs");
  const path = await import("path");
  const cwd = process.cwd();

  // Find config file
  const configFiles = [
    "workflow.config.json",
    "workflow.config.js",
    ".workflowrc.json",
  ];
  let configPath: string | null = null;

  for (const file of configFiles) {
    const fullPath = path.join(cwd, file);
    if (fs.existsSync(fullPath)) {
      configPath = fullPath;
      break;
    }
  }

  if (!configPath) {
    console.log(chalk.red("✗ No workflow configuration file found"));
    console.log(chalk.yellow("  Run: workflow init"));
    process.exit(1);
  }

  // Load and update config
  const configContent = fs.readFileSync(configPath, "utf-8");
  const config = JSON.parse(configContent);

  if (!config.scopes) {
    config.scopes = [];
  }

  // Check if scope already exists
  const existing = config.scopes.find((s: { name: string }) => s.name === name);
  if (existing) {
    console.log(chalk.yellow(`  Scope "${name}" already exists`));
    process.exit(1);
  }

  // Add new scope
  const newScope = {
    name,
    description: options.description || `${name} related changes`,
    emoji: options.emoji || "📦",
    category: options.category || "feature",
  };

  config.scopes.push(newScope);

  // Write back
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

  console.log(chalk.green(`✓ Added scope: ${newScope.emoji} ${name}`));
  console.log(chalk.dim(`  Description: ${newScope.description}`));
  console.log(chalk.dim(`  Category: ${newScope.category}`));
}

/**
 * Remove a scope from the project configuration
 */
async function scopeRemoveCommand(name: string): Promise<void> {
  console.log(chalk.bold.cyan(`\n➖ Removing Scope: ${name}\n`));

  const fs = await import("fs");
  const path = await import("path");
  const cwd = process.cwd();

  // Find config file
  const configFiles = [
    "workflow.config.json",
    "workflow.config.js",
    ".workflowrc.json",
  ];
  let configPath: string | null = null;

  for (const file of configFiles) {
    const fullPath = path.join(cwd, file);
    if (fs.existsSync(fullPath)) {
      configPath = fullPath;
      break;
    }
  }

  if (!configPath) {
    console.log(chalk.red("✗ No workflow configuration file found"));
    process.exit(1);
  }

  // Load and update config
  const configContent = fs.readFileSync(configPath, "utf-8");
  const config = JSON.parse(configContent);

  if (!config.scopes || config.scopes.length === 0) {
    console.log(chalk.yellow("  No scopes configured"));
    process.exit(1);
  }

  const index = config.scopes.findIndex(
    (s: { name: string }) => s.name === name,
  );
  if (index === -1) {
    console.log(chalk.yellow(`  Scope "${name}" not found`));
    process.exit(1);
  }

  const removed = config.scopes.splice(index, 1)[0];

  // Write back
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");

  console.log(chalk.green(`✓ Removed scope: ${removed.emoji || "📦"} ${name}`));
}

/**
 * Sync scopes with the community registry
 */
async function scopeSyncCommand(options: {
  push?: boolean;
  pull?: boolean;
  dryRun?: boolean;
}): Promise<void> {
  console.log(chalk.bold.cyan("\n🔄 Syncing Scopes\n"));

  // Import and delegate to unified sync command
  const { syncCommand } = await import("../sync.js");
  await syncCommand({
    ...options,
    scopes: true,
    learn: false,
    solutions: false,
  });
}

/**
 * Analyze scope usage in the project
 */
async function scopeAnalyzeCommand(): Promise<void> {
  console.log(chalk.bold.cyan("\n🔍 Analyzing Scope Usage\n"));

  const { execa } = await import("execa");
  const cwd = process.cwd();

  try {
    // Get recent commits and analyze scope usage
    const { stdout } = await execa(
      "git",
      ["log", "--oneline", "-50", "--format=%s"],
      { cwd },
    );
    const commits = stdout.split("\n").filter(Boolean);

    const config = await loadConfig();
    const scopes = config?.scopes || [];
    const scopeNames = scopes.map((s: { name: string }) => s.name);

    // Count scope usage
    const usage: Record<string, number> = {};
    let unscoped = 0;
    let invalidScopes: string[] = [];

    for (const commit of commits) {
      const match = commit.match(/^\w+\(([^)]+)\):/);
      if (match) {
        const scope = match[1];
        if (scopeNames.includes(scope)) {
          usage[scope] = (usage[scope] || 0) + 1;
        } else {
          if (!invalidScopes.includes(scope)) {
            invalidScopes.push(scope);
          }
        }
      } else if (commit.match(/^\w+:/)) {
        unscoped++;
      }
    }

    // Display results
    console.log(chalk.bold("  Scope Usage (last 50 commits):"));
    console.log("");

    const sortedUsage = Object.entries(usage).sort((a, b) => b[1] - a[1]);
    for (const [scope, count] of sortedUsage) {
      const scopeConfig = scopes.find(
        (s: { name: string }) => s.name === scope,
      );
      const emoji = scopeConfig?.emoji || "📦";
      const bar = "█".repeat(Math.min(count, 20));
      console.log(
        `    ${emoji} ${chalk.green(scope.padEnd(15))} ${bar} ${count}`,
      );
    }

    if (unscoped > 0) {
      console.log(
        `    ${chalk.yellow("(unscoped)".padEnd(17))} ${"░".repeat(Math.min(unscoped, 20))} ${unscoped}`,
      );
    }

    // Suggest unused scopes
    const unusedScopes = scopeNames.filter((name: string) => !usage[name]);
    if (unusedScopes.length > 0) {
      console.log(chalk.yellow("\n  Unused scopes (consider removing):"));
      for (const name of unusedScopes) {
        console.log(chalk.dim(`    • ${name}`));
      }
    }

    // Suggest adding invalid scopes
    if (invalidScopes.length > 0) {
      console.log(chalk.yellow("\n  Unknown scopes (consider adding):"));
      for (const name of invalidScopes) {
        console.log(chalk.dim(`    • ${name}`));
      }
    }

    console.log("");
  } catch {
    console.log(chalk.yellow("  Unable to analyze git history"));
    console.log(
      chalk.dim("  Make sure you're in a git repository with commit history"),
    );
  }
}

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
  $ workflow scope list                           ${chalk.dim("# List available scopes")}
  $ workflow scope create --name fintech          ${chalk.dim("# Create fintech scope package")}
  $ workflow scope migrate --name my-scopes       ${chalk.dim("# Migrate inline to package")}
  $ workflow scope add auth                       ${chalk.dim("# Add auth scope")}
  $ workflow scope remove legacy                  ${chalk.dim("# Remove legacy scope")}
  $ workflow scope analyze                        ${chalk.dim("# Analyze scope usage")}
`,
    )
    .action(() => {
      // Default action: list scopes
      scopeListCommand();
    });

  // list subcommand
  scopeCmd
    .command("list")
    .description("List available scopes")
    .action(scopeListCommand);

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

  // add subcommand
  scopeCmd
    .command("add <name>")
    .description("Add a scope to the project configuration")
    .option("--description <desc>", "Scope description")
    .option("--emoji <emoji>", "Scope emoji")
    .option("--category <cat>", "Scope category (feature, fix, core, etc.)")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow scope add auth                           ${chalk.dim("# Add auth scope")}
  $ workflow scope add payments --emoji 💳            ${chalk.dim("# With emoji")}
  $ workflow scope add api --category core            ${chalk.dim("# With category")}
`,
    )
    .action(scopeAddCommand);

  // remove subcommand
  scopeCmd
    .command("remove <name>")
    .description("Remove a scope from the project configuration")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow scope remove legacy                      ${chalk.dim("# Remove scope")}
`,
    )
    .action(scopeRemoveCommand);

  // sync subcommand
  scopeCmd
    .command("sync")
    .description("Sync scopes with the community registry")
    .option("--push", "Push local scopes to registry")
    .option("--pull", "Pull scopes from registry")
    .option("--dry-run", "Preview without syncing")
    .addHelpText(
      "after",
      `
${chalk.bold("Examples:")}
  $ workflow scope sync --push                        ${chalk.dim("# Push to registry")}
  $ workflow scope sync --pull                        ${chalk.dim("# Pull from registry")}
  $ workflow scope sync --dry-run                     ${chalk.dim("# Preview changes")}
`,
    )
    .action(scopeSyncCommand);

  // analyze subcommand
  scopeCmd
    .command("analyze")
    .description("Analyze scope usage in the project")
    .addHelpText(
      "after",
      `
${chalk.bold("Details:")}
  Analyzes recent git commits to show:
  - Which scopes are used most frequently
  - Unused scopes that could be removed
  - Unknown scopes that could be added
`,
    )
    .action(scopeAnalyzeCommand);

  return scopeCmd;
}

// Export individual commands for direct use
export {
  scopeListCommand,
  scopeAddCommand,
  scopeRemoveCommand,
  scopeSyncCommand,
  scopeAnalyzeCommand,
};
