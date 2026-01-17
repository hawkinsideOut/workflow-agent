/**
 * Environment configuration with Zod validation
 * Loads and validates all required secrets for the GitHub App
 */

import { config } from "dotenv";
import { z } from "zod";

// Load .env file
config();

/**
 * Environment variable schema with validation
 */
export const EnvSchema = z.object({
  // GitHub App credentials
  GITHUB_APP_ID: z.string().min(1, "GITHUB_APP_ID is required"),
  GITHUB_PRIVATE_KEY: z.string().min(1, "GITHUB_PRIVATE_KEY is required"),
  GITHUB_WEBHOOK_SECRET: z.string().min(1, "GITHUB_WEBHOOK_SECRET is required"),
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),

  // LLM API keys (at least one required for visual testing)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Server configuration
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Database configuration
  DATABASE_PATH: z.string().default("./data/workflow-agent.db"),

  // Smee.io webhook proxy for development
  SMEE_URL: z.string().url().optional(),

  // Auto-heal configuration
  MAX_RETRIES: z.coerce.number().min(1).max(100).default(10),
  BACKOFF_BASE_MINUTES: z.coerce.number().min(1).default(1),
  BACKOFF_MAX_MINUTES: z.coerce.number().min(1).default(30),

  // Visual testing configuration
  VISUAL_BASELINE_DIR: z.string().default("./visual-baselines"),
  LLM_PROVIDER: z.enum(["anthropic", "openai"]).default("anthropic"),
});

export type Env = z.infer<typeof EnvSchema>;

/**
 * Validates environment variables and returns typed config
 * Throws descriptive errors for missing/invalid values
 */
export function loadEnv(): Env {
  const result = EnvSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.errors
      .map((e) => `  - ${e.path.join(".")}: ${e.message}`)
      .join("\n");

    throw new Error(
      `Environment validation failed:\n${errors}\n\nPlease check your .env file or environment variables.`,
    );
  }

  // Validate that at least one LLM provider is configured
  if (!result.data.ANTHROPIC_API_KEY && !result.data.OPENAI_API_KEY) {
    console.warn(
      "⚠️  Warning: No LLM API key configured. Visual testing will be unavailable.",
    );
  }

  // Warn if LLM_PROVIDER doesn't match available keys
  if (
    result.data.LLM_PROVIDER === "anthropic" &&
    !result.data.ANTHROPIC_API_KEY
  ) {
    console.warn(
      "⚠️  Warning: LLM_PROVIDER is 'anthropic' but ANTHROPIC_API_KEY is not set.",
    );
  }
  if (result.data.LLM_PROVIDER === "openai" && !result.data.OPENAI_API_KEY) {
    console.warn(
      "⚠️  Warning: LLM_PROVIDER is 'openai' but OPENAI_API_KEY is not set.",
    );
  }

  return result.data;
}

/**
 * Cached environment instance
 */
let _env: Env | null = null;

/**
 * Get the validated environment configuration
 * Caches the result after first call
 */
export function getEnv(): Env {
  if (!_env) {
    _env = loadEnv();
  }
  return _env;
}

/**
 * Check if running in development mode
 */
export function isDev(): boolean {
  return getEnv().NODE_ENV === "development";
}

/**
 * Check if running in production mode
 */
export function isProd(): boolean {
  return getEnv().NODE_ENV === "production";
}

/**
 * Reset cached environment (useful for testing)
 */
export function resetEnvCache(): void {
  _env = null;
}
