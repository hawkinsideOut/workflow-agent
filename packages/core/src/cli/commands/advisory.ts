/**
 * Advisory Command
 *
 * Generates comprehensive advisory board analysis and documentation.
 *
 * Usage:
 *   workflow-agent advisory                              # Interactive mode
 *   workflow-agent advisory --depth quick                # Quick analysis
 *   workflow-agent advisory --depth executive            # Executive summary only
 *   workflow-agent advisory --include-health             # Include code health metrics
 *   workflow-agent advisory --compare docs/advisory/     # Compare with previous
 *   workflow-agent advisory --ci                         # CI mode with exit codes
 *   workflow-agent advisory --dry-run                    # Preview only
 */

import * as p from "@clack/prompts";
import chalk from "chalk";
import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { AdvisoryAnalyzer } from "../../utils/advisory-analyzer.js";
import { QuestionGenerator } from "../../utils/question-generator.js";
import { ReportComparator } from "../../utils/report-comparator.js";
import { loadConfig } from "../../config/index.js";
import type { AdvisoryDepth } from "../../config/schema.js";

export interface AdvisoryOptions {
  depth?: AdvisoryDepth;
  output?: string;
  interactive?: boolean;
  dryRun?: boolean;
  format?: "markdown" | "json";
  timestamp?: boolean;
  includeHealth?: boolean;
  ci?: boolean;
  compare?: string;
}

