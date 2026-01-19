import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  CodeAnalyzer,
  createCodeAnalyzer,
  DEFAULT_ANALYZER_OPTIONS,
} from "./code-analyzer";

// ============================================
// Test Fixtures
// ============================================

const TEST_DIR = "/tmp/code-analyzer-test";

const createTestFile = async (relativePath: string, content: string): Promise<void> => {
  const fullPath = path.join(TEST_DIR, relativePath);
  await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.promises.writeFile(fullPath, content);
};

const createTestProject = async (): Promise<void> => {
  // package.json
  await createTestFile(
    "package.json",
    JSON.stringify({
      name: "test-project",
      dependencies: {
        next: "^14.0.0",
        react: "^18.0.0",
        zod: "^3.0.0",
      },
      devDependencies: {
        typescript: "^5.0.0",
        vitest: "^1.0.0",
      },
    }),
  );

  // Entry point
  await createTestFile(
    "src/index.ts",
    `
import { createApp } from "./app";
import { config } from "./config";

export function main() {
  const app = createApp(config);
  return app;
}

export default main;
`,
  );

  // Config file
  await createTestFile(
    "src/config.ts",
    `
const DATABASE_URL = process.env.DATABASE_URL;
const API_KEY = process.env.API_KEY;

export const config = {
  database: DATABASE_URL,
  apiKey: API_KEY,
  port: 3000,
};
`,
  );

  // Service file
  await createTestFile(
    "src/services/auth.service.ts",
    `
import { prisma } from "../lib/prisma";
import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  return user;
}

export async function register(email: string, password: string) {
  return prisma.user.create({ data: { email, password } });
}
`,
  );

  // Component file
  await createTestFile(
    "src/components/Button.tsx",
    `
import React from "react";

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

export function Button({ onClick, children }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

export default Button;
`,
  );

  // Hook file
  await createTestFile(
    "src/hooks/useAuth.ts",
    `
import { useState, useEffect } from "react";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check auth status
    setLoading(false);
  }, []);

  return { user, loading };
}
`,
  );

  // Utility file
  await createTestFile(
    "src/utils/helpers.ts",
    `
export function formatDate(date: Date): string {
  return date.toISOString();
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
`,
  );

  // Type definitions
  await createTestFile(
    "src/types.ts",
    `
export interface User {
  id: string;
  email: string;
  name: string;
}

export type AuthStatus = "authenticated" | "unauthenticated" | "loading";
`,
  );

  // Test file
  await createTestFile(
    "src/utils/helpers.test.ts",
    `
import { describe, it, expect } from "vitest";
import { formatDate, capitalize } from "./helpers";

describe("helpers", () => {
  it("should format date", () => {
    const date = new Date("2024-01-01");
    expect(formatDate(date)).toBe("2024-01-01T00:00:00.000Z");
  });

  it("should capitalize", () => {
    expect(capitalize("hello")).toBe("Hello");
  });
});
`,
  );

  // Middleware file
  await createTestFile(
    "src/middleware/auth.middleware.ts",
    `
export function authMiddleware(req: Request) {
  const token = req.headers.get("authorization");
  if (!token) {
    throw new Error("Unauthorized");
  }
  return token;
}
`,
  );

  // Model file
  await createTestFile(
    "src/models/user.model.ts",
    `
export class UserModel {
  id: string;
  email: string;
  
  constructor(data: { id: string; email: string }) {
    this.id = data.id;
    this.email = data.email;
  }
}
`,
  );
};

// ============================================
// Test Setup/Teardown
// ============================================

