/**
 * Advisory Board Analysis Utilities
 *
 * Performs comprehensive application audits at multiple depth levels:
 * - executive: High-level business summary for non-technical stakeholders
 * - quick: Package.json scan, framework detection
 * - standard: Adds file structure, adapter detection, scope identification
 * - comprehensive: Full code-level pattern detection
 */

import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { join } from "path";
import fg from "fast-glob";
import type { AdvisoryDepth, WorkflowConfig } from "../config/schema.js";
import { detectPackageManager, isMonorepo } from "./git-repo.js";
import { analyzeProject } from "./auto-setup.js";

// ============================================================================
// Types
// ============================================================================

export interface AdvisoryAnalysis {
  depth: AdvisoryDepth;
  timestamp: string;
  project: ProjectOverview;
  technology: TechnologyStack;
  packages: PackageAnalysis;
  architecture?: ArchitectureOverview;
  codePatterns?: CodePatternAnalysis;
  risks: RiskAssessment;
  opportunities: OpportunityAssessment;
  health?: HealthMetrics;
}

export interface ProjectOverview {
  name: string;
  version: string;
  description?: string;
  isMonorepo: boolean;
  packageManager: string;
  workspaceCount?: number;
  fileCount: number;
  totalLines: number;
}

export interface TechnologyStack {
  framework?: string;
  frameworkVersion?: string;
  language: string;
  runtime: string;
  buildTools: string[];
  platforms: string[];
  infrastructure: string[];
}

export interface PackageAnalysis {
  total: number;
  production: DependencyInfo[];
  development: DependencyInfo[];
  categories: PackageCategory[];
  outdated: OutdatedPackage[];
  security: SecurityIssue[];
}

export interface DependencyInfo {
  name: string;
  version: string;
  category: string;
  purpose: string;
  businessValue: string;
  usagePatterns: string[];
  alternatives?: string[];
}

export interface PackageCategory {
  name: string;
  count: number;
  packages: string[];
  businessImpact: string;
}

export interface OutdatedPackage {
  name: string;
  current: string;
  latest: string;
  breaking: boolean;
}

export interface SecurityIssue {
  package: string;
  severity: "critical" | "high" | "medium" | "low";
  issue: string;
  recommendation: string;
}

export interface ArchitectureOverview {
  pattern: string;
  layers: string[];
  entryPoints: string[];
  dataFlow: string;
  keyDecisions: string[];
}

export interface CodePatternAnalysis {
  components: ComponentPattern[];
  services: ServicePattern[];
  utilities: UtilityPattern[];
  tests: TestPattern;
  customPatterns: string[];
}

export interface ComponentPattern {
  type: string;
  count: number;
  examples: string[];
  conventions: string[];
}

export interface ServicePattern {
  name: string;
  purpose: string;
  integrations: string[];
}

export interface UtilityPattern {
  category: string;
  count: number;
  usage: string;
}

export interface TestPattern {
  framework: string;
  coverage?: number;
  types: string[];
  count: number;
}

export interface RiskAssessment {
  overall: number; // 0-1 score
  categories: RiskCategory[];
  critical: string[];
  high: string[];
  medium: string[];
  low: string[];
}

export interface RiskCategory {
  name: string;
  score: number;
  issues: string[];
  impact: string;
}

export interface OpportunityAssessment {
  overall: number; // 0-1 score
  categories: OpportunityCategory[];
  immediate: string[];
  shortTerm: string[];
  longTerm: string[];
}

export interface OpportunityCategory {
  name: string;
  potential: number;
  recommendations: string[];
  businessValue: string;
}

export interface HealthMetrics {
  typecheck: boolean;
  lint: boolean;
  tests: boolean;
  build: boolean;
  coverage?: number;
  issues: number;
}

export interface AdvisoryOptions {
  depth: AdvisoryDepth;
  cwd: string;
  config?: WorkflowConfig;
  includeHealth?: boolean;
  excludePatterns?: string[];
}

// ============================================================================
// Advisory Analyzer Class
// ============================================================================

export class AdvisoryAnalyzer {
  private options: AdvisoryOptions;

  constructor(options: AdvisoryOptions) {
    this.options = options;
  }

