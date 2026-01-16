import fs from "fs/promises";
import path from "path";
import { WorkflowConfig } from "../config/schema.js";
import { detectAdapter, getAdapter } from "../adapters/index.js";

export interface TemplateContext {
  projectName: string;
  framework: string;
  scopes: string;
  scopeList: string;
  pathStructure: string;
  enforcement: string;
  year: string;
  // Additional context for scope package scaffolding
  scopeName?: string;
  presetName?: string;
  scopeDefinitions?: string;
  packageDirectory?: string;
  isMonorepo?: string;
  testImports?: string;
  packageVersion?: string;
  [key: string]: string | undefined;
}

/**
 * Renders a template string with provided context using simple {{variable}} syntax
 */
export function renderTemplate(
  template: string,
  context: TemplateContext,
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return context[key] ?? match;
  });
}

/**
 * Builds template context from workflow config and detected framework
 */
export async function buildTemplateContext(
  config: WorkflowConfig,
  projectPath: string = process.cwd(),
): Promise<TemplateContext> {
  // Detect framework
  const detectedFramework = await detectAdapter();
  const adapter = getAdapter(detectedFramework);

  // Build scope list as markdown
  const scopeList = config.scopes
    .map((s) => `- **${s.name}** - ${s.description}`)
    .join("\n");

  // Build scope names list (comma-separated)
  const scopes = config.scopes.map((s) => s.name).join(", ");

  // Build path structure from adapter
  const pathStructure = adapter
    ? `
### Path Structure

\`\`\`
${adapter.paths.components}/    → UI components
${adapter.paths.lib}/          → Utility functions and services
${adapter.paths.hooks}/        → Custom React hooks
${adapter.paths.types}/        → TypeScript type definitions
\`\`\`
`.trim()
    : "N/A";

  // Get project name from package.json or directory name
  const projectName = await getProjectName(projectPath);

  return {
    projectName,
    framework: adapter?.name || "unknown",
    scopes,
    scopeList,
    pathStructure,
    enforcement: config.enforcement,
    year: new Date().getFullYear().toString(),
  };
}

/**
 * Renders a template file and writes output
 */
export async function renderTemplateFile(
  templatePath: string,
  outputPath: string,
  context: TemplateContext,
): Promise<void> {
  const template = await fs.readFile(templatePath, "utf-8");
  const rendered = renderTemplate(template, context);
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, rendered, "utf-8");
}

/**
 * Renders all template files from source directory to output directory
 * Supports .md, .ts, .json file extensions
 */
export async function renderTemplateDirectory(
  templateDir: string,
  outputDir: string,
  context: TemplateContext,
): Promise<string[]> {
  const files = await fs.readdir(templateDir);
  const rendered: string[] = [];

  for (const file of files) {
    // Support .md, .ts, .json files
    if (!file.match(/\.(md|ts|json)$/)) continue;

    const templatePath = path.join(templateDir, file);
    const outputPath = path.join(outputDir, file);

    await renderTemplateFile(templatePath, outputPath, context);
    rendered.push(file);
  }

  return rendered;
}

/**
 * Gets project name from package.json or directory name
 */
async function getProjectName(projectPath: string): Promise<string> {
  try {
    const pkgPath = path.join(projectPath, "package.json");
    const pkg = JSON.parse(await fs.readFile(pkgPath, "utf-8"));
    return pkg.name || path.basename(projectPath);
  } catch {
    return path.basename(projectPath);
  }
}

/**
 * Validates that template directory exists and contains markdown files
 */
export async function validateTemplateDirectory(
  templateDir: string,
): Promise<void> {
  try {
    const stat = await fs.stat(templateDir);
    if (!stat.isDirectory()) {
      throw new Error(`Template path is not a directory: ${templateDir}`);
    }

    const files = await fs.readdir(templateDir);
    const templateFiles = files.filter((f) => f.match(/\.(md|ts|json)$/));

    if (templateFiles.length === 0) {
      throw new Error(
        `No template files found in template directory: ${templateDir}`,
      );
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Template directory not found: ${templateDir}`);
    }
    throw error;
  }
}

/**
 * Renders a scope package from templates
 * @param outputDir Directory to create package in
 * @param context Template context with scope-specific variables
 */
export async function renderScopePackage(
  outputDir: string,
  context: Required<
    Pick<
      TemplateContext,
      "scopeName" | "presetName" | "scopeDefinitions" | "packageVersion"
    >
  > &
    TemplateContext,
): Promise<void> {
  // Ensure output directory exists
  await fs.mkdir(path.join(outputDir, "src"), { recursive: true });

  // Write package.json
  const packageJson = {
    name: `@workflow/scopes-${context.scopeName}`,
    version: context.packageVersion,
    description: `Scope preset for ${context.presetName}`,
    keywords: ["workflow", "scopes", context.scopeName, "preset"],
    repository: {
      type: "git",
      url: "git+https://github.com/your-org/your-repo.git",
      directory:
        context.packageDirectory || `packages/scopes-${context.scopeName}`,
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

  await fs.writeFile(
    path.join(outputDir, "package.json"),
    JSON.stringify(packageJson, null, 2),
    "utf-8",
  );

  // Write tsconfig.json
  const tsconfig = {
    extends: "../../tsconfig.json",
    compilerOptions: {
      outDir: "./dist",
      rootDir: "./src",
    },
    include: ["src/**/*"],
  };

  await fs.writeFile(
    path.join(outputDir, "tsconfig.json"),
    JSON.stringify(tsconfig, null, 2),
    "utf-8",
  );

  // Write tsup.config.ts
  const tsupConfig = `import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
`;

  await fs.writeFile(
    path.join(outputDir, "tsup.config.ts"),
    tsupConfig,
    "utf-8",
  );

  // Write src/index.ts
  const indexTs = `import type { Scope } from '@hawkinside_out/workflow-agent/config';

export const scopes: Scope[] = ${context.scopeDefinitions};

export const preset = {
  name: '${context.presetName}',
  description: 'Scope configuration for ${context.presetName}',
  scopes,
  version: '${context.packageVersion}',
};

export default preset;
`;

  await fs.writeFile(path.join(outputDir, "src", "index.ts"), indexTs, "utf-8");
}