export async function advisoryCommand(options: AdvisoryOptions) {
  console.log(chalk.bold.cyan("\n🎯 Advisory Board Analysis\n"));

  const cwd = process.cwd();

  // Load config
  let config;
  try {
    config = await loadConfig(cwd);
  } catch (error) {
    // Config is optional for advisory
    config = undefined;
  }

  const advisoryConfig = config?.advisory;

  // Interactive mode: gather missing options
  const isInteractive = options.interactive || (!options.depth && !options.ci);

  let depth: AdvisoryDepth =
    options.depth || advisoryConfig?.defaultDepth || "standard";
  let outputDir =
    options.output || advisoryConfig?.outputDir || "docs/advisory";
  let includeHealth =
    options.includeHealth ?? advisoryConfig?.includeHealthMetrics ?? false;

  if (isInteractive && !options.depth) {
    const depthChoice = await p.select({
      message: "Select analysis depth:",
      options: [
        {
          value: "executive",
          label:
            "📊 Executive - Business summary for non-technical stakeholders",
          hint: "High-level overview only",
        },
        {
          value: "quick",
          label: "⚡ Quick - Package scan and framework detection",
          hint: "~30 seconds",
        },
        {
          value: "standard",
          label: "🔍 Standard - Includes architecture analysis",
          hint: "~1-2 minutes (recommended)",
        },
        {
          value: "comprehensive",
          label: "🔬 Comprehensive - Full code-level pattern detection",
          hint: "~3-5 minutes",
        },
      ],
      initialValue: "standard",
    });

    if (p.isCancel(depthChoice)) {
      p.cancel("Analysis cancelled");
      process.exit(0);
    }

    depth = depthChoice as AdvisoryDepth;
  }

  if (isInteractive && !options.output) {
    const outputChoice = await p.text({
      message: "Output directory:",
      placeholder: "docs/advisory",
      defaultValue: outputDir,
    });

    if (p.isCancel(outputChoice)) {
      p.cancel("Analysis cancelled");
      process.exit(0);
    }

    outputDir = outputChoice as string;
  }

  if (isInteractive && !options.includeHealth) {
    const healthChoice = await p.confirm({
      message: "Include code health metrics?",
      initialValue: includeHealth,
    });

    if (p.isCancel(healthChoice)) {
      p.cancel("Analysis cancelled");
      process.exit(0);
    }

    includeHealth = healthChoice;
  }

  // Create analyzer
  const analyzer = new AdvisoryAnalyzer({
    depth,
    cwd,
    config: config ?? undefined,
    includeHealth,
    excludePatterns: advisoryConfig?.excludePatterns,
  });

  // Run analysis
  const spinner = p.spinner();
  const depthLabels = {
    executive: "executive summary",
    quick: "quick scan",
    standard: "standard analysis",
    comprehensive: "comprehensive analysis",
  };

  spinner.start(`Running ${depthLabels[depth]}...`);

  let analysis;
  try {
    analysis = await analyzer.analyze();
    spinner.stop(`✓ Analysis complete`);
  } catch (error) {
    spinner.stop("✗ Analysis failed");
    console.error(
      chalk.red(
        `Error: ${error instanceof Error ? error.message : String(error)}`,
      ),
    );
    process.exit(1);
  }

  // Generate questions
  const questionGenerator = new QuestionGenerator(analysis, advisoryConfig);
  const questions = questionGenerator.generate();

  // Display summary
  console.log("");
  displaySummary(analysis, questions);

  // Handle comparison mode
  let comparisonReport;
  let comparator;
  if (options.compare) {
    // If the path ends with .json, use it directly; otherwise append analysis.json
    const comparisonPath = options.compare.endsWith(".json")
      ? join(cwd, options.compare)
      : join(cwd, options.compare, "analysis.json");
    if (existsSync(comparisonPath)) {
      spinner.start("Comparing with previous report...");
      try {
        const previousContent = await readFile(comparisonPath, "utf-8");
        const previousAnalysis = JSON.parse(previousContent);

        comparator = new ReportComparator(previousAnalysis, analysis);
        comparisonReport = comparator.compare();

        spinner.stop("✓ Comparison complete");
        console.log("");
        displayComparisonSummary(comparisonReport);
      } catch (error) {
        spinner.stop("⚠ Comparison failed");
        console.warn(chalk.yellow(`Could not compare reports: ${error}`));
      }
    } else {
      console.warn(
        chalk.yellow(
          `\n⚠ No previous report found at ${comparisonPath}. Skipping comparison.\n`,
        ),
      );
    }
  }

  // Check if dry-run
  if (options.dryRun) {
    console.log(chalk.dim("\n--dry-run mode: No files written.\n"));
    return;
  }

  // Create output directory
  const fullOutputDir = join(cwd, outputDir);
  await mkdir(fullOutputDir, { recursive: true });

  // Write reports
  spinner.start("Generating reports...");

  try {
    const timestamp = options.timestamp
      ? new Date().toISOString().split("T")[0]
      : "";

    if (options.format === "json") {
      // JSON format
      await writeAnalysisJson(fullOutputDir, analysis, questions, timestamp);
    } else {
      // Markdown format (default)
      await writeMarkdownReports(
        fullOutputDir,
        analysis,
        questions,
        comparator,
        timestamp,
      );
    }

    spinner.stop("✓ Reports generated");
  } catch (error) {
    spinner.stop("✗ Failed to write reports");
    console.error(chalk.red(`Error: ${error}`));
    process.exit(1);
  }

  // Display file locations
  console.log("");
  console.log(chalk.green("📝 Reports written to:"));
  const suffix = options.timestamp
    ? `-${new Date().toISOString().split("T")[0]}`
    : "";

  if (options.format === "json") {
    console.log(chalk.dim(`   ${join(outputDir, `analysis${suffix}.json`)}`));
    console.log(chalk.dim(`   ${join(outputDir, `questions${suffix}.json`)}`));
  } else {
    console.log(
      chalk.dim(`   ${join(outputDir, `EXECUTIVE_SUMMARY${suffix}.md`)}`),
    );
    console.log(
      chalk.dim(`   ${join(outputDir, `TECHNOLOGY_AUDIT${suffix}.md`)}`),
    );
    console.log(
      chalk.dim(`   ${join(outputDir, `STRATEGIC_ROADMAP${suffix}.md`)}`),
    );
    console.log(
      chalk.dim(`   ${join(outputDir, `BOARD_QUESTIONS${suffix}.md`)}`),
    );

    if (comparisonReport) {
      console.log(
        chalk.dim(`   ${join(outputDir, `DIFF_REPORT${suffix}.md`)}`),
      );
    }
  }

  // CI mode: check thresholds and exit with code
  if (options.ci) {
    console.log("");
    const exitCode = checkCIThresholds(analysis, advisoryConfig);

    if (exitCode !== 0) {
      console.log(chalk.red(`\n❌ CI check failed (exit code ${exitCode})\n`));
      process.exit(exitCode);
    } else {
      console.log(chalk.green("\n✓ CI check passed\n"));
    }
  }

  p.outro(chalk.green("✓ Advisory analysis complete!"));
}

