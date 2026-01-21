import chalk from "chalk";
import * as p from "@clack/prompts";
import * as path from "node:path";
import {
  PatternStore,
  CodeAnalyzer,
  type SolutionPattern,
  type SolutionCategory,
  type SolutionFile,
  type DependencyVersion,
} from "@hawkinside_out/workflow-improvement-tracker";

// ============================================
// Types
// ============================================

interface SolutionCaptureOptions {
  name?: string;
  description?: string;
  category?: SolutionCategory;
  keywords?: string;
  path?: string;
  anonymize?: boolean;
  private?: boolean;
}

interface SolutionSearchOptions {
  category?: SolutionCategory;
  framework?: string;
  limit?: number;
}

interface SolutionListOptions {
  category?: SolutionCategory;
  framework?: string;
  deprecated?: boolean;
  limit?: number;
}

interface SolutionApplyOptions {
  output?: string;
  dryRun?: boolean;
  includeTests?: boolean;
}

// ============================================
// Helper Functions
// ============================================

function getWorkspacePath(): string {
  return process.cwd();
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatCategory(category: SolutionCategory): string {
  const icons: Record<SolutionCategory, string> = {
    auth: "🔐",
    api: "🌐",
    database: "💾",
    ui: "🎨",
    testing: "🧪",
    deployment: "🚀",
    integrations: "🔗",
    performance: "⚡",
    security: "🛡️",
    other: "📦",
    state: "🔄",
    forms: "📝",
    "error-handling": "⚠️",
    caching: "💨",
  };
  return `${icons[category]} ${category}`;
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

// ============================================
// solution:capture Command
// ============================================

/**
 * Capture a solution pattern from working code
 */
export async function solutionCaptureCommand(options: SolutionCaptureOptions) {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);

  console.log(chalk.cyan("\n📦 Capture Solution Pattern\n"));

  // Get the directory to analyze
  let targetPath = options.path;
  if (!targetPath) {
    const pathInput = await p.text({
      message: "Path to the solution directory:",
      placeholder: "./src/auth",
      validate: (val) => {
        if (!val) return "Path is required";
        return undefined;
      },
    });

    if (p.isCancel(pathInput)) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }
    targetPath = pathInput as string;
  }

  // Resolve to absolute path
  const absolutePath = path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(cwd, targetPath);

  // Get pattern name
  let name = options.name;
  if (!name) {
    const nameInput = await p.text({
      message: "Solution name:",
      placeholder: "JWT Authentication",
      validate: (val) => {
        if (!val || val.length < 3) return "Name must be at least 3 characters";
        return undefined;
      },
    });

    if (p.isCancel(nameInput)) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }
    name = nameInput as string;
  }

  // Get description
  let description = options.description;
  if (!description) {
    const descInput = await p.text({
      message: "Solution description:",
      placeholder: "Complete JWT-based authentication with refresh tokens",
      validate: (val) => {
        if (!val || val.length < 10)
          return "Description must be at least 10 characters";
        return undefined;
      },
    });

    if (p.isCancel(descInput)) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }
    description = descInput as string;
  }

  // Get category
  let category = options.category;
  if (!category) {
    const categoryChoice = await p.select({
      message: "Solution category:",
      options: [
        { value: "auth", label: "🔐 Authentication" },
        { value: "api", label: "🌐 API" },
        { value: "database", label: "💾 Database" },
        { value: "ui", label: "🎨 UI/Components" },
        { value: "testing", label: "🧪 Testing" },
        { value: "deployment", label: "🚀 Deployment" },
        { value: "integrations", label: "🔗 Integrations" },
        { value: "performance", label: "⚡ Performance" },
        { value: "security", label: "🛡️ Security" },
        { value: "state", label: "🔄 State Management" },
        { value: "forms", label: "📝 Forms" },
        { value: "error-handling", label: "⚠️ Error Handling" },
        { value: "caching", label: "💨 Caching" },
        { value: "other", label: "📦 Other" },
      ],
    });

    if (p.isCancel(categoryChoice)) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }
    category = categoryChoice as SolutionCategory;
  }

  // Get keywords
  let keywords: string[] = [];
  if (options.keywords) {
    keywords = options.keywords.split(",").map((k) => k.trim());
  } else {
    const keywordsInput = await p.text({
      message: "Keywords (comma-separated):",
      placeholder: "jwt, authentication, login, refresh-token",
    });

    if (p.isCancel(keywordsInput)) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }
    if (keywordsInput) {
      keywords = (keywordsInput as string).split(",").map((k) => k.trim());
    }
  }

  // Analyze the directory
  const spinner = p.spinner();
  spinner.start("Analyzing solution...");

  const analyzer = new CodeAnalyzer({
    anonymize: options.anonymize ?? false,
  });

  try {
    const pattern = await analyzer.createSolutionPattern(
      absolutePath,
      name,
      description,
      category,
      keywords,
      { isPrivate: options.private ?? false },
    );

    spinner.stop("Solution analyzed");

    // Show summary
    console.log(chalk.green("\n✓ Solution captured successfully!\n"));
    console.log(chalk.dim("─".repeat(50)));
    console.log(`${chalk.bold("Name:")} ${pattern.name}`);
    console.log(
      `${chalk.bold("Category:")} ${formatCategory(pattern.category)}`,
    );
    console.log(
      `${chalk.bold("Files:")} ${pattern.implementation.files.length}`,
    );
    console.log(
      `${chalk.bold("Dependencies:")} ${pattern.implementation.dependencies.length}`,
    );
    console.log(
      `${chalk.bold("Framework:")} ${pattern.compatibility.framework || "generic"}`,
    );
    console.log(chalk.dim("─".repeat(50)));

    // Confirm save
    const confirm = await p.confirm({
      message: "Save this solution pattern?",
      initialValue: true,
    });

    if (p.isCancel(confirm) || !confirm) {
      p.cancel("Solution not saved");
      process.exit(0);
    }

    // Save the pattern
    await store.saveSolution(pattern);
    console.log(chalk.green(`\n✓ Solution saved with ID: ${pattern.id}\n`));
  } catch (error) {
    spinner.stop("Analysis failed");
    console.error(chalk.red(`\n✗ Error: ${(error as Error).message}\n`));
    process.exit(1);
  }
}

