/**
 * Unit tests for environment configuration
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  EnvSchema,
  loadEnv,
  getEnv,
  isDev,
  isProd,
  resetEnvCache,
} from "../config/env";

describe("Environment Configuration", () => {
  // Store original env
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset cache before each test
    resetEnvCache();
    // Clear all env vars
    Object.keys(process.env).forEach((key) => {
      delete process.env[key];
    });
  });

  afterEach(() => {
    // Restore original env
    Object.keys(process.env).forEach((key) => {
      delete process.env[key];
    });
    Object.assign(process.env, originalEnv);
    resetEnvCache();
  });

  describe("EnvSchema", () => {
    it("should validate required fields", () => {
      const result = EnvSchema.safeParse({});
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = result.error.errors.map((e) => e.path[0]);
        expect(errors).toContain("GITHUB_APP_ID");
        expect(errors).toContain("GITHUB_PRIVATE_KEY");
        expect(errors).toContain("GITHUB_WEBHOOK_SECRET");
      }
    });

    it("should validate with all required fields", () => {
      const result = EnvSchema.safeParse({
        GITHUB_APP_ID: "123456",
        GITHUB_PRIVATE_KEY:
          "-----BEGIN RSA PRIVATE KEY-----\ntest\n-----END RSA PRIVATE KEY-----",
        GITHUB_WEBHOOK_SECRET: "secret123",
      });
      expect(result.success).toBe(true);
    });

    it("should use default values", () => {
      const result = EnvSchema.safeParse({
        GITHUB_APP_ID: "123456",
        GITHUB_PRIVATE_KEY: "key",
        GITHUB_WEBHOOK_SECRET: "secret",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(3000);
        expect(result.data.HOST).toBe("0.0.0.0");
        expect(result.data.NODE_ENV).toBe("development");
        expect(result.data.DATABASE_PATH).toBe("./data/workflow-agent.db");
        expect(result.data.MAX_RETRIES).toBe(10);
        expect(result.data.BACKOFF_BASE_MINUTES).toBe(1);
        expect(result.data.BACKOFF_MAX_MINUTES).toBe(30);
        expect(result.data.LLM_PROVIDER).toBe("anthropic");
      }
    });

    it("should coerce PORT to number", () => {
      const result = EnvSchema.safeParse({
        GITHUB_APP_ID: "123456",
        GITHUB_PRIVATE_KEY: "key",
        GITHUB_WEBHOOK_SECRET: "secret",
        PORT: "8080",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.PORT).toBe(8080);
        expect(typeof result.data.PORT).toBe("number");
      }
    });

    it("should validate NODE_ENV enum", () => {
      const validEnvs = ["development", "production", "test"];
      for (const env of validEnvs) {
        const result = EnvSchema.safeParse({
          GITHUB_APP_ID: "123456",
          GITHUB_PRIVATE_KEY: "key",
          GITHUB_WEBHOOK_SECRET: "secret",
          NODE_ENV: env,
        });
        expect(result.success).toBe(true);
      }

      const invalidResult = EnvSchema.safeParse({
        GITHUB_APP_ID: "123456",
        GITHUB_PRIVATE_KEY: "key",
        GITHUB_WEBHOOK_SECRET: "secret",
        NODE_ENV: "invalid",
      });
      expect(invalidResult.success).toBe(false);
    });

    it("should validate LLM_PROVIDER enum", () => {
      const validProviders = ["anthropic", "openai"];
      for (const provider of validProviders) {
        const result = EnvSchema.safeParse({
          GITHUB_APP_ID: "123456",
          GITHUB_PRIVATE_KEY: "key",
          GITHUB_WEBHOOK_SECRET: "secret",
          LLM_PROVIDER: provider,
        });
        expect(result.success).toBe(true);
      }
    });

    it("should validate SMEE_URL as URL", () => {
      const result = EnvSchema.safeParse({
        GITHUB_APP_ID: "123456",
        GITHUB_PRIVATE_KEY: "key",
        GITHUB_WEBHOOK_SECRET: "secret",
        SMEE_URL: "https://smee.io/abc123",
      });
      expect(result.success).toBe(true);

      const invalidResult = EnvSchema.safeParse({
        GITHUB_APP_ID: "123456",
        GITHUB_PRIVATE_KEY: "key",
        GITHUB_WEBHOOK_SECRET: "secret",
        SMEE_URL: "not-a-url",
      });
      expect(invalidResult.success).toBe(false);
    });

    it("should validate MAX_RETRIES range", () => {
      const result = EnvSchema.safeParse({
        GITHUB_APP_ID: "123456",
        GITHUB_PRIVATE_KEY: "key",
        GITHUB_WEBHOOK_SECRET: "secret",
        MAX_RETRIES: "50",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.MAX_RETRIES).toBe(50);
      }

      // Too high
      const tooHighResult = EnvSchema.safeParse({
        GITHUB_APP_ID: "123456",
        GITHUB_PRIVATE_KEY: "key",
        GITHUB_WEBHOOK_SECRET: "secret",
        MAX_RETRIES: "101",
      });
      expect(tooHighResult.success).toBe(false);

      // Too low
      const tooLowResult = EnvSchema.safeParse({
        GITHUB_APP_ID: "123456",
        GITHUB_PRIVATE_KEY: "key",
        GITHUB_WEBHOOK_SECRET: "secret",
        MAX_RETRIES: "0",
      });
      expect(tooLowResult.success).toBe(false);
    });
  });

  describe("loadEnv", () => {
    it("should throw with descriptive error for missing required fields", () => {
      expect(() => loadEnv()).toThrow("Environment validation failed");
      expect(() => loadEnv()).toThrow("GITHUB_APP_ID");
    });

    it("should load valid env successfully", () => {
      process.env.GITHUB_APP_ID = "123456";
      process.env.GITHUB_PRIVATE_KEY = "key";
      process.env.GITHUB_WEBHOOK_SECRET = "secret";

      const env = loadEnv();
      expect(env.GITHUB_APP_ID).toBe("123456");
      expect(env.PORT).toBe(3000);
    });

    it("should warn when no LLM API key is configured", () => {
      process.env.GITHUB_APP_ID = "123456";
      process.env.GITHUB_PRIVATE_KEY = "key";
      process.env.GITHUB_WEBHOOK_SECRET = "secret";

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      loadEnv();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("No LLM API key configured"),
      );
      consoleSpy.mockRestore();
    });

    it("should warn when LLM_PROVIDER doesn't match available keys", () => {
      process.env.GITHUB_APP_ID = "123456";
      process.env.GITHUB_PRIVATE_KEY = "key";
      process.env.GITHUB_WEBHOOK_SECRET = "secret";
      process.env.LLM_PROVIDER = "openai";
      // No OPENAI_API_KEY set

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      loadEnv();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          "LLM_PROVIDER is 'openai' but OPENAI_API_KEY is not set",
        ),
      );
      consoleSpy.mockRestore();
    });
  });

  describe("getEnv", () => {
    it("should cache the result", () => {
      process.env.GITHUB_APP_ID = "123456";
      process.env.GITHUB_PRIVATE_KEY = "key";
      process.env.GITHUB_WEBHOOK_SECRET = "secret";

      const env1 = getEnv();
      const env2 = getEnv();
      expect(env1).toBe(env2); // Same object reference
    });
  });

  describe("isDev", () => {
    it("should return true in development", () => {
      process.env.GITHUB_APP_ID = "123456";
      process.env.GITHUB_PRIVATE_KEY = "key";
      process.env.GITHUB_WEBHOOK_SECRET = "secret";
      process.env.NODE_ENV = "development";

      expect(isDev()).toBe(true);
    });

    it("should return false in production", () => {
      process.env.GITHUB_APP_ID = "123456";
      process.env.GITHUB_PRIVATE_KEY = "key";
      process.env.GITHUB_WEBHOOK_SECRET = "secret";
      process.env.NODE_ENV = "production";

      expect(isDev()).toBe(false);
    });
  });

  describe("isProd", () => {
    it("should return true in production", () => {
      process.env.GITHUB_APP_ID = "123456";
      process.env.GITHUB_PRIVATE_KEY = "key";
      process.env.GITHUB_WEBHOOK_SECRET = "secret";
      process.env.NODE_ENV = "production";

      expect(isProd()).toBe(true);
    });

    it("should return false in development", () => {
      process.env.GITHUB_APP_ID = "123456";
      process.env.GITHUB_PRIVATE_KEY = "key";
      process.env.GITHUB_WEBHOOK_SECRET = "secret";
      process.env.NODE_ENV = "development";

      expect(isProd()).toBe(false);
    });
  });
});