/**
 * Display analysis summary
 */
function displaySummary(analysis: any, questions: any) {
  console.log(chalk.bold("📊 Analysis Summary\n"));

  console.log(
    chalk.dim(`Project: ${analysis.project.name} v${analysis.project.version}`),
  );
  console.log(
    chalk.dim(
      `Framework: ${analysis.technology.framework || "N/A"} (${analysis.technology.language})`,
    ),
  );
  console.log(chalk.dim(`Total Packages: ${analysis.packages.total}`));
  console.log(chalk.dim(`Files Analyzed: ${analysis.project.fileCount}`));
  console.log("");

  // Risk score
  const riskScore = (analysis.risks.overall * 100).toFixed(0);
  const riskColor =
    analysis.risks.overall > 0.7
      ? chalk.red
      : analysis.risks.overall > 0.4
        ? chalk.yellow
        : chalk.green;
  console.log(riskColor(`⚠️  Risk Score: ${riskScore}%`));

  // Opportunity score
  const oppScore = (analysis.opportunities.overall * 100).toFixed(0);
  const oppColor =
    analysis.opportunities.overall > 0.7
      ? chalk.green
      : analysis.opportunities.overall > 0.5
        ? chalk.yellow
        : chalk.dim;
  console.log(oppColor(`🌟 Opportunity Score: ${oppScore}%`));

  console.log("");

  // Questions summary
  console.log(chalk.bold("❓ Advisory Questions\n"));
  console.log(
    chalk.dim(`Total Questions: ${questions.summary.totalQuestions}`),
  );
  console.log(chalk.red(`   High Priority: ${questions.summary.highPriority}`));
  console.log(
    chalk.yellow(`   Medium Priority: ${questions.summary.mediumPriority}`),
  );
  console.log(chalk.dim(`   Low Priority: ${questions.summary.lowPriority}`));
  console.log("");

  // Top 3 high-priority questions
  const highPriorityQuestions = questions.questions.filter(
    (q: any) => q.priority === "high",
  );

  if (highPriorityQuestions.length > 0) {
    console.log(chalk.bold.yellow("🔥 Top Priority Questions:\n"));
    highPriorityQuestions.slice(0, 3).forEach((q: any, i: number) => {
      console.log(chalk.yellow(`${i + 1}. ${q.question}`));
      console.log(chalk.dim(`   Category: ${q.category}`));
      console.log("");
    });
  }
}

/**
 * Display comparison summary
 */
function displayComparisonSummary(comparison: any) {
  console.log(chalk.bold("📈 Changes Since Last Report\n"));

  const riskChange = comparison.changes.riskScoreChange;
  const riskEmoji = riskChange < 0 ? "✅" : riskChange > 0 ? "⚠️" : "➖";
  console.log(
    `${riskEmoji} Risk Score: ${(riskChange * 100).toFixed(0)}% change`,
  );

  const oppChange = comparison.changes.opportunityScoreChange;
  const oppEmoji = oppChange > 0 ? "✅" : oppChange < 0 ? "⚠️" : "➖";
  console.log(
    `${oppEmoji} Opportunity Score: ${(oppChange * 100).toFixed(0)}% change`,
  );

  console.log(
    `📦 Packages: ${comparison.changes.packageCountChange > 0 ? "+" : ""}${comparison.changes.packageCountChange}`,
  );

  if (comparison.changes.newHighRisks > 0) {
    console.log(
      chalk.red(
        `⚠️  ${comparison.changes.newHighRisks} new high-priority risks`,
      ),
    );
  }

  if (comparison.changes.resolvedHighRisks > 0) {
    console.log(
      chalk.green(
        `✅ ${comparison.changes.resolvedHighRisks} high-priority risks resolved`,
      ),
    );
  }

  console.log("");
}