// ============================================
// solution:search Command
// ============================================

/**
 * Search for solution patterns
 */
export async function solutionSearchCommand(
  query: string,
  options: SolutionSearchOptions,
) {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);

  console.log(chalk.cyan("\n🔍 Search Solution Patterns\n"));

  // Convert query to keywords array
  const keywords = query.split(/\s+/).filter((k) => k.length > 0);

  const result = await store.searchSolutions(keywords, {
    category: options.category,
    framework: options.framework,
    limit: options.limit ?? 10,
  });

  if (!result.success || !result.data) {
    console.error(chalk.red(`\n✗ Search failed: ${result.error}\n`));
    return;
  }

  const solutions = result.data;

  if (solutions.length === 0) {
    console.log(chalk.yellow("No solutions found matching your query.\n"));
    console.log(chalk.dim("Try different keywords or fewer filters."));
    return;
  }

  console.log(chalk.green(`Found ${solutions.length} solution(s):\n`));
  console.log(chalk.dim("─".repeat(70)));

  for (const solution of solutions) {
    console.log(
      `${chalk.bold(solution.name)} ${chalk.dim(`(${solution.id.slice(0, 8)})`)}`,
    );
    console.log(`  ${formatCategory(solution.category)}`);
    console.log(`  ${chalk.dim(truncate(solution.description, 60))}`);
    console.log(
      `  Files: ${solution.implementation.files.length} | ` +
        `Framework: ${solution.compatibility.framework || "generic"} | ` +
        `Uses: ${solution.metrics.applications}`,
    );
    console.log(chalk.dim("─".repeat(70)));
  }

  console.log(
    chalk.dim("\nUse 'workflow solution:apply <id>' to apply a solution."),
  );
}

// ============================================
// solution:list Command
// ============================================

