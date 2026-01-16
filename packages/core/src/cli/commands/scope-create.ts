import * as p from "@clack/prompts";
import chalk from "chalk";
import { existsSync } from "fs";
import { writeFile, mkdir, readFile } from "fs/promises";
import { join } from "path";
import { validateScopeDefinitions, type Scope } from "../../config/schema.js";

interface ScopeCreateOptions {
  name?: string;
  scopes?: string;
  presetName?: string;
  outputDir?: string;
  noTest?: boolean;
}

export async function scopeCreateCommand(options: ScopeCreateOptions) {
  console.log(chalk.bold.cyan("\n🎨 Create Custom Scope Package\n"));

  const cwd = process.cwd();
  const isNonInteractive = !!(
    options.name &&
    options.scopes &&
    options.presetName
  );

  // Check for monorepo
  const isMonorepo = existsSync(join(cwd, "pnpm-workspace.yaml"));
  if (isMonorepo) {
    console.log(chalk.dim("✓ Detected monorepo workspace\n"));
  }

  // Get package name
  const packageNameInput = isNonInteractive
    ? options.name
    : await p.text({
        message:
          'What is the package name? (e.g., "fintech", "gaming", "healthcare")',
        placeholder: "my-custom-scope",
        validate: (value) => {
          if (!value || value.length === 0) return "Package name is required";
          if (!/^[a-z0-9-]+$/.test(value))
            return "Package name must be lowercase alphanumeric with hyphens";
          if (value.length > 32)
            return "Package name must be 32 characters or less";
          return undefined;
        },
      });

  if (!isNonInteractive && p.isCancel(packageNameInput)) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  const packageName = packageNameInput as string;

  // Get preset display name
  const presetNameInput = isNonInteractive
    ? options.presetName
    : await p.text({
        message:
          'What is the preset display name? (e.g., "FinTech Application", "Gaming Platform")',
        placeholder: "My Custom Preset",
        validate: (value) => {
          if (!value || value.length === 0) return "Preset name is required";
          return undefined;
        },
      });

  if (!isNonInteractive && p.isCancel(presetNameInput)) {
    p.cancel("Operation cancelled");
    process.exit(0);
  }

  const presetName = presetNameInput as string;

  // Collect scopes
  const scopes: Scope[] = [];

  if (isNonInteractive && options.scopes) {
    // Parse scopes from command line (format: "name:description:emoji:category,...")
    const scopeParts = options.scopes.split(",");
    for (const part of scopeParts) {
      const [name, description, emoji, category] = part.split(":");
      scopes.push({
        name: name.trim(),
        description: description?.trim() || "Scope description",
        emoji: emoji?.trim(),
        category: category?.trim() as any,
      });
    }
  } else {
    console.log(
      chalk.dim("\nAdd scopes to your preset (aim for 8-15 scopes):\n"),
    );

    let addMore = true;
    while (addMore) {
      const scopeName = await p.text({
        message: `Scope #${scopes.length + 1} - Name:`,
        placeholder: "auth",
        validate: (value) => {
          if (!value || value.length === 0) return "Scope name is required";
          if (!/^[a-z0-9-]+$/.test(value))
            return "Must be lowercase alphanumeric with hyphens";
          if (value.length > 32) return "Must be 32 characters or less";
          if (scopes.some((s) => s.name === value))
            return "Scope name already exists";
          return undefined;
        },
      });

      if (p.isCancel(scopeName)) {
        break;
      }

      const scopeDescription = await p.text({
        message: "Description:",
        placeholder: "Authentication and authorization",
        validate: (value) => {
          if (!value || value.length < 10)
            return "Description must be at least 10 characters";
          return undefined;
        },
      });

      if (p.isCancel(scopeDescription)) {
        break;
      }

      const scopeEmoji = await p.text({
        message: "Emoji (optional):",
        placeholder: "🔐",
      });

      if (p.isCancel(scopeEmoji)) {
        break;
      }

      const scopeCategory = await p.select({
        message: "Category (optional):",
        options: [
          { value: "auth", label: "Authentication & Authorization" },
          { value: "features", label: "Features & Functionality" },
          { value: "infrastructure", label: "Infrastructure & DevOps" },
          { value: "documentation", label: "Documentation" },
          { value: "testing", label: "Testing & QA" },
          { value: "performance", label: "Performance & Optimization" },
          { value: "other", label: "Other" },
          { value: "", label: "None" },
        ],
      });

      if (p.isCancel(scopeCategory)) {
        break;
      }

      scopes.push({
        name: scopeName as string,
        description: scopeDescription as string,
        emoji: scopeEmoji ? (scopeEmoji as string) : undefined,
        category: scopeCategory ? (scopeCategory as any) : undefined,
      });

      console.log(chalk.green(`\n✓ Added scope: ${scopeName}\n`));

      if (scopes.length >= 3) {
        addMore = (await p.confirm({
          message: `You have ${scopes.length} scopes. Add another?`,
          initialValue: scopes.length < 10,
        })) as boolean;

        if (p.isCancel(addMore)) {
          break;
        }

        if (!addMore) break;
      }
    }
  }

  if (scopes.length === 0) {
    p.cancel("No scopes defined. Operation cancelled.");
    process.exit(1);
  }

  // Validate scopes
  const validation = validateScopeDefinitions(scopes);
  if (!validation.valid) {
    console.log(chalk.red("\n✗ Scope validation failed:\n"));
    validation.errors.forEach((error) =>
      console.log(chalk.red(`  • ${error}`)),
    );
    p.cancel("Operation cancelled");
    process.exit(1);
  }

  console.log(
    chalk.green(`\n✓ ${scopes.length} scopes validated successfully\n`),
  );

  // Determine output directory
  let outputDir: string;
  if (options.outputDir) {
    outputDir = options.outputDir;
  } else if (isMonorepo) {
    outputDir = join(cwd, "packages", `scopes-${packageName}`);
  } else {
    const customDir = await p.text({
      message: "Output directory:",
      placeholder: `./scopes-${packageName}`,
      defaultValue: `./scopes-${packageName}`,
    });

    if (p.isCancel(customDir)) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }

    outputDir = join(cwd, customDir as string);
  }

  // Check if directory exists
  if (existsSync(outputDir)) {
    const shouldOverwrite = await p.confirm({
      message: `Directory ${outputDir} already exists. Overwrite?`,
      initialValue: false,
    });

    if (p.isCancel(shouldOverwrite) || !shouldOverwrite) {
      p.cancel("Operation cancelled");
      process.exit(0);
    }
  }

  // Create package files
  const spinner = p.spinner();
  spinner.start("Creating package structure...");

  try {
    // Create directories
    await mkdir(join(outputDir, "src"), { recursive: true });

    // Create package.json
    const packageJson = {
      name: `@workflow/scopes-${packageName}`,
      version: "1.0.0",
      description: `Scope preset for ${presetName}`,
      keywords: ["workflow", "scopes", packageName, "preset"],
      repository: {
        type: "git",
        url: "git+https://github.com/your-org/your-repo.git",
        directory: `packages/scopes-${packageName}`,
      },
      license: "MIT",
      author: "Your Name",
      type: "module",
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          import: "./dist/index.js",
        },
      },
      files: ["dist"],
      scripts: {
        build: "tsup",
        dev: "tsup --watch",
        typecheck: "tsc --noEmit",
        test: "vitest run",
      },
      peerDependencies: {
        "@hawkinside_out/workflow-agent": "^1.0.0",
      },
      devDependencies: {
        "@hawkinside_out/workflow-agent": "^1.0.0",
        tsup: "^8.0.1",
        typescript: "^5.3.3",
        vitest: "^1.0.0",
      },
      publishConfig: {
        access: "public",
      },
    };

    await writeFile(
      join(outputDir, "package.json"),
      JSON.stringify(packageJson, null, 2),
      "utf-8",
    );

    // Create tsconfig.json
    const tsconfig = {
      extends: "../../tsconfig.json",
      compilerOptions: {
        outDir: "./dist",
        rootDir: "./src",
      },
      include: ["src/**/*"],
    };

    await writeFile(
      join(outputDir, "tsconfig.json"),
      JSON.stringify(tsconfig, null, 2),
      "utf-8",
    );

    // Create tsup.config.ts
    const tsupConfig = `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
`;

    await writeFile(join(outputDir, "tsup.config.ts"), tsupConfig, "utf-8");

    // Create src/index.ts
    const indexTs = `import type { Scope } from '@hawkinside_out/workflow-agent/config';

export const scopes: Scope[] = ${JSON.stringify(scopes, null, 2)};

export const preset = {
  name: '${presetName}',
  description: 'Scope configuration for ${presetName}',
  scopes,
  version: '1.0.0',
};

export default preset;
`;

    await writeFile(join(outputDir, "src", "index.ts"), indexTs, "utf-8");

    // Create test file if not disabled
    if (!options.noTest) {
      const testFile = `import { describe, it, expect } from 'vitest';
import { scopes, preset } from './index.js';
import { ScopeSchema } from '@hawkinside_out/workflow-agent/config';

describe('${presetName} Scope Preset', () => {
  it('should export valid scopes array', () => {
    expect(scopes).toBeDefined();
    expect(Array.isArray(scopes)).toBe(true);
    expect(scopes.length).toBeGreaterThan(0);
  });

  it('should have valid preset object', () => {
    expect(preset).toBeDefined();
    expect(preset.name).toBe('${presetName}');
    expect(preset.scopes).toBe(scopes);
    expect(preset.version).toBeDefined();
  });

  it('should have no duplicate scope names', () => {
    const names = scopes.map(s => s.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should have all scopes match schema', () => {
    scopes.forEach(scope => {
      const result = ScopeSchema.safeParse(scope);
      expect(result.success).toBe(true);
    });
  });

  it('should have descriptions for all scopes', () => {
    scopes.forEach(scope => {
      expect(scope.description).toBeDefined();
      expect(scope.description.length).toBeGreaterThan(0);
    });
  });
});
`;

      await writeFile(
        join(outputDir, "src", "index.test.ts"),
        testFile,
        "utf-8",
      );
    }

    spinner.stop("✓ Package structure created");

    // Update pnpm-workspace.yaml if monorepo
    if (isMonorepo) {
      const workspaceFile = join(cwd, "pnpm-workspace.yaml");
      const workspaceContent = await readFile(workspaceFile, "utf-8");

      const packagePath = `packages/scopes-${packageName}`;
      if (
        !workspaceContent.includes(packagePath) &&
        !workspaceContent.includes("packages/*")
      ) {
        console.log(
          chalk.yellow("\n⚠️  Add the following to pnpm-workspace.yaml:"),
        );
        console.log(chalk.dim(`  - '${packagePath}'`));
      } else {
        console.log(chalk.green("\n✓ Package will be included in workspace"));
      }
    }

    // Success summary
    console.log(
      chalk.green.bold("\n✨ Custom scope package created successfully!\n"),
    );
    console.log(chalk.bold("Package details:"));
    console.log(chalk.dim(`  Location: ${outputDir}`));
    console.log(chalk.dim(`  Package: @workflow/scopes-${packageName}`));
    console.log(chalk.dim(`  Scopes: ${scopes.length} defined\n`));

    console.log(chalk.bold("Next steps:\n"));
    console.log(chalk.dim(`  1. cd ${outputDir}`));
    console.log(chalk.dim(`  2. pnpm install`));
    console.log(chalk.dim(`  3. pnpm build`));
    if (!options.noTest) {
      console.log(chalk.dim(`  4. pnpm test`));
    }
    console.log(
      chalk.dim(
        `  ${!options.noTest ? "5" : "4"}. Update repository URL in package.json`,
      ),
    );

    const shouldPublish = isNonInteractive
      ? false
      : await p.confirm({
          message: "\nWould you like instructions for publishing to npm?",
          initialValue: false,
        });

    if (shouldPublish && !p.isCancel(shouldPublish)) {
      console.log(chalk.bold("\n📦 Publishing instructions:\n"));
      console.log(
        chalk.dim("  1. npm login (or configure .npmrc with your registry)"),
      );
      console.log(chalk.dim("  2. Update version in package.json as needed"));
      console.log(chalk.dim("  3. pnpm publish --access public"));
      console.log(
        chalk.dim(
          "  4. Use in other projects: pnpm add @workflow/scopes-" +
            packageName +
            "\n",
        ),
      );
    }
  } catch (error) {
    spinner.stop("✗ Failed to create package");
    console.error(chalk.red("\nError:"), error);
    process.exit(1);
  }
}