/**
 * Write analysis as JSON
 */
async function writeAnalysisJson(
  outputDir: string,
  analysis: any,
  questions: any,
  timestamp: string,
) {
  const suffix = timestamp ? `-${timestamp}` : "";

  await writeFile(
    join(outputDir, `analysis${suffix}.json`),
    JSON.stringify(analysis, null, 2),
    "utf-8",
  );

  await writeFile(
    join(outputDir, `questions${suffix}.json`),
    JSON.stringify(questions, null, 2),
    "utf-8",
  );
}

/**
 * Write markdown reports
 */
async function writeMarkdownReports(
  outputDir: string,
  analysis: any,
  questions: any,
  comparator: any,
  timestamp: string,
) {
  const suffix = timestamp ? `-${timestamp}` : "";

  // Also save JSON for future comparisons
  await writeFile(
    join(outputDir, `analysis.json`),
    JSON.stringify(analysis, null, 2),
    "utf-8",
  );

  // Generate each markdown report
  await writeFile(
    join(outputDir, `EXECUTIVE_SUMMARY${suffix}.md`),
    generateExecutiveSummary(analysis, questions),
    "utf-8",
  );

  await writeFile(
    join(outputDir, `TECHNOLOGY_AUDIT${suffix}.md`),
    generateTechnologyAudit(analysis),
    "utf-8",
  );

  await writeFile(
    join(outputDir, `STRATEGIC_ROADMAP${suffix}.md`),
    generateStrategicRoadmap(analysis, questions),
    "utf-8",
  );

  await writeFile(
    join(outputDir, `BOARD_QUESTIONS${suffix}.md`),
    generateBoardQuestions(questions),
    "utf-8",
  );

  if (comparator) {
    await writeFile(
      join(outputDir, `DIFF_REPORT${suffix}.md`),
      comparator.generateMarkdownSummary(),
      "utf-8",
    );
  }
}

/**
 * Generate Executive Summary markdown
 */
