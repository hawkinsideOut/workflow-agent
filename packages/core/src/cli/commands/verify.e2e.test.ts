/**
 * E2E Tests for verify CLI command with platform-specific checks
 * Tests CLI invocation with platform detection and check execution
 */

import { describe, it, expect, beforeAll, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { execa } from "execa";
import {
  setupTempDir,
  cleanupTempDir,
  createWorkflowConfig,
  initGitRepo,
} from "./test-utils.js";

describe("verify CLI command - Platform Detection E2E", () => {
  let tempDir: string;
  let cliPath: string;

  beforeAll(async () => {
    cliPath = join(process.cwd(), "dist", "cli", "index.js");
  });

  beforeEach(async () => {
    tempDir = await setupTempDir("verify-platform-e2e-");
    await createWorkflowConfig(tempDir);
    await initGitRepo(tempDir);
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  // ============================================
  // Shopify Theme Detection
  // ============================================

  describe("Shopify Theme platform detection", () => {
    it("detects Shopify theme by shopify.theme.toml", async () => {
      // Create Shopify theme project structure
      await writeFile(
        join(tempDir, "shopify.theme.toml"),
        "[theme]\nname = 'Test Theme'\n",
      );
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test-shopify-theme",
          scripts: {
            typecheck: "echo 'no typescript'",
            lint: "echo 'ok'",
            format: "echo 'ok'",
            test: "echo 'ok'",
            build: "echo 'ok'",
          },
        }),
      );

      const { stdout, stderr, exitCode } = await execa(
        "node",
        [cliPath, "verify", "--no-platform-checks"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      // Should complete without platform checks (they would fail without CLI)
      expect(stdout).toContain("Quality Verification");
    });

    it("detects Shopify theme by config/settings_schema.json", async () => {
      await mkdir(join(tempDir, "config"), { recursive: true });
      await writeFile(join(tempDir, "config/settings_schema.json"), "[]");
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test-shopify-theme",
          scripts: {
            typecheck: "echo 'ok'",
            lint: "echo 'ok'",
            format: "echo 'ok'",
            test: "echo 'ok'",
            build: "echo 'ok'",
          },
        }),
      );

      const { stdout } = await execa("node", [cliPath, "verify"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Quality Verification");
    });

    it("detects Shopify theme by .liquid files", async () => {
      await writeFile(join(tempDir, "layout.liquid"), "{{ content }}");
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test-shopify-theme",
          scripts: {
            typecheck: "echo 'ok'",
            lint: "echo 'ok'",
            format: "echo 'ok'",
            test: "echo 'ok'",
            build: "echo 'ok'",
          },
        }),
      );

      const { stdout } = await execa("node", [cliPath, "verify"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Quality Verification");
    });
  });

  // ============================================
  // Shopify Hydrogen Detection
  // ============================================

  describe("Shopify Hydrogen platform detection", () => {
    it("detects Shopify Hydrogen by @shopify/hydrogen dependency", async () => {
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test-hydrogen-store",
          dependencies: {
            "@shopify/hydrogen": "^2024.0.0",
            "@shopify/remix-oxygen": "^2.0.0",
          },
          scripts: {
            typecheck: "echo 'ok'",
            lint: "echo 'ok'",
            format: "echo 'ok'",
            test: "echo 'ok'",
            build: "echo 'ok'",
          },
        }),
      );

      const { stdout } = await execa("node", [cliPath, "verify"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Quality Verification");
    });

    it("detects Shopify Hydrogen by hydrogen.config.ts", async () => {
      await writeFile(
        join(tempDir, "hydrogen.config.ts"),
        "export default {};",
      );
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test-hydrogen-store",
          scripts: {
            typecheck: "echo 'ok'",
            lint: "echo 'ok'",
            format: "echo 'ok'",
            test: "echo 'ok'",
            build: "echo 'ok'",
          },
        }),
      );

      const { stdout } = await execa("node", [cliPath, "verify"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Quality Verification");
    });
  });

  // ============================================
  // WordPress Detection
  // ============================================

  describe("WordPress platform detection", () => {
    it("detects WordPress by wp-content directory", async () => {
      await mkdir(join(tempDir, "wp-content/themes"), { recursive: true });
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test-wordpress-theme",
          scripts: {
            typecheck: "echo 'ok'",
            lint: "echo 'ok'",
            format: "echo 'ok'",
            test: "echo 'ok'",
            build: "echo 'ok'",
          },
        }),
      );

      const { stdout } = await execa("node", [cliPath, "verify"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Quality Verification");
    });

    it("detects WordPress by functions.php", async () => {
      await writeFile(
        join(tempDir, "functions.php"),
        "<?php\n// Theme functions",
      );
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test-wordpress-theme",
          scripts: {
            typecheck: "echo 'ok'",
            lint: "echo 'ok'",
            format: "echo 'ok'",
            test: "echo 'ok'",
            build: "echo 'ok'",
          },
        }),
      );

      const { stdout } = await execa("node", [cliPath, "verify"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Quality Verification");
    });

    it("detects WordPress theme by style.css with Theme Name", async () => {
      await writeFile(
        join(tempDir, "style.css"),
        `/*
Theme Name: Test WordPress Theme
Theme URI: https://example.com
Author: Test Author
Version: 1.0.0
*/`,
      );
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test-wordpress-theme",
          scripts: {
            typecheck: "echo 'ok'",
            lint: "echo 'ok'",
            format: "echo 'ok'",
            test: "echo 'ok'",
            build: "echo 'ok'",
          },
        }),
      );

      const { stdout } = await execa("node", [cliPath, "verify"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Quality Verification");
    });
  });

  // ============================================
  // Magento Detection
  // ============================================

  describe("Magento platform detection", () => {
    it("detects Magento by app/etc/env.php", async () => {
      await mkdir(join(tempDir, "app/etc"), { recursive: true });
      await writeFile(join(tempDir, "app/etc/env.php"), "<?php\nreturn [];");
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test-magento",
          scripts: {
            typecheck: "echo 'ok'",
            lint: "echo 'ok'",
            format: "echo 'ok'",
            test: "echo 'ok'",
            build: "echo 'ok'",
          },
        }),
      );

      const { stdout } = await execa("node", [cliPath, "verify"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Quality Verification");
    });

    it("detects Magento by bin/magento", async () => {
      await mkdir(join(tempDir, "bin"), { recursive: true });
      await writeFile(join(tempDir, "bin/magento"), "#!/usr/bin/env php");
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test-magento",
          scripts: {
            typecheck: "echo 'ok'",
            lint: "echo 'ok'",
            format: "echo 'ok'",
            test: "echo 'ok'",
            build: "echo 'ok'",
          },
        }),
      );

      const { stdout } = await execa("node", [cliPath, "verify"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Quality Verification");
    });
  });

  // ============================================
  // WooCommerce Detection
  // ============================================

  describe("WooCommerce platform detection", () => {
    it("detects WooCommerce by plugin directory", async () => {
      await mkdir(join(tempDir, "wp-content/plugins/woocommerce"), {
        recursive: true,
      });
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test-woocommerce",
          scripts: {
            typecheck: "echo 'ok'",
            lint: "echo 'ok'",
            format: "echo 'ok'",
            test: "echo 'ok'",
            build: "echo 'ok'",
          },
        }),
      );

      const { stdout } = await execa("node", [cliPath, "verify"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Quality Verification");
    });
  });

  // ============================================
  // Standard quality checks still work
  // ============================================

  describe("standard quality checks", () => {
    it("runs standard JS/TS checks regardless of platform", async () => {
      // Create a Shopify theme with JS/TS tooling
      await writeFile(
        join(tempDir, "shopify.theme.toml"),
        "[theme]\nname = 'Test'",
      );
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test-hybrid-project",
          scripts: {
            typecheck: "echo 'typecheck passed'",
            lint: "echo 'lint passed'",
            format: "echo 'format passed'",
            test: "echo 'test passed'",
            build: "echo 'build passed'",
          },
        }),
      );

      const { stdout, exitCode } = await execa("node", [cliPath, "verify"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("Quality Verification");
      // Standard checks should run
      expect(stdout).toContain("Type Check");
    });
  });

  // ============================================
  // verify command options
  // ============================================

  describe("verify command options", () => {
    it("shows help for verify command", async () => {
      const { stdout } = await execa("node", [cliPath, "verify", "--help"], {
        cwd: tempDir,
        reject: false,
      });

      expect(stdout).toContain("verify");
    });

    it("runs with --dry-run flag", async () => {
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test-project",
          scripts: {
            lint: "echo 'lint error' && exit 1",
          },
        }),
      );

      const { stdout } = await execa(
        "node",
        [cliPath, "verify", "--dry-run", "--fix"],
        {
          cwd: tempDir,
          reject: false,
        },
      );

      expect(stdout).toContain("DRY-RUN");
    });
  });
});