  /**
   * Run analysis at specified depth level
   */
  async analyze(): Promise<AdvisoryAnalysis> {
    const timestamp = new Date().toISOString();
    const { depth } = this.options;

    // All depths start with project overview
    const project = await this.analyzeProject();

    if (depth === "executive") {
      return this.analyzeExecutive(timestamp, project);
    }

    // Quick depth and above include technology and packages
    const technology = await this.analyzeTechnology();
    const packages = await this.analyzePackages();
    const risks = await this.assessRisks(project, technology, packages);
    const opportunities = await this.assessOpportunities(
      project,
      technology,
      packages,
    );

    if (depth === "quick") {
      return {
        depth,
        timestamp,
        project,
        technology,
        packages,
        risks,
        opportunities,
      };
    }

    // Standard depth adds architecture
    const architecture = await this.analyzeArchitecture();

    if (depth === "standard") {
      const health = this.options.includeHealth
        ? await this.analyzeHealth()
        : undefined;

      return {
        depth,
        timestamp,
        project,
        technology,
        packages,
        architecture,
        risks,
        opportunities,
        health,
      };
    }

    // Comprehensive depth includes everything
    const codePatterns = await this.analyzeCodePatterns();
    const health = this.options.includeHealth
      ? await this.analyzeHealth()
      : undefined;

    return {
      depth,
      timestamp,
      project,
      technology,
      packages,
      architecture,
      codePatterns,
      risks,
      opportunities,
      health,
    };
  }

  /**
   * Executive depth: High-level business summary only
   */
  private async analyzeExecutive(
    timestamp: string,
    project: ProjectOverview,
  ): Promise<AdvisoryAnalysis> {
    // Get minimal tech info for categorization
    const packageJson = await this.readPackageJson();
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};

    // Categorize at high level
    const techCategories = this.categorizeTechnologies(deps, devDeps);
    const risks = this.calculateExecutiveRisks(project, techCategories);
    const opportunities = this.calculateExecutiveOpportunities(
      project,
      techCategories,
    );