function generateExecutiveSummary(analysis: any, questions: any): string {
  let md = `# Executive Summary\n\n`;
  md += `> **Generated:** ${new Date(analysis.timestamp).toLocaleDateString()}\n\n`;
  md += `---\n\n`;

  md += `## Project Overview\n\n`;
  md += `**${analysis.project.name}** is a ${analysis.technology.framework || "modern"} application `;
  md += `built with ${analysis.technology.language}. `;

  if (analysis.project.description) {
    md += `${analysis.project.description}\n\n`;
  } else {
    md += `\n\n`;
  }

  md += `### Key Metrics\n\n`;
  md += `| Metric | Value |\n`;
  md += `|--------|-------|\n`;
  md += `| Version | ${analysis.project.version} |\n`;
  md += `| Dependencies | ${analysis.packages.total} packages |\n`;
  md += `| Codebase Size | ${analysis.project.fileCount} files (~${(analysis.project.totalLines / 1000).toFixed(0)}K lines) |\n`;
  md += `| Architecture | ${analysis.project.isMonorepo ? "Monorepo" : "Single repository"} |\n`;
  md += `\n`;

  // Risk/Opportunity Matrix
  md += `## Strategic Assessment\n\n`;

  const riskScore = analysis.risks.overall;
  const oppScore = analysis.opportunities.overall;

  md += `### Risk & Opportunity Matrix\n\n`;
  md += `| Category | Score | Status |\n`;
  md += `|----------|-------|--------|\n`;
  md += `| **Technical Risk** | ${(riskScore * 100).toFixed(0)}% | ${getRiskLabel(riskScore)} |\n`;
  md += `| **Growth Opportunity** | ${(oppScore * 100).toFixed(0)}% | ${getOpportunityLabel(oppScore)} |\n`;
  md += `\n`;

  // Technology Stack (high-level)
  md += `### Technology Foundation\n\n`;
  md += `**Primary Stack:**\n`;
  md += `- Framework: ${analysis.technology.framework || "N/A"}\n`;
  md += `- Language: ${analysis.technology.language}\n`;
  md += `- Runtime: ${analysis.technology.runtime}\n`;
  if (analysis.technology.platforms.length > 0) {
    md += `- Platforms: ${analysis.technology.platforms.join(", ")}\n`;
  }
  md += `\n`;

  if (analysis.technology.infrastructure.length > 0) {
    md += `**Infrastructure:** ${analysis.technology.infrastructure.join(", ")}\n\n`;
  }

  // Key package categories
  if (analysis.packages.categories.length > 0) {
    md += `### Technology Categories\n\n`;
    const topCategories = analysis.packages.categories
      .sort((a: any, b: any) => b.count - a.count)
      .slice(0, 5);

    topCategories.forEach((cat: any) => {
      md += `- **${cat.name}** (${cat.count} packages) - ${cat.businessImpact}\n`;
    });
    md += `\n`;
  }

  // Top Priority Questions (Executive view)
  md += `## Key Strategic Questions\n\n`;

  const highPriorityQuestions = questions.questions.filter(
    (q: any) => q.priority === "high",
  );

  if (highPriorityQuestions.length > 0) {
    highPriorityQuestions.slice(0, 5).forEach((q: any, i: number) => {
      md += `### ${i + 1}. ${q.question}\n\n`;
      md += `**Context:** ${q.context}\n\n`;
      md += `**Business Impact:** ${q.businessImpact}\n\n`;
    });
  }

  // Critical Risks
  if (analysis.risks.critical && analysis.risks.critical.length > 0) {
    md += `## Critical Risks\n\n`;
    analysis.risks.critical.forEach((risk: string) => {
      md += `- ⚠️ ${risk}\n`;
    });
    md += `\n`;
  }

  // Top Opportunities
  if (
    analysis.opportunities.immediate &&
    analysis.opportunities.immediate.length > 0
  ) {
    md += `## Immediate Opportunities\n\n`;
    analysis.opportunities.immediate.slice(0, 5).forEach((opp: string) => {
      md += `- 🌟 ${opp}\n`;
    });
    md += `\n`;
  }

  md += `---\n\n`;
  md += `*For detailed technical analysis, see [TECHNOLOGY_AUDIT.md](TECHNOLOGY_AUDIT.md)*\n`;
  md += `*For strategic recommendations, see [STRATEGIC_ROADMAP.md](STRATEGIC_ROADMAP.md)*\n`;

  return md;
}

/**
 * Generate Technology Audit markdown
 */
function generateTechnologyAudit(analysis: any): string {
  let md = `# Technology Audit\n\n`;
  md += `> **Generated:** ${new Date(analysis.timestamp).toLocaleDateString()}\n`;
  md += `> **Analysis Depth:** ${analysis.depth}\n\n`;
  md += `---\n\n`;

  // Project Details
  md += `## Project Details\n\n`;
  md += `| Property | Value |\n`;
  md += `|----------|-------|\n`;
  md += `| Name | ${analysis.project.name} |\n`;
  md += `| Version | ${analysis.project.version} |\n`;
  md += `| Package Manager | ${analysis.project.packageManager} |\n`;
  md += `| Repository Type | ${analysis.project.isMonorepo ? "Monorepo" : "Single"} |\n`;
  if (analysis.project.workspaceCount) {
    md += `| Workspaces | ${analysis.project.workspaceCount} |\n`;
  }
  md += `| Total Files | ${analysis.project.fileCount} |\n`;
  md += `| Estimated Lines | ${analysis.project.totalLines.toLocaleString()} |\n`;
  md += `\n`;

  // Technology Stack
  md += `## Technology Stack\n\n`;
  md += `### Core Technologies\n\n`;
  md += `| Component | Technology |\n`;
  md += `|-----------|------------|\n`;
  md += `| Framework | ${analysis.technology.framework || "N/A"} ${analysis.technology.frameworkVersion || ""} |\n`;
  md += `| Language | ${analysis.technology.language} |\n`;
  md += `| Runtime | ${analysis.technology.runtime} |\n`;
  md += `| Platforms | ${analysis.technology.platforms.join(", ")} |\n`;
  md += `\n`;

  if (analysis.technology.buildTools.length > 0) {
    md += `### Build Tools\n\n`;
    analysis.technology.buildTools.forEach((tool: string) => {
      md += `- ${tool}\n`;
    });
    md += `\n`;
  }

  if (analysis.technology.infrastructure.length > 0) {
    md += `### Infrastructure\n\n`;
    analysis.technology.infrastructure.forEach((infra: string) => {
      md += `- ${infra}\n`;
    });
    md += `\n`;
  }

  // Package Analysis
  md += `## Dependency Analysis\n\n`;
  md += `### Overview\n\n`;
  md += `- **Total Packages:** ${analysis.packages.total}\n`;
  md += `- **Production:** ${analysis.packages.production.length}\n`;
  md += `- **Development:** ${analysis.packages.development.length}\n`;
  md += `\n`;

  // Categories
  if (analysis.packages.categories.length > 0) {
    md += `### Package Categories\n\n`;
    md += `| Category | Count | Business Impact |\n`;
    md += `|----------|-------|----------------|\n`;

    analysis.packages.categories
      .sort((a: any, b: any) => b.count - a.count)
      .forEach((cat: any) => {
        md += `| ${cat.name} | ${cat.count} | ${cat.businessImpact} |\n`;
      });

    md += `\n`;
  }

  // Top Production Dependencies
  if (analysis.packages.production.length > 0) {
    md += `### Key Production Dependencies\n\n`;
    md += `| Package | Version | Category | Purpose |\n`;
    md += `|---------|---------|----------|--------|\n`;

    analysis.packages.production.slice(0, 15).forEach((pkg: any) => {
      md += `| ${pkg.name} | \`${pkg.version}\` | ${pkg.category} | ${pkg.purpose} |\n`;
    });

    if (analysis.packages.production.length > 15) {
      md += `\n*...and ${analysis.packages.production.length - 15} more*\n`;
    }

    md += `\n`;
  }

  // Architecture (if available)
  if (analysis.architecture) {
    md += `## Architecture Overview\n\n`;
    md += `**Pattern:** ${analysis.architecture.pattern}\n\n`;

    md += `### Layers\n\n`;
    analysis.architecture.layers.forEach((layer: string) => {
      md += `- ${layer}\n`;
    });
    md += `\n`;

    md += `**Data Flow:** ${analysis.architecture.dataFlow}\n\n`;

    if (analysis.architecture.keyDecisions.length > 0) {
      md += `### Key Architecture Decisions\n\n`;
      analysis.architecture.keyDecisions.forEach((decision: string) => {
        md += `- ${decision}\n`;
      });
      md += `\n`;
    }
  }

  // Code Patterns (if comprehensive analysis)
  if (analysis.codePatterns) {
    md += `## Code Patterns\n\n`;

    if (analysis.codePatterns.components.length > 0) {
      md += `### Components\n\n`;
      analysis.codePatterns.components.forEach((comp: any) => {
        md += `**${comp.type}** (${comp.count})\n`;
        md += `- Conventions: ${comp.conventions.join(", ")}\n`;
        md += `\n`;
      });
    }

    if (analysis.codePatterns.tests) {
      md += `### Testing\n\n`;
      md += `- Framework: ${analysis.codePatterns.tests.framework}\n`;
      md += `- Test Count: ${analysis.codePatterns.tests.count}\n`;
      md += `- Types: ${analysis.codePatterns.tests.types.join(", ")}\n`;
      if (analysis.codePatterns.tests.coverage) {
        md += `- Coverage: ${analysis.codePatterns.tests.coverage}%\n`;
      }
      md += `\n`;
    }
  }

  // Health Metrics (if available)
  if (analysis.health) {
    md += `## Code Health\n\n`;
    md += `| Check | Status |\n`;
    md += `|-------|--------|\n`;
    md += `| TypeScript | ${analysis.health.typecheck ? "✅ Passing" : "❌ Failing"} |\n`;
    md += `| Linting | ${analysis.health.lint ? "✅ Passing" : "❌ Failing"} |\n`;
    md += `| Tests | ${analysis.health.tests ? "✅ Passing" : "❌ Failing"} |\n`;
    md += `| Build | ${analysis.health.build ? "✅ Passing" : "❌ Failing"} |\n`;
    if (analysis.health.coverage) {
      md += `| Coverage | ${analysis.health.coverage}% |\n`;
    }
    md += `\n`;
  }

  return md;
}

/**
 * Generate Strategic Roadmap markdown
 */
function generateStrategicRoadmap(analysis: any, questions: any): string {
  let md = `# Strategic Roadmap\n\n`;
  md += `> **Generated:** ${new Date(analysis.timestamp).toLocaleDateString()}\n\n`;
  md += `---\n\n`;

  md += `## Overview\n\n`;
  md += `This roadmap outlines strategic recommendations based on the technical analysis of ${analysis.project.name}. `;
  md += `Recommendations are prioritized by business impact and feasibility.\n\n`;

  // Risk Management
  md += `## Risk Management\n\n`;

  if (analysis.risks.critical.length > 0) {
    md += `### 🔴 Critical Priorities\n\n`;
    analysis.risks.critical.forEach((risk: string, i: number) => {
      md += `${i + 1}. ${risk}\n`;
    });
    md += `\n`;
  }

  if (analysis.risks.high.length > 0) {
    md += `### 🟡 High Priority\n\n`;
    analysis.risks.high.forEach((risk: string, i: number) => {
      md += `${i + 1}. ${risk}\n`;
    });
    md += `\n`;
  }

  // Opportunities
  md += `## Growth Opportunities\n\n`;

  if (analysis.opportunities.immediate.length > 0) {
    md += `### ⚡ Immediate (0-30 days)\n\n`;
    analysis.opportunities.immediate.forEach((opp: string, i: number) => {
      md += `${i + 1}. ${opp}\n`;
    });
    md += `\n`;
  }

  if (analysis.opportunities.shortTerm.length > 0) {
    md += `### 📅 Short-term (1-3 months)\n\n`;
    analysis.opportunities.shortTerm.forEach((opp: string, i: number) => {
      md += `${i + 1}. ${opp}\n`;
    });
    md += `\n`;
  }

  if (analysis.opportunities.longTerm.length > 0) {
    md += `### 🎯 Long-term (3-12 months)\n\n`;
    analysis.opportunities.longTerm.forEach((opp: string, i: number) => {
      md += `${i + 1}. ${opp}\n`;
    });
    md += `\n`;
  }

  // Recommendations by Category
  md += `## Detailed Recommendations\n\n`;

  const categoryMap = new Map<string, any[]>();

  questions.questions.forEach((q: any) => {
    if (!categoryMap.has(q.category)) {
      categoryMap.set(q.category, []);
    }
    categoryMap.get(q.category)!.push(q);
  });

  for (const [category, qs] of categoryMap) {
    md += `### ${category}\n\n`;

    qs.forEach((q: any) => {
      md += `#### ${q.question}\n\n`;

      if (q.findings.length > 0) {
        md += `**Current State:**\n`;
        q.findings.forEach((f: string) => {
          md += `- ${f}\n`;
        });
        md += `\n`;
      }

      if (q.recommendations.length > 0) {
        md += `**Recommendations:**\n`;
        q.recommendations.forEach((r: string) => {
          md += `- ${r}\n`;
        });
        md += `\n`;
      }

      md += `**Business Impact:** ${q.businessImpact}\n\n`;
      md += `**Priority:** ${q.priority.toUpperCase()}\n\n`;
      md += `---\n\n`;
    });
  }

  return md;
}

/**
 * Generate Board Questions markdown
 */
function generateBoardQuestions(questions: any): string {
  let md = `# Advisory Board Questions\n\n`;
  md += `> **Total Questions:** ${questions.summary.totalQuestions}\n`;
  md += `> **High Priority:** ${questions.summary.highPriority} | `;
  md += `**Medium:** ${questions.summary.mediumPriority} | `;
  md += `**Low:** ${questions.summary.lowPriority}\n\n`;
  md += `---\n\n`;

  md += `## Table of Contents\n\n`;
  questions.summary.categories.forEach((cat: string) => {
    const slug = cat.toLowerCase().replace(/\s+/g, "-");
    md += `- [${cat}](#${slug})\n`;
  });
  md += `\n---\n\n`;

  // Group by category
  const categoryMap = new Map<string, any[]>();

  questions.questions.forEach((q: any) => {
    if (!categoryMap.has(q.category)) {
      categoryMap.set(q.category, []);
    }
    categoryMap.get(q.category)!.push(q);
  });

  // Output by category
  for (const [category, qs] of categoryMap) {
    const slug = category.toLowerCase().replace(/\s+/g, "-");
    md += `## ${category}\n\n`;
    md += `<a id="${slug}"></a>\n\n`;

    qs.forEach((q: any, i: number) => {
      const priorityEmoji =
        q.priority === "high" ? "🔴" : q.priority === "medium" ? "🟡" : "🟢";

      md += `### ${i + 1}. ${priorityEmoji} ${q.question}\n\n`;
      md += `**Context:** ${q.context}\n\n`;

      if (q.findings.length > 0) {
        md += `**Findings:**\n`;
        q.findings.forEach((f: string) => {
          md += `- ${f}\n`;
        });
        md += `\n`;
      }

      if (q.recommendations.length > 0) {
        md += `**Recommendations:**\n`;
        q.recommendations.forEach((r: string) => {
          md += `- ${r}\n`;
        });
        md += `\n`;
      }

      md += `**Business Impact:** ${q.businessImpact}\n\n`;
      md += `---\n\n`;
    });
  }

  return md;
}

/**
 * Get risk label
 */
function getRiskLabel(score: number): string {
  if (score > 0.7) return "🔴 High Risk";
  if (score > 0.4) return "🟡 Moderate Risk";
  return "🟢 Low Risk";
}

/**
 * Get opportunity label
 */
function getOpportunityLabel(score: number): string {
  if (score > 0.7) return "🌟 High Potential";
  if (score > 0.5) return "📈 Moderate Potential";
  return "💡 Identified";
}

/**
 * Check CI thresholds and return exit code
 */
function checkCIThresholds(analysis: any, config: any): number {
  const thresholds = config?.riskThresholds || {
    high: 0.7,
    medium: 0.4,
  };

  const riskScore = analysis.risks.overall;

  if (riskScore >= thresholds.high) {
    console.log(
      chalk.red(
        `High risk threshold exceeded: ${(riskScore * 100).toFixed(0)}%`,
      ),
    );
    return 1;
  }

  if (analysis.packages.security && analysis.packages.security.length > 0) {
    const criticalCount = analysis.packages.security.filter(
      (s: any) => s.severity === "critical",
    ).length;

    if (criticalCount > 0) {
      console.log(
        chalk.red(`Critical security vulnerabilities found: ${criticalCount}`),
      );
      return 1;
    }
  }

  return 0;
}
