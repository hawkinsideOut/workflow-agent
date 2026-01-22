import chalk from "chalk";
import * as p from "@clack/prompts";
import * as path from "node:path";
import {
  PatternStore,
  CodeAnalyzer,
  ContributorManager,
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
  await store.initialize();

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

  // Determine isPrivate: if --private flag is set, use it; otherwise check sync status
  // If sync is enabled, default to public (isPrivate: false) so solutions can be shared
  let isPrivate = options.private ?? false;
  if (options.private === undefined) {
    const contributorManager = new ContributorManager(cwd);
    const syncEnabled = await contributorManager.isSyncEnabled();
    // When sync is enabled, default to public; when disabled, default to private
    isPrivate = !syncEnabled;
  }

  try {
    const pattern = await analyzer.createSolutionPattern(
      absolutePath,
      name,
      description,
      category,
      keywords,
      { isPrivate },
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
  await store.initialize();

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
  await store.initialize();

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
  await store.initialize();

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
  await store.initialize();

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
  await store.initialize();

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

// ============================================
// solution:create Command
// ============================================

interface SolutionCreateOptions {
  name?: string;
  description?: string;
  category?: SolutionCategory;
  keywords?: string;
  framework?: string;
}

/**
 * Create a new solution pattern manually (without capturing from files)
 */
export async function solutionCreateCommand(options: SolutionCreateOptions) {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);
  await store.initialize();

  console.log(chalk.cyan("\n✨ Create Solution Pattern\n"));

  // Get pattern name
  let name = options.name;
  if (!name) {
    const nameInput = await p.text({
      message: "Solution name:",
      placeholder: "My Custom Solution",
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
      placeholder: "A description of what this solution does",
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
      placeholder: "auth, jwt, login",
    });

    if (p.isCancel(keywordsInput)) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }
    if (keywordsInput) {
      keywords = (keywordsInput as string).split(",").map((k) => k.trim());
    }
  }

  const framework = options.framework || "generic";
  const now = new Date().toISOString();

  // Create the solution pattern
  const solution: SolutionPattern = {
    id: crypto.randomUUID(),
    name,
    description,
    category,
    keywords,
    implementation: {
      files: [],
      dependencies: [],
      devDependencies: [],
      envVars: [],
    },
    compatibility: {
      framework,
      frameworkVersion: ">=1.0.0",
      runtime: "node",
      runtimeVersion: ">=18.0.0",
      dependencies: [],
    },
    metrics: {
      applications: 0,
      successes: 0,
      failures: 0,
      successRate: 0,
    },
    isPrivate: true,
    createdAt: now,
    updatedAt: now,
  };

  // Save the pattern
  await store.saveSolution(solution);

  console.log(chalk.green("\n✓ Solution pattern created!\n"));
  console.log(chalk.dim(`  ID: ${solution.id}`));
  console.log(chalk.dim(`  Name: ${name}`));
  console.log(chalk.dim(`  Category: ${category}`));
  console.log(chalk.dim(`\nAdd files using 'workflow solution capture --path <dir>'`));
}

// ============================================
// solution:show Command
// ============================================

/**
 * Show details of a specific solution pattern
 */
export async function solutionShowCommand(solutionId: string) {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);
  await store.initialize();

  console.log(chalk.cyan("\n📋 Solution Details\n"));

  const result = await store.getSolution(solutionId);
  if (!result.success || !result.data) {
    console.error(chalk.red(`\n✗ Solution not found: ${solutionId}\n`));
    process.exit(1);
  }

  const solution = result.data;

  console.log(chalk.dim("─".repeat(60)));
  console.log(chalk.bold(`Name: ${solution.name}`));
  console.log(`ID: ${chalk.dim(solution.id)}`);
  console.log(`Category: ${formatCategory(solution.category)}`);
  console.log(`Description: ${solution.description}`);
  console.log(chalk.dim("─".repeat(60)));

  // Compatibility
  console.log(chalk.bold("\nCompatibility:"));
  console.log(`  Framework: ${solution.compatibility.framework || "generic"}`);
  console.log(`  Version: ${solution.compatibility.frameworkVersion}`);
  console.log(`  Runtime: ${solution.compatibility.runtime} ${solution.compatibility.runtimeVersion}`);

  // Implementation
  console.log(chalk.bold("\nImplementation:"));
  console.log(`  Files: ${solution.implementation.files.length}`);
  for (const file of solution.implementation.files) {
    console.log(chalk.dim(`    • ${file.path} (${file.role})`));
  }

  if (solution.implementation.dependencies.length > 0) {
    console.log(`  Dependencies: ${solution.implementation.dependencies.length}`);
    for (const dep of solution.implementation.dependencies) {
      console.log(chalk.dim(`    • ${dep.name}@${dep.version}`));
    }
  }

  if (solution.implementation.envVars.length > 0) {
    console.log(`  Environment Variables: ${solution.implementation.envVars.length}`);
    for (const env of solution.implementation.envVars) {
      const required = env.required ? chalk.red("*") : "";
      console.log(chalk.dim(`    • ${env.name}${required}`));
    }
  }

  // Metrics
  console.log(chalk.bold("\nMetrics:"));
  console.log(`  Applications: ${solution.metrics.applications}`);
  console.log(`  Success Rate: ${(solution.metrics.successRate * 100).toFixed(1)}%`);

  // Metadata
  console.log(chalk.bold("\nMetadata:"));
  console.log(`  Created: ${formatDate(solution.createdAt)}`);
  console.log(`  Updated: ${formatDate(solution.updatedAt)}`);
  console.log(`  Private: ${solution.isPrivate ? "Yes" : "No"}`);
  if (solution.deprecatedAt) {
    console.log(chalk.red(`  Deprecated: ${formatDate(solution.deprecatedAt)}`));
    console.log(chalk.dim(`    Reason: ${solution.deprecationReason || "No reason provided"}`));
  }

  console.log();
}