/**
 * List all solution patterns
 */
export async function solutionListCommand(options: SolutionListOptions) {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);

  console.log(chalk.cyan("\n📋 Solution Patterns\n"));

  const result = await store.listSolutions({
    category: options.category,
    framework: options.framework,
    includeDeprecated: options.deprecated ?? false,
    limit: options.limit ?? 20,
  });

  if (!result.success || !result.data) {
    console.error(chalk.red(`\n✗ List failed: ${result.error}\n`));
    return;
  }

  const solutions = result.data;

  if (solutions.length === 0) {
    console.log(chalk.yellow("No solutions found.\n"));
    console.log(
      chalk.dim("Use 'workflow solution:capture' to capture a solution."),
    );
    return;
  }

  console.log(chalk.green(`${solutions.length} solution(s):\n`));

  // Group by category
  const byCategory = new Map<SolutionCategory, SolutionPattern[]>();
  for (const solution of solutions) {
    const list = byCategory.get(solution.category) || [];
    list.push(solution);
    byCategory.set(solution.category, list);
  }

  for (const [category, items] of byCategory) {
    console.log(chalk.bold(`\n${formatCategory(category)}`));
    console.log(chalk.dim("─".repeat(50)));

    for (const solution of items) {
      const deprecated = solution.deprecatedAt
        ? chalk.red(" [DEPRECATED]")
        : "";
      console.log(
        `  ${chalk.cyan(solution.id.slice(0, 8))} ${solution.name}${deprecated}`,
      );
      console.log(`    ${chalk.dim(truncate(solution.description, 50))}`);
      console.log(
        chalk.dim(
          `    Created: ${formatDate(solution.createdAt)} | Files: ${solution.implementation.files.length}`,
        ),
      );
    }
  }

  console.log(
    chalk.dim(
      "\nUse 'workflow solution:search <query>' to find specific solutions.",
    ),
  );
}

// ============================================
// solution:apply Command
// ============================================

/**
 * Apply a solution pattern to the current project
 */
export async function solutionApplyCommand(
  solutionId: string,
  options: SolutionApplyOptions,
) {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);

  console.log(chalk.cyan("\n🚀 Apply Solution Pattern\n"));

  // Get the solution
  const result = await store.getSolution(solutionId);
  if (!result.success || !result.data) {
    console.error(chalk.red(`\n✗ Solution not found: ${solutionId}\n`));
    process.exit(1);
  }

  const solution = result.data;

  // Check for deprecation
  if (solution.deprecatedAt) {
    console.log(
      chalk.yellow(
        `⚠️  This solution is deprecated: ${solution.deprecationReason || "No reason provided"}\n`,
      ),
    );
    const proceed = await p.confirm({
      message: "Do you want to continue?",
      initialValue: false,
    });

    if (p.isCancel(proceed) || !proceed) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }
  }

  // Show solution details
  console.log(chalk.bold(`Solution: ${solution.name}`));
  console.log(chalk.dim(solution.description));
  console.log();

  // Show files that will be created
  console.log(chalk.bold("Files to create:"));
  const filesToApply: SolutionFile[] = options.includeTests
    ? solution.implementation.files
    : solution.implementation.files.filter(
        (f: SolutionFile) => f.role !== "test",
      );

  for (const file of filesToApply) {
    console.log(chalk.dim(`  • ${file.path} (${file.role})`));
  }
  console.log();

  // Show dependencies
  if (solution.implementation.dependencies.length > 0) {
    console.log(chalk.bold("Dependencies to install:"));
    for (const dep of solution.implementation.dependencies) {
      console.log(chalk.dim(`  • ${dep.name}@${dep.version}`));
    }
    console.log();
  }

  // Show environment variables
  if (solution.implementation.envVars.length > 0) {
    console.log(chalk.bold("Environment variables needed:"));
    for (const env of solution.implementation.envVars) {
      const required = env.required ? chalk.red("*") : "";
      console.log(chalk.dim(`  • ${env.name}${required}`));
    }
    console.log();
  }

  if (options.dryRun) {
    console.log(chalk.yellow("Dry run mode - no files were created.\n"));
    return;
  }

  // Confirm application
  const confirm = await p.confirm({
    message: "Apply this solution?",
    initialValue: true,
  });

  if (p.isCancel(confirm) || !confirm) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  // Apply the solution
  const spinner = p.spinner();
  spinner.start("Applying solution...");

  try {
    const outputDir = options.output || cwd;
    const fs = await import("node:fs");
    const pathModule = await import("node:path");

    for (const file of filesToApply) {
      const filePath = pathModule.join(outputDir, file.path);
      const dir = pathModule.dirname(filePath);

      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(filePath, file.content);
    }

    // Update metrics
    await store.updateSolutionMetrics(solution.id, true);

    spinner.stop("Solution applied");
    console.log(chalk.green(`\n✓ Solution applied successfully!\n`));
    console.log(chalk.dim(`Created ${filesToApply.length} file(s).`));

    // Show next steps
    if (solution.implementation.dependencies.length > 0) {
      console.log(chalk.cyan("\nNext step: Install dependencies with:"));
      const deps = solution.implementation.dependencies
        .map((d: DependencyVersion) => `${d.name}@${d.version}`)
        .join(" ");
      console.log(chalk.dim(`  npm install ${deps}`));
    }
  } catch (error) {
    spinner.stop("Application failed");

    // Record failure
    await store.updateSolutionMetrics(solution.id, false);

    console.error(chalk.red(`\n✗ Error: ${(error as Error).message}\n`));
    process.exit(1);
  }
}

