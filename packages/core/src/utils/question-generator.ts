/**
 * Advisory Board Question Generator
 *
 * Transforms technical analysis findings into strategic questions
 * formatted for executive/advisory board presentation.
 *
 * Categories:
 * - Technology Decisions
 * - Package Utilization
 * - Platform Strategy
 * - Business Alignment
 * - Technical Debt
 * - Growth Opportunities
 */

import type { AdvisoryAnalysis, PackageCategory } from "./advisory-analyzer.js";
import type { AdvisoryConfig, AdvisoryQuestion } from "../config/schema.js";

// ============================================================================
// Types
// ============================================================================

export interface BoardQuestion {
  category: string;
  question: string;
  context: string;
  findings: string[];
  recommendations: string[];
  priority: "high" | "medium" | "low";
  businessImpact: string;
}

export interface QuestionSet {
  questions: BoardQuestion[];
  summary: QuestionSummary;
}

export interface QuestionSummary {
  totalQuestions: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  categories: string[];
}

// ============================================================================
// Question Generator Class
// ============================================================================

export class QuestionGenerator {
  private analysis: AdvisoryAnalysis;
  private config?: AdvisoryConfig;

  constructor(analysis: AdvisoryAnalysis, config?: AdvisoryConfig) {
    this.analysis = analysis;
    this.config = config;
  }

  /**
   * Generate all advisory board questions
   */
  generate(): QuestionSet {
    const questions: BoardQuestion[] = [];

    // Generate questions for each category
    questions.push(...this.generateTechnologyQuestions());
    questions.push(...this.generatePackageQuestions());
    questions.push(...this.generatePlatformQuestions());
    questions.push(...this.generateBusinessQuestions());
    questions.push(...this.generateTechnicalDebtQuestions());
    questions.push(...this.generateGrowthQuestions());

    // Add custom questions from config
    if (this.config?.customQuestions) {
      questions.push(
        ...this.formatCustomQuestions(this.config.customQuestions),
      );
    }

    // Sort by priority
    const sorted = this.sortByPriority(questions);

    return {
      questions: sorted,
      summary: this.generateSummary(sorted),
    };
  }

  /**
   * Technology Decisions questions
   */
  private generateTechnologyQuestions(): BoardQuestion[] {
    const questions: BoardQuestion[] = [];
    const { technology, project } = this.analysis;

    if (technology.framework) {
      questions.push({
        category: "Technology Decisions",
        question: `Why was ${technology.framework} chosen as the primary framework, and does it still align with our strategic goals?`,
        context: `Project uses ${technology.framework}${technology.frameworkVersion ? ` v${technology.frameworkVersion}` : ""} as the foundation`,
        findings: [
          `Framework: ${technology.framework}`,
          `Language: ${technology.language}`,
          `Runtime: ${technology.runtime}`,
        ],
        recommendations: [
          "Validate framework continues to meet performance and scalability needs",
          "Assess community support and long-term viability",
          "Consider migration costs vs. benefits if alternatives exist",
        ],
        priority: "high",
        businessImpact:
          "Framework choice affects development velocity, talent acquisition, and long-term maintenance costs",
      });
    }

    if (technology.buildTools && technology.buildTools.length > 0) {
      questions.push({
        category: "Technology Decisions",
        question: `How are our build tools (${technology.buildTools.join(", ")}) optimizing development workflow and deployment efficiency?`,
        context: `Build pipeline uses ${technology.buildTools.join(", ")}`,
        findings: technology.buildTools.map(
          (tool) => `Using ${tool} for build process`,
        ),
        recommendations: [
          "Measure build time impacts on CI/CD pipeline",
          "Evaluate if modern alternatives could improve developer experience",
          "Consider caching strategies to optimize build performance",
        ],
        priority: "medium",
        businessImpact:
          "Build efficiency directly impacts time-to-market for new features",
      });
    }

    if (project.isMonorepo) {
      questions.push({
        category: "Technology Decisions",
        question: `Is the monorepo structure providing expected benefits in code sharing and deployment coordination?`,
        context: `Project uses monorepo with ${project.workspaceCount || "multiple"} workspaces`,
        findings: [
          `Monorepo with ${project.workspaceCount} packages`,
          `Total ${project.fileCount} files managed`,
        ],
        recommendations: [
          "Assess if shared code is properly abstracted and reused",
          "Evaluate build caching and selective deployment strategies",
          "Consider workspace organization for scaling",
        ],
        priority: "medium",
        businessImpact:
          "Monorepo architecture affects team collaboration and deployment complexity",
      });
    }

    return questions;
  }

  /**
   * Package Utilization questions
   */
  private generatePackageQuestions(): BoardQuestion[] {
    const questions: BoardQuestion[] = [];
    const { packages } = this.analysis;

    if (packages.total > 80) {
      questions.push({
        category: "Package Utilization",
        question: `With ${packages.total} dependencies, are we maintaining optimal balance between functionality and maintenance burden?`,
        context: `Project has ${packages.production.length} production and ${packages.development.length} development dependencies`,
        findings: [
          `Total packages: ${packages.total}`,
          `Production: ${packages.production.length}`,
          `Development: ${packages.development.length}`,
        ],
        recommendations: [
          "Audit for unused or redundant packages",
          "Evaluate if critical functionality should be internalized",
          "Implement dependency update strategy",
        ],
        priority: packages.total > 150 ? "high" : "medium",
        businessImpact:
          "Dependency count affects security surface area and maintenance costs",
      });
    }

    // Category-specific questions
    if (packages.categories.length > 0) {
      const topCategories = packages.categories
        .sort((a, b) => b.count - a.count)
        .slice(0, 3);

      topCategories.forEach((cat) => {
        if (cat.count > 5) {
          questions.push({
            category: "Package Utilization",
            question: `How are we leveraging our ${cat.count} ${cat.name} packages to deliver business value?`,
            context: `${cat.name}: ${cat.packages.slice(0, 3).join(", ")}${cat.count > 3 ? `, +${cat.count - 3} more` : ""}`,
            findings: [
              `${cat.count} packages in ${cat.name} category`,
              cat.businessImpact,
            ],
            recommendations: this.getCategoryRecommendations(cat),
            priority: this.getCategoryPriority(cat),
            businessImpact: cat.businessImpact,
          });
        }
      });
    }

    // Security and outdated packages
    if (packages.security && packages.security.length > 0) {
      const criticalCount = packages.security.filter(
        (s) => s.severity === "critical",
      ).length;

      questions.push({
        category: "Package Utilization",
        question: `What is our strategy for addressing ${packages.security.length} identified security vulnerabilities${criticalCount > 0 ? ` (${criticalCount} critical)` : ""}?`,
        context: "Security audit identified vulnerabilities in dependencies",
        findings: packages.security.map(
          (s) => `${s.package}: ${s.severity} - ${s.issue}`,
        ),
        recommendations: packages.security.map((s) => s.recommendation),
        priority: criticalCount > 0 ? "high" : "medium",
        businessImpact:
          "Security vulnerabilities pose risk to customer data and business operations",
      });
    }

    return questions;
  }

  /**
   * Platform Strategy questions
   */
  private generatePlatformQuestions(): BoardQuestion[] {
    const questions: BoardQuestion[] = [];
    const { technology } = this.analysis;

    if (technology.platforms && technology.platforms.length > 0) {
      questions.push({
        category: "Platform Strategy",
        question: `Are our platform choices (${technology.platforms.join(", ")}) aligned with target market and growth plans?`,
        context: `Currently deployed on ${technology.platforms.join(" + ")}`,
        findings: technology.platforms.map((p) => `Supports ${p} platform`),
        recommendations: [
          "Validate platform coverage matches user demographics",
          "Assess cross-platform development efficiency",
          "Consider platform-specific optimization opportunities",
        ],
        priority: "medium",
        businessImpact:
          "Platform strategy determines market reach and development costs",
      });
    }

    if (technology.infrastructure && technology.infrastructure.length > 0) {
      questions.push({
        category: "Platform Strategy",
        question: `How is our infrastructure choice (${technology.infrastructure.join(", ")}) supporting scalability and cost efficiency?`,
        context: `Infrastructure: ${technology.infrastructure.join(", ")}`,
        findings: technology.infrastructure.map((i) => `Deployed on ${i}`),
        recommendations: [
          "Monitor infrastructure costs vs. usage patterns",
          "Evaluate auto-scaling and redundancy capabilities",
          "Consider multi-region deployment for global users",
        ],
        priority: "high",
        businessImpact:
          "Infrastructure directly impacts operational costs, uptime, and scalability",
      });
    }

    return questions;
  }

  /**
   * Business Alignment questions
   */
  private generateBusinessQuestions(): BoardQuestion[] {
    const questions: BoardQuestion[] = [];
    const { packages } = this.analysis;

    // Analytics
    const hasAnalytics = packages.categories.some((cat) =>
      cat.name.toLowerCase().includes("analytics"),
    );

    if (!hasAnalytics) {
      questions.push({
        category: "Business Alignment",
        question:
          "Why don't we have analytics infrastructure, and how are we making data-driven product decisions?",
        context: "No analytics packages detected in the project",
        findings: ["Missing analytics implementation"],
        recommendations: [
          "Implement analytics to track user behavior and feature adoption",
          "Set up conversion funnels and key metric tracking",
          "Enable A/B testing capabilities for product experiments",
        ],
        priority: "high",
        businessImpact:
          "Lack of analytics limits ability to measure ROI and optimize user experience",
      });
    }

    // Authentication
    const hasAuth = packages.categories.some((cat) =>
      cat.name.toLowerCase().includes("auth"),
    );

    if (hasAuth) {
      const authCat = packages.categories.find((cat) =>
        cat.name.toLowerCase().includes("auth"),
      )!;
      questions.push({
        category: "Business Alignment",
        question: `How is our authentication solution (${authCat.packages.join(", ")}) supporting user onboarding and security requirements?`,
        context: `Using ${authCat.packages.join(" + ")} for authentication`,
        findings: authCat.packages.map((p) => `Auth provider: ${p}`),
        recommendations: [
          "Measure authentication success rates and friction points",
          "Ensure compliance with security standards (SOC2, GDPR, etc.)",
          "Evaluate social login options to reduce signup friction",
        ],
        priority: "high",
        businessImpact:
          "Authentication affects conversion rates and security posture",
      });
    }

    // Testing and Quality
    const hasTestingtools = packages.categories.some((cat) =>
      cat.name.toLowerCase().includes("testing"),
    );

    if (hasTestingtools) {
      questions.push({
        category: "Business Alignment",
        question:
          "How is our testing strategy contributing to product quality and customer satisfaction?",
        context: "Testing infrastructure is in place",
        findings: ["Testing tools available"],
        recommendations: [
          "Set coverage targets aligned with quality goals",
          "Implement testing in CI/CD for every release",
          "Track bugs-in-production as quality metric",
        ],
        priority: "medium",
        businessImpact:
          "Quality assurance directly affects customer satisfaction and support costs",
      });
    }

    return questions;
  }

  /**
   * Technical Debt questions
   */
  private generateTechnicalDebtQuestions(): BoardQuestion[] {
    const questions: BoardQuestion[] = [];
    const { risks, packages } = this.analysis;

    // High-risk items
    if (risks.high && risks.high.length > 0) {
      questions.push({
        category: "Technical Debt",
        question: `What is our strategy for addressing ${risks.high.length} high-priority technical risks?`,
        context: "Analysis identified significant technical risks",
        findings: risks.high,
        recommendations: [
          "Prioritize risks by business impact",
          "Allocate dedicated time for technical debt in sprints",
          "Track debt reduction as OKR/KPI",
        ],
        priority: "high",
        businessImpact:
          "Unaddressed technical debt slows feature velocity and increases costs",
      });
    }

    // Outdated packages
    if (packages.outdated && packages.outdated.length > 10) {
      const breakingCount = packages.outdated.filter((p) => p.breaking).length;

      questions.push({
        category: "Technical Debt",
        question: `How should we prioritize updating ${packages.outdated.length} outdated packages${breakingCount > 0 ? ` (${breakingCount} with breaking changes)` : ""}?`,
        context: "Dependency audit found outdated packages",
        findings: packages.outdated
          .slice(0, 5)
          .map((p) => `${p.name}: ${p.current} → ${p.latest}`),
        recommendations: [
          "Create update roadmap starting with non-breaking changes",
          "Test breaking changes in feature branches",
          "Consider automated dependency updates (Dependabot, Renovate)",
        ],
        priority: breakingCount > 5 ? "high" : "medium",
        businessImpact:
          "Outdated dependencies miss performance improvements and security patches",
      });
    }

    // Complexity risks
    const complexityRisk = risks.categories.find((c) =>
      c.name.includes("Complexity"),
    );
    if (complexityRisk && complexityRisk.score > 0.5) {
      questions.push({
        category: "Technical Debt",
        question:
          "How are we managing codebase complexity to maintain development velocity?",
        context: `Complexity score: ${(complexityRisk.score * 100).toFixed(0)}%`,
        findings: complexityRisk.issues,
        recommendations: [
          "Implement code quality metrics and monitoring",
          "Establish refactoring goals for each sprint",
          "Consider modularization strategies",
        ],
        priority: complexityRisk.score > 0.7 ? "high" : "medium",
        businessImpact:
          "High complexity slows new feature development and increases bugs",
      });
    }

    return questions;
  }