// ============================================
// solution:export Command
// ============================================

interface SolutionExportOptions {
  output?: string;
  format?: "json" | "yaml";
  category?: SolutionCategory;
}

/**
 * Export solution patterns to a file
 */
export async function solutionExportCommand(options: SolutionExportOptions) {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);
  await store.initialize();
  const format = options.format ?? "json";
  const outputPath = options.output ?? `solutions-export.${format}`;

  console.log(chalk.cyan("\n📤 Exporting Solution Patterns\n"));

  const result = await store.listSolutions({
    solutionCategory: options.category,
    limit: 1000,
  });

  if (!result.success || !result.data) {
    console.error(chalk.red(`\n✗ Export failed: ${result.error}\n`));
    process.exit(1);
  }

  const solutions = result.data;

  if (solutions.length === 0) {
    console.log(chalk.yellow("  No solutions to export"));
    return;
  }

  // Format output
  const fs = await import("node:fs");
  const pathModule = await import("node:path");

  let output: string;
  if (format === "yaml") {
    output = `# Workflow Agent Solutions Export\n# Exported: ${new Date().toISOString()}\n\nsolutions:\n`;
    for (const solution of solutions) {
      output += `  - id: ${solution.id}\n`;
      output += `    name: "${solution.name}"\n`;
      output += `    category: ${solution.category}\n`;
      output += `    description: "${solution.description}"\n\n`;
    }
  } else {
    output = JSON.stringify(
      {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        solutions,
      },
      null,
      2,
    );
  }

  // Write file
  const fullOutputPath = pathModule.default.isAbsolute(outputPath)
    ? outputPath
    : pathModule.default.join(cwd, outputPath);

  await fs.promises.writeFile(fullOutputPath, output, "utf-8");

  console.log(chalk.green(`  ✓ Exported ${solutions.length} solutions\n`));
  console.log(chalk.dim(`    Output: ${fullOutputPath}`));
  console.log(chalk.dim(`    Format: ${format.toUpperCase()}`));
}

// ============================================
// solution:import Command
// ============================================

interface SolutionImportOptions {
  format?: "json" | "yaml";
  dryRun?: boolean;
  merge?: boolean;
}

/**
 * Import solution patterns from a file
 */
export async function solutionImportCommand(
  file: string,
  options: SolutionImportOptions,
) {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);
  await store.initialize();
  const dryRun = options.dryRun ?? false;
  const merge = options.merge ?? true;

  console.log(chalk.cyan("\n📥 Importing Solution Patterns\n"));

  const fs = await import("node:fs");
  const pathModule = await import("node:path");

  const filePath = pathModule.default.isAbsolute(file) ? file : pathModule.default.join(cwd, file);

  if (!fs.existsSync(filePath)) {
    console.log(chalk.red(`  ✗ File not found: ${filePath}`));
    process.exit(1);
  }

  const content = await fs.promises.readFile(filePath, "utf-8");

  let importData: { solutions?: SolutionPattern[] };

  try {
    if (file.endsWith(".yaml") || file.endsWith(".yml")) {
      console.log(chalk.yellow("  YAML import not fully supported, treating as JSON"));
    }
    importData = JSON.parse(content);
  } catch {
    console.log(chalk.red("  ✗ Failed to parse import file"));
    process.exit(1);
  }

  const solutions = importData.solutions || [];

  if (solutions.length === 0) {
    console.log(chalk.yellow("  No solutions found in import file"));
    return;
  }

  console.log(chalk.dim(`  Found ${solutions.length} solutions\n`));

  if (dryRun) {
    console.log(chalk.yellow("  🔍 Dry run - no changes will be made\n"));

    for (const solution of solutions) {
      console.log(chalk.dim(`    Would import: ${solution.name} (${solution.id})`));
    }
    return;
  }

  // Import solutions
  let imported = 0;
  let skipped = 0;

  for (const solution of solutions) {
    const existing = await store.getSolution(solution.id);
    if (existing.success && existing.data && !merge) {
      console.log(chalk.yellow(`    Skipped (exists): ${solution.name}`));
      skipped++;
      continue;
    }

    await store.saveSolution(solution);
    console.log(chalk.green(`    ✓ Imported: ${solution.name}`));
    imported++;
  }

  console.log(chalk.green(`\n  ✓ Import complete`));
  console.log(chalk.dim(`    Imported: ${imported}`));
  console.log(chalk.dim(`    Skipped: ${skipped}`));
}

