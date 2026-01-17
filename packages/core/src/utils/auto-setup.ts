/**
 * Auto-Setup Utilities
 *
 * Intelligent project setup that:
 * - Analyzes what a project has and needs
 * - Generates audit reports showing what will change
 * - MERGES with existing configs (improves, doesn't replace)
 * - Batches dependency installs for performance
 * - Supports monorepos with root + shared configs
 *
 * Works like a developer would: analyze first, then configure.
 */

import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { execa } from "execa";
import {
  detectPackageManager,
  isMonorepo,
  getPackageScripts,
  type PackageManager,
} from "./git-repo.js";

// ============================================================================
// Types
// ============================================================================

export interface ProjectAnalysis {
  packageManager: PackageManager;
  isMonorepo: boolean;
  isTypeScript: boolean;
  framework: FrameworkType;
  existing: ExistingConfigs;
  scripts: ExistingScripts;
  setupPlans: SetupPlan[];
}

export interface ExistingConfigs {
  typescript: boolean;
  eslint: boolean;
  eslintFlat: boolean;
  prettier: boolean;
  vitest: boolean;
  jest: boolean;
  husky: boolean;
  simpleGitHooks: boolean;
  githubActions: boolean;
}

export interface ExistingScripts {
  build: boolean;
  test: boolean;
  lint: boolean;
  format: boolean;
  typecheck: boolean;
  verify: boolean;
}

export interface SetupPlan {
  name: string;
  description: string;
  priority: "high" | "medium" | "low";
  changes: ConfigChange[];
  dependencies: string[];
  devDependencies: string[];
}

export interface ConfigChange {
  type: "add" | "modify" | "unchanged";
  file: string;
  key?: string;
  oldValue?: unknown;
  newValue?: unknown;
  description: string;
}

export interface SetupResult {
  success: boolean;
  name: string;
  message: string;
  filesCreated: string[];
  filesUpdated: string[];
  packagesInstalled: string[];
}

export interface AuditReport {
  analysis: ProjectAnalysis;
  totalChanges: number;
  allDependencies: string[];
  allDevDependencies: string[];
  plans: SetupPlan[];
}

export type FrameworkType =
  | "nextjs"
  | "remix"
  | "react"
  | "vue"
  | "nuxt"
  | "svelte"
  | "node"
  | "express"
  | "hono"
  | "shopify"
  | "unknown";

// Package.json structure for type safety
interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
  "simple-git-hooks"?: Record<string, string>;
  "lint-staged"?: Record<string, string | string[]>;
  [key: string]: unknown;
}

// TSConfig structure
interface TSConfig {
  compilerOptions?: Record<string, unknown>;
  include?: string[];
  exclude?: string[];
  [key: string]: unknown;
}

// ============================================================================
// Project Analysis
// ============================================================================

/**
 * Analyze a project to determine what setup is needed
 */
export async function analyzeProject(
  projectPath: string = process.cwd(),
): Promise<ProjectAnalysis> {
  const packageManager = await detectPackageManager(projectPath);
  const mono = await isMonorepo(projectPath);
  const scripts = await getPackageScripts(projectPath);

  // Check for TypeScript
  const isTypeScript =
    existsSync(join(projectPath, "tsconfig.json")) ||
    existsSync(join(projectPath, "src/index.ts")) ||
    existsSync(join(projectPath, "index.ts"));

  // Detect framework
  const framework = await detectFramework(projectPath);

  // Check existing configs
  const existing: ExistingConfigs = {
    typescript: existsSync(join(projectPath, "tsconfig.json")),
    eslint:
      existsSync(join(projectPath, "eslint.config.js")) ||
      existsSync(join(projectPath, "eslint.config.mjs")) ||
      existsSync(join(projectPath, ".eslintrc.js")) ||
      existsSync(join(projectPath, ".eslintrc.json")) ||
      existsSync(join(projectPath, ".eslintrc")),
    eslintFlat:
      existsSync(join(projectPath, "eslint.config.js")) ||
      existsSync(join(projectPath, "eslint.config.mjs")),
    prettier:
      existsSync(join(projectPath, ".prettierrc")) ||
      existsSync(join(projectPath, ".prettierrc.json")) ||
      existsSync(join(projectPath, "prettier.config.js")) ||
      existsSync(join(projectPath, "prettier.config.mjs")),
    vitest:
      existsSync(join(projectPath, "vitest.config.ts")) ||
      existsSync(join(projectPath, "vitest.config.js")),
    jest:
      existsSync(join(projectPath, "jest.config.js")) ||
      existsSync(join(projectPath, "jest.config.ts")),
    husky: existsSync(join(projectPath, ".husky")),
    simpleGitHooks:
      existsSync(join(projectPath, ".git/hooks/pre-commit")) ||
      (await hasSimpleGitHooksConfig(projectPath)),
    githubActions: existsSync(join(projectPath, ".github/workflows")),
  };

  // Check existing scripts
  const existingScripts: ExistingScripts = {
    build: !!scripts.build,
    test: !!scripts.test,
    lint: !!scripts.lint,
    format: !!scripts.format,
    typecheck: !!scripts.typecheck,
    verify: !!scripts.verify,
  };

  // Generate setup plans
  const setupPlans = await generateSetupPlans(
    projectPath,
    packageManager,
    isTypeScript,
    framework,
    existing,
    existingScripts,
    mono,
  );

  return {
    packageManager,
    isMonorepo: mono,
    isTypeScript,
    framework,
    existing,
    scripts: existingScripts,
    setupPlans,
  };
}