  /**
   * Growth Opportunities questions
   */
  private generateGrowthQuestions(): BoardQuestion[] {
    const questions: BoardQuestion[] = [];
    const { opportunities } = this.analysis;

    // Immediate opportunities
    if (opportunities.immediate && opportunities.immediate.length > 0) {
      questions.push({
        category: "Growth Opportunities",
        question:
          "Which immediate technical opportunities should we prioritize for maximum business impact?",
        context: `${opportunities.immediate.length} immediate opportunities identified`,
        findings: opportunities.immediate,
        recommendations: [
          "Evaluate ROI and effort for each opportunity",
          "Align opportunities with business OKRs",
          "Quick wins can build momentum for larger initiatives",
        ],
        priority: "high",
        businessImpact:
          "Immediate opportunities can deliver quick ROI with minimal investment",
      });
    }

    // Strategic opportunities
    opportunities.categories.forEach((cat) => {
      if (cat.potential > 0.6) {
        questions.push({
          category: "Growth Opportunities",
          question: `How can we capitalize on ${cat.name.toLowerCase()} opportunities to drive business growth?`,
          context: `Potential score: ${(cat.potential * 100).toFixed(0)}%`,
          findings: cat.recommendations,
          recommendations: [
            "Develop roadmap for implementing recommendations",
            "Assign owners and timelines",
            "Define success metrics",
          ],
          priority: cat.potential > 0.8 ? "high" : "medium",
          businessImpact: cat.businessValue,
        });
      }
    });

    return questions;
  }

  /**
   * Format custom questions from config
   */
  private formatCustomQuestions(
    customQuestions: AdvisoryQuestion[],
  ): BoardQuestion[] {
    return customQuestions.map((q) => ({
      category: q.category,
      question: q.question,
      context: q.context || "Custom advisory question",
      findings: [],
      recommendations: [],
      priority: q.priority || "medium",
      businessImpact: "Custom question defined by organization",
    }));
  }

  /**
   * Sort questions by priority
   */
  private sortByPriority(questions: BoardQuestion[]): BoardQuestion[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return questions.sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority],
    );
  }

  /**
   * Generate summary of questions
   */
  private generateSummary(questions: BoardQuestion[]): QuestionSummary {
    const categories = Array.from(new Set(questions.map((q) => q.category)));

    return {
      totalQuestions: questions.length,
      highPriority: questions.filter((q) => q.priority === "high").length,
      mediumPriority: questions.filter((q) => q.priority === "medium").length,
      lowPriority: questions.filter((q) => q.priority === "low").length,
      categories,
    };
  }

  /**
   * Get recommendations for a package category
   */
  private getCategoryRecommendations(cat: PackageCategory): string[] {
    const recommendations: string[] = [];

    if (cat.name.includes("UI") || cat.name.includes("Styling")) {
      recommendations.push(
        "Ensure design system consistency across components",
      );
      recommendations.push("Consider component library optimization");
    } else if (cat.name.includes("API") || cat.name.includes("Data")) {
      recommendations.push("Implement proper error handling and retry logic");
      recommendations.push("Consider caching strategies for performance");
    } else if (cat.name.includes("Testing")) {
      recommendations.push("Increase test coverage for critical paths");
      recommendations.push("Automate testing in CI/CD pipeline");
    } else if (cat.name.includes("Database") || cat.name.includes("ORM")) {
      recommendations.push("Optimize queries and indexes");
      recommendations.push("Implement database migration strategy");
    }

    if (recommendations.length === 0) {
      recommendations.push("Review usage patterns for optimization");
      recommendations.push("Consider if functionality meets current needs");
    }

    return recommendations;
  }

  /**
   * Get priority for a package category
   */
  private getCategoryPriority(cat: PackageCategory): "high" | "medium" | "low" {
    // High priority for critical infrastructure
    if (
      ["Authentication", "Database", "Infrastructure", "API"].some((key) =>
        cat.name.includes(key),
      )
    ) {
      return "high";
    }

    // Medium for important but not critical
    if (
      ["UI", "Testing", "State Management", "Forms"].some((key) =>
        cat.name.includes(key),
      )
    ) {
      return "medium";
    }

    return "low";
  }
}