describe("CodeAnalyzer", () => {
  beforeEach(async () => {
    try {
      await fs.promises.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Directory may not exist
    }
    await fs.promises.mkdir(TEST_DIR, { recursive: true });
  });

  afterEach(async () => {
    try {
      await fs.promises.rm(TEST_DIR, { recursive: true, force: true });
    } catch {
      // Cleanup may fail
    }
  });

  // ============================================
  // Factory Function Tests
  // ============================================

  describe("createCodeAnalyzer", () => {
    it("should create a new CodeAnalyzer instance", () => {
      const analyzer = createCodeAnalyzer();
      expect(analyzer).toBeInstanceOf(CodeAnalyzer);
    });

    it("should accept custom options", () => {
      const analyzer = createCodeAnalyzer({ maxFiles: 10 });
      expect(analyzer).toBeInstanceOf(CodeAnalyzer);
    });

    it("should have default options", () => {
      expect(DEFAULT_ANALYZER_OPTIONS.maxFiles).toBe(50);
      expect(DEFAULT_ANALYZER_OPTIONS.extensions).toContain(".ts");
      expect(DEFAULT_ANALYZER_OPTIONS.ignoreDirs).toContain("node_modules");
    });
  });

  // ============================================
  // analyzeFile Tests
  // ============================================

  describe("analyzeFile", () => {
    it("should analyze a simple TypeScript file", async () => {
      await createTestFile(
        "simple.ts",
        `export function hello() { return "Hello"; }`,
      );

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(path.join(TEST_DIR, "simple.ts"));

      expect(result).not.toBeNull();
      expect(result?.exports).toContain("hello");
      expect(result?.lineCount).toBeGreaterThan(0);
    });

    it("should extract named exports", async () => {
      await createTestFile(
        "exports.ts",
        `
export const FOO = "foo";
export function bar() {}
export class Baz {}
export interface Qux {}
export type Quux = string;
`,
      );

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(path.join(TEST_DIR, "exports.ts"));

      expect(result?.exports).toContain("FOO");
      expect(result?.exports).toContain("bar");
      expect(result?.exports).toContain("Baz");
      expect(result?.exports).toContain("Qux");
      expect(result?.exports).toContain("Quux");
    });

    it("should extract default exports", async () => {
      await createTestFile(
        "default.ts",
        `export default function main() {}`,
      );

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(path.join(TEST_DIR, "default.ts"));

      expect(result?.exports).toContain("main");
    });

    it("should extract imports", async () => {
      await createTestFile(
        "imports.ts",
        `
import { useState } from "react";
import express from "express";
import { z } from "zod";
`,
      );

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(path.join(TEST_DIR, "imports.ts"));

      expect(result?.imports).toContain("react");
      expect(result?.imports).toContain("express");
      expect(result?.imports).toContain("zod");
    });

    it("should detect file role for test files", async () => {
      await createTestFile("utils.test.ts", `describe("test", () => {});`);

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(path.join(TEST_DIR, "utils.test.ts"));

      expect(result?.role).toBe("test");
    });

    it("should detect file role for config files", async () => {
      await createTestFile("vite.config.ts", `export default {};`);

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(path.join(TEST_DIR, "vite.config.ts"));

      expect(result?.role).toBe("config");
    });

    it("should detect file role for type files", async () => {
      await createTestFile("types.ts", `export type Foo = string;`);

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(path.join(TEST_DIR, "types.ts"));

      expect(result?.role).toBe("type");
    });

    it("should detect file role for hooks", async () => {
      await createTestFile(
        "hooks/useAuth.ts",
        `export function useAuth() {}`,
      );

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(
        path.join(TEST_DIR, "hooks/useAuth.ts"),
      );

      expect(result?.role).toBe("hook");
    });

    it("should detect file role for components", async () => {
      await createTestFile(
        "components/Button.tsx",
        `export function Button() {}`,
      );

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(
        path.join(TEST_DIR, "components/Button.tsx"),
      );

      expect(result?.role).toBe("component");
    });

    it("should detect file role for services", async () => {
      await createTestFile(
        "services/auth.service.ts",
        `export function login() {}`,
      );

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(
        path.join(TEST_DIR, "services/auth.service.ts"),
      );

      expect(result?.role).toBe("service");
    });

    it("should detect file role for middleware", async () => {
      await createTestFile(
        "middleware/auth.ts",
        `export function authMiddleware() {}`,
      );

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(
        path.join(TEST_DIR, "middleware/auth.ts"),
      );

      expect(result?.role).toBe("middleware");
    });

    it("should detect file role for models", async () => {
      await createTestFile("models/user.ts", `export class User {}`);

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(
        path.join(TEST_DIR, "models/user.ts"),
      );

      expect(result?.role).toBe("model");
    });

    it("should detect file role for entry points", async () => {
      await createTestFile("index.ts", `export default function main() {}`);

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(path.join(TEST_DIR, "index.ts"));

      expect(result?.role).toBe("entry");
    });

    it("should skip files larger than maxFileSize", async () => {
      const largeContent = "x".repeat(200_000);
      await createTestFile("large.ts", largeContent);

      const analyzer = createCodeAnalyzer({ maxFileSize: 100_000 });
      const result = await analyzer.analyzeFile(path.join(TEST_DIR, "large.ts"));

      expect(result).toBeNull();
    });

    it("should return null for non-existent files", async () => {
      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(path.join(TEST_DIR, "nonexistent.ts"));

      expect(result).toBeNull();
    });

    it("should extract dependencies from imports", async () => {
      await createTestFile(
        "deps.ts",
        `
import axios from "axios";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
`,
      );

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(path.join(TEST_DIR, "deps.ts"));

      expect(result?.dependencies).toContain("axios");
      expect(result?.dependencies).toContain("zod");
      expect(result?.dependencies).toContain("@prisma/client");
    });

    it("should not include relative imports as dependencies", async () => {
      await createTestFile(
        "relative.ts",
        `
import { foo } from "./utils";
import { bar } from "../lib/helpers";
`,
      );

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(path.join(TEST_DIR, "relative.ts"));

      expect(result?.dependencies).not.toContain("./utils");
      expect(result?.dependencies).not.toContain("../lib/helpers");
    });

    it("should anonymize content when enabled", async () => {
      await createTestFile(
        "secrets.ts",
        `
const password = "secret123";
const email = "user@example.com";
const path = "/home/username/project";
`,
      );

      const analyzer = createCodeAnalyzer({ anonymize: true });
      const result = await analyzer.analyzeFile(path.join(TEST_DIR, "secrets.ts"));

      expect(result?.content).not.toContain("/home/username");
      expect(result?.content).not.toContain("user@example.com");
    });

    it("should generate a purpose description", async () => {
      await createTestFile(
        "utils.ts",
        `export function formatDate() {} export function parseDate() {}`,
      );

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeFile(path.join(TEST_DIR, "utils.ts"));

      expect(result?.purpose).toContain("formatDate");
    });
  });

  // ============================================
  // analyzeDirectory Tests
  // ============================================

  describe("analyzeDirectory", () => {
    beforeEach(async () => {
      await createTestProject();
    });

    it("should analyze all files in a directory", async () => {
      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeDirectory(TEST_DIR);

      expect(result.success).toBe(true);
      expect(result.files.length).toBeGreaterThan(0);
    });

    it("should extract dependencies from package.json", async () => {
      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeDirectory(TEST_DIR);

      expect(result.dependencies).toBeDefined();
      expect(result.dependencies.some((d) => d.name === "next")).toBe(true);
      expect(result.dependencies.some((d) => d.name === "react")).toBe(true);
    });

    it("should extract devDependencies from package.json", async () => {
      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeDirectory(TEST_DIR);

      expect(result.devDependencies).toBeDefined();
      expect(result.devDependencies.some((d) => d.name === "typescript")).toBe(true);
    });

    it("should detect framework from package.json", async () => {
      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeDirectory(TEST_DIR);

      expect(result.framework).toBe("next");
      expect(result.frameworkVersion).toBe("^14.0.0");
    });

    it("should extract environment variables", async () => {
      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeDirectory(TEST_DIR);

      expect(result.envVars.some((e) => e.name === "DATABASE_URL")).toBe(true);
      expect(result.envVars.some((e) => e.name === "API_KEY")).toBe(true);
    });

    it("should detect entry points", async () => {
      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeDirectory(TEST_DIR);

      expect(result.entryPoints.length).toBeGreaterThan(0);
    });

    it("should respect maxFiles option", async () => {
      const analyzer = createCodeAnalyzer({ maxFiles: 2 });
      const result = await analyzer.analyzeDirectory(TEST_DIR);

      expect(result.files.length).toBeLessThanOrEqual(2);
    });

    it("should ignore specified directories", async () => {
      await createTestFile("node_modules/pkg/index.js", `export const x = 1;`);

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeDirectory(TEST_DIR);

      const nodeModulesFiles = result.files.filter((f) =>
        f.path.includes("node_modules"),
      );
      expect(nodeModulesFiles.length).toBe(0);
    });

    it("should only include specified extensions", async () => {
      await createTestFile("readme.md", "# Readme");
      await createTestFile("data.json", "{}");

      const analyzer = createCodeAnalyzer({ extensions: [".ts", ".tsx"] });
      const result = await analyzer.analyzeDirectory(TEST_DIR);

      const mdFiles = result.files.filter((f) => f.path.endsWith(".md"));
      const jsonFiles = result.files.filter((f) => f.path.endsWith(".json"));

      expect(mdFiles.length).toBe(0);
      expect(jsonFiles.length).toBe(0);
    });

    it("should handle empty directories", async () => {
      await fs.promises.rm(TEST_DIR, { recursive: true, force: true });
      await fs.promises.mkdir(TEST_DIR, { recursive: true });

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeDirectory(TEST_DIR);

      expect(result.success).toBe(true);
      expect(result.files.length).toBe(0);
    });

    it("should handle missing package.json", async () => {
      await fs.promises.rm(TEST_DIR, { recursive: true, force: true });
      await fs.promises.mkdir(TEST_DIR, { recursive: true });
      await createTestFile("src/index.ts", `export const x = 1;`);

      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeDirectory(TEST_DIR);

      expect(result.success).toBe(true);
      expect(result.dependencies.length).toBe(0);
    });

    it("should return error for invalid paths", async () => {
      const analyzer = createCodeAnalyzer();
      const result = await analyzer.analyzeDirectory("/nonexistent/path");

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  // ============================================
  // detectArchitecture Tests
  // ============================================

  describe("detectArchitecture", () => {
    beforeEach(async () => {
      await createTestProject();
    });

    it("should detect entry points", async () => {
      const analyzer = createCodeAnalyzer();
      const analysis = await analyzer.analyzeDirectory(TEST_DIR);
      const architecture = analyzer.detectArchitecture(analysis);

      expect(architecture.entryPoints.length).toBeGreaterThan(0);
    });

    it("should generate data flow description", async () => {
      const analyzer = createCodeAnalyzer();
      const analysis = await analyzer.analyzeDirectory(TEST_DIR);
      const architecture = analyzer.detectArchitecture(analysis);

      expect(architecture.dataFlow).toBeDefined();
      expect(architecture.dataFlow.length).toBeGreaterThan(0);
    });

    it("should detect request-response architecture", async () => {
      const analyzer = createCodeAnalyzer();
      const analysis = await analyzer.analyzeDirectory(TEST_DIR);
      const architecture = analyzer.detectArchitecture(analysis);

      // Our test project has middleware, so dataFlow should include middleware pattern
      expect(architecture.dataFlow).toContain("Middleware");
    });

    it("should extract key decisions", async () => {
      const analyzer = createCodeAnalyzer();
      const analysis = await analyzer.analyzeDirectory(TEST_DIR);
      const architecture = analyzer.detectArchitecture(analysis);

      expect(architecture.keyDecisions.length).toBeGreaterThan(0);
    });

    it("should include framework in key decisions", async () => {
      const analyzer = createCodeAnalyzer();
      const analysis = await analyzer.analyzeDirectory(TEST_DIR);
      const architecture = analyzer.detectArchitecture(analysis);

      const frameworkDecision = architecture.keyDecisions.find((d) =>
        d.toLowerCase().includes("next"),
      );
      expect(frameworkDecision).toBeDefined();
    });

    it("should detect Zod usage", async () => {
      const analyzer = createCodeAnalyzer();
      const analysis = await analyzer.analyzeDirectory(TEST_DIR);
      const architecture = analyzer.detectArchitecture(analysis);

      const zodDecision = architecture.keyDecisions.find((d) =>
        d.toLowerCase().includes("zod"),
      );
      expect(zodDecision).toBeDefined();
    });
  });

  // ============================================
  // createSolutionPattern Tests
  // ============================================

  describe("createSolutionPattern", () => {
    beforeEach(async () => {
      await createTestProject();
    });

    it("should create a valid SolutionPattern", async () => {
      const analyzer = createCodeAnalyzer();
      const pattern = await analyzer.createSolutionPattern(
        TEST_DIR,
        "Test Auth Solution",
        "Authentication solution for testing",
        "auth",
        ["authentication", "login", "jwt"],
      );

      expect(pattern.id).toBeDefined();
      expect(pattern.name).toBe("Test Auth Solution");
      expect(pattern.description).toBe("Authentication solution for testing");
      expect(pattern.category).toBe("auth");
    });

    it("should include files in implementation", async () => {
      const analyzer = createCodeAnalyzer();
      const pattern = await analyzer.createSolutionPattern(
        TEST_DIR,
        "Test Solution",
        "Test description",
        "auth",
        ["test"],
      );

      expect(pattern.implementation.files.length).toBeGreaterThan(0);
    });

    it("should include dependencies", async () => {
      const analyzer = createCodeAnalyzer();
      const pattern = await analyzer.createSolutionPattern(
        TEST_DIR,
        "Test Solution",
        "Test description",
        "auth",
        ["test"],
      );

      expect(pattern.implementation.dependencies.length).toBeGreaterThan(0);
    });

    it("should include devDependencies", async () => {
      const analyzer = createCodeAnalyzer();
      const pattern = await analyzer.createSolutionPattern(
        TEST_DIR,
        "Test Solution",
        "Test description",
        "auth",
        ["test"],
      );

      expect(pattern.implementation.devDependencies.length).toBeGreaterThan(0);
    });

    it("should include environment variables", async () => {
      const analyzer = createCodeAnalyzer();
      const pattern = await analyzer.createSolutionPattern(
        TEST_DIR,
        "Test Solution",
        "Test description",
        "auth",
        ["test"],
      );

      expect(pattern.implementation.envVars.length).toBeGreaterThan(0);
    });

    it("should include problem definition with keywords", async () => {
      const analyzer = createCodeAnalyzer();
      const pattern = await analyzer.createSolutionPattern(
        TEST_DIR,
        "Test Solution",
        "Test description",
        "auth",
        ["authentication", "login"],
      );

      expect(pattern.problem.keywords).toContain("authentication");
      expect(pattern.problem.keywords).toContain("login");
    });

    it("should include architecture information", async () => {
      const analyzer = createCodeAnalyzer();
      const pattern = await analyzer.createSolutionPattern(
        TEST_DIR,
        "Test Solution",
        "Test description",
        "auth",
        ["test"],
      );

      expect(pattern.architecture.entryPoints.length).toBeGreaterThan(0);
      expect(pattern.architecture.dataFlow).toBeDefined();
      expect(pattern.architecture.keyDecisions.length).toBeGreaterThan(0);
    });

    it("should include compatibility information", async () => {
      const analyzer = createCodeAnalyzer();
      const pattern = await analyzer.createSolutionPattern(
        TEST_DIR,
        "Test Solution",
        "Test description",
        "auth",
        ["test"],
      );

      expect(pattern.compatibility.framework).toBe("next");
      expect(pattern.compatibility.frameworkVersion).toBe("^14.0.0");
    });

    it("should set default metrics", async () => {
      const analyzer = createCodeAnalyzer();
      const pattern = await analyzer.createSolutionPattern(
        TEST_DIR,
        "Test Solution",
        "Test description",
        "auth",
        ["test"],
      );

      expect(pattern.metrics.applications).toBe(0);
      expect(pattern.metrics.successes).toBe(0);
      expect(pattern.metrics.failures).toBe(0);
    });

    it("should set source as manual", async () => {
      const analyzer = createCodeAnalyzer();
      const pattern = await analyzer.createSolutionPattern(
        TEST_DIR,
        "Test Solution",
        "Test description",
        "auth",
        ["test"],
      );

      expect(pattern.source).toBe("manual");
    });

    it("should set isPrivate to true by default", async () => {
      const analyzer = createCodeAnalyzer();
      const pattern = await analyzer.createSolutionPattern(
        TEST_DIR,
        "Test Solution",
        "Test description",
        "auth",
        ["test"],
      );

      expect(pattern.isPrivate).toBe(true);
    });

    it("should use directory name as sourceProject", async () => {
      const analyzer = createCodeAnalyzer();
      const pattern = await analyzer.createSolutionPattern(
        TEST_DIR,
        "Test Solution",
        "Test description",
        "auth",
        ["test"],
      );

      expect(pattern.sourceProject).toBe("code-analyzer-test");
    });

    it("should add category as a tag", async () => {
      const analyzer = createCodeAnalyzer();
      const pattern = await analyzer.createSolutionPattern(
        TEST_DIR,
        "Test Solution",
        "Test description",
        "database",
        ["test"],
      );

      expect(pattern.tags.some((t) => t.name === "database")).toBe(true);
    });
  });
});
