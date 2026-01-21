import * as fs from "node:fs";
import * as path from "node:path";
import type {
  SolutionPattern,
  SolutionFile,
  Implementation,
  Architecture,
  ProblemDefinition,
  DependencyVersion,
  EnvVar,
  Compatibility,
  FileRole,
  SolutionCategory,
} from "./patterns-schema.js";
import { createDefaultMetrics } from "./patterns-schema.js";

// ============================================
// Types
// ============================================

/** Options for code analysis */
export interface AnalyzerOptions {
  /** Maximum number of files to analyze */
  maxFiles?: number;
  /** File extensions to include */
  extensions?: string[];
  /** Directories to ignore */
  ignoreDirs?: string[];
  /** Maximum file size in bytes */
  maxFileSize?: number;
  /** Whether to anonymize content */
  anonymize?: boolean;
}

/** Default analyzer options */
export const DEFAULT_ANALYZER_OPTIONS: AnalyzerOptions = {
  maxFiles: 50,
  extensions: [".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".rs", ".java"],
  ignoreDirs: [
    "node_modules",
    ".git",
    "dist",
    "build",
    ".next",
    "coverage",
    "__pycache__",
  ],
  maxFileSize: 100_000, // 100KB
  anonymize: true,
};

/** Result of analyzing a file */
export interface FileAnalysis {
  path: string;
  role: FileRole;
  purpose: string;
  exports: string[];
  imports: string[];
  lineCount: number;
  content: string;
  dependencies: string[];
}

/** Result of analyzing a directory/solution */
export interface SolutionAnalysis {
  success: boolean;
  files: FileAnalysis[];
  dependencies: DependencyVersion[];
  devDependencies: DependencyVersion[];
  envVars: EnvVar[];
  entryPoints: string[];
  framework?: string;
  frameworkVersion?: string;
  error?: string;
}

/** Result of detecting architecture */
export interface ArchitectureAnalysis {
  entryPoints: string[];
  dataFlow: string;
  keyDecisions: string[];
}

// ============================================
// Regex Patterns for Code Analysis
// ============================================

const PATTERNS = {
  // JavaScript/TypeScript imports - matches:
  // import "package" | import x from "package" | import { x } from "package"
  // require("package") | require('package')
  jsImport:
    /(?:import\s+(?:[\w{},*\s]+\s+from\s+)?|require\s*\()['"]([^'"./][^'"]*)['"]\)?/g,

  // JavaScript/TypeScript exports
  jsExportNamed:
    /export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)/g,
  jsExportDefault: /export\s+default\s+(?:function\s+)?(\w+)?/g,

  // Python imports
  pyImport:
    /(?:from|import)\s+([a-zA-Z_][a-zA-Z0-9_]*(?:\.[a-zA-Z_][a-zA-Z0-9_]*)*)/g,

  // Environment variables
  envVar:
    /(?:process\.env\.|os\.environ(?:\.get)?\(?\[?)['"]?([A-Z][A-Z0-9_]+)['"]?/g,

  // Function/class definitions
  jsFunctionDef:
    /(?:async\s+)?(?:function\s+)?(\w+)\s*(?:<[^>]*>)?\s*\([^)]*\)\s*(?::\s*\w+)?\s*[{=>]/g,
  jsClassDef: /class\s+(\w+)/g,

  // Framework detection patterns
  frameworkPatterns: {
    next: /['"]next['"]/,
    react: /['"]react['"]/,
    vue: /['"]vue['"]/,
    angular: /['"]@angular\/core['"]/,
    express: /['"]express['"]/,
    fastapi: /from\s+fastapi/,
    django: /from\s+django/,
    flask: /from\s+flask/,
  },
};

// File role detection patterns
const ROLE_PATTERNS: { pattern: RegExp | string; role: FileRole }[] = [
  { pattern: /\.(test|spec)\.[jt]sx?$/, role: "test" },
  { pattern: /\.d\.ts$/, role: "type" },
  { pattern: /types?\.ts$/, role: "type" },
  { pattern: /\.config\.[jt]s$/, role: "config" },
  { pattern: /(middleware|middlewares)/, role: "middleware" },
  { pattern: /(hook|hooks|use[A-Z])/, role: "hook" },
  { pattern: /(component|components)/, role: "component" },
  { pattern: /(service|services)/, role: "service" },
  { pattern: /(model|models|schema|schemas)/, role: "model" },
  { pattern: /(util|utils|helper|helpers|lib)/, role: "util" },
  { pattern: /(index|main|app|server)\.[jt]sx?$/, role: "entry" },
];

// ============================================
// CodeAnalyzer Class
// ============================================

/**
 * Analyzes source code to extract solution patterns.
 * Used for learning from working implementations.
 */
export class CodeAnalyzer {
  private options: Required<AnalyzerOptions>;

  constructor(options: AnalyzerOptions = {}) {
    this.options = {
      ...DEFAULT_ANALYZER_OPTIONS,
      ...options,
    } as Required<AnalyzerOptions>;
  }

  // ============================================
  // Public Methods
  // ============================================

  /**
   * Analyze a single file and extract metadata
   */
  async analyzeFile(filePath: string): Promise<FileAnalysis | null> {
    try {
      const stat = await fs.promises.stat(filePath);

      // Skip large files
      if (stat.size > this.options.maxFileSize) {
        return null;
      }

      const content = await fs.promises.readFile(filePath, "utf-8");
      const relativePath = path.basename(filePath);
      const ext = path.extname(filePath);

      const exports = this.extractExports(content, ext);
      const imports = this.extractImports(content, ext);
      const dependencies = this.extractDependencies(content, ext);
      const lineCount = content.split("\n").length;
      const role = this.detectFileRole(filePath, content);
      const purpose = this.inferPurpose(filePath, exports, role);

      // Optionally anonymize content
      const processedContent = this.options.anonymize
        ? this.anonymizeContent(content)
        : content;

      return {
        path: relativePath,
        role,
        purpose,
        exports,
        imports,
        lineCount,
        content: processedContent,
        dependencies,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Analyze a directory and extract solution pattern data
   */
  async analyzeDirectory(
    dirPath: string,
    _category?: SolutionCategory,
  ): Promise<SolutionAnalysis> {
    try {
      const files = await this.collectFiles(dirPath);
      const analyses: FileAnalysis[] = [];
      const allDependencies = new Set<string>();

      for (const file of files.slice(0, this.options.maxFiles)) {
        const analysis = await this.analyzeFile(file);
        if (analysis) {
          analyses.push(analysis);
          analysis.dependencies.forEach((dep) => allDependencies.add(dep));
        }
      }

      // Parse package.json if it exists
      const { dependencies, devDependencies, framework, frameworkVersion } =
        await this.parsePackageJson(dirPath);

      // Detect environment variables
      const envVars = this.extractEnvVars(analyses);

      // Detect entry points
      const entryPoints = this.detectEntryPoints(analyses);

      return {
        success: true,
        files: analyses,
        dependencies,
        devDependencies,
        envVars,
        entryPoints,
        framework,
        frameworkVersion,
      };
    } catch (error) {
      return {
        success: false,
        files: [],
        dependencies: [],
        devDependencies: [],
        envVars: [],
        entryPoints: [],
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Detect the architectural pattern of a solution
   */
  detectArchitecture(analysis: SolutionAnalysis): ArchitectureAnalysis {
    const entryPoints = analysis.entryPoints;
    const roles = new Set(analysis.files.map((f) => f.role));

    // Detect data flow based on file roles
    let dataFlow = "Entry -> Processing -> Output";
    if (roles.has("middleware")) {
      dataFlow = "Request -> Middleware -> Handler -> Response";
    } else if (roles.has("service") && roles.has("model")) {
      dataFlow = "Controller -> Service -> Model -> Database";
    } else if (roles.has("hook") && roles.has("component")) {
      dataFlow = "Component -> Hook -> State -> Render";
    }

    // Extract key decisions based on patterns
    const keyDecisions: string[] = [];
    if (analysis.framework) {
      keyDecisions.push(`Uses ${analysis.framework} framework`);
    }
    if (roles.has("type")) {
      keyDecisions.push("TypeScript for type safety");
    }
    if (analysis.dependencies.some((d) => d.name.includes("prisma"))) {
      keyDecisions.push("Prisma ORM for database access");
    }
    if (analysis.dependencies.some((d) => d.name.includes("zod"))) {
      keyDecisions.push("Zod for runtime validation");
    }

    return {
      entryPoints,
      dataFlow,
      keyDecisions,
    };
  }

  /**
   * Create a full SolutionPattern from analysis
   */
  async createSolutionPattern(
    dirPath: string,
    name: string,
    description: string,
    category: SolutionCategory,
    keywords: string[],
    options: { isPrivate?: boolean } = {},
  ): Promise<SolutionPattern> {
    const analysis = await this.analyzeDirectory(dirPath, category);
    const architecture = this.detectArchitecture(analysis);

    const now = new Date().toISOString();

    const files: SolutionFile[] = analysis.files.map((f) => ({
      path: f.path,
      purpose: f.purpose,
      role: f.role,
      content: f.content,
      exports: f.exports,
      imports: f.imports,
      lineCount: f.lineCount,
    }));

    const implementation: Implementation = {
      files,
      dependencies: analysis.dependencies,
      devDependencies: analysis.devDependencies,
      envVars: analysis.envVars,
    };

    const problem: ProblemDefinition = {
      keywords,
      description: `Solution for: ${description}`,
      errorPatterns: [],
    };

    const architectureData: Architecture = {
      entryPoints: architecture.entryPoints,
      dataFlow: architecture.dataFlow,
      keyDecisions: architecture.keyDecisions,
    };

    const compatibility: Compatibility = {
      framework: analysis.framework || "generic",
      frameworkVersion: analysis.frameworkVersion || "*",
      dependencies: analysis.dependencies.slice(0, 5), // Top 5 deps
    };

    return {
      id: crypto.randomUUID(),
      name,
      description,
      category,
      tags: [{ name: category, category: "custom" }],
      problem,
      implementation,
      architecture: architectureData,
      compatibility,
      metrics: createDefaultMetrics(),
      relatedPatterns: [],
      source: "manual",
      sourceProject: path.basename(dirPath),
      isPrivate: options.isPrivate ?? false,
      createdAt: now,
      updatedAt: now,
    };
  }

  // ============================================
  // Private Helpers
  // ============================================

  private async collectFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];

    const walk = async (dir: string): Promise<void> => {
      const entries = await fs.promises.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!this.options.ignoreDirs.includes(entry.name)) {
            await walk(fullPath);
          }
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name);
          if (this.options.extensions.includes(ext)) {
            files.push(fullPath);
          }
        }
      }
    };

    await walk(dirPath);
    return files;
  }

  private extractExports(content: string, ext: string): string[] {
    const exports: string[] = [];

    if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
      // Named exports
      let match;
      const namedRegex = new RegExp(PATTERNS.jsExportNamed.source, "g");
      while ((match = namedRegex.exec(content)) !== null) {
        exports.push(match[1]);
      }

      // Default export
      const defaultRegex = new RegExp(PATTERNS.jsExportDefault.source, "g");
      while ((match = defaultRegex.exec(content)) !== null) {
        if (match[1]) {
          exports.push(match[1]);
        } else {
          exports.push("default");
        }
      }
    }

    return [...new Set(exports)];
  }

  private extractImports(content: string, ext: string): string[] {
    const imports: string[] = [];

    if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
      let match;
      const regex = new RegExp(PATTERNS.jsImport.source, "g");
      while ((match = regex.exec(content)) !== null) {
        imports.push(match[1]);
      }
    } else if (ext === ".py") {
      let match;
      const regex = new RegExp(PATTERNS.pyImport.source, "g");
      while ((match = regex.exec(content)) !== null) {
        imports.push(match[1].split(".")[0]);
      }
    }

    return [...new Set(imports)];
  }

  private extractDependencies(content: string, ext: string): string[] {
    // Extract external package dependencies (not relative imports)
    const deps: string[] = [];

    if ([".ts", ".tsx", ".js", ".jsx"].includes(ext)) {
      let match;
      const regex = new RegExp(PATTERNS.jsImport.source, "g");
      while ((match = regex.exec(content)) !== null) {
        const pkg = match[1];
        // Filter out relative imports and Node.js builtins
        if (!pkg.startsWith(".") && !pkg.startsWith("node:")) {
          // Get the package name (handle scoped packages)
          const pkgName = pkg.startsWith("@")
            ? pkg.split("/").slice(0, 2).join("/")
            : pkg.split("/")[0];
          deps.push(pkgName);
        }
      }
    }

    return [...new Set(deps)];
  }

  private detectFileRole(filePath: string, content: string): FileRole {
    const normalizedPath = filePath.toLowerCase();

    for (const { pattern, role } of ROLE_PATTERNS) {
      if (typeof pattern === "string") {
        if (normalizedPath.includes(pattern)) {
          return role;
        }
      } else {
        if (pattern.test(normalizedPath)) {
          return role;
        }
      }
    }

    // Default based on content analysis
    if (
      content.includes("export default function") ||
      content.includes("export function")
    ) {
      return "util";
    }

    return "util";
  }

  private inferPurpose(
    filePath: string,
    exports: string[],
    role: FileRole,
  ): string {
    const fileName = path.basename(filePath, path.extname(filePath));
    const roleDescriptions: Record<FileRole, string> = {
      entry: "Application entry point",
      config: "Configuration settings",
      util: "Utility functions",
      component: "UI component",
      hook: "React hook",
      middleware: "Request middleware",
      model: "Data model",
      service: "Business logic service",
      test: "Test file",
      type: "Type definitions",
    };

    const base = roleDescriptions[role] || "Source file";

    if (exports.length > 0) {
      return `${base}: ${exports.slice(0, 3).join(", ")}${exports.length > 3 ? "..." : ""}`;
    }

    return `${base} for ${fileName}`;
  }

  private extractEnvVars(files: FileAnalysis[]): EnvVar[] {
    const envVars = new Set<string>();

    for (const file of files) {
      let match;
      const regex = new RegExp(PATTERNS.envVar.source, "g");
      while ((match = regex.exec(file.content)) !== null) {
        envVars.add(match[1]);
      }
    }

    return Array.from(envVars).map((name) => ({
      name,
      description: `Environment variable ${name}`,
      required: true,
    }));
  }

  private detectEntryPoints(files: FileAnalysis[]): string[] {
    const entryFiles = files.filter((f) => f.role === "entry");
    if (entryFiles.length > 0) {
      return entryFiles.map((f) => f.path);
    }

    // Fallback: look for common entry point names
    const commonEntryNames = ["index", "main", "app", "server"];
    const entries = files.filter((f) => {
      const baseName = path
        .basename(f.path, path.extname(f.path))
        .toLowerCase();
      return commonEntryNames.includes(baseName);
    });

    return entries.length > 0
      ? entries.map((f) => f.path)
      : files.slice(0, 1).map((f) => f.path);
  }

  private async parsePackageJson(dirPath: string): Promise<{
    dependencies: DependencyVersion[];
    devDependencies: DependencyVersion[];
    framework?: string;
    frameworkVersion?: string;
  }> {
    try {
      const pkgPath = path.join(dirPath, "package.json");
      const content = await fs.promises.readFile(pkgPath, "utf-8");
      const pkg = JSON.parse(content);

      const parseDeps = (
        deps: Record<string, string> = {},
      ): DependencyVersion[] =>
        Object.entries(deps).map(([name, version]) => ({
          name,
          version: version.replace(/^[\^~]/, ""),
          compatibleRange: version,
        }));

      const dependencies = parseDeps(pkg.dependencies);
      const devDependencies = parseDeps(pkg.devDependencies);

      // Detect framework
      let framework: string | undefined;
      let frameworkVersion: string | undefined;

      const frameworkMap: Record<string, string> = {
        next: "next",
        react: "react",
        vue: "vue",
        "@angular/core": "angular",
        express: "express",
        fastify: "fastify",
        hono: "hono",
      };

      for (const [pkgName, fwName] of Object.entries(frameworkMap)) {
        if (pkg.dependencies?.[pkgName]) {
          framework = fwName;
          frameworkVersion = pkg.dependencies[pkgName];
          break;
        }
      }

      return { dependencies, devDependencies, framework, frameworkVersion };
    } catch {
      return { dependencies: [], devDependencies: [] };
    }
  }

  private anonymizeContent(content: string): string {
    // Replace absolute paths
    let anonymized = content.replace(
      /\/(?:home|Users|var|tmp)\/[^\s:'"]+/g,
      "<PATH>",
    );

    // Replace potential secrets
    anonymized = anonymized.replace(
      /(?:password|secret|api[_-]?key|token)\s*[:=]\s*["'][^"']+["']/gi,
      "<REDACTED>",
    );

    // Replace email addresses
    anonymized = anonymized.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      "<EMAIL>",
    );

    return anonymized;
  }
}

// ============================================
// Factory Functions
// ============================================

/**
 * Create a new code analyzer instance
 */
export function createCodeAnalyzer(options?: AnalyzerOptions): CodeAnalyzer {
  return new CodeAnalyzer(options);
}