// ============================================
// solution:analyze Command
// ============================================

/**
 * Analyze codebase for potential solution patterns
 */
export async function solutionAnalyzeCommand() {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);
  await store.initialize();
  const fs = await import("node:fs");
  const pathModule = await import("node:path");

  console.log(chalk.cyan("\n🔍 Analyzing Codebase for Solution Patterns\n"));

  // Get existing solutions
  const existingResult = await store.listSolutions({ limit: 1000 });
  const existingNames = (existingResult.data || []).map((s) => s.name.toLowerCase());

  const opportunities: Array<{
    name: string;
    category: SolutionCategory;
    description: string;
    path: string;
  }> = [];

  // Check for common solution patterns
  const patterns = [
    { path: "src/auth", name: "Authentication Module", category: "auth" as SolutionCategory, desc: "Authentication implementation" },
    { path: "src/lib/auth", name: "Auth Library", category: "auth" as SolutionCategory, desc: "Authentication utilities" },
    { path: "src/api", name: "API Layer", category: "api" as SolutionCategory, desc: "API routing structure" },
    { path: "app/api", name: "Next.js API Routes", category: "api" as SolutionCategory, desc: "Next.js API implementation" },
    { path: "src/db", name: "Database Layer", category: "database" as SolutionCategory, desc: "Database connection and queries" },
    { path: "src/lib/db", name: "Database Utilities", category: "database" as SolutionCategory, desc: "Database helper functions" },
    { path: "src/components/ui", name: "UI Components", category: "ui" as SolutionCategory, desc: "Reusable UI components" },
    { path: "src/hooks", name: "Custom Hooks", category: "ui" as SolutionCategory, desc: "React custom hooks" },
    { path: "__tests__", name: "Testing Setup", category: "testing" as SolutionCategory, desc: "Test configuration and utilities" },
    { path: ".github/workflows", name: "CI/CD Pipeline", category: "deployment" as SolutionCategory, desc: "GitHub Actions workflows" },
    { path: "src/integrations", name: "Integrations", category: "integrations" as SolutionCategory, desc: "Third-party integrations" },
    { path: "src/middleware", name: "Middleware", category: "security" as SolutionCategory, desc: "Request middleware and guards" },
  ];

  for (const pattern of patterns) {
    const fullPath = pathModule.default.join(cwd, pattern.path);
    if (fs.existsSync(fullPath) && !existingNames.includes(pattern.name.toLowerCase())) {
      opportunities.push({
        name: pattern.name,
        category: pattern.category,
        description: pattern.desc,
        path: pattern.path,
      });
    }
  }

  if (opportunities.length === 0) {
    console.log(chalk.green("  ✓ No new solution opportunities found"));
    console.log(chalk.dim("\n  Your solutions seem well-captured!"));
    return;
  }

  console.log(chalk.bold(`  Found ${opportunities.length} potential solutions:\n`));

  for (const opp of opportunities) {
    console.log(`  ${formatCategory(opp.category)}`);
    console.log(chalk.bold(`    ${opp.name}`));
    console.log(chalk.dim(`    ${opp.description}`));
    console.log(chalk.dim(`    Path: ${opp.path}\n`));
  }

  console.log(chalk.dim("  To capture a solution:"));
  console.log(chalk.cyan("    workflow solution capture --path <path> --name <name>"));
}
// ============================================
// solution:migrate Command
// ============================================

interface SolutionMigrateOptions {
  public?: boolean;
  private?: boolean;
  dryRun?: boolean;
}

/**
 * Migrate solution patterns (e.g., make all public or private)
 */