// ============================================
// solution:deprecate Command
// ============================================

/**
 * Deprecate a solution pattern
 */
export async function solutionDeprecateCommand(
  solutionId: string,
  reason: string,
) {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);

  console.log(chalk.cyan("\n⚠️  Deprecate Solution Pattern\n"));

  const result = await store.getSolution(solutionId);
  if (!result.success || !result.data) {
    console.error(chalk.red(`\n✗ Solution not found: ${solutionId}\n`));
    process.exit(1);
  }

  const solution = result.data;

  console.log(`Solution: ${chalk.bold(solution.name)}`);
  console.log(`Reason: ${reason}\n`);

  const confirm = await p.confirm({
    message: "Deprecate this solution?",
    initialValue: false,
  });

  if (p.isCancel(confirm) || !confirm) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  await store.deprecateSolution(solutionId, reason);
  console.log(chalk.green(`\n✓ Solution deprecated.\n`));
}

// ============================================
// solution:stats Command
// ============================================

/**
 * Show solution pattern statistics
 */
export async function solutionStatsCommand() {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);

  console.log(chalk.cyan("\n📊 Solution Pattern Statistics\n"));

  const stats = await store.getStats();

  console.log(chalk.dim("─".repeat(40)));
  console.log(`${chalk.bold("Solutions:")} ${stats.totalSolutions}`);
  console.log(`  Active: ${stats.totalSolutions - stats.deprecatedSolutions}`);
  console.log(`  Deprecated: ${stats.deprecatedSolutions}`);
  console.log(`  Private: ${stats.privateSolutions}`);
  console.log(`  Synced: ${stats.syncedSolutions}`);
  console.log(chalk.dim("─".repeat(40)));
  console.log(`${chalk.bold("Fixes:")} ${stats.totalFixes}`);
  console.log(`${chalk.bold("Blueprints:")} ${stats.totalBlueprints}`);
  console.log(chalk.dim("─".repeat(40)));

  // Category breakdown
  console.log(`\n${chalk.bold("By Category:")}`);
  const listResult = await store.listSolutions({ limit: 1000 });

  if (listResult.success && listResult.data) {
    const categories = new Map<SolutionCategory, number>();

    for (const s of listResult.data) {
      categories.set(s.category, (categories.get(s.category) || 0) + 1);
    }

    for (const [category, count] of categories) {
      console.log(`  ${formatCategory(category)}: ${count}`);
    }
  }

  console.log();
}