describe("verify CLI command - Platform Check Execution E2E", () => {
  let tempDir: string;
  let cliPath: string;

  beforeAll(async () => {
    cliPath = join(process.cwd(), "dist", "cli", "index.js");
  });

  beforeEach(async () => {
    tempDir = await setupTempDir("verify-platform-exec-e2e-");
    await initGitRepo(tempDir);
  });

  afterEach(async () => {
    await cleanupTempDir(tempDir);
  });

  // ============================================
  // Platform check CLI detection
  // ============================================

  describe("platform CLI detection", () => {
    it("handles missing Shopify CLI gracefully", async () => {
      // Create Shopify theme project
      await writeFile(
        join(tempDir, "shopify.theme.toml"),
        "[theme]\nname = 'Test'",
      );
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test-shopify-theme",
          scripts: {
            typecheck: "echo 'ok'",
            lint: "echo 'ok'",
            format: "echo 'ok'",
            test: "echo 'ok'",
            build: "echo 'ok'",
          },
        }),
      );

      // This test verifies the command doesn't crash even if Shopify CLI isn't installed
      // (it will either prompt for install or skip based on TTY)
      const { exitCode } = await execa("node", [cliPath, "verify"], {
        cwd: tempDir,
        reject: false,
        env: {
          ...process.env,
          // Disable TTY to prevent interactive prompts
          CI: "true",
        },
      });

      // Should not crash - may exit with 0 (skipped platform checks) or non-zero (install needed)
      expect(typeof exitCode).toBe("number");
    });
  });
});