export async function solutionMigrateCommand(options: SolutionMigrateOptions) {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);
  await store.initialize();

  console.log(chalk.cyan("\n🔄 Migrate Solution Patterns\n"));

  if (!options.public && !options.private) {
    console.log(chalk.yellow("  Please specify --public or --private"));
    console.log(chalk.dim("\n  Examples:"));
    console.log(chalk.dim("    workflow solution migrate --public     # Make all solutions public"));
    console.log(chalk.dim("    workflow solution migrate --private    # Make all solutions private"));
    return;
  }

  const targetPrivate = options.private ?? false;
  const targetLabel = targetPrivate ? "private" : "public";

  const result = await store.listSolutions({ limit: 1000 });
  if (!result.success || !result.data) {
    console.log(chalk.red(`  ✗ Failed to load solutions: ${result.error}`));
    return;
  }

  const solutions = result.data;
  const toMigrate = solutions.filter((s) => s.isPrivate !== targetPrivate);

  if (toMigrate.length === 0) {
    console.log(chalk.green(`  ✓ All ${solutions.length} solutions are already ${targetLabel}`));
    return;
  }

  console.log(chalk.dim(`  Found ${toMigrate.length} solutions to make ${targetLabel}:\n`));

  for (const solution of toMigrate) {
    console.log(chalk.dim(`    • ${solution.name} (${solution.id.slice(0, 8)})`));
  }

  if (options.dryRun) {
    console.log(chalk.yellow(`\n  [DRY-RUN] Would migrate ${toMigrate.length} solutions to ${targetLabel}`));
    return;
  }

  // Confirm
  const confirm = await p.confirm({
    message: `Migrate ${toMigrate.length} solutions to ${targetLabel}?`,
    initialValue: true,
  });

  if (p.isCancel(confirm) || !confirm) {
    p.cancel("Migration cancelled");
    return;
  }

  // Perform migration
  let migrated = 0;
  for (const solution of toMigrate) {
    const updated: SolutionPattern = {
      ...solution,
      isPrivate: targetPrivate,
      updatedAt: new Date().toISOString(),
    };
    const saveResult = await store.saveSolution(updated);
    if (saveResult.success) {
      migrated++;
    }
  }

  console.log(chalk.green(`\n  ✓ Migrated ${migrated} solutions to ${targetLabel}`));
  
  if (!targetPrivate) {
    console.log(chalk.dim("    These solutions can now be synced with 'workflow sync --solutions --push'"));
  }
}

// ============================================
// solution:edit Command
// ============================================

interface SolutionEditOptions {
  name?: string;
  description?: string;
  public?: boolean;
  private?: boolean;
}

/**
 * Edit a solution pattern's properties
 */
export async function solutionEditCommand(solutionId: string, options: SolutionEditOptions) {
  const cwd = getWorkspacePath();
  const store = new PatternStore(cwd);
  await store.initialize();

  console.log(chalk.cyan("\n✏️ Edit Solution Pattern\n"));

  // Find the solution
  const result = await store.getSolution(solutionId);
  
  if (!result.success || !result.data) {
    // Try partial ID match
    const allResult = await store.listSolutions({ limit: 1000 });
    if (allResult.success && allResult.data) {
      const match = allResult.data.find((s) => s.id.startsWith(solutionId));
      if (match) {
        return solutionEditCommand(match.id, options);
      }
    }
    console.log(chalk.red(`  ✗ Solution not found: ${solutionId}`));
    return;
  }

  const solution = result.data;
  let updated = { ...solution };
  const changes: string[] = [];

  // Apply changes
  if (options.name) {
    updated.name = options.name;
    changes.push(`name: "${options.name}"`);
  }

  if (options.description) {
    updated.description = options.description;
    changes.push(`description: "${options.description.slice(0, 30)}..."`);
  }

  if (options.public !== undefined && options.public) {
    updated.isPrivate = false;
    changes.push("visibility: public");
  } else if (options.private !== undefined && options.private) {
    updated.isPrivate = true;
    changes.push("visibility: private");
  }

  if (changes.length === 0) {
    console.log(chalk.yellow("  No changes specified"));
    console.log(chalk.dim("\n  Options:"));
    console.log(chalk.dim("    --name <name>        Update name"));
    console.log(chalk.dim("    --description <desc> Update description"));
    console.log(chalk.dim("    --public             Make public (syncable)"));
    console.log(chalk.dim("    --private            Make private"));
    return;
  }

  // Show current and changes
  console.log(chalk.dim(`  Solution: ${solution.name} (${solution.id.slice(0, 8)})`));
  console.log(chalk.dim("  Changes:"));
  for (const change of changes) {
    console.log(chalk.dim(`    • ${change}`));
  }

  // Update
  updated.updatedAt = new Date().toISOString();
  const saveResult = await store.saveSolution(updated);

  if (saveResult.success) {
    console.log(chalk.green("\n  ✓ Solution updated"));
    
    if (options.public) {
      console.log(chalk.dim("    This solution can now be synced with 'workflow sync --solutions --push'"));
    }
  } else {
    console.log(chalk.red(`\n  ✗ Failed to save: ${saveResult.error}`));
  }
}