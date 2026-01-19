/**
 * Report Comparator
 *
 * Compares two advisory reports to identify changes:
 * - New risks and opportunities
 * - Resolved issues
 * - Score changes
 * - Package changes (added, removed, updated)
 *
 * Useful for quarterly board reviews and tracking technical progress.
 */

import type { AdvisoryAnalysis } from "./advisory-analyzer.js";

// ============================================================================
// Types
// ============================================================================

export interface ReportComparison {
  timestamp: string;
  baseline: ReportSummary;
  current: ReportSummary;
  changes: ChangesSummary;
  details: DetailedChanges;
}

export interface ReportSummary {
  timestamp: string;
  depth: string;
  projectName: string;
  overallRiskScore: number;
  overallOpportunityScore: number;
  packageCount: number;
}

export interface ChangesSummary {
  riskScoreChange: number;
  opportunityScoreChange: number;
  packageCountChange: number;
  newHighRisks: number;
  resolvedHighRisks: number;
  newOpportunities: number;
}

export interface DetailedChanges {
  risks: RiskChanges;
  opportunities: OpportunityChanges;
  packages: PackageChanges;
  technology: TechnologyChanges;
}

export interface RiskChanges {
  new: string[];
  resolved: string[];
  changed: RiskScoreChange[];
}

export interface RiskScoreChange {
  category: string;
  before: number;
  after: number;
  change: number;
}

export interface OpportunityChanges {
  new: string[];
  completed: string[];
  changed: OpportunityScoreChange[];
}

export interface OpportunityScoreChange {
  category: string;
  before: number;
  after: number;
  change: number;
}

export interface PackageChanges {
  added: PackageChange[];
  removed: PackageChange[];
  updated: PackageChange[];
}

export interface PackageChange {
  name: string;
  version?: string;
  previousVersion?: string;
  category: string;
}

export interface TechnologyChanges {
  frameworkChanged: boolean;
  newBuildTools: string[];
  newInfrastructure: string[];
  removedTools: string[];
}

// ============================================================================
// Report Comparator Class
// ============================================================================

export class ReportComparator {
  private baseline: AdvisoryAnalysis;
  private current: AdvisoryAnalysis;

  constructor(baseline: AdvisoryAnalysis, current: AdvisoryAnalysis) {
    this.baseline = baseline;
    this.current = current;
  }

  /**
   * Compare two reports and generate diff
   */
  compare(): ReportComparison {
    const baselineSummary = this.extractSummary(this.baseline);
    const currentSummary = this.extractSummary(this.current);
    const changes = this.calculateChanges(baselineSummary, currentSummary);
    const details = this.analyzeDetailedChanges();

    return {
      timestamp: new Date().toISOString(),
      baseline: baselineSummary,
      current: currentSummary,
      changes,
      details,
    };
  }

  /**
   * Extract summary from analysis
   */
  private extractSummary(analysis: AdvisoryAnalysis): ReportSummary {
    return {
      timestamp: analysis.timestamp,
      depth: analysis.depth,
      projectName: analysis.project.name,
      overallRiskScore: analysis.risks.overall,
      overallOpportunityScore: analysis.opportunities.overall,
      packageCount: analysis.packages.total,
    };
  }

  /**
   * Calculate high-level changes
   */
  private calculateChanges(
    baseline: ReportSummary,
    current: ReportSummary,
  ): ChangesSummary {
    const riskScoreChange =
      current.overallRiskScore - baseline.overallRiskScore;
    const opportunityScoreChange =
      current.overallOpportunityScore - baseline.overallOpportunityScore;
    const packageCountChange = current.packageCount - baseline.packageCount;

    // Count new and resolved high-priority risks
    const baselineHighRisks = new Set(this.baseline.risks.high);
    const currentHighRisks = new Set(this.current.risks.high);

    const newHighRisks = Array.from(currentHighRisks).filter(
      (risk) => !baselineHighRisks.has(risk),
    ).length;

    const resolvedHighRisks = Array.from(baselineHighRisks).filter(
      (risk) => !currentHighRisks.has(risk),
    ).length;

    // Count new opportunities
    const baselineImmediate = new Set(this.baseline.opportunities.immediate);
    const currentImmediate = new Set(this.current.opportunities.immediate);

    const newOpportunities = Array.from(currentImmediate).filter(
      (opp) => !baselineImmediate.has(opp),
    ).length;

    return {
      riskScoreChange,
      opportunityScoreChange,
      packageCountChange,
      newHighRisks,
      resolvedHighRisks,
      newOpportunities,
    };
  }

