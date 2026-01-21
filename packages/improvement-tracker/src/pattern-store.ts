import * as fs from "node:fs";
import * as path from "node:path";
import {
  FixPatternSchema,
  BlueprintSchema,
  SolutionPatternSchema,
  PATTERNS_DIR,
  DEPRECATION_THRESHOLD_DAYS,
  isPatternDeprecated,
  generatePatternHash,
  updateMetrics,
  type FixPattern,
  type Blueprint,
  type SolutionPattern,
  type PatternTag,
} from "./patterns-schema";

// ============================================
// Types
// ============================================

/** Query options for searching patterns */
export interface PatternQuery {
  /** Filter by tags */
  tags?: PatternTag[];
  /** Filter by framework */
  framework?: string;
  /** Filter by category (fix patterns only) */
  category?: string;
  /** Include deprecated patterns */
  includeDeprecated?: boolean;
  /** Search in name and description */
  search?: string;
  /** Limit results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/** Query options for searching solution patterns */
export interface SolutionQuery extends PatternQuery {
  /** Filter by solution category */
  solutionCategory?: string;
  /** Search in problem keywords */
  keywords?: string[];
  /** Filter by source project */
  sourceProject?: string;
}

/** Result of a pattern operation */
export interface PatternResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** Result of conflict detection */
export interface ConflictResult {
  hasConflict: boolean;
  existingPattern?: FixPattern | Blueprint | SolutionPattern;
  suggestedVersion?: number;
}

/** Statistics about stored patterns */
export interface PatternStats {
  totalFixes: number;
  totalBlueprints: number;
  totalSolutions: number;
  deprecatedFixes: number;
  deprecatedBlueprints: number;
  deprecatedSolutions: number;
  privateFixes: number;
  privateBlueprints: number;
  privateSolutions: number;
  syncedFixes: number;
  syncedBlueprints: number;
  syncedSolutions: number;
  /** Count of patterns that failed schema validation */
  invalidFixes: number;
  invalidBlueprints: number;
  invalidSolutions: number;
}

/** Validation error details for a pattern file */
export interface PatternValidationError {
  file: string;
  type: "fix" | "blueprint" | "solution";
  error: string;
  details?: string[];
}

// ============================================
// PatternStore Class
// ============================================

/**
 * File-based store for fix patterns, blueprints, and solution patterns.
 * Supports CRUD operations, conflict resolution, and deprecation handling.
 */
export class PatternStore {
  private readonly basePath: string;
  private readonly fixesPath: string;
  private readonly blueprintsPath: string;
  private readonly solutionsPath: string;
  /** Tracks validation errors from the last load operation */
  private validationErrors: PatternValidationError[] = [];

  constructor(workspacePath: string) {
    this.basePath = path.join(workspacePath, PATTERNS_DIR);
    this.fixesPath = path.join(this.basePath, "fixes");
    this.blueprintsPath = path.join(this.basePath, "blueprints");
    this.solutionsPath = path.join(this.basePath, "solutions");
  }

  /**
   * Get validation errors from the last pattern load operation.
   * Useful for debugging why patterns might not be showing up.
   */
  getValidationErrors(): PatternValidationError[] {
    return [...this.validationErrors];
  }

  /**
   * Clear tracked validation errors
   */
  clearValidationErrors(): void {
    this.validationErrors = [];
  }

  // ============================================
  // Initialization
  // ============================================

  /**
   * Initialize the pattern store directories
   */
  async initialize(): Promise<void> {
    await fs.promises.mkdir(this.fixesPath, { recursive: true });
    await fs.promises.mkdir(this.blueprintsPath, { recursive: true });
    await fs.promises.mkdir(this.solutionsPath, { recursive: true });
  }