async function hasSimpleGitHooksConfig(projectPath: string): Promise<boolean> {
  try {
    const pkgPath = join(projectPath, "package.json");
    if (!existsSync(pkgPath)) return false;
    const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
    return !!pkg["simple-git-hooks"];
  } catch {
    return false;
  }
}

/**
 * Detect the framework used in the project
 */
async function detectFramework(projectPath: string): Promise<FrameworkType> {
  try {
    const pkgPath = join(projectPath, "package.json");
    if (!existsSync(pkgPath)) return "unknown";

    const pkg = JSON.parse(await readFile(pkgPath, "utf-8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };

    // Shopify theme detection
    if (
      existsSync(join(projectPath, "shopify.theme.toml")) ||
      existsSync(join(projectPath, "config/settings_schema.json")) ||
      deps["@shopify/cli"] ||
      deps["@shopify/theme"]
    ) {
      return "shopify";
    }

    // Framework detection by dependencies
    if (deps.next) return "nextjs";
    if (deps["@remix-run/react"]) return "remix";
    if (deps.nuxt) return "nuxt";
    if (deps.vue) return "vue";
    if (deps.svelte || deps["@sveltejs/kit"]) return "svelte";
    if (deps.react && !deps.next) return "react";
    if (deps.hono) return "hono";
    if (deps.express) return "express";
    if (deps["@types/node"] || pkg.type === "module") return "node";

    return "unknown";
  } catch {
    return "unknown";
  }
}

// ============================================================================
// Setup Plan Generation
// ============================================================================

async function generateSetupPlans(
  projectPath: string,
  packageManager: PackageManager,
  isTypeScript: boolean,
  framework: FrameworkType,
  existing: ExistingConfigs,
  scripts: ExistingScripts,
  isMonorepo: boolean,
): Promise<SetupPlan[]> {
  const plans: SetupPlan[] = [];

  // TypeScript setup/improvement
  if (isTypeScript) {
    plans.push(
      await planTypeScriptSetup(
        projectPath,
        framework,
        existing.typescript,
        isMonorepo,
      ),
    );
  }

  // ESLint setup/improvement
  plans.push(
    await planESLintSetup(projectPath, isTypeScript, framework, existing),
  );

  // Prettier setup/improvement
  plans.push(await planPrettierSetup(projectPath, existing.prettier));

  // Testing setup
  plans.push(
    await planTestingSetup(projectPath, isTypeScript, framework, existing),
  );

  // Build configuration (for non-framework TS projects)
  if (isTypeScript && !["nextjs", "remix", "nuxt"].includes(framework)) {
    plans.push(await planBuildSetup(projectPath, scripts.build));
  }

  // Scripts setup
  plans.push(
    await planScriptsSetup(projectPath, isTypeScript, framework, scripts),
  );

  // Pre-commit hooks
  plans.push(await planHooksSetup(projectPath, existing));

  // GitHub Actions CI
  plans.push(
    await planCISetup(
      projectPath,
      packageManager,
      isTypeScript,
      framework,
      existing.githubActions,
      isMonorepo,
    ),
  );

  return plans;
}

// ============================================================================
// Individual Plan Generators
// ============================================================================

async function planTypeScriptSetup(
  projectPath: string,
  _framework: FrameworkType,
  hasExisting: boolean,
  isMonorepo: boolean,
): Promise<SetupPlan> {
  const changes: ConfigChange[] = [];
  const devDeps: string[] = [];

  // Check if typescript is installed
  const pkg = await readPackageJson(projectPath);
  const deps = pkg.dependencies || {};
  const devDepsPkg = pkg.devDependencies || {};
  const allDeps = { ...deps, ...devDepsPkg };
  if (!allDeps.typescript) {
    devDeps.push("typescript");
  }

  if (hasExisting) {
    // Audit existing config
    const tsconfig = await readTSConfig(join(projectPath, "tsconfig.json"));
    const opts = tsconfig.compilerOptions || {};

    // Recommend improvements
    if (!opts.strict) {
      changes.push({
        type: "modify",
        file: "tsconfig.json",
        key: "compilerOptions.strict",
        oldValue: opts.strict,
        newValue: true,
        description: "Enable strict type checking",
      });
    }
    if (!opts.skipLibCheck) {
      changes.push({
        type: "modify",
        file: "tsconfig.json",
        key: "compilerOptions.skipLibCheck",
        oldValue: opts.skipLibCheck,
        newValue: true,
        description:
          "Skip type checking of declaration files for faster builds",
      });
    }
    if (opts.target !== "ES2022" && opts.target !== "ESNext") {
      changes.push({
        type: "modify",
        file: "tsconfig.json",
        key: "compilerOptions.target",
        oldValue: opts.target,
        newValue: "ES2022",
        description: "Use modern JavaScript target",
      });
    }
  } else {
    changes.push({
      type: "add",
      file: isMonorepo ? "tsconfig.base.json" : "tsconfig.json",
      description: `Create TypeScript configuration${isMonorepo ? " (shared base for monorepo)" : ""}`,
    });
  }

  return {
    name: "typescript",
    description: hasExisting
      ? "Improve TypeScript configuration"
      : "Set up TypeScript configuration",
    priority: "high",
    changes,
    dependencies: [],
    devDependencies: devDeps,
  };
}

async function planESLintSetup(
  projectPath: string,
  isTypeScript: boolean,
  framework: FrameworkType,
  existing: ExistingConfigs,
): Promise<SetupPlan> {
  const changes: ConfigChange[] = [];
  const devDeps: string[] = [];

  const pkg = await readPackageJson(projectPath);
  const deps = pkg.dependencies || {};
  const devDepsPkg = pkg.devDependencies || {};
  const allDeps = { ...deps, ...devDepsPkg };

  // Core ESLint
  if (!allDeps.eslint) {
    devDeps.push("eslint");
  }

  // TypeScript support
  if (isTypeScript) {
    if (!allDeps["@typescript-eslint/eslint-plugin"]) {
      devDeps.push("@typescript-eslint/eslint-plugin");
    }
    if (!allDeps["@typescript-eslint/parser"]) {
      devDeps.push("@typescript-eslint/parser");
    }
    if (!allDeps["typescript-eslint"]) {
      devDeps.push("typescript-eslint");
    }
  }

  // Framework-specific plugins
  if (framework === "react" || framework === "nextjs") {
    if (!allDeps["eslint-plugin-react"]) devDeps.push("eslint-plugin-react");
    if (!allDeps["eslint-plugin-react-hooks"])
      devDeps.push("eslint-plugin-react-hooks");
  }

  if (existing.eslint) {
    if (!existing.eslintFlat) {
      changes.push({
        type: "modify",
        file: "eslint.config.mjs",
        description: "Migrate to ESLint 9 flat config format (recommended)",
      });
    } else {
      changes.push({
        type: "unchanged",
        file: "eslint.config.mjs",
        description: "ESLint flat config already exists",
      });
    }
  } else {
    changes.push({
      type: "add",
      file: "eslint.config.mjs",
      description: "Create ESLint configuration with TypeScript support",
    });
  }

  return {
    name: "eslint",
    description: existing.eslint
      ? "Audit ESLint configuration and dependencies"
      : "Set up ESLint for code linting",
    priority: "high",
    changes,
    dependencies: [],
    devDependencies: devDeps,
  };
}

async function planPrettierSetup(
  projectPath: string,
  hasExisting: boolean,
): Promise<SetupPlan> {
  const changes: ConfigChange[] = [];
  const devDeps: string[] = [];

  const pkg = await readPackageJson(projectPath);
  const deps = pkg.dependencies || {};
  const devDepsPkg = pkg.devDependencies || {};
  const allDeps = { ...deps, ...devDepsPkg };

  if (!allDeps.prettier) {
    devDeps.push("prettier");
  }

  if (hasExisting) {
    const prettierConfig = await readPrettierConfig(projectPath);
    // Check for recommended settings
    if (prettierConfig.printWidth === undefined) {
      changes.push({
        type: "modify",
        file: ".prettierrc",
        key: "printWidth",
        newValue: 100,
        description: "Add printWidth setting",
      });
    }
    if (prettierConfig.trailingComma === undefined) {
      changes.push({
        type: "modify",
        file: ".prettierrc",
        key: "trailingComma",
        newValue: "es5",
        description: "Add trailing comma setting",
      });
    }
    if (changes.length === 0) {
      changes.push({
        type: "unchanged",
        file: ".prettierrc",
        description: "Prettier configuration is complete",
      });
    }
  } else {
    changes.push({
      type: "add",
      file: ".prettierrc",
      description: "Create Prettier configuration",
    });
    changes.push({
      type: "add",
      file: ".prettierignore",
      description: "Create Prettier ignore file",
    });
  }

  return {
    name: "prettier",
    description: hasExisting
      ? "Audit Prettier configuration"
      : "Set up Prettier for code formatting",
    priority: "high",
    changes,
    dependencies: [],
    devDependencies: devDeps,
  };
}

async function planTestingSetup(
  projectPath: string,
  isTypeScript: boolean,
  framework: FrameworkType,
  existing: ExistingConfigs,
): Promise<SetupPlan> {
  const changes: ConfigChange[] = [];
  const devDeps: string[] = [];

  const pkg = await readPackageJson(projectPath);
  const deps = pkg.dependencies || {};
  const devDepsPkg = pkg.devDependencies || {};
  const allDeps = { ...deps, ...devDepsPkg };

  // Respect existing Jest - don't force Vitest
  if (existing.jest) {
    changes.push({
      type: "unchanged",
      file: "jest.config.*",
      description: "Jest configuration exists (preserving existing setup)",
    });
    return {
      name: "testing",
      description: "Jest testing already configured",
      priority: "high",
      changes,
      dependencies: [],
      devDependencies: [],
    };
  }

  // Set up Vitest
  if (!allDeps.vitest) {
    devDeps.push("vitest");
  }
  if (!allDeps["@vitest/coverage-v8"]) {
    devDeps.push("@vitest/coverage-v8");
  }

  // DOM testing for frontend frameworks
  if (["react", "nextjs", "vue", "nuxt", "svelte"].includes(framework)) {
    if (!allDeps.jsdom) devDeps.push("jsdom");
    if (framework === "react" || framework === "nextjs") {
      if (!allDeps["@testing-library/react"])
        devDeps.push("@testing-library/react");
    }
  }

  if (existing.vitest) {
    changes.push({
      type: "unchanged",
      file: `vitest.config.${isTypeScript ? "ts" : "js"}`,
      description: "Vitest configuration already exists",
    });
  } else {
    changes.push({
      type: "add",
      file: `vitest.config.${isTypeScript ? "ts" : "js"}`,
      description: "Create Vitest configuration",
    });
  }

  return {
    name: "testing",
    description: existing.vitest
      ? "Audit Vitest dependencies"
      : "Set up Vitest for testing",
    priority: "high",
    changes,
    dependencies: [],
    devDependencies: devDeps,
  };
}

async function planBuildSetup(
  projectPath: string,
  hasBuildScript: boolean,
): Promise<SetupPlan> {
  const changes: ConfigChange[] = [];
  const devDeps: string[] = [];

  const pkg = await readPackageJson(projectPath);
  const deps = pkg.dependencies || {};
  const devDepsPkg = pkg.devDependencies || {};
  const allDeps = { ...deps, ...devDepsPkg };

  if (hasBuildScript) {
    changes.push({
      type: "unchanged",
      file: "package.json",
      key: "scripts.build",
      description: "Build script already configured",
    });
  } else {
    if (!allDeps.tsup) {
      devDeps.push("tsup");
    }
    changes.push({
      type: "add",
      file: "tsup.config.ts",
      description: "Create tsup build configuration",
    });
  }

  return {
    name: "build",
    description: hasBuildScript
      ? "Build configuration exists"
      : "Set up tsup for TypeScript builds",
    priority: "medium",
    changes,
    dependencies: [],
    devDependencies: devDeps,
  };
}

async function planScriptsSetup(
  _projectPath: string,
  isTypeScript: boolean,
  _framework: FrameworkType,
  scripts: ExistingScripts,
): Promise<SetupPlan> {
  const changes: ConfigChange[] = [];
  const scriptsToAdd: Record<string, string> = {};

  if (!scripts.lint) {
    scriptsToAdd.lint = "eslint src";
    changes.push({
      type: "add",
      file: "package.json",
      key: "scripts.lint",
      newValue: "eslint src",
      description: "Add lint script",
    });
  }

  if (!scripts.format) {
    scriptsToAdd.format = 'prettier --write "src/**/*.{ts,tsx,js,jsx,json}"';
    changes.push({
      type: "add",
      file: "package.json",
      key: "scripts.format",
      newValue: scriptsToAdd.format,
      description: "Add format script",
    });
  }

  if (isTypeScript && !scripts.typecheck) {
    scriptsToAdd.typecheck = "tsc --noEmit";
    changes.push({
      type: "add",
      file: "package.json",
      key: "scripts.typecheck",
      newValue: "tsc --noEmit",
      description: "Add typecheck script",
    });
  }

  if (!scripts.test) {
    scriptsToAdd.test = "vitest run";
    changes.push({
      type: "add",
      file: "package.json",
      key: "scripts.test",
      newValue: "vitest run",
      description: "Add test script",
    });
  }

  if (!scripts.verify) {
    scriptsToAdd.verify = "workflow-agent verify";
    changes.push({
      type: "add",
      file: "package.json",
      key: "scripts.verify",
      newValue: "workflow-agent verify",
      description: "Add verify script",
    });
  }

  if (Object.keys(scriptsToAdd).length === 0) {
    changes.push({
      type: "unchanged",
      file: "package.json",
      description: "All standard scripts already configured",
    });
  }

  return {
    name: "scripts",
    description: "Configure npm scripts",
    priority: "medium",
    changes,
    dependencies: [],
    devDependencies: [],
  };
}

async function planHooksSetup(
  projectPath: string,
  existing: ExistingConfigs,
): Promise<SetupPlan> {
  const changes: ConfigChange[] = [];
  const devDeps: string[] = [];

  const pkg = await readPackageJson(projectPath);
  const deps = pkg.dependencies || {};
  const devDepsPkg = pkg.devDependencies || {};
  const allDeps = { ...deps, ...devDepsPkg };

  // Prefer simple-git-hooks over husky
  if (!allDeps["simple-git-hooks"]) {
    devDeps.push("simple-git-hooks");
  }
  if (!allDeps["lint-staged"]) {
    devDeps.push("lint-staged");
  }

  if (existing.husky || existing.simpleGitHooks) {
    changes.push({
      type: "modify",
      file: "package.json",
      key: "simple-git-hooks",
      description: "Ensure pre-commit hook configuration",
    });
  } else {
    changes.push({
      type: "add",
      file: "package.json",
      key: "simple-git-hooks",
      newValue: { "pre-commit": "npx lint-staged" },
      description: "Add pre-commit hook configuration",
    });
    changes.push({
      type: "add",
      file: "package.json",
      key: "lint-staged",
      description: "Add lint-staged configuration",
    });
  }

  return {
    name: "hooks",
    description:
      existing.husky || existing.simpleGitHooks
        ? "Audit pre-commit hooks"
        : "Set up pre-commit hooks",
    priority: "medium",
    changes,
    dependencies: [],
    devDependencies: devDeps,
  };
}

async function planCISetup(
  projectPath: string,
  _packageManager: PackageManager,
  _isTypeScript: boolean,
  _framework: FrameworkType,
  hasExisting: boolean,
  _isMonorepo: boolean,
): Promise<SetupPlan> {
  const changes: ConfigChange[] = [];

  if (hasExisting) {
    // Check if ci.yml exists specifically
    if (existsSync(join(projectPath, ".github/workflows/ci.yml"))) {
      changes.push({
        type: "unchanged",
        file: ".github/workflows/ci.yml",
        description: "CI workflow already exists",
      });
    } else {
      changes.push({
        type: "add",
        file: ".github/workflows/ci.yml",
        description: "Add CI workflow (other workflows exist)",
      });
    }
  } else {
    changes.push({
      type: "add",
      file: ".github/workflows/ci.yml",
      description: "Create GitHub Actions CI workflow",
    });
  }

  return {
    name: "ci",
    description: hasExisting
      ? "Audit CI configuration"
      : "Set up GitHub Actions CI",
    priority: "low",
    changes,
    dependencies: [],
    devDependencies: [],
  };
}

// ============================================================================
// Audit Report Generation
// ============================================================================

/**
 * Generate a comprehensive audit report
 */
export async function generateAuditReport(
  projectPath: string = process.cwd(),
): Promise<AuditReport> {
  const analysis = await analyzeProject(projectPath);

  // Collect all dependencies across plans
  const allDeps = new Set<string>();
  const allDevDeps = new Set<string>();

  for (const plan of analysis.setupPlans) {
    plan.dependencies.forEach((d) => allDeps.add(d));
    plan.devDependencies.forEach((d) => allDevDeps.add(d));
  }

  // Count total changes
  const totalChanges = analysis.setupPlans.reduce(
    (sum, plan) =>
      sum + plan.changes.filter((c) => c.type !== "unchanged").length,
    0,
  );

  return {
    analysis,
    totalChanges,
    allDependencies: Array.from(allDeps),
    allDevDependencies: Array.from(allDevDeps),
    plans: analysis.setupPlans,
  };
}

/**
 * Format audit report for console display
 */
export function formatAuditReport(report: AuditReport): string {
  const lines: string[] = [];

  lines.push("📋 Auto-Setup Audit Report\n");
  lines.push(`Framework: ${report.analysis.framework}`);
  lines.push(`Package Manager: ${report.analysis.packageManager}`);
  lines.push(`TypeScript: ${report.analysis.isTypeScript ? "Yes" : "No"}`);
  lines.push(`Monorepo: ${report.analysis.isMonorepo ? "Yes" : "No"}\n`);

  for (const plan of report.plans) {
    const hasChanges = plan.changes.some((c) => c.type !== "unchanged");
    const icon = hasChanges ? "🔧" : "✓";
    lines.push(
      `${icon} ${plan.name.charAt(0).toUpperCase() + plan.name.slice(1)}`,
    );

    for (const change of plan.changes) {
      const symbol =
        change.type === "add" ? "+" : change.type === "modify" ? "~" : "=";

      let line = `  ${symbol} ${change.description}`;
      if (
        change.key &&
        change.oldValue !== undefined &&
        change.newValue !== undefined
      ) {
        line += ` (${String(change.oldValue)} → ${String(change.newValue)})`;
      }
      lines.push(line);
    }

    if (plan.devDependencies.length > 0) {
      lines.push(`  📦 Install: ${plan.devDependencies.join(", ")}`);
    }
    lines.push("");
  }

  if (report.allDevDependencies.length > 0) {
    lines.push("Dependencies to install (batched):");
    const pm = report.analysis.packageManager;
    const cmd =
      pm === "npm" ? "npm install" : pm === "yarn" ? "yarn add" : `${pm} add`;
    lines.push(`  ${cmd} -D ${report.allDevDependencies.join(" ")}`);
    lines.push("");
  }

  lines.push(`Total changes: ${report.totalChanges}`);

  return lines.join("\n");
}

// ============================================================================
// Setup Execution
// ============================================================================

/**
 * Execute all setup plans
 */
export async function runAllSetups(
  projectPath: string = process.cwd(),
  onProgress?: (step: string, status: "start" | "done" | "error") => void,
): Promise<SetupResult[]> {
  const report = await generateAuditReport(projectPath);
  const results: SetupResult[] = [];
  const filesCreated: string[] = [];
  const filesUpdated: string[] = [];

  // Step 1: Batch install all dependencies
  if (report.allDevDependencies.length > 0) {
    onProgress?.("Installing dependencies", "start");
    try {
      await installDependencies(
        projectPath,
        report.analysis.packageManager,
        report.allDevDependencies,
      );
      onProgress?.("Installing dependencies", "done");
    } catch (error) {
      onProgress?.("Installing dependencies", "error");
      results.push({
        success: false,
        name: "dependencies",
        message: `Failed to install: ${error instanceof Error ? error.message : String(error)}`,
        filesCreated: [],
        filesUpdated: [],
        packagesInstalled: [],
      });
      return results;
    }
  }

  // Step 2: Apply each setup
  for (const plan of report.plans) {
    const hasChanges = plan.changes.some((c) => c.type !== "unchanged");
    if (!hasChanges && plan.devDependencies.length === 0) continue;

    onProgress?.(`Setting up ${plan.name}`, "start");

    try {
      const result = await applySetupPlan(projectPath, plan, report.analysis);
      results.push(result);
      filesCreated.push(...result.filesCreated);
      filesUpdated.push(...result.filesUpdated);
      onProgress?.(`Setting up ${plan.name}`, "done");
    } catch (error) {
      onProgress?.(`Setting up ${plan.name}`, "error");
      results.push({
        success: false,
        name: plan.name,
        message: `Failed: ${error instanceof Error ? error.message : String(error)}`,
        filesCreated: [],
        filesUpdated: [],
        packagesInstalled: [],
      });
    }
  }

  // Step 3: Initialize git hooks
  onProgress?.("Initializing git hooks", "start");
  try {
    await execa("npx", ["simple-git-hooks"], {
      cwd: projectPath,
      stdio: "pipe",
    });
    onProgress?.("Initializing git hooks", "done");
  } catch {
    // May fail if not in a git repo
    onProgress?.("Initializing git hooks", "error");
  }

  return results;
}

async function installDependencies(
  projectPath: string,
  packageManager: PackageManager,
  packages: string[],
): Promise<void> {
  if (packages.length === 0) return;

  const commands: Record<PackageManager, { cmd: string; args: string[] }> = {
    npm: { cmd: "npm", args: ["install", "--save-dev"] },
    pnpm: { cmd: "pnpm", args: ["add", "-D"] },
    yarn: { cmd: "yarn", args: ["add", "-D"] },
    bun: { cmd: "bun", args: ["add", "-D"] },
  };

  const { cmd, args } = commands[packageManager];
  await execa(cmd, [...args, ...packages], {
    cwd: projectPath,
    stdio: "pipe",
  });
}

async function applySetupPlan(
  projectPath: string,
  plan: SetupPlan,
  analysis: ProjectAnalysis,
): Promise<SetupResult> {
  const filesCreated: string[] = [];
  const filesUpdated: string[] = [];

  switch (plan.name) {
    case "typescript":
      await applyTypeScriptSetup(
        projectPath,
        analysis,
        filesCreated,
        filesUpdated,
      );
      break;
    case "eslint":
      await applyESLintSetup(projectPath, analysis, filesCreated, filesUpdated);
      break;
    case "prettier":
      await applyPrettierSetup(projectPath, filesCreated, filesUpdated);
      break;
    case "testing":
      await applyTestingSetup(
        projectPath,
        analysis,
        filesCreated,
        filesUpdated,
      );
      break;
    case "build":
      await applyBuildSetup(projectPath, filesCreated, filesUpdated);
      break;
    case "scripts":
      await applyScriptsSetup(projectPath, analysis, filesUpdated);
      break;
    case "hooks":
      await applyHooksSetup(projectPath, filesUpdated);
      break;
    case "ci":
      await applyCISetup(projectPath, analysis, filesCreated, filesUpdated);
      break;
  }

  return {
    success: true,
    name: plan.name,
    message: `${plan.name} configured successfully`,
    filesCreated,
    filesUpdated,
    packagesInstalled: plan.devDependencies,
  };
}

// ============================================================================
// Setup Application Functions
// ============================================================================

async function applyTypeScriptSetup(
  projectPath: string,
  analysis: ProjectAnalysis,
  filesCreated: string[],
  filesUpdated: string[],
): Promise<void> {
  const configName = analysis.isMonorepo
    ? "tsconfig.base.json"
    : "tsconfig.json";
  const configPath = join(projectPath, configName);

  let tsconfig: Record<string, unknown> = {};

  if (existsSync(configPath)) {
    tsconfig = await readJsonFile(configPath);
    filesUpdated.push(configName);
  } else {
    filesCreated.push(configName);
  }

  // Ensure compilerOptions
  if (!tsconfig.compilerOptions) {
    tsconfig.compilerOptions = {};
  }
  const opts = tsconfig.compilerOptions as Record<string, unknown>;

  // Apply improvements (merge with existing)
  const improvements: Record<string, unknown> = {
    target: opts.target || "ES2022",
    module: opts.module || "ESNext",
    moduleResolution: opts.moduleResolution || "bundler",
    esModuleInterop: opts.esModuleInterop ?? true,
    strict: opts.strict ?? true,
    skipLibCheck: opts.skipLibCheck ?? true,
    resolveJsonModule: opts.resolveJsonModule ?? true,
    isolatedModules: opts.isolatedModules ?? true,
    declaration: opts.declaration ?? true,
    declarationMap: opts.declarationMap ?? true,
    sourceMap: opts.sourceMap ?? true,
  };

  // Framework-specific options
  const frameworkOpts = getFrameworkTsOptions(analysis.framework);

  tsconfig.compilerOptions = { ...opts, ...improvements, ...frameworkOpts };

  // Ensure include/exclude
  if (!tsconfig.include) {
    tsconfig.include = ["src/**/*"];
  }
  if (!tsconfig.exclude) {
    tsconfig.exclude = ["node_modules", "dist", "coverage"];
  }

  await writeFile(configPath, JSON.stringify(tsconfig, null, 2) + "\n");
}

function getFrameworkTsOptions(
  framework: FrameworkType,
): Record<string, unknown> {
  switch (framework) {
    case "nextjs":
      return {
        lib: ["dom", "dom.iterable", "esnext"],
        jsx: "preserve",
        incremental: true,
        plugins: [{ name: "next" }],
      };
    case "react":
    case "remix":
      return {
        lib: ["dom", "dom.iterable", "esnext"],
        jsx: "react-jsx",
      };
    case "vue":
    case "nuxt":
      return {
        lib: ["esnext", "dom"],
        jsx: "preserve",
      };
    default:
      return {};
  }
}

async function applyESLintSetup(
  projectPath: string,
  analysis: ProjectAnalysis,
  filesCreated: string[],
  _filesUpdated: string[],
): Promise<void> {
  // Only create new config if no flat config exists
  if (analysis.existing.eslintFlat) {
    return;
  }

  const configPath = join(projectPath, "eslint.config.mjs");
  const config = generateESLintFlatConfig(
    analysis.isTypeScript,
    analysis.framework,
  );

  await writeFile(configPath, config);
  filesCreated.push("eslint.config.mjs");
}

function generateESLintFlatConfig(
  isTypeScript: boolean,
  framework: FrameworkType,
): string {
  const imports: string[] = [];
  const configs: string[] = [];

  if (isTypeScript) {
    imports.push(`import tseslint from "typescript-eslint";`);
  }

  // Add react plugin import if needed
  if (framework === "react" || framework === "nextjs") {
    imports.push(`import react from "eslint-plugin-react";`);
    imports.push(`import reactHooks from "eslint-plugin-react-hooks";`);
  }

  // Base config
  if (isTypeScript) {
    configs.push(`  ...tseslint.configs.recommended`);
  }

  configs.push(`  {
    files: ["**/*.${isTypeScript ? "{ts,tsx}" : "{js,jsx}"}"],
    rules: {
      ${isTypeScript ? `"@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],` : ""}
      "no-console": "warn",
    },
  }`);

  configs.push(`  {
    ignores: ["dist/", "node_modules/", "coverage/", ".next/", "build/"],
  }`);

  return `${imports.join("\n")}

export default [
${configs.join(",\n")}
];
`;
}

async function applyPrettierSetup(
  projectPath: string,
  filesCreated: string[],
  filesUpdated: string[],
): Promise<void> {
  const prettierPath = join(projectPath, ".prettierrc");

  let config: Record<string, unknown> = {
    semi: true,
    singleQuote: false,
    tabWidth: 2,
    trailingComma: "es5",
    printWidth: 100,
    bracketSpacing: true,
  };

  if (existsSync(prettierPath)) {
    const existing = await readPrettierConfig(projectPath);
    config = { ...config, ...existing };
    filesUpdated.push(".prettierrc");
  } else {
    filesCreated.push(".prettierrc");
  }

  await writeFile(prettierPath, JSON.stringify(config, null, 2) + "\n");

  // Create .prettierignore if it doesn't exist
  const ignorePath = join(projectPath, ".prettierignore");
  if (!existsSync(ignorePath)) {
    const ignoreContent = `dist/
node_modules/
coverage/
.next/
build/
*.min.js
pnpm-lock.yaml
package-lock.json
yarn.lock
`;
    await writeFile(ignorePath, ignoreContent);
    filesCreated.push(".prettierignore");
  }
}

async function applyTestingSetup(
  projectPath: string,
  analysis: ProjectAnalysis,
  filesCreated: string[],
  _filesUpdated: string[],
): Promise<void> {
  // Skip if jest exists or vitest already configured
  if (analysis.existing.jest || analysis.existing.vitest) {
    return;
  }

  const ext = analysis.isTypeScript ? "ts" : "js";
  const configPath = join(projectPath, `vitest.config.${ext}`);

  const environment = ["react", "nextjs", "vue", "nuxt", "svelte"].includes(
    analysis.framework,
  )
    ? "jsdom"
    : "node";

  const config = `import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "${environment}",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "**/*.test.${ext}"],
    },
    include: ["src/**/*.test.${ext}", "tests/**/*.test.${ext}"],
  },
});
`;

  await writeFile(configPath, config);
  filesCreated.push(`vitest.config.${ext}`);
}

async function applyBuildSetup(
  projectPath: string,
  filesCreated: string[],
  _filesUpdated: string[],
): Promise<void> {
  const configPath = join(projectPath, "tsup.config.ts");

  if (existsSync(configPath)) {
    return;
  }

  const config = `import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: true,
  sourcemap: true,
});
`;

  await writeFile(configPath, config);
  filesCreated.push("tsup.config.ts");
}

async function applyScriptsSetup(
  projectPath: string,
  analysis: ProjectAnalysis,
  filesUpdated: string[],
): Promise<void> {
  const pkgPath = join(projectPath, "package.json");
  const pkg = await readPackageJson(projectPath);
  const scripts = pkg.scripts || {};

  // Add missing scripts (don't overwrite)
  const scriptsToAdd: Record<string, string> = {
    lint: "eslint src",
    "lint:fix": "eslint src --fix",
    format: 'prettier --write "src/**/*.{ts,tsx,js,jsx,json}"',
    "format:check": 'prettier --check "src/**/*.{ts,tsx,js,jsx,json}"',
    test: "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    verify: "workflow-agent verify",
    "verify:fix": "workflow-agent verify --fix",
    "pre-commit": "workflow-agent verify --fix",
  };

  if (analysis.isTypeScript) {
    scriptsToAdd.typecheck = "tsc --noEmit";
  }

  let added = false;
  for (const [name, cmd] of Object.entries(scriptsToAdd)) {
    if (!scripts[name]) {
      scripts[name] = cmd;
      added = true;
    }
  }

  if (added) {
    pkg.scripts = scripts;
    await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
    filesUpdated.push("package.json");
  }
}

async function applyHooksSetup(
  projectPath: string,
  filesUpdated: string[],
): Promise<void> {
  const pkgPath = join(projectPath, "package.json");
  const pkg = await readPackageJson(projectPath);

  // Add simple-git-hooks config
  if (!pkg["simple-git-hooks"]) {
    pkg["simple-git-hooks"] = {
      "pre-commit": "npx lint-staged",
    };
  }

  // Add lint-staged config
  if (!pkg["lint-staged"]) {
    pkg["lint-staged"] = {
      "*.{ts,tsx,js,jsx}": ["eslint --fix", "prettier --write"],
      "*.{json,md,yml,yaml}": ["prettier --write"],
    };
  }

  await writeFile(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  filesUpdated.push("package.json");
}

async function applyCISetup(
  projectPath: string,
  analysis: ProjectAnalysis,
  filesCreated: string[],
  _filesUpdated: string[],
): Promise<void> {
  const workflowsDir = join(projectPath, ".github/workflows");
  await mkdir(workflowsDir, { recursive: true });

  const ciPath = join(workflowsDir, "ci.yml");

  if (existsSync(ciPath)) {
    return;
  }

  const workflow = generateCIWorkflow(
    analysis.packageManager,
    analysis.isTypeScript,
    analysis.framework,
    analysis.isMonorepo,
  );

  await writeFile(ciPath, workflow);
  filesCreated.push(".github/workflows/ci.yml");
}

function generateCIWorkflow(
  packageManager: PackageManager,
  isTypeScript: boolean,
  framework: FrameworkType,
  _isMonorepo: boolean,
): string {
  const runCmd =
    packageManager === "npm"
      ? "npm run"
      : packageManager === "yarn"
        ? "yarn"
        : packageManager;
  const isPnpm = packageManager === "pnpm";

  return `name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  ci:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