  /**
   * Analyze detailed changes
   */
  private analyzeDetailedChanges(): DetailedChanges {
    return {
      risks: this.compareRisks(),
      opportunities: this.compareOpportunities(),
      packages: this.comparePackages(),
      technology: this.compareTechnology(),
    };
  }

  /**
   * Compare risks between reports
   */
  private compareRisks(): RiskChanges {
    const baselineRisks = new Set([
      ...this.baseline.risks.critical,
      ...this.baseline.risks.high,
      ...this.baseline.risks.medium,
    ]);

    const currentRisks = new Set([
      ...this.current.risks.critical,
      ...this.current.risks.high,
      ...this.current.risks.medium,
    ]);

    const newRisks = Array.from(currentRisks).filter(
      (risk) => !baselineRisks.has(risk),
    );

    const resolved = Array.from(baselineRisks).filter(
      (risk) => !currentRisks.has(risk),
    );

    // Compare risk category scores
    const changed: RiskScoreChange[] = [];
    const baselineCatMap = new Map(
      this.baseline.risks.categories.map((c) => [c.name, c]),
    );
    const currentCatMap = new Map(
      this.current.risks.categories.map((c) => [c.name, c]),
    );

    for (const [name, current] of currentCatMap) {
      const baseline = baselineCatMap.get(name);
      if (baseline && Math.abs(current.score - baseline.score) > 0.05) {
        changed.push({
          category: name,
          before: baseline.score,
          after: current.score,
          change: current.score - baseline.score,
        });
      }
    }

    return { new: newRisks, resolved, changed };
  }

  /**
   * Compare opportunities between reports
   */
  private compareOpportunities(): OpportunityChanges {
    const baselineOpps = new Set([
      ...this.baseline.opportunities.immediate,
      ...this.baseline.opportunities.shortTerm,
    ]);

    const currentOpps = new Set([
      ...this.current.opportunities.immediate,
      ...this.current.opportunities.shortTerm,
    ]);

    const newOpps = Array.from(currentOpps).filter(
      (opp) => !baselineOpps.has(opp),
    );

    const completed = Array.from(baselineOpps).filter(
      (opp) => !currentOpps.has(opp),
    );

    // Compare opportunity category scores
    const changed: OpportunityScoreChange[] = [];
    const baselineCatMap = new Map(
      this.baseline.opportunities.categories.map((c) => [c.name, c]),
    );
    const currentCatMap = new Map(
      this.current.opportunities.categories.map((c) => [c.name, c]),
    );

    for (const [name, current] of currentCatMap) {
      const baseline = baselineCatMap.get(name);
      if (baseline && Math.abs(current.potential - baseline.potential) > 0.05) {
        changed.push({
          category: name,
          before: baseline.potential,
          after: current.potential,
          change: current.potential - baseline.potential,
        });
      }
    }

    return { new: newOpps, completed, changed };
  }

