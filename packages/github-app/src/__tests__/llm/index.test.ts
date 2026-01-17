/**
 * Unit tests for LLM module (index.ts)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock getEnv
vi.mock("../../config/env", () => ({
  getEnv: vi.fn(() => ({
    LLM_PROVIDER: "anthropic",
    ANTHROPIC_API_KEY: "test-key",
    OPENAI_API_KEY: undefined,
  })),
}));

// Mock the anthropic client
vi.mock("../../llm/anthropic", () => ({
  anthropicClient: {
    name: "anthropic",
    compareImages: vi.fn(() =>
      Promise.resolve({
        hasDifferences: false,
        confidence: 0.95,
        differences: [],
        summary: "Images are identical",
      }),
    ),
    generateFix: vi.fn(() =>
      Promise.resolve({
        analysis: "Error analysis",
        rootCause: "Missing module",
        suggestedFix: {
          description: "Install missing package",
          files: [],
        },
        confidence: 0.9,
      }),
    ),
  },
  resetAnthropicClient: vi.fn(),
}));

// Mock the openai client
vi.mock("../../llm/openai", () => ({
  openaiClient: {
    name: "openai",
    compareImages: vi.fn(() =>
      Promise.resolve({
        hasDifferences: false,
        confidence: 0.95,
        differences: [],
        summary: "Images are identical",
      }),
    ),
    generateFix: vi.fn(() =>
      Promise.resolve({
        analysis: "Error analysis",
        rootCause: "Missing module",
        suggestedFix: {
          description: "Install missing package",
          files: [],
        },
        confidence: 0.9,
      }),
    ),
  },
  resetOpenAIClient: vi.fn(),
}));

describe("LLM Index", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe("getLLMClient", () => {
    it("should return anthropic client when LLM_PROVIDER is anthropic", async () => {
      vi.doMock("../../config/env", () => ({
        getEnv: vi.fn(() => ({
          LLM_PROVIDER: "anthropic",
          ANTHROPIC_API_KEY: "test-key",
        })),
      }));

      const { getLLMClient } = await import("../../llm/index");
      const client = getLLMClient();

      expect(client).toBeDefined();
      expect(typeof client.compareImages).toBe("function");
      expect(typeof client.generateFix).toBe("function");
    });

    it("should return openai client when LLM_PROVIDER is openai", async () => {
      vi.doMock("../../config/env", () => ({
        getEnv: vi.fn(() => ({
          LLM_PROVIDER: "openai",
          OPENAI_API_KEY: "test-key",
        })),
      }));

      const { getLLMClient } = await import("../../llm/index");
      const client = getLLMClient();

      expect(client).toBeDefined();
    });

    it("should throw when ANTHROPIC_API_KEY is not set but provider is anthropic", async () => {
      vi.doMock("../../config/env", () => ({
        getEnv: vi.fn(() => ({
          LLM_PROVIDER: "anthropic",
          ANTHROPIC_API_KEY: undefined,
        })),
      }));

      const { getLLMClient } = await import("../../llm/index");

      expect(() => getLLMClient()).toThrow("ANTHROPIC_API_KEY");
    });

    it("should throw when OPENAI_API_KEY is not set but provider is openai", async () => {
      vi.doMock("../../config/env", () => ({
        getEnv: vi.fn(() => ({
          LLM_PROVIDER: "openai",
          OPENAI_API_KEY: undefined,
        })),
      }));

      const { getLLMClient } = await import("../../llm/index");

      expect(() => getLLMClient()).toThrow("OPENAI_API_KEY");
    });
  });

  describe("compareImages", () => {
    it("should compare images using the configured LLM provider", async () => {
      vi.doMock("../../config/env", () => ({
        getEnv: vi.fn(() => ({
          LLM_PROVIDER: "anthropic",
          ANTHROPIC_API_KEY: "test-key",
        })),
      }));

      const { compareImages } = await import("../../llm/index");

      const beforeImage = Buffer.from("before");
      const afterImage = Buffer.from("after");

      const result = await compareImages(beforeImage, afterImage);

      expect(result).toBeDefined();
      expect(typeof result.hasDifferences).toBe("boolean");
      expect(result.confidence).toBeDefined();
    });

    it("should accept optional context", async () => {
      vi.doMock("../../config/env", () => ({
        getEnv: vi.fn(() => ({
          LLM_PROVIDER: "anthropic",
          ANTHROPIC_API_KEY: "test-key",
        })),
      }));

      const { compareImages } = await import("../../llm/index");

      const result = await compareImages(
        Buffer.from("before"),
        Buffer.from("after"),
        "Look for button changes",
      );

      expect(result).toBeDefined();
    });
  });

  describe("suggestFix", () => {
    it("should generate fix suggestions from error logs", async () => {
      vi.doMock("../../config/env", () => ({
        getEnv: vi.fn(() => ({
          LLM_PROVIDER: "anthropic",
          ANTHROPIC_API_KEY: "test-key",
        })),
      }));

      const { generateFix } = await import("../../llm/index");

      const result = await generateFix("Error: Module not found", {}, "");

      expect(result).toBeDefined();
      expect(result.analysis).toBeDefined();
      expect(result.suggestedFix).toBeDefined();
    });
  });
});