    return {
      depth: "executive",
      timestamp,
      project,
      technology: {
        language: this.detectLanguage(deps, devDeps),
        runtime: this.detectRuntime(deps, devDeps),
        buildTools: this.detectBuildTools(devDeps),
        platforms: this.detectPlatforms(deps),
        infrastructure: this.detectInfrastructure(deps, devDeps),
      },
      packages: {
        total: Object.keys(deps).length + Object.keys(devDeps).length,
        production: [],
        development: [],
        categories: techCategories,
        outdated: [],
        security: [],
      },
      risks,
      opportunities,
    };
  }

  /**
   * Analyze project overview
   */
  private async analyzeProject(): Promise<ProjectOverview> {
    const packageJson = await this.readPackageJson();
    const isMonorepoProject = await isMonorepo(this.options.cwd);
    const fileCount = await this.countFiles();
    const totalLines = await this.countTotalLines();

    let workspaceCount: number | undefined;
    if (isMonorepoProject && packageJson.workspaces) {
      workspaceCount = Array.isArray(packageJson.workspaces)
        ? packageJson.workspaces.length
        : 0;
    }

    return {
      name: packageJson.name || "Unknown Project",
      version: packageJson.version || "0.0.0",
      description: packageJson.description,
      isMonorepo: isMonorepoProject,
      packageManager: await detectPackageManager(this.options.cwd),
      workspaceCount,
      fileCount,
      totalLines,
    };
  }

  /**
   * Analyze technology stack
   */
  private async analyzeTechnology(): Promise<TechnologyStack> {
    const packageJson = await this.readPackageJson();
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};

    const projectAnalysis = await analyzeProject(this.options.cwd);

    return {
      framework: projectAnalysis.framework,
      frameworkVersion:
        deps[projectAnalysis.framework || ""] ||
        devDeps[projectAnalysis.framework || ""],
      language: this.detectLanguage(deps, devDeps),
      runtime: this.detectRuntime(deps, devDeps),
      buildTools: this.detectBuildTools(devDeps),
      platforms: this.detectPlatforms(deps),
      infrastructure: this.detectInfrastructure(deps, devDeps),
    };
  }

  /**
   * Analyze packages in detail
   */
  private async analyzePackages(): Promise<PackageAnalysis> {
    const packageJson = await this.readPackageJson();
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};

    const production = this.analyzeDependencies(deps, "production");
    const development = this.analyzeDependencies(devDeps, "development");
    const categories = this.categorizeTechnologies(deps, devDeps);

    return {
      total: Object.keys(deps).length + Object.keys(devDeps).length,
      production,
      development,
      categories,
      outdated: [], // TODO: Implement outdated check
      security: [], // TODO: Implement security audit
    };
  }

  /**
   * Analyze dependencies and categorize them
   */
  private analyzeDependencies(
    deps: Record<string, string>,
    _type: "production" | "development",
  ): DependencyInfo[] {
    return Object.entries(deps).map(([name, version]) => {
      const category = this.categorizeDependency(name);
      const info = this.getDependencyInfo(name, category);

      return {
        name,
        version,
        category,
        ...info,
      };
    });
  }

  /**
   * Categorize a dependency
   */
  private categorizeDependency(name: string): string {
    // UI Frameworks
    if (
      ["react", "vue", "angular", "svelte", "solid-js"].some((fw) =>
        name.includes(fw),
      )
    ) {
      return "UI Framework";
    }

    // Meta-frameworks
    if (
      ["next", "nuxt", "remix", "sveltekit", "astro"].some((fw) =>
        name.includes(fw),
      )
    ) {
      return "Meta-Framework";
    }

    // State Management
    if (
      ["redux", "zustand", "jotai", "recoil", "mobx", "pinia"].includes(name)
    ) {
      return "State Management";
    }

    // API/Data Fetching
    if (
      [
        "axios",
        "fetch",
        "swr",
        "react-query",
        "@tanstack/react-query",
        "apollo",
        "urql",
      ].some((lib) => name.includes(lib))
    ) {
      return "API/Data Fetching";
    }

    // Routing
    if (
      ["react-router", "vue-router", "@tanstack/router"].some((r) =>
        name.includes(r),
      )
    ) {
      return "Routing";
    }

    // Forms
    if (
      ["formik", "react-hook-form", "final-form"].some((f) => name.includes(f))
    ) {
      return "Forms";
    }

    // Styling
    if (
      [
        "styled-components",
        "emotion",
        "tailwind",
        "sass",
        "less",
        "@mui",
        "antd",
        "chakra-ui",
      ].some((s) => name.includes(s))
    ) {
      return "Styling/UI Components";
    }

    // Testing
    if (
      [
        "vitest",
        "jest",
        "mocha",
        "chai",
        "testing-library",
        "playwright",
        "cypress",
      ].some((t) => name.includes(t))
    ) {
      return "Testing";
    }

    // Build Tools
    if (
      ["vite", "webpack", "rollup", "esbuild", "turbo", "tsup"].includes(name)
    ) {
      return "Build Tools";
    }

    // Linting/Formatting
    if (["eslint", "prettier", "stylelint"].some((l) => name.includes(l))) {
      return "Code Quality";
    }

    // Database
    if (
      ["prisma", "drizzle", "mongoose", "sequelize", "typeorm", "knex"].some(
        (db) => name.includes(db),
      )
    ) {
      return "Database ORM";
    }

    // Authentication
    if (
      ["next-auth", "auth0", "supabase", "clerk"].some((a) => name.includes(a))
    ) {
      return "Authentication";
    }

    // Deployment/Infrastructure
    if (
      ["vercel", "netlify", "aws-sdk", "@google-cloud"].some((d) =>
        name.includes(d),
      )
    ) {
      return "Infrastructure";
    }

    // Analytics
    if (
      ["@analytics", "posthog", "mixpanel", "segment"].some((a) =>
        name.includes(a),
      )
    ) {
      return "Analytics";
    }

    return "Other";
  }

  /**
   * Get detailed info about a dependency
   */
  private getDependencyInfo(
    name: string,
    category: string,
  ): Omit<DependencyInfo, "name" | "version" | "category"> {
    // TODO: This could be enhanced with a knowledge base or API lookup
    const defaultInfo = {
      purpose: `${category} library`,
      businessValue: "Supports application functionality",
      usagePatterns: ["Used throughout the application"],
    };

    // Enhanced info for common packages
    const knownPackages: Record<
      string,
      Omit<DependencyInfo, "name" | "version" | "category">
    > = {
      react: {
        purpose: "Core UI library for building component-based interfaces",
        businessValue:
          "Enables fast, interactive user experiences with reusable components",
        usagePatterns: [
          "Component rendering",
          "State management",
          "Event handling",
        ],
        alternatives: ["Vue", "Svelte", "Solid"],
      },
      next: {
        purpose: "React meta-framework with SSR, routing, and optimization",
        businessValue: "Improves SEO, performance, and developer productivity",
        usagePatterns: [
          "Server-side rendering",
          "API routes",
          "File-based routing",
        ],
        alternatives: ["Remix", "Gatsby"],
      },
      typescript: {
        purpose: "Static type checking for JavaScript",
        businessValue:
          "Reduces bugs, improves code quality, and enhances developer experience",
        usagePatterns: ["Type definitions", "Compile-time checks"],
      },
      // Add more as needed
    };

    return knownPackages[name] || defaultInfo;
  }

  /**
   * Categorize technologies at high level
   */
  private categorizeTechnologies(
    deps: Record<string, string>,
    devDeps: Record<string, string>,
  ): PackageCategory[] {
    const allDeps = { ...deps, ...devDeps };
    const categories = new Map<string, string[]>();

    Object.keys(allDeps).forEach((name) => {
      const category = this.categorizeDependency(name);
      if (!categories.has(category)) {
        categories.set(category, []);
      }
      categories.get(category)!.push(name);
    });

    return Array.from(categories.entries()).map(([name, packages]) => ({
      name,
      count: packages.length,
      packages,
      businessImpact: this.getCategoryBusinessImpact(name),
    }));
  }

  /**
   * Get business impact description for a category
   */
  private getCategoryBusinessImpact(category: string): string {
    const impacts: Record<string, string> = {
      "UI Framework":
        "Core user experience - directly impacts customer satisfaction and engagement",
      "Meta-Framework":
        "Application performance and SEO - affects discoverability and user retention",
      "State Management":
        "Data consistency - ensures reliable application behavior",
      "API/Data Fetching":
        "Backend integration - enables core business functionality",
      Routing: "Navigation - affects user flow and conversion rates",
      Forms: "Data collection - critical for user onboarding and conversions",
      "Styling/UI Components":
        "Visual design - impacts brand perception and usability",
      Testing: "Quality assurance - reduces production bugs and support costs",
      "Build Tools":
        "Development efficiency - affects time-to-market for new features",
      "Code Quality":
        "Maintainability - reduces technical debt and long-term costs",
      "Database ORM": "Data persistence - ensures business data integrity",
      Authentication:
        "Security and user management - protects business and customer data",
      Infrastructure:
        "Hosting and scalability - affects uptime and operational costs",
      Analytics: "Business intelligence - enables data-driven decision making",
    };

    return impacts[category] || "Supports various application features";
  }

  /**
   * Analyze architecture patterns
   */
  private async analyzeArchitecture(): Promise<ArchitectureOverview> {
    const files = await this.getProjectFiles();
    const entryPoints = this.detectEntryPoints(files);
    const pattern = this.detectArchitecturePattern(files);
    const layers = this.detectLayers(files);

    return {
      pattern,
      layers,
      entryPoints,
      dataFlow: this.analyzeDataFlow(files),
      keyDecisions: this.extractKeyDecisions(files),
    };
  }

  /**
   * Analyze code patterns in detail
   */
  private async analyzeCodePatterns(): Promise<CodePatternAnalysis> {
    const files = await this.getProjectFiles();

    return {
      components: await this.analyzeComponents(files),
      services: await this.analyzeServices(files),
      utilities: await this.analyzeUtilities(files),
      tests: await this.analyzeTests(files),
      customPatterns: await this.detectCustomPatterns(files),
    };
  }

  /**
   * Assess risks
   */
  private async assessRisks(
    project: ProjectOverview,
    technology: TechnologyStack,
    packages: PackageAnalysis,
  ): Promise<RiskAssessment> {
    const categories: RiskCategory[] = [];
    const critical: string[] = [];
    const high: string[] = [];
    const medium: string[] = [];
    const low: string[] = [];

    // Dependency risk
    const depRisk = this.assessDependencyRisk(packages);
    categories.push(depRisk);
    this.categorizeRiskItems(depRisk, critical, high, medium, low);

    // Technology obsolescence risk
    const techRisk = this.assessTechnologyRisk(technology);
    categories.push(techRisk);
    this.categorizeRiskItems(techRisk, critical, high, medium, low);

    // Project complexity risk
    const complexityRisk = this.assessComplexityRisk(project);
    categories.push(complexityRisk);
    this.categorizeRiskItems(complexityRisk, critical, high, medium, low);

    const overall =
      categories.reduce((sum, cat) => sum + cat.score, 0) / categories.length;

    return { overall, categories, critical, high, medium, low };
  }

  /**
   * Assess opportunities
   */
  private async assessOpportunities(
    project: ProjectOverview,
    technology: TechnologyStack,
    packages: PackageAnalysis,
  ): Promise<OpportunityAssessment> {
    const categories: OpportunityCategory[] = [];
    const immediate: string[] = [];
    const shortTerm: string[] = [];
    const longTerm: string[] = [];

    // Modernization opportunities
    const modernization = this.assessModernizationOpportunities(
      technology,
      packages,
    );
    categories.push(modernization);
    this.categorizeOpportunityItems(
      modernization,
      immediate,
      shortTerm,
      longTerm,
    );

    // Optimization opportunities
    const optimization = this.assessOptimizationOpportunities(project);
    categories.push(optimization);
    this.categorizeOpportunityItems(
      optimization,
      immediate,
      shortTerm,
      longTerm,
    );

    // Growth opportunities
    const growth = this.assessGrowthOpportunities(technology, packages);
    categories.push(growth);
    this.categorizeOpportunityItems(growth, immediate, shortTerm, longTerm);

    const overall =
      categories.reduce((sum, cat) => sum + cat.potential, 0) /
      categories.length;

    return { overall, categories, immediate, shortTerm, longTerm };
  }

  /**
   * Analyze health metrics
   */
  private async analyzeHealth(): Promise<HealthMetrics> {
    // TODO: Integrate with doctor and verify commands
    return {
      typecheck: false,
      lint: false,
      tests: false,
      build: false,
      issues: 0,
    };
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private async readPackageJson(): Promise<any> {
    const pkgPath = join(this.options.cwd, "package.json");
    if (!existsSync(pkgPath)) {
      throw new Error("package.json not found");
    }
    const content = await readFile(pkgPath, "utf-8");
    return JSON.parse(content);
  }

  private async countFiles(): Promise<number> {
    const patterns = ["**/*.{ts,tsx,js,jsx,py,go,rs,java}"];
    const files = await fg(patterns, {
      cwd: this.options.cwd,
      ignore: [
        "node_modules/**",
        "dist/**",
        "build/**",
        ".next/**",
        "coverage/**",
      ],
    });
    return files.length;
  }

  private async countTotalLines(): Promise<number> {
    // Quick estimate: avg 50 lines per file
    const fileCount = await this.countFiles();
    return fileCount * 50;
  }

  private detectLanguage(
    deps: Record<string, string>,
    devDeps: Record<string, string>,
  ): string {
    if (devDeps.typescript || deps.typescript) return "TypeScript";
    if (
      Object.keys(deps).some((d) => d.includes("react") || d.includes("vue"))
    ) {
      return "JavaScript";
    }
    return "JavaScript";
  }

  private detectRuntime(
    deps: Record<string, string>,
    devDeps: Record<string, string>,
  ): string {
    if (deps.next || devDeps.next) return "Node.js (Next.js)";
    if (Object.keys(deps).some((d) => d.includes("react"))) {
      return "Browser + Node.js";
    }
    return "Node.js";
  }

  private detectBuildTools(devDeps: Record<string, string>): string[] {
    const tools: string[] = [];
    if (devDeps.vite) tools.push("Vite");
    if (devDeps.webpack) tools.push("Webpack");
    if (devDeps.rollup) tools.push("Rollup");
    if (devDeps.esbuild) tools.push("esbuild");
    if (devDeps.turbo || devDeps.turborepo) tools.push("Turborepo");
    if (devDeps.tsup) tools.push("tsup");
    return tools;
  }

  private detectPlatforms(deps: Record<string, string>): string[] {
    const platforms: string[] = [];
    if (deps.react || deps.next) platforms.push("Web");
    if (deps["react-native"]) platforms.push("Mobile (React Native)");
    if (deps.electron) platforms.push("Desktop (Electron)");
    return platforms.length > 0 ? platforms : ["Web"];
  }

  private detectInfrastructure(
    deps: Record<string, string>,
    devDeps: Record<string, string>,
  ): string[] {
    const infra: string[] = [];
    const allDeps = { ...deps, ...devDeps };

    if (allDeps.vercel || allDeps["@vercel/node"]) infra.push("Vercel");
    if (Object.keys(allDeps).some((d) => d.includes("aws-"))) {
      infra.push("AWS");
    }
    if (Object.keys(allDeps).some((d) => d.includes("@google-cloud"))) {
      infra.push("Google Cloud");
    }
    if (allDeps.netlify) infra.push("Netlify");
    if (allDeps.supabase || allDeps["@supabase/supabase-js"]) {
      infra.push("Supabase");
    }
    if (allDeps.firebase || allDeps["firebase-admin"]) infra.push("Firebase");

    return infra;
  }

  private calculateExecutiveRisks(
    project: ProjectOverview,
    categories: PackageCategory[],
  ): RiskAssessment {
    const risks: string[] = [];
    let overallScore = 0;

    // Simple heuristics for executive view
    if (project.fileCount > 1000) {
      risks.push(
        "Large codebase may require significant maintenance resources",
      );
      overallScore += 0.3;
    }

    if (categories.length > 15) {
      risks.push(
        "High number of technology categories indicates potential complexity",
      );
      overallScore += 0.2;
    }

    const totalPackages = categories.reduce((sum, cat) => sum + cat.count, 0);
    if (totalPackages > 100) {
      risks.push(
        "Large dependency footprint increases security and maintenance burden",
      );
      overallScore += 0.3;
    }

    overallScore = Math.min(overallScore, 1);

    return {
      overall: overallScore,
      categories: [
        {
          name: "Technical Complexity",
          score: overallScore,
          issues: risks,
          impact: "May affect development velocity and operational costs",
        },
      ],
      critical: [],
      high: overallScore > 0.7 ? risks : [],
      medium: overallScore > 0.4 && overallScore <= 0.7 ? risks : [],
      low: overallScore <= 0.4 ? risks : [],
    };
  }

  private calculateExecutiveOpportunities(
    _project: ProjectOverview,
    categories: PackageCategory[],
  ): OpportunityAssessment {
    const opportunities: string[] = [];
    let overallScore = 0.5;

    // Modern stack indicates good foundation
    const hasModernFramework = categories.some((cat) =>
      cat.name.includes("Meta-Framework"),
    );
    if (hasModernFramework) {
      opportunities.push(
        "Modern framework provides foundation for rapid feature development",
      );
      overallScore += 0.2;
    }

    // Testing infrastructure
    const hasTestingTools = categories.some((cat) => cat.name === "Testing");
    if (hasTestingTools) {
      opportunities.push(
        "Testing infrastructure enables quality-driven expansion",
      );
      overallScore += 0.1;
    }

    return {
      overall: Math.min(overallScore, 1),
      categories: [
        {
          name: "Growth Potential",
          potential: overallScore,
          recommendations: opportunities,
          businessValue:
            "Strong foundation for scaling features and market reach",
        },
      ],
      immediate: [],
      shortTerm: opportunities,
      longTerm: [],
    };
  }

  private assessDependencyRisk(packages: PackageAnalysis): RiskCategory {
    let score = 0;
    const issues: string[] = [];

    if (packages.total > 100) {
      score += 0.3;
      issues.push(`High dependency count (${packages.total} packages)`);
    }

    if (packages.outdated.length > 10) {
      score += 0.3;
      issues.push(`${packages.outdated.length} outdated packages`);
    }

    if (packages.security.length > 0) {
      score += 0.4;
      issues.push(`${packages.security.length} security vulnerabilities`);
    }

    return {
      name: "Dependency Management",
      score: Math.min(score, 1),
      issues,
      impact: "Affects security, stability, and maintenance costs",
    };
  }

  private assessTechnologyRisk(technology: TechnologyStack): RiskCategory {
    let score = 0;
    const issues: string[] = [];

    // Check for modern vs legacy frameworks
    const legacyFrameworks = ["angular.js", "backbone", "ember"];
    if (
      technology.framework &&
      legacyFrameworks.some((f) => technology.framework?.includes(f))
    ) {
      score += 0.5;
      issues.push("Legacy framework may limit future development");
    }

    return {
      name: "Technology Stack",
      score,
      issues,
      impact: "May affect ability to attract talent and adopt new features",
    };
  }

  private assessComplexityRisk(project: ProjectOverview): RiskCategory {
    let score = 0;
    const issues: string[] = [];

    if (project.fileCount > 1000) {
      score += 0.2;
      issues.push("Large codebase requires careful management");
    }

    if (project.isMonorepo && (project.workspaceCount || 0) > 10) {
      score += 0.2;
      issues.push("Complex monorepo structure");
    }

    return {
      name: "Project Complexity",
      score,
      issues,
      impact: "Affects onboarding time and development velocity",
    };
  }

  private assessModernizationOpportunities(
    _technology: TechnologyStack,
    packages: PackageAnalysis,
  ): OpportunityCategory {
    const recommendations: string[] = [];
    let potential = 0.5;

    // Check for upgrade opportunities
    if (packages.outdated.length > 0) {
      recommendations.push(
        "Upgrade dependencies to access new features and improvements",
      );
      potential += 0.2;
    }

    return {
      name: "Modernization",
      potential: Math.min(potential, 1),
      recommendations,
      businessValue: "Improved performance, security, and developer experience",
    };
  }

  private assessOptimizationOpportunities(
    project: ProjectOverview,
  ): OpportunityCategory {
    const recommendations: string[] = [];

    if (project.fileCount > 500) {
      recommendations.push(
        "Consider code splitting and lazy loading strategies",
      );
    }

    return {
      name: "Performance Optimization",
      potential: 0.6,
      recommendations,
      businessValue: "Faster load times and better user experience",
    };
  }

  private assessGrowthOpportunities(
    _technology: TechnologyStack,
    packages: PackageAnalysis,
  ): OpportunityCategory {
    const recommendations: string[] = [];
    let potential = 0.5;

    const hasAnalytics = packages.categories.some((cat) =>
      cat.name.includes("Analytics"),
    );
    if (!hasAnalytics) {
      recommendations.push("Add analytics to enable data-driven decisions");
      potential += 0.2;
    }

    return {
      name: "Growth & Expansion",
      potential: Math.min(potential, 1),
      recommendations,
      businessValue: "Data-driven growth and improved user insights",
    };
  }

  private categorizeRiskItems(
    risk: RiskCategory,
    critical: string[],
    high: string[],
    medium: string[],
    low: string[],
  ): void {
    if (risk.score > 0.7) {
      critical.push(...risk.issues);
    } else if (risk.score > 0.5) {
      high.push(...risk.issues);
    } else if (risk.score > 0.3) {
      medium.push(...risk.issues);
    } else {
      low.push(...risk.issues);
    }
  }

  private categorizeOpportunityItems(
    opportunity: OpportunityCategory,
    immediate: string[],
    shortTerm: string[],
    longTerm: string[],
  ): void {
    if (opportunity.potential > 0.7) {
      immediate.push(...opportunity.recommendations);
    } else if (opportunity.potential > 0.5) {
      shortTerm.push(...opportunity.recommendations);
    } else {
      longTerm.push(...opportunity.recommendations);
    }
  }

  private async getProjectFiles(): Promise<string[]> {
    const patterns = ["**/*.{ts,tsx,js,jsx}"];
    return await fg(patterns, {
      cwd: this.options.cwd,
      ignore: this.options.excludePatterns || [
        "node_modules/**",
        "dist/**",
        "build/**",
        ".next/**",
        "coverage/**",
      ],
    });
  }

  private detectEntryPoints(files: string[]): string[] {
    const entryPoints = files.filter(
      (f) =>
        f.includes("index.") ||
        f.includes("main.") ||
        f.includes("app.") ||
        f.includes("_app.") ||
        f.includes("layout."),
    );
    return entryPoints.slice(0, 5);
  }

  private detectArchitecturePattern(files: string[]): string {
    const hasComponents = files.some((f) => f.includes("components/"));
    const hasPages = files.some(
      (f) => f.includes("pages/") || f.includes("app/"),
    );
    const hasServices = files.some((f) => f.includes("services/"));

    if (hasComponents && hasPages && hasServices) {
      return "Layered Architecture (Pages → Components → Services)";
    }
    if (hasComponents && hasPages) {
      return "Component-Based Architecture";
    }
    return "Standard Application Structure";
  }

  private detectLayers(files: string[]): string[] {
    const layers: string[] = [];
    if (files.some((f) => f.includes("pages/") || f.includes("app/"))) {
      layers.push("Presentation (Pages/Routes)");
    }
    if (files.some((f) => f.includes("components/"))) {
      layers.push("UI Components");
    }
    if (files.some((f) => f.includes("services/") || f.includes("api/"))) {
      layers.push("Business Logic/Services");
    }
    if (files.some((f) => f.includes("lib/") || f.includes("utils/"))) {
      layers.push("Utilities/Helpers");
    }
    if (files.some((f) => f.includes("models/") || f.includes("types/"))) {
      layers.push("Data Models");
    }
    return layers;
  }

  private analyzeDataFlow(files: string[]): string {
    const hasStateManagement = files.some(
      (f) => f.includes("store") || f.includes("context"),
    );
    const hasApi = files.some(
      (f) => f.includes("api") || f.includes("services"),
    );

    if (hasStateManagement && hasApi) {
      return "API → Services → State Management → Components";
    }
    if (hasApi) {
      return "API → Components (Direct)";
    }
    return "Props-based Component Communication";
  }

  private extractKeyDecisions(files: string[]): string[] {
    const decisions: string[] = [];

    if (files.some((f) => f.includes(".ts") || f.includes(".tsx"))) {
      decisions.push("TypeScript for type safety");
    }
    if (files.some((f) => f.includes("app/") && !f.includes("pages/"))) {
      decisions.push("App Router architecture (Next.js)");
    }
    if (files.some((f) => f.includes("server") || f.includes("api"))) {
      decisions.push("API routes for backend functionality");
    }

    return decisions;
  }

  private async analyzeComponents(
    files: string[],
  ): Promise<ComponentPattern[]> {
    const components = files.filter((f) => f.includes("components/"));
    const patterns: ComponentPattern[] = [];

    // Detect component types
    const ui = components.filter(
      (f) => f.includes("/ui/") || f.includes("/common/"),
    );
    const feature = components.filter((f) =>
      ["features/", "modules/"].some((dir) => f.includes(dir)),
    );

    if (ui.length > 0) {
      patterns.push({
        type: "UI Components",
        count: ui.length,
        examples: ui.slice(0, 3),
        conventions: ["Reusable", "Presentation-focused"],
      });
    }

    if (feature.length > 0) {
      patterns.push({
        type: "Feature Components",
        count: feature.length,
        examples: feature.slice(0, 3),
        conventions: ["Business logic", "Domain-specific"],
      });
    }

    return patterns;
  }

  private async analyzeServices(files: string[]): Promise<ServicePattern[]> {
    const services = files.filter(
      (f) => f.includes("services/") || f.includes("api/"),
    );

    return services.slice(0, 5).map((file) => ({
      name: file,
      purpose: "API integration or business logic",
      integrations: [],
    }));
  }

  private async analyzeUtilities(files: string[]): Promise<UtilityPattern[]> {
    const utils = files.filter(
      (f) => f.includes("utils/") || f.includes("lib/"),
    );

    return [
      {
        category: "Utilities",
        count: utils.length,
        usage: "Helper functions and shared utilities",
      },
    ];
  }

  private async analyzeTests(files: string[]): Promise<TestPattern> {
    const tests = files.filter(
      (f) => f.includes(".test.") || f.includes(".spec."),
    );

    const hasVitest = tests.some((f) => f.includes("vitest"));
    const hasJest = tests.some((f) => f.includes("jest"));

    return {
      framework: hasVitest ? "Vitest" : hasJest ? "Jest" : "Unknown",
      count: tests.length,
      types: ["Unit tests"],
    };
  }

  private async detectCustomPatterns(files: string[]): Promise<string[]> {
    const patterns: string[] = [];

    if (files.some((f) => f.includes("hooks/"))) {
      patterns.push("Custom React Hooks");
    }
    if (files.some((f) => f.includes("middleware"))) {
      patterns.push("Middleware Pattern");
    }
    if (files.some((f) => f.includes("providers"))) {
      patterns.push("Context Providers");
    }

    return patterns;
  }
}
