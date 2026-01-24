/**
 * Integration tests for check-runner platform detection and CLI checks
 * Tests real file I/O and detection logic against actual file structures
 */

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { mkdtemp, rm, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  detectAllPlatforms,
  type FrameworkType,
  type PlatformDetectionResult,
} from "./auto-setup.js";

describe("Platform Detection Integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "workflow-platform-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  describe("Shopify Theme Detection", () => {
    it("should detect Shopify theme by shopify.theme.toml", async () => {
      await writeFile(join(tempDir, "shopify.theme.toml"), "");
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("shopify-theme");
    });

    it("should detect Shopify theme by config/settings_schema.json", async () => {
      await mkdir(join(tempDir, "config"), { recursive: true });
      await writeFile(join(tempDir, "config/settings_schema.json"), "[]");
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("shopify-theme");
    });

    it("should detect Shopify theme by @shopify/theme dependency", async () => {
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test",
          devDependencies: { "@shopify/theme": "^1.0.0" },
        }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("shopify-theme");
    });

    it("should detect Shopify theme by .liquid files", async () => {
      await writeFile(join(tempDir, "layout.liquid"), "");
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("shopify-theme");
    });
  });

  describe("Shopify Hydrogen Detection", () => {
    it("should detect Shopify Hydrogen by @shopify/hydrogen dependency", async () => {
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { "@shopify/hydrogen": "^2.0.0" },
        }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("shopify-hydrogen");
    });

    it("should detect Shopify Hydrogen by @shopify/remix-oxygen dependency", async () => {
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { "@shopify/remix-oxygen": "^1.0.0" },
        }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("shopify-hydrogen");
    });

    it("should detect Shopify Hydrogen by hydrogen.config.ts", async () => {
      await writeFile(join(tempDir, "hydrogen.config.ts"), "");
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("shopify-hydrogen");
    });

    it("should prioritize Hydrogen over Theme when both detected", async () => {
      await writeFile(join(tempDir, "shopify.theme.toml"), "");
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { "@shopify/hydrogen": "^2.0.0" },
        }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("shopify-hydrogen");
      expect(result.detected).toContain("shopify-theme");
      // Hydrogen should be detected first (more specific)
      expect(result.detected.indexOf("shopify-hydrogen")).toBeLessThan(
        result.detected.indexOf("shopify-theme"),
      );
    });
  });

  describe("WordPress Detection", () => {
    it("should detect WordPress by wp-content directory", async () => {
      await mkdir(join(tempDir, "wp-content"), { recursive: true });
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("wordpress");
    });

    it("should detect WordPress by functions.php", async () => {
      await writeFile(join(tempDir, "functions.php"), "<?php");
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("wordpress");
    });

    it("should detect WordPress by style.css with Theme Name header", async () => {
      await writeFile(
        join(tempDir, "style.css"),
        `/*
Theme Name: My WordPress Theme
Version: 1.0
*/`,
      );
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("wordpress");
    });

    it("should detect WordPress by composer.json with wordpress dependency", async () => {
      await writeFile(
        join(tempDir, "composer.json"),
        JSON.stringify({
          require: { "johnpbloch/wordpress": "^6.0" },
        }),
      );
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("wordpress");
    });
  });

  describe("WooCommerce Detection", () => {
    it("should detect WooCommerce with WordPress + woocommerce in composer", async () => {
      await mkdir(join(tempDir, "wp-content"), { recursive: true });
      await writeFile(
        join(tempDir, "composer.json"),
        JSON.stringify({
          require: { "woocommerce/woocommerce": "^8.0" },
        }),
      );
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("woocommerce");
    });

    it("should detect WooCommerce by plugin directory", async () => {
      await mkdir(join(tempDir, "wp-content/plugins/woocommerce"), {
        recursive: true,
      });
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("woocommerce");
    });

    it("should prioritize WooCommerce over plain WordPress", async () => {
      await mkdir(join(tempDir, "wp-content/plugins/woocommerce"), {
        recursive: true,
      });
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await detectAllPlatforms(tempDir);

      // Should detect WooCommerce but not plain WordPress (WooCommerce implies WordPress)
      expect(result.detected).toContain("woocommerce");
      expect(result.detected).not.toContain("wordpress");
    });
  });

  describe("Magento Detection", () => {
    it("should detect Magento by app/etc/env.php", async () => {
      await mkdir(join(tempDir, "app/etc"), { recursive: true });
      await writeFile(join(tempDir, "app/etc/env.php"), "<?php");
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("magento");
    });

    it("should detect Magento by bin/magento", async () => {
      await mkdir(join(tempDir, "bin"), { recursive: true });
      await writeFile(join(tempDir, "bin/magento"), "#!/bin/bash");
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("magento");
    });

    it("should detect Magento by composer.json with magento dependency", async () => {
      await writeFile(
        join(tempDir, "composer.json"),
        JSON.stringify({
          require: { "magento/framework": "^103.0" },
        }),
      );
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("magento");
    });
  });

  describe("Multi-Platform Detection", () => {
    it("should detect multiple platforms in hybrid projects", async () => {
      // Create a project with both Shopify theme and Node.js
      await writeFile(join(tempDir, "shopify.theme.toml"), "");
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { express: "^4.0.0" },
        }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("shopify-theme");
      expect(result.detected).toContain("express");
    });

    it("should return primary as first detected platform", async () => {
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({
          name: "test",
          dependencies: { "@shopify/hydrogen": "^2.0.0" },
        }),
      );

      const result = await detectAllPlatforms(tempDir);

      expect(result.primary).toBe("shopify-hydrogen");
      expect(result.detected[0]).toBe("shopify-hydrogen");
    });

    it("should return unknown for empty projects", async () => {
      const result = await detectAllPlatforms(tempDir);

      expect(result.primary).toBe("unknown");
      expect(result.detected).toEqual([]);
    });

    it("should return unknown for projects without detectable platforms", async () => {
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await detectAllPlatforms(tempDir);

      // May detect 'node' as fallback, or be empty
      expect(["unknown", "node"]).toContain(result.primary);
    });
  });

  describe("Edge Cases", () => {
    it("should handle missing package.json gracefully", async () => {
      await writeFile(join(tempDir, "shopify.theme.toml"), "");

      const result = await detectAllPlatforms(tempDir);

      expect(result.detected).toContain("shopify-theme");
    });

    it("should handle malformed package.json gracefully", async () => {
      await writeFile(join(tempDir, "package.json"), "not valid json");

      const result = await detectAllPlatforms(tempDir);

      expect(result.primary).toBe("unknown");
    });

    it("should handle malformed composer.json gracefully", async () => {
      await mkdir(join(tempDir, "wp-content"), { recursive: true });
      await writeFile(join(tempDir, "composer.json"), "not valid json");
      await writeFile(
        join(tempDir, "package.json"),
        JSON.stringify({ name: "test" }),
      );

      const result = await detectAllPlatforms(tempDir);

      // Should still detect WordPress by wp-content
      expect(result.detected).toContain("wordpress");
    });

    it("should not crash on permission errors", async () => {
      // This test ensures the function handles errors gracefully
      const nonExistent = join(tempDir, "does-not-exist");

      const result = await detectAllPlatforms(nonExistent);

      expect(result.primary).toBe("unknown");
      expect(result.detected).toEqual([]);
    });
  });
});