  /**
   * Compare packages between reports
   */
  private comparePackages(): PackageChanges {
    const baselineProduction = new Map(
      this.baseline.packages.production.map((p) => [p.name, p]),
    );
    const currentProduction = new Map(
      this.current.packages.production.map((p) => [p.name, p]),
    );

    const added: PackageChange[] = [];
    const removed: PackageChange[] = [];
    const updated: PackageChange[] = [];

    // Find added packages
    for (const [name, pkg] of currentProduction) {
      if (!baselineProduction.has(name)) {
        added.push({
          name,
          version: pkg.version,
          category: pkg.category,
        });
      }
    }

    // Find removed and updated packages
    for (const [name, baselinePkg] of baselineProduction) {
      const currentPkg = currentProduction.get(name);

      if (!currentPkg) {
        removed.push({
          name,
          version: baselinePkg.version,
          category: baselinePkg.category,
        });
      } else if (baselinePkg.version !== currentPkg.version) {
        updated.push({
          name,
          version: currentPkg.version,
          previousVersion: baselinePkg.version,
          category: currentPkg.category,
        });
      }
    }

    // Also check dev dependencies
    const baselineDev = new Map(
      this.baseline.packages.development.map((p) => [p.name, p]),
    );
    const currentDev = new Map(
      this.current.packages.development.map((p) => [p.name, p]),
    );

    for (const [name, pkg] of currentDev) {
      if (!baselineDev.has(name)) {
        added.push({
          name,
          version: pkg.version,
          category: pkg.category,
        });
      }
    }

    for (const [name, baselinePkg] of baselineDev) {
      const currentPkg = currentDev.get(name);

      if (!currentPkg) {
        removed.push({
          name,
          version: baselinePkg.version,
          category: baselinePkg.category,
        });
      } else if (baselinePkg.version !== currentPkg.version) {
        updated.push({
          name,
          version: currentPkg.version,
          previousVersion: baselinePkg.version,
          category: currentPkg.category,
        });
      }
    }

    return { added, removed, updated };
  }

  /**
   * Compare technology stack between reports
   */
  private compareTechnology(): TechnologyChanges {
    const baselineTech = this.baseline.technology;
    const currentTech = this.current.technology;

    const frameworkChanged =
      baselineTech.framework !== currentTech.framework ||
      baselineTech.frameworkVersion !== currentTech.frameworkVersion;

    const baselineTools = new Set(baselineTech.buildTools);
    const currentTools = new Set(currentTech.buildTools);

    const newBuildTools = currentTech.buildTools.filter(
      (tool) => !baselineTools.has(tool),
    );
    const removedTools = baselineTech.buildTools.filter(
      (tool) => !currentTools.has(tool),
    );

    const baselineInfra = new Set(baselineTech.infrastructure);

    const newInfrastructure = currentTech.infrastructure.filter(
      (infra) => !baselineInfra.has(infra),
    );

    return {
      frameworkChanged,
      newBuildTools,
      newInfrastructure,
      removedTools,
    };
  }

