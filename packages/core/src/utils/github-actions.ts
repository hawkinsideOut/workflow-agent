/**
 * GitHub Actions workflow generator
 * Creates CI workflow with lint, typecheck, format, build, and test checks
 */

import { existsSync } from "fs";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import type { CIConfig } from "../config/schema.js";
import {
  type PackageManager,
  getInstallCommand,
  getRunCommand,
  getProjectInfo,
} from "./git-repo.js";

export interface WorkflowGeneratorOptions {
  /** Project path */
  projectPath?: string;
  /** Package manager to use */
  packageManager?: PackageManager;
  /** Whether it's a monorepo */
  isMonorepo?: boolean;
  /** CI configuration */
  ciConfig?: CIConfig;
  /** Node.js versions to test against */
  nodeVersions?: string[];
  /** Default branch name */
  defaultBranch?: string;
}

export interface GenerateResult {
  success: boolean;
  filePath: string;
  error?: string;
}

/**
 * Generate the CI workflow YAML content
 */
export function generateCIWorkflowContent(options: {
  packageManager: PackageManager;
  isMonorepo: boolean;
  checks: string[];
  nodeVersions: string[];
  defaultBranch: string;
  hasLintScript: boolean;
  hasTypecheckScript: boolean;
  hasFormatScript: boolean;
  hasTestScript: boolean;
  hasBuildScript: boolean;
}): string {
  const {
    packageManager,
    isMonorepo,
    checks,
    nodeVersions,
    defaultBranch,
    hasLintScript,
    hasTypecheckScript,
    hasFormatScript,
    hasTestScript,
    hasBuildScript,
  } = options;

  const installCmd = getInstallCommand(packageManager);

  // Build steps based on available scripts and checks
  const steps: string[] = [];

  // Checkout
  steps.push(`      - name: Checkout
        uses: actions/checkout@v4`);

  // Setup package manager cache based on type
  let cacheType = packageManager;
  if (packageManager === "bun") {
    cacheType = "npm"; // fallback for bun
  }

  // Setup Node.js (using matrix for multiple versions)
  const useMatrix = nodeVersions.length > 1;
  const nodeVersionValue = useMatrix
    ? `\${{ matrix.node-version }}`
    : nodeVersions[0] || "20";

  steps.push(`
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '${nodeVersionValue}'
          cache: '${cacheType}'`);

  // Setup pnpm if needed
  if (packageManager === "pnpm") {
    steps.push(`
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9`);
  }

  // Install dependencies
  steps.push(`
      - name: Install dependencies
        run: ${installCmd}`);

  // Lint check
  if (checks.includes("lint")) {
    if (hasLintScript) {
      const lintCmd = getRunCommand(packageManager, "lint", isMonorepo);
      steps.push(`
      - name: Lint
        run: ${lintCmd}`);
    } else {
      steps.push(`
      - name: Lint
        run: echo "No lint script configured - add 'lint' to package.json scripts"`);
    }
  }

  // Typecheck
  if (checks.includes("typecheck")) {
    if (hasTypecheckScript) {
      const typecheckCmd = getRunCommand(
        packageManager,
        "typecheck",
        isMonorepo,
      );
      steps.push(`
      - name: Type check
        run: ${typecheckCmd}`);
    } else {
      steps.push(`
      - name: Type check
        run: npx tsc --noEmit`);
    }
  }

  // Format check
  if (checks.includes("format")) {
    if (hasFormatScript) {
      // Check if there's a format:check script, otherwise use prettier directly
      const formatCmd = getRunCommand(
        packageManager,
        "format:check",
        isMonorepo,
      );
      steps.push(`
      - name: Format check
        run: ${formatCmd} || npx prettier --check "**/*.{ts,tsx,js,jsx,json,md}"`);
    } else {
      steps.push(`
      - name: Format check
        run: npx prettier --check "**/*.{ts,tsx,js,jsx,json,md}"`);
    }
  }

  // Build
  if (checks.includes("build")) {
    if (hasBuildScript) {
      const buildCmd = getRunCommand(packageManager, "build", isMonorepo);
      steps.push(`
      - name: Build
        run: ${buildCmd}`);
    } else {
      steps.push(`
      - name: Build
        run: echo "No build script configured - add 'build' to package.json scripts"`);
    }
  }

  // Test
  if (checks.includes("test")) {
    if (hasTestScript) {
      const testCmd = getRunCommand(packageManager, "test", isMonorepo);
      steps.push(`
      - name: Test
        run: ${testCmd}`);
    } else {
      steps.push(`
      - name: Test
        run: echo "No test script configured - add 'test' to package.json scripts"`);
    }
  }

  // Build the matrix strategy if using multiple Node versions
  let matrixStrategy = "";
  if (useMatrix) {
    matrixStrategy = `
    strategy:
      matrix:
        node-version: [${nodeVersions.map((v) => `'${v}'`).join(", ")}]`;
  }

  const workflow = `# Workflow Agent CI Pipeline
# Auto-generated - modifications will be preserved on regeneration
# To regenerate: workflow github:setup

name: CI

on:
  push:
    branches: [${defaultBranch}, develop]
  pull_request:
    branches: [${defaultBranch}, develop]

jobs:
  ci:
    runs-on: ubuntu-latest${matrixStrategy}

    steps:
${steps.join("\n")}
`;

  return workflow;
}

/**
 * Create the GitHub Actions CI workflow file
 */
export async function createCIWorkflow(
  options: WorkflowGeneratorOptions = {},
): Promise<GenerateResult> {
  const projectPath = options.projectPath || process.cwd();
  const workflowsDir = join(projectPath, ".github", "workflows");
  const workflowPath = join(workflowsDir, "ci.yml");

  const result: GenerateResult = {
    success: false,
    filePath: workflowPath,
  };

  try {
    // Get project info if not provided
    const projectInfo = await getProjectInfo(projectPath);
    const packageManager = options.packageManager || projectInfo.packageManager;
    const isMonorepo = options.isMonorepo ?? projectInfo.isMonorepo;

    // Get CI checks from config or use defaults
    const checks = options.ciConfig?.checks || [
      "lint",
      "typecheck",
      "format",
      "build",
      "test",
    ];
    const nodeVersions = options.nodeVersions || ["20"];
    const defaultBranch = options.defaultBranch || "main";

    // Ensure .github/workflows directory exists
    if (!existsSync(workflowsDir)) {
      await mkdir(workflowsDir, { recursive: true });
    }

    // Generate workflow content
    const content = generateCIWorkflowContent({
      packageManager,
      isMonorepo,
      checks,
      nodeVersions,
      defaultBranch,
      hasLintScript: projectInfo.hasLintScript,
      hasTypecheckScript: projectInfo.hasTypecheckScript,
      hasFormatScript: projectInfo.hasFormatScript,
      hasTestScript: projectInfo.hasTestScript,
      hasBuildScript: projectInfo.hasBuildScript,
    });

    // Write workflow file
    await writeFile(workflowPath, content, "utf-8");

    result.success = true;
  } catch (error) {
    result.error = error instanceof Error ? error.message : String(error);
  }

  return result;
}

/**
 * Check if a CI workflow already exists
 */
export function hasCIWorkflow(projectPath: string = process.cwd()): boolean {
  const workflowsDir = join(projectPath, ".github", "workflows");
  const possibleNames = ["ci.yml", "ci.yaml", "main.yml", "main.yaml"];

  return possibleNames.some((name) => existsSync(join(workflowsDir, name)));
}