describe("Standard Framework Detection Integration", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), "workflow-framework-test-"));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("should detect Next.js", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        name: "test",
        dependencies: { next: "^14.0.0", react: "^18.0.0" },
      }),
    );

    const result = await detectAllPlatforms(tempDir);

    expect(result.detected).toContain("nextjs");
  });

  it("should detect Remix", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        name: "test",
        dependencies: { "@remix-run/react": "^2.0.0" },
      }),
    );

    const result = await detectAllPlatforms(tempDir);

    expect(result.detected).toContain("remix");
  });

  it("should detect Vue.js", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        name: "test",
        dependencies: { vue: "^3.0.0" },
      }),
    );

    const result = await detectAllPlatforms(tempDir);

    expect(result.detected).toContain("vue");
  });

  it("should detect React (without Next.js)", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        name: "test",
        dependencies: { react: "^18.0.0" },
      }),
    );

    const result = await detectAllPlatforms(tempDir);

    expect(result.detected).toContain("react");
    expect(result.detected).not.toContain("nextjs");
  });

  it("should detect Express.js", async () => {
    await writeFile(
      join(tempDir, "package.json"),
      JSON.stringify({
        name: "test",
        dependencies: { express: "^4.0.0" },
      }),
    );

    const result = await detectAllPlatforms(tempDir);

    expect(result.detected).toContain("express");
  });
});