  /**
   * Check if the store is initialized
   */
  async isInitialized(): Promise<boolean> {
    try {
      await fs.promises.access(this.basePath);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // Fix Pattern CRUD
  // ============================================

  /**
   * Save a fix pattern to the store
   */
  async saveFixPattern(
    pattern: FixPattern,
  ): Promise<PatternResult<FixPattern>> {
    try {
      const validation = FixPatternSchema.safeParse(pattern);
      if (!validation.success) {
        return {
          success: false,
          error: `Validation failed: ${validation.error.message}`,
        };
      }

      // Check for conflicts
      const conflict = await this.detectFixConflict(pattern);
      if (conflict.hasConflict && !pattern.conflictVersion) {
        // Auto-assign version if conflict detected
        pattern = {
          ...pattern,
          conflictVersion: conflict.suggestedVersion,
          originalId: conflict.existingPattern?.id,
        };
      }

      const filePath = this.getFixFilePath(pattern.id);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, JSON.stringify(pattern, null, 2));

      return { success: true, data: pattern };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get a fix pattern by ID
   */
  async getFixPattern(id: string): Promise<PatternResult<FixPattern>> {
    try {
      const filePath = this.getFixFilePath(id);
      const content = await fs.promises.readFile(filePath, "utf-8");
      const pattern = JSON.parse(content);
      const validation = FixPatternSchema.safeParse(pattern);

      if (!validation.success) {
        return {
          success: false,
          error: `Invalid pattern data: ${validation.error.message}`,
        };
      }

      return { success: true, data: validation.data };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { success: false, error: "Pattern not found" };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete a fix pattern by ID
   */
  async deleteFixPattern(id: string): Promise<PatternResult<void>> {
    try {
      const filePath = this.getFixFilePath(id);
      await fs.promises.unlink(filePath);
      return { success: true };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { success: false, error: "Pattern not found" };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * List all fix patterns with optional filtering
   */
  async listFixPatterns(
    query: PatternQuery = {},
  ): Promise<PatternResult<FixPattern[]>> {
    try {
      const patterns = await this.loadAllFixPatterns();
      const filtered = this.filterPatterns(patterns, query);
      return { success: true, data: filtered };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update metrics for a fix pattern
   */
  async updateFixMetrics(
    id: string,
    success: boolean,
  ): Promise<PatternResult<FixPattern>> {
    const result = await this.getFixPattern(id);
    if (!result.success || !result.data) {
      return result;
    }

    const updatedPattern = {
      ...result.data,
      metrics: updateMetrics(result.data.metrics, success),
      updatedAt: new Date().toISOString(),
    };

    return this.saveFixPattern(updatedPattern);
  }

  /**
   * Deprecate a fix pattern
   */
  async deprecateFixPattern(
    id: string,
    reason: string,
  ): Promise<PatternResult<FixPattern>> {
    const result = await this.getFixPattern(id);
    if (!result.success || !result.data) {
      return result;
    }

    const deprecatedPattern = {
      ...result.data,
      deprecatedAt: new Date().toISOString(),
      deprecationReason: reason,
      updatedAt: new Date().toISOString(),
    };

    return this.saveFixPattern(deprecatedPattern);
  }

  // ============================================
  // Blueprint CRUD
  // ============================================

  /**
   * Save a blueprint to the store
   */
  async saveBlueprint(blueprint: Blueprint): Promise<PatternResult<Blueprint>> {
    try {
      const validation = BlueprintSchema.safeParse(blueprint);
      if (!validation.success) {
        return {
          success: false,
          error: `Validation failed: ${validation.error.message}`,
        };
      }

      // Check for conflicts
      const conflict = await this.detectBlueprintConflict(blueprint);
      if (conflict.hasConflict && !blueprint.conflictVersion) {
        blueprint = {
          ...blueprint,
          conflictVersion: conflict.suggestedVersion,
          originalId: conflict.existingPattern?.id,
        };
      }

      const filePath = this.getBlueprintFilePath(blueprint.id);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, JSON.stringify(blueprint, null, 2));

      return { success: true, data: blueprint };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get a blueprint by ID
   */
  async getBlueprint(id: string): Promise<PatternResult<Blueprint>> {
    try {
      const filePath = this.getBlueprintFilePath(id);
      const content = await fs.promises.readFile(filePath, "utf-8");
      const blueprint = JSON.parse(content);
      const validation = BlueprintSchema.safeParse(blueprint);

      if (!validation.success) {
        return {
          success: false,
          error: `Invalid blueprint data: ${validation.error.message}`,
        };
      }

      return { success: true, data: validation.data };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { success: false, error: "Blueprint not found" };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete a blueprint by ID
   */
  async deleteBlueprint(id: string): Promise<PatternResult<void>> {
    try {
      const filePath = this.getBlueprintFilePath(id);
      await fs.promises.unlink(filePath);
      return { success: true };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { success: false, error: "Blueprint not found" };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * List all blueprints with optional filtering
   */
  async listBlueprints(
    query: PatternQuery = {},
  ): Promise<PatternResult<Blueprint[]>> {
    try {
      const blueprints = await this.loadAllBlueprints();
      const filtered = this.filterPatterns(blueprints, query);
      return { success: true, data: filtered };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update metrics for a blueprint
   */
  async updateBlueprintMetrics(
    id: string,
    success: boolean,
  ): Promise<PatternResult<Blueprint>> {
    const result = await this.getBlueprint(id);
    if (!result.success || !result.data) {
      return result;
    }

    const updatedBlueprint = {
      ...result.data,
      metrics: updateMetrics(result.data.metrics, success),
      updatedAt: new Date().toISOString(),
    };

    return this.saveBlueprint(updatedBlueprint);
  }

  /**
   * Deprecate a blueprint
   */
  async deprecateBlueprint(
    id: string,
    reason: string,
  ): Promise<PatternResult<Blueprint>> {
    const result = await this.getBlueprint(id);
    if (!result.success || !result.data) {
      return result;
    }

    const deprecatedBlueprint = {
      ...result.data,
      deprecatedAt: new Date().toISOString(),
      deprecationReason: reason,
      updatedAt: new Date().toISOString(),
    };

    return this.saveBlueprint(deprecatedBlueprint);
  }

  // ============================================
  // Solution Pattern CRUD
  // ============================================

  /**
   * Save a solution pattern to the store
   */
  async saveSolution(
    pattern: SolutionPattern,
  ): Promise<PatternResult<SolutionPattern>> {
    try {
      const validation = SolutionPatternSchema.safeParse(pattern);
      if (!validation.success) {
        return {
          success: false,
          error: `Validation failed: ${validation.error.message}`,
        };
      }

      // Check for conflicts
      const conflict = await this.detectSolutionConflict(pattern);
      if (conflict.hasConflict && !pattern.conflictVersion) {
        // Auto-assign version if conflict detected
        pattern = {
          ...pattern,
          conflictVersion: conflict.suggestedVersion,
          originalId: conflict.existingPattern?.id,
        };
      }

      const filePath = this.getSolutionFilePath(pattern.id);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, JSON.stringify(pattern, null, 2));

      return { success: true, data: pattern };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get a solution pattern by ID
   */
  async getSolution(id: string): Promise<PatternResult<SolutionPattern>> {
    try {
      const filePath = this.getSolutionFilePath(id);
      const content = await fs.promises.readFile(filePath, "utf-8");
      const pattern = JSON.parse(content);
      const validation = SolutionPatternSchema.safeParse(pattern);

      if (!validation.success) {
        return {
          success: false,
          error: `Invalid solution data: ${validation.error.message}`,
        };
      }

      return { success: true, data: validation.data };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { success: false, error: "Solution not found" };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Delete a solution pattern by ID
   */
  async deleteSolution(id: string): Promise<PatternResult<void>> {
    try {
      const filePath = this.getSolutionFilePath(id);
      await fs.promises.unlink(filePath);
      return { success: true };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { success: false, error: "Solution not found" };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * List all solution patterns with optional filtering
   */
  async listSolutions(
    query: SolutionQuery = {},
  ): Promise<PatternResult<SolutionPattern[]>> {
    try {
      const solutions = await this.loadAllSolutions();
      const filtered = this.filterSolutions(solutions, query);
      return { success: true, data: filtered };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Search for solutions by keywords (problem matching)
   */
  async searchSolutions(
    keywords: string[],
    options: SolutionQuery = {},
  ): Promise<PatternResult<SolutionPattern[]>> {
    try {
      const result = await this.listSolutions({
        ...options,
        includeDeprecated: options.includeDeprecated ?? false,
      });

      if (!result.success || !result.data) {
        return result;
      }

      // Score each solution by keyword matches
      const scored = result.data.map((solution) => {
        let score = 0;
        const searchTerms = keywords.map((k) => k.toLowerCase());

        // Check problem keywords (highest weight)
        for (const term of searchTerms) {
          const keywordMatch = solution.problem.keywords.some(
            (k) =>
              k.toLowerCase().includes(term) || term.includes(k.toLowerCase()),
          );
          if (keywordMatch) score += 10;
        }

        // Check name and description (medium weight)
        for (const term of searchTerms) {
          if (solution.name.toLowerCase().includes(term)) score += 5;
          if (solution.description.toLowerCase().includes(term)) score += 3;
        }

        // Check tags (medium weight)
        for (const term of searchTerms) {
          const tagMatch = solution.tags.some((t) =>
            t.name.toLowerCase().includes(term),
          );
          if (tagMatch) score += 5;
        }

        return { solution, score };
      });

      // Filter out zero scores and sort by score descending
      const matches = scored
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ solution }) => solution);

      // Apply limit if specified
      const limited = options.limit ? matches.slice(0, options.limit) : matches;

      return { success: true, data: limited };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Update metrics for a solution pattern
   */
  async updateSolutionMetrics(
    id: string,
    success: boolean,
  ): Promise<PatternResult<SolutionPattern>> {
    const result = await this.getSolution(id);
    if (!result.success || !result.data) {
      return result;
    }

    const updatedSolution = {
      ...result.data,
      metrics: updateMetrics(result.data.metrics, success),
      updatedAt: new Date().toISOString(),
    };

    return this.saveSolution(updatedSolution);
  }

  /**
   * Deprecate a solution pattern
   */
  async deprecateSolution(
    id: string,
    reason: string,
  ): Promise<PatternResult<SolutionPattern>> {
    const result = await this.getSolution(id);
    if (!result.success || !result.data) {
      return result;
    }

    const deprecatedSolution = {
      ...result.data,
      deprecatedAt: new Date().toISOString(),
      deprecationReason: reason,
      updatedAt: new Date().toISOString(),
    };

    return this.saveSolution(deprecatedSolution);
  }

  // ============================================
  // Search and Match
  // ============================================

  /**
   * Find fix patterns matching an error message
   */
  async findMatchingFixes(
    errorMessage: string,
    framework?: string,
  ): Promise<PatternResult<FixPattern[]>> {
    const result = await this.listFixPatterns({
      framework,
      includeDeprecated: false,
    });

    if (!result.success || !result.data) {
      return result;
    }

    const matches = result.data.filter((pattern) => {
      try {
        const regex = new RegExp(pattern.trigger.errorPattern, "i");
        return regex.test(errorMessage);
      } catch {
        // Invalid regex in pattern, skip
        return false;
      }
    });

    // Sort by success rate (highest first)
    matches.sort((a, b) => b.metrics.successRate - a.metrics.successRate);

    return { success: true, data: matches };
  }

  /**
   * Find blueprints matching a technology stack
   */
  async findMatchingBlueprints(
    framework: string,
    language?: string,
  ): Promise<PatternResult<Blueprint[]>> {
    const result = await this.listBlueprints({ includeDeprecated: false });

    if (!result.success || !result.data) {
      return result;
    }

    const matches = result.data.filter((blueprint) => {
      const frameworkMatch =
        blueprint.stack.framework.toLowerCase() === framework.toLowerCase();
      const languageMatch =
        !language ||
        blueprint.stack.language.toLowerCase() === language.toLowerCase();
      return frameworkMatch && languageMatch;
    });

    // Sort by success rate
    matches.sort((a, b) => b.metrics.successRate - a.metrics.successRate);

    return { success: true, data: matches };
  }

  // ============================================
  // Conflict Detection
  // ============================================

  /**
   * Detect if a fix pattern conflicts with existing patterns
   */
  async detectFixConflict(pattern: FixPattern): Promise<ConflictResult> {
    const existing = await this.loadAllFixPatterns();
    const hash = generatePatternHash(pattern);

    // Find patterns with the same hash (content match) or same name
    const conflicts = existing.filter((p) => {
      if (p.id === pattern.id) return false; // Skip self
      const existingHash = generatePatternHash(p);
      return existingHash === hash || p.name === pattern.name;
    });

    if (conflicts.length === 0) {
      return { hasConflict: false };
    }

    // Find the highest existing version
    const maxVersion = Math.max(
      ...conflicts.map((c) => c.conflictVersion ?? 1),
      pattern.conflictVersion ?? 0,
    );

    return {
      hasConflict: true,
      existingPattern: conflicts[0],
      suggestedVersion: maxVersion + 1,
    };
  }

  /**
   * Detect if a blueprint conflicts with existing blueprints
   */
  async detectBlueprintConflict(blueprint: Blueprint): Promise<ConflictResult> {
    const existing = await this.loadAllBlueprints();
    const hash = generatePatternHash(blueprint);

    const conflicts = existing.filter((b) => {
      if (b.id === blueprint.id) return false;
      const existingHash = generatePatternHash(b);
      return existingHash === hash || b.name === blueprint.name;
    });

    if (conflicts.length === 0) {
      return { hasConflict: false };
    }

    const maxVersion = Math.max(
      ...conflicts.map((c) => c.conflictVersion ?? 1),
      blueprint.conflictVersion ?? 0,
    );

    return {
      hasConflict: true,
      existingPattern: conflicts[0],
      suggestedVersion: maxVersion + 1,
    };
  }

  /**
   * Detect if a solution pattern conflicts with existing solutions
   */
  async detectSolutionConflict(
    solution: SolutionPattern,
  ): Promise<ConflictResult> {
    const existing = await this.loadAllSolutions();
    const hash = generatePatternHash(solution);

    const conflicts = existing.filter((s) => {
      if (s.id === solution.id) return false;
      const existingHash = generatePatternHash(s);
      return existingHash === hash || s.name === solution.name;
    });

    if (conflicts.length === 0) {
      return { hasConflict: false };
    }

    const maxVersion = Math.max(
      ...conflicts.map((c) => c.conflictVersion ?? 1),
      solution.conflictVersion ?? 0,
    );

    return {
      hasConflict: true,
      existingPattern: conflicts[0],
      suggestedVersion: maxVersion + 1,
    };
  }

  // ============================================
  // Deprecation Management
  // ============================================

  /**
   * Auto-deprecate patterns that haven't been updated in a year
   */
  async autoDeprecateOldPatterns(
    thresholdDays: number = DEPRECATION_THRESHOLD_DAYS,
  ): Promise<{ fixes: number; blueprints: number }> {
    let fixCount = 0;
    let blueprintCount = 0;

    // Process fix patterns
    const fixes = await this.loadAllFixPatterns();
    for (const pattern of fixes) {
      if (
        !pattern.deprecatedAt &&
        isPatternDeprecated(pattern, thresholdDays)
      ) {
        await this.deprecateFixPattern(
          pattern.id,
          `Auto-deprecated: No updates in ${thresholdDays}+ days`,
        );
        fixCount++;
      }
    }

    // Process blueprints
    const blueprints = await this.loadAllBlueprints();
    for (const blueprint of blueprints) {
      if (
        !blueprint.deprecatedAt &&
        isPatternDeprecated(blueprint, thresholdDays)
      ) {
        await this.deprecateBlueprint(
          blueprint.id,
          `Auto-deprecated: No updates in ${thresholdDays}+ days`,
        );
        blueprintCount++;
      }
    }

    return { fixes: fixCount, blueprints: blueprintCount };
  }

  /**
   * Get all deprecated patterns
   */
  async getDeprecatedPatterns(): Promise<{
    fixes: FixPattern[];
    blueprints: Blueprint[];
  }> {
    const fixes = (await this.loadAllFixPatterns()).filter((p) =>
      isPatternDeprecated(p),
    );
    const blueprints = (await this.loadAllBlueprints()).filter((b) =>
      isPatternDeprecated(b),
    );

    return { fixes, blueprints };
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get statistics about stored patterns.
   * Also clears and repopulates validation errors for accurate counts.
   */
  async getStats(): Promise<PatternStats> {
    // Clear previous validation errors before loading
    this.validationErrors = [];

    const fixes = await this.loadAllFixPatterns();
    const blueprints = await this.loadAllBlueprints();
    const solutions = await this.loadAllSolutions();

    // Count invalid patterns from validation errors
    const invalidFixes = this.validationErrors.filter(
      (e) => e.type === "fix",
    ).length;
    const invalidBlueprints = this.validationErrors.filter(
      (e) => e.type === "blueprint",
    ).length;
    const invalidSolutions = this.validationErrors.filter(
      (e) => e.type === "solution",
    ).length;

    return {
      totalFixes: fixes.length,
      totalBlueprints: blueprints.length,
      totalSolutions: solutions.length,
      deprecatedFixes: fixes.filter((p) => isPatternDeprecated(p)).length,
      deprecatedBlueprints: blueprints.filter((b) => isPatternDeprecated(b))
        .length,
      deprecatedSolutions: solutions.filter((s) => !!s.deprecatedAt).length,
      privateFixes: fixes.filter((p) => p.isPrivate).length,
      privateBlueprints: blueprints.filter((b) => b.isPrivate).length,
      privateSolutions: solutions.filter((s) => s.isPrivate).length,
      syncedFixes: fixes.filter((p) => p.syncedAt).length,
      syncedBlueprints: blueprints.filter((b) => b.syncedAt).length,
      syncedSolutions: solutions.filter((s) => s.syncedAt).length,
      invalidFixes,
      invalidBlueprints,
      invalidSolutions,
    };
  }

  // ============================================
  // Sync Helpers
  // ============================================

  /**
   * Get patterns ready for sync (non-private, not deprecated)
   */
  async getPatternsForSync(): Promise<{
    fixes: FixPattern[];
    blueprints: Blueprint[];
    solutions: SolutionPattern[];
  }> {
    const fixes = (await this.loadAllFixPatterns()).filter(
      (p) => !p.isPrivate && !isPatternDeprecated(p),
    );
    const blueprints = (await this.loadAllBlueprints()).filter(
      (b) => !b.isPrivate && !isPatternDeprecated(b),
    );
    const solutions = (await this.loadAllSolutions()).filter(
      (s) => !s.isPrivate && !s.deprecatedAt,
    );

    return { fixes, blueprints, solutions };
  }

  /**
   * Mark patterns as synced
   */
  async markAsSynced(
    patternIds: string[],
    type: "fix" | "blueprint" | "solution",
  ): Promise<void> {
    const now = new Date().toISOString();

    for (const id of patternIds) {
      if (type === "fix") {
        const result = await this.getFixPattern(id);
        if (result.success && result.data) {
          await this.saveFixPattern({
            ...result.data,
            syncedAt: now,
            updatedAt: now,
          });
        }
      } else if (type === "blueprint") {
        const result = await this.getBlueprint(id);
        if (result.success && result.data) {
          await this.saveBlueprint({
            ...result.data,
            syncedAt: now,
            updatedAt: now,
          });
        }
      } else if (type === "solution") {
        const result = await this.getSolution(id);
        if (result.success && result.data) {
          await this.saveSolution({
            ...result.data,
            syncedAt: now,
            updatedAt: now,
          });
        }
      }
    }
  }

  // ============================================
  // Unified Helper Methods
  // ============================================

  /**
   * Update metrics for any pattern type
   */
  async updatePatternMetrics(
    id: string,
    type: "fix" | "blueprint",
    success: boolean,
  ): Promise<PatternResult<FixPattern | Blueprint>> {
    if (type === "fix") {
      return this.updateFixMetrics(id, success);
    } else {
      return this.updateBlueprintMetrics(id, success);
    }
  }

  /**
   * Deprecate any pattern type
   */
  async deprecatePattern(
    id: string,
    type: "fix" | "blueprint",
    reason: string,
  ): Promise<PatternResult<FixPattern | Blueprint>> {
    if (type === "fix") {
      return this.deprecateFixPattern(id, reason);
    } else {
      return this.deprecateBlueprint(id, reason);
    }
  }

  // ============================================
  // Private Helpers
  // ============================================

  private getFixFilePath(id: string): string {
    return path.join(this.fixesPath, `${id}.json`);
  }

  private getBlueprintFilePath(id: string): string {
    return path.join(this.blueprintsPath, `${id}.json`);
  }

  private getSolutionFilePath(id: string): string {
    return path.join(this.solutionsPath, `${id}.json`);
  }

  private async loadAllFixPatterns(): Promise<FixPattern[]> {
    try {
      const files = await fs.promises.readdir(this.fixesPath);
      const patterns: FixPattern[] = [];

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        try {
          const content = await fs.promises.readFile(
            path.join(this.fixesPath, file),
            "utf-8",
          );
          const data = JSON.parse(content);
          const validation = FixPatternSchema.safeParse(data);
          if (validation.success) {
            patterns.push(validation.data);
          } else {
            // Track validation error for debugging
            this.validationErrors.push({
              file,
              type: "fix",
              error: "Schema validation failed",
              details: validation.error.issues.map(
                (i) => `${i.path.join(".")}: ${i.message}`,
              ),
            });
          }
        } catch (parseError) {
          // Track parse error
          this.validationErrors.push({
            file,
            type: "fix",
            error:
              parseError instanceof Error
                ? parseError.message
                : "Failed to parse JSON",
          });
          continue;
        }
      }

      return patterns;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  private async loadAllBlueprints(): Promise<Blueprint[]> {
    try {
      const files = await fs.promises.readdir(this.blueprintsPath);
      const blueprints: Blueprint[] = [];

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        try {
          const content = await fs.promises.readFile(
            path.join(this.blueprintsPath, file),
            "utf-8",
          );
          const data = JSON.parse(content);
          const validation = BlueprintSchema.safeParse(data);
          if (validation.success) {
            blueprints.push(validation.data);
          } else {
            // Track validation error for debugging
            this.validationErrors.push({
              file,
              type: "blueprint",
              error: "Schema validation failed",
              details: validation.error.issues.map(
                (i) => `${i.path.join(".")}: ${i.message}`,
              ),
            });
          }
        } catch (parseError) {
          // Track parse error
          this.validationErrors.push({
            file,
            type: "blueprint",
            error:
              parseError instanceof Error
                ? parseError.message
                : "Failed to parse JSON",
          });
          continue;
        }
      }

      return blueprints;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  private async loadAllSolutions(): Promise<SolutionPattern[]> {
    try {
      const files = await fs.promises.readdir(this.solutionsPath);
      const solutions: SolutionPattern[] = [];

      for (const file of files) {
        if (!file.endsWith(".json")) continue;

        try {
          const content = await fs.promises.readFile(
            path.join(this.solutionsPath, file),
            "utf-8",
          );
          const data = JSON.parse(content);
          const validation = SolutionPatternSchema.safeParse(data);
          if (validation.success) {
            solutions.push(validation.data);
          } else {
            // Track validation error for debugging
            this.validationErrors.push({
              file,
              type: "solution",
              error: "Schema validation failed",
              details: validation.error.issues.map(
                (i) => `${i.path.join(".")}: ${i.message}`,
              ),
            });
          }
        } catch (parseError) {
          // Track parse error
          this.validationErrors.push({
            file,
            type: "solution",
            error:
              parseError instanceof Error
                ? parseError.message
                : "Failed to parse JSON",
          });
          continue;
        }
      }

      return solutions;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  private filterSolutions(
    solutions: SolutionPattern[],
    query: SolutionQuery,
  ): SolutionPattern[] {
    let filtered = [...solutions];

    // Filter out deprecated unless explicitly requested
    if (!query.includeDeprecated) {
      filtered = filtered.filter((s) => !s.deprecatedAt);
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      filtered = filtered.filter((s) =>
        query.tags!.some((queryTag) =>
          s.tags.some(
            (sTag) =>
              sTag.name.toLowerCase() === queryTag.name.toLowerCase() &&
              sTag.category === queryTag.category,
          ),
        ),
      );
    }

    // Filter by framework
    if (query.framework) {
      filtered = filtered.filter(
        (s) =>
          s.compatibility.framework.toLowerCase() ===
          query.framework!.toLowerCase(),
      );
    }

    // Filter by solution category
    if (query.solutionCategory) {
      filtered = filtered.filter((s) => s.category === query.solutionCategory);
    }

    // Filter by source project
    if (query.sourceProject) {
      filtered = filtered.filter(
        (s) => s.sourceProject === query.sourceProject,
      );
    }

    // Filter by keywords
    if (query.keywords && query.keywords.length > 0) {
      filtered = filtered.filter((s) =>
        query.keywords!.some((keyword) =>
          s.problem.keywords.some((k) =>
            k.toLowerCase().includes(keyword.toLowerCase()),
          ),
        ),
      );
    }

    // Search in name and description
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(searchLower) ||
          s.description.toLowerCase().includes(searchLower),
      );
    }

    // Apply pagination
    const offset = query.offset ?? 0;
    const limit = query.limit ?? filtered.length;
    filtered = filtered.slice(offset, offset + limit);

    return filtered;
  }

  private filterPatterns<T extends FixPattern | Blueprint>(
    patterns: T[],
    query: PatternQuery,
  ): T[] {
    let filtered = [...patterns];

    // Filter out deprecated unless explicitly requested
    if (!query.includeDeprecated) {
      filtered = filtered.filter((p) => !isPatternDeprecated(p));
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      filtered = filtered.filter((p) =>
        query.tags!.some((queryTag) =>
          p.tags.some(
            (pTag) =>
              pTag.name.toLowerCase() === queryTag.name.toLowerCase() &&
              pTag.category === queryTag.category,
          ),
        ),
      );
    }

    // Filter by framework
    if (query.framework) {
      filtered = filtered.filter(
        (p) =>
          p.compatibility.framework.toLowerCase() ===
          query.framework!.toLowerCase(),
      );
    }

    // Filter by category (fix patterns only)
    if (query.category) {
      filtered = filtered.filter((p) => {
        if ("category" in p) {
          return (p as FixPattern).category === query.category;
        }
        return true;
      });
    }

    // Search in name and description
    if (query.search) {
      const searchLower = query.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower),
      );
    }

    // Apply pagination
    const offset = query.offset ?? 0;
    const limit = query.limit ?? filtered.length;
    filtered = filtered.slice(offset, offset + limit);

    return filtered;
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new pattern store for a workspace
 */
export function createPatternStore(workspacePath: string): PatternStore {
  return new PatternStore(workspacePath);
}
