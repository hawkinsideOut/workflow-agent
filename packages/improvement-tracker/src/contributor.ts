import * as fs from "node:fs";
import * as path from "node:path";
import { CONTRIBUTOR_ID_FILE } from "./patterns-schema";

// ============================================
// Types
// ============================================

/** Contributor ID configuration */
export interface ContributorConfig {
  /** Anonymous UUID for this contributor */
  id: string;
  /** When the ID was created */
  createdAt: string;
  /** Whether the user has opted in to sync */
  syncOptIn: boolean;
  /** When sync was enabled (if applicable) */
  syncEnabledAt?: string;
  /** Whether telemetry is enabled */
  telemetryEnabled: boolean;
}

/** Result of contributor operations */
export interface ContributorResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// ContributorManager Class
// ============================================

/**
 * Manages anonymous contributor identity for pattern attribution.
 * Creates and stores a persistent UUID that is never linked to personal information.
 */
export class ContributorManager {
  private readonly configPath: string;
  private cache: ContributorConfig | null = null;

  constructor(workspacePath: string) {
    this.configPath = path.join(workspacePath, CONTRIBUTOR_ID_FILE);
  }

  // ============================================
  // Core Operations
  // ============================================

  /**
   * Get or create the contributor ID.
   * Creates a new ID if one doesn't exist.
   */
  async getOrCreateId(): Promise<ContributorResult<string>> {
    try {
      const config = await this.getConfig();
      if (config.success && config.data) {
        return { success: true, data: config.data.id };
      }

      // Create new contributor config
      const newConfig = await this.createConfig();
      if (newConfig.success && newConfig.data) {
        return { success: true, data: newConfig.data.id };
      }

      return { success: false, error: newConfig.error };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get the current contributor configuration
   */
  async getConfig(): Promise<ContributorResult<ContributorConfig>> {
    try {
      // Check cache first
      if (this.cache) {
        return { success: true, data: this.cache };
      }

      const content = await fs.promises.readFile(this.configPath, "utf-8");
      const config = JSON.parse(content) as ContributorConfig;

      // Validate config structure
      if (!config.id || !config.createdAt) {
        return { success: false, error: "Invalid contributor config" };
      }

      this.cache = config;
      return { success: true, data: config };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { success: false, error: "Contributor config not found" };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create a new contributor configuration
   */
  async createConfig(): Promise<ContributorResult<ContributorConfig>> {
    try {
      const config: ContributorConfig = {
        id: this.generateAnonymousId(),
        createdAt: new Date().toISOString(),
        syncOptIn: false,
        telemetryEnabled: false,
      };

      await this.saveConfig(config);
      return { success: true, data: config };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Check if contributor config exists
   */
  async exists(): Promise<boolean> {
    try {
      await fs.promises.access(this.configPath);
      return true;
    } catch {
      return false;
    }
  }

  // ============================================
  // Sync Settings
  // ============================================

  /**
   * Enable sync opt-in
   */
  async enableSync(): Promise<ContributorResult<ContributorConfig>> {
    const result = await this.getConfig();
    if (!result.success) {
      // Create new config if doesn't exist
      const createResult = await this.createConfig();
      if (!createResult.success) {
        return createResult;
      }
      result.data = createResult.data;
    }

    const updatedConfig: ContributorConfig = {
      ...result.data!,
      syncOptIn: true,
      syncEnabledAt: new Date().toISOString(),
    };

    return this.saveConfig(updatedConfig);
  }

  /**
   * Disable sync opt-in
   */
  async disableSync(): Promise<ContributorResult<ContributorConfig>> {
    const result = await this.getConfig();
    if (!result.success || !result.data) {
      return { success: false, error: "Contributor config not found" };
    }

    const updatedConfig: ContributorConfig = {
      ...result.data,
      syncOptIn: false,
      syncEnabledAt: undefined,
    };

    return this.saveConfig(updatedConfig);
  }

  /**
   * Check if sync is enabled
   */
  async isSyncEnabled(): Promise<boolean> {
    const result = await this.getConfig();
    return result.success && result.data?.syncOptIn === true;
  }

  // ============================================
  // Telemetry Settings
  // ============================================

  /**
   * Enable telemetry collection
   */
  async enableTelemetry(): Promise<ContributorResult<ContributorConfig>> {
    const result = await this.getConfig();
    if (!result.success) {
      const createResult = await this.createConfig();
      if (!createResult.success) {
        return createResult;
      }
      result.data = createResult.data;
    }

    const updatedConfig: ContributorConfig = {
      ...result.data!,
      telemetryEnabled: true,
    };

    return this.saveConfig(updatedConfig);
  }

  /**
   * Disable telemetry collection
   */
  async disableTelemetry(): Promise<ContributorResult<ContributorConfig>> {
    const result = await this.getConfig();
    if (!result.success) {
      // If no config exists, create one with telemetry disabled
      const createResult = await this.createConfig();
      if (!createResult.success) {
        return createResult;
      }
      // Return config with telemetry already false (default)
      return createResult;
    }

    const updatedConfig: ContributorConfig = {
      ...result.data!,
      telemetryEnabled: false,
    };

    return this.saveConfig(updatedConfig);
  }

  /**
   * Check if telemetry is enabled
   */
  async isTelemetryEnabled(): Promise<boolean> {
    const result = await this.getConfig();
    return result.success && result.data?.telemetryEnabled === true;
  }

  // ============================================
  // Reset/Delete
  // ============================================

  /**
   * Reset the contributor ID (creates new anonymous ID)
   * Use with caution - this changes your contributor identity
   */
  async resetId(): Promise<ContributorResult<ContributorConfig>> {
    const result = await this.getConfig();
    const preserveSettings = result.success && result.data;

    const newConfig: ContributorConfig = {
      id: this.generateAnonymousId(),
      createdAt: new Date().toISOString(),
      syncOptIn: preserveSettings ? result.data!.syncOptIn : false,
      syncEnabledAt: preserveSettings ? result.data!.syncEnabledAt : undefined,
      telemetryEnabled: preserveSettings
        ? result.data!.telemetryEnabled
        : false,
    };

    return this.saveConfig(newConfig);
  }

  /**
   * Delete the contributor configuration entirely
   */
  async delete(): Promise<ContributorResult<void>> {
    try {
      await fs.promises.unlink(this.configPath);
      this.cache = null;
      return { success: true };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { success: true }; // Already doesn't exist
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // ============================================
  // Private Helpers
  // ============================================

  /**
   * Generate a new anonymous UUID
   */
  private generateAnonymousId(): string {
    // Use a prefix to easily identify workflow contributor IDs
    const uuid = crypto.randomUUID();
    return `wf-${uuid}`;
  }

  /**
   * Save configuration to disk
   */
  private async saveConfig(
    config: ContributorConfig,
  ): Promise<ContributorResult<ContributorConfig>> {
    try {
      // Ensure directory exists
      await fs.promises.mkdir(path.dirname(this.configPath), {
        recursive: true,
      });

      await fs.promises.writeFile(
        this.configPath,
        JSON.stringify(config, null, 2),
      );

      this.cache = config;
      return { success: true, data: config };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Clear the cache (useful for testing)
   */
  clearCache(): void {
    this.cache = null;
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new contributor manager for a workspace
 */
export function createContributorManager(
  workspacePath: string,
): ContributorManager {
  return new ContributorManager(workspacePath);
}