${
  isPnpm
    ? `
      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9
`
    : ""
}
      - name: Install dependencies
        run: ${packageManager} install

${
  isTypeScript
    ? `      - name: Type check
        run: ${runCmd} typecheck

`
    : ""
}      - name: Lint
        run: ${runCmd} lint

      - name: Format check
        run: ${runCmd} format:check || true

      - name: Test
        run: ${runCmd} test
${
  isTypeScript && !["nextjs", "remix", "nuxt"].includes(framework)
    ? `
      - name: Build
        run: ${runCmd} build
`
    : ""
}`;
}

// ============================================================================
// Utility Functions
// ============================================================================

async function readPackageJson(projectPath: string): Promise<PackageJson> {
  const pkgPath = join(projectPath, "package.json");
  if (!existsSync(pkgPath)) {
    return {};
  }
  return JSON.parse(await readFile(pkgPath, "utf-8")) as PackageJson;
}

async function readTSConfig(filePath: string): Promise<TSConfig> {
  if (!existsSync(filePath)) {
    return {};
  }
  return JSON.parse(await readFile(filePath, "utf-8")) as TSConfig;
}

async function readJsonFile(
  filePath: string,
): Promise<Record<string, unknown>> {
  if (!existsSync(filePath)) {
    return {};
  }
  return JSON.parse(await readFile(filePath, "utf-8"));
}

async function readPrettierConfig(
  projectPath: string,
): Promise<Record<string, unknown>> {
  const files = [".prettierrc", ".prettierrc.json", "prettier.config.js"];

  for (const file of files) {
    const filePath = join(projectPath, file);
    if (existsSync(filePath)) {
      if (file.endsWith(".js")) {
        return {}; // Can't easily read JS config
      }
      try {
        return JSON.parse(await readFile(filePath, "utf-8"));
      } catch {
        return {};
      }
    }
  }

  return {};
}