  /**
   * Generate markdown summary of changes
   */
  generateMarkdownSummary(): string {
    const comparison = this.compare();
    const { changes, details } = comparison;

    let md = `# Advisory Report Comparison\n\n`;
    md += `**Baseline:** ${new Date(comparison.baseline.timestamp).toLocaleDateString()}\n`;
    md += `**Current:** ${new Date(comparison.current.timestamp).toLocaleDateString()}\n\n`;

    md += `## Executive Summary\n\n`;

    // Risk score change
    const riskChange = changes.riskScoreChange;
    const riskEmoji = riskChange < 0 ? "✅" : riskChange > 0 ? "⚠️" : "➖";
    md += `${riskEmoji} **Risk Score:** ${(comparison.baseline.overallRiskScore * 100).toFixed(0)}% → ${(comparison.current.overallRiskScore * 100).toFixed(0)}% `;
    md += `(${riskChange > 0 ? "+" : ""}${(riskChange * 100).toFixed(0)}%)\n`;

    // Opportunity score change
    const oppChange = changes.opportunityScoreChange;
    const oppEmoji = oppChange > 0 ? "✅" : oppChange < 0 ? "⚠️" : "➖";
    md += `${oppEmoji} **Opportunity Score:** ${(comparison.baseline.overallOpportunityScore * 100).toFixed(0)}% → ${(comparison.current.overallOpportunityScore * 100).toFixed(0)}% `;
    md += `(${oppChange > 0 ? "+" : ""}${(oppChange * 100).toFixed(0)}%)\n`;

    // Package count change
    md += `📦 **Packages:** ${comparison.baseline.packageCount} → ${comparison.current.packageCount} `;
    md += `(${changes.packageCountChange > 0 ? "+" : ""}${changes.packageCountChange})\n\n`;

    // Key changes
    md += `## Key Changes\n\n`;

    if (changes.newHighRisks > 0) {
      md += `⚠️ **${changes.newHighRisks}** new high-priority risks identified\n`;
    }

    if (changes.resolvedHighRisks > 0) {
      md += `✅ **${changes.resolvedHighRisks}** high-priority risks resolved\n`;
    }

    if (changes.newOpportunities > 0) {
      md += `🌟 **${changes.newOpportunities}** new opportunities identified\n`;
    }

    if (details.technology.frameworkChanged) {
      md += `🔄 Framework changed: ${comparison.baseline.projectName}\n`;
    }

    md += `\n---\n\n`;

    // Detailed risks
    if (details.risks.new.length > 0 || details.risks.resolved.length > 0) {
      md += `## Risk Changes\n\n`;

      if (details.risks.new.length > 0) {
        md += `### New Risks\n\n`;
        details.risks.new.forEach((risk) => {
          md += `- ${risk}\n`;
        });
        md += `\n`;
      }

      if (details.risks.resolved.length > 0) {
        md += `### Resolved Risks\n\n`;
        details.risks.resolved.forEach((risk) => {
          md += `- ~~${risk}~~\n`;
        });
        md += `\n`;
      }

      if (details.risks.changed.length > 0) {
        md += `### Risk Score Changes\n\n`;
        md += `| Category | Before | After | Change |\n`;
        md += `|----------|--------|-------|--------|\n`;
        details.risks.changed.forEach((change) => {
          const changeStr =
            change.change > 0
              ? `+${(change.change * 100).toFixed(0)}%`
              : `${(change.change * 100).toFixed(0)}%`;
          md += `| ${change.category} | ${(change.before * 100).toFixed(0)}% | ${(change.after * 100).toFixed(0)}% | ${changeStr} |\n`;
        });
        md += `\n`;
      }
    }

    // Package changes
    if (
      details.packages.added.length > 0 ||
      details.packages.removed.length > 0 ||
      details.packages.updated.length > 0
    ) {
      md += `## Package Changes\n\n`;

      if (details.packages.added.length > 0) {
        md += `### Added (${details.packages.added.length})\n\n`;
        details.packages.added.slice(0, 10).forEach((pkg) => {
          md += `- **${pkg.name}** \`${pkg.version}\` (${pkg.category})\n`;
        });
        if (details.packages.added.length > 10) {
          md += `\n_...and ${details.packages.added.length - 10} more_\n`;
        }
        md += `\n`;
      }

      if (details.packages.removed.length > 0) {
        md += `### Removed (${details.packages.removed.length})\n\n`;
        details.packages.removed.slice(0, 10).forEach((pkg) => {
          md += `- ~~${pkg.name}~~ \`${pkg.version}\`\n`;
        });
        if (details.packages.removed.length > 10) {
          md += `\n_...and ${details.packages.removed.length - 10} more_\n`;
        }
        md += `\n`;
      }

      if (details.packages.updated.length > 0) {
        md += `### Updated (${details.packages.updated.length})\n\n`;
        details.packages.updated.slice(0, 10).forEach((pkg) => {
          md += `- **${pkg.name}** \`${pkg.previousVersion}\` → \`${pkg.version}\`\n`;
        });
        if (details.packages.updated.length > 10) {
          md += `\n_...and ${details.packages.updated.length - 10} more_\n`;
        }
        md += `\n`;
      }
    }

    return md;
  }
}
