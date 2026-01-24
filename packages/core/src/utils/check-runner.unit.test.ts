/**
 * Unit tests for check-runner platform-specific functionality
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  PLATFORM_CLI_INSTALL,
  PLATFORM_CHECKS,
  type PlatformType,
  type PlatformCheckDefinition,
} from "./check-runner.js";

describe("PLATFORM_CLI_INSTALL", () => {
  it("should have configuration for all platform types", () => {
    const expectedPlatforms: PlatformType[] = [
      "shopify-theme",
      "shopify-hydrogen",
      "wordpress",
      "magento",
      "woocommerce",
    ];

    for (const platform of expectedPlatforms) {
      expect(PLATFORM_CLI_INSTALL[platform]).toBeDefined();
      expect(PLATFORM_CLI_INSTALL[platform].cli).toBeTruthy();
      expect(PLATFORM_CLI_INSTALL[platform].install).toBeTruthy();
      expect(PLATFORM_CLI_INSTALL[platform].displayName).toBeTruthy();
      expect(typeof PLATFORM_CLI_INSTALL[platform].requiresComposer).toBe(
        "boolean",
      );
    }
  });

  it("should require Composer for PHP-based platforms", () => {
    expect(PLATFORM_CLI_INSTALL["wordpress"].requiresComposer).toBe(true);
    expect(PLATFORM_CLI_INSTALL["magento"].requiresComposer).toBe(true);
    expect(PLATFORM_CLI_INSTALL["woocommerce"].requiresComposer).toBe(true);
  });

  it("should NOT require Composer for Shopify platforms", () => {
    expect(PLATFORM_CLI_INSTALL["shopify-theme"].requiresComposer).toBe(false);
    expect(PLATFORM_CLI_INSTALL["shopify-hydrogen"].requiresComposer).toBe(
      false,
    );
  });

  it("should use npm install for Shopify platforms", () => {
    expect(PLATFORM_CLI_INSTALL["shopify-theme"].install).toContain(
      "npm install",
    );
    expect(PLATFORM_CLI_INSTALL["shopify-hydrogen"].install).toContain(
      "npm install",
    );
  });

  it("should use composer for PHP platforms", () => {
    expect(PLATFORM_CLI_INSTALL["wordpress"].install).toContain("composer");
    expect(PLATFORM_CLI_INSTALL["magento"].install).toContain("composer");
    expect(PLATFORM_CLI_INSTALL["woocommerce"].install).toContain("composer");
  });

  it("should have shopify CLI for Shopify platforms", () => {
    expect(PLATFORM_CLI_INSTALL["shopify-theme"].cli).toBe("shopify");
    expect(PLATFORM_CLI_INSTALL["shopify-hydrogen"].cli).toBe("shopify");
  });

  it("should have phpcs CLI for PHP platforms", () => {
    expect(PLATFORM_CLI_INSTALL["wordpress"].cli).toBe("phpcs");
    expect(PLATFORM_CLI_INSTALL["magento"].cli).toBe("phpcs");
    expect(PLATFORM_CLI_INSTALL["woocommerce"].cli).toBe("phpcs");
  });
});

describe("PLATFORM_CHECKS", () => {
  it("should have checks for all platform types", () => {
    const platformsWithChecks = new Set(PLATFORM_CHECKS.map((c) => c.platform));

    expect(platformsWithChecks.has("shopify-theme")).toBe(true);
    expect(platformsWithChecks.has("shopify-hydrogen")).toBe(true);
    expect(platformsWithChecks.has("wordpress")).toBe(true);
    expect(platformsWithChecks.has("magento")).toBe(true);
    expect(platformsWithChecks.has("woocommerce")).toBe(true);
  });

  it("should have proper check definition structure", () => {
    for (const check of PLATFORM_CHECKS) {
      expect(check.name).toBeTruthy();
      expect(check.displayName).toBeTruthy();
      expect(check.command).toBeTruthy();
      expect(Array.isArray(check.args)).toBe(true);
      expect(typeof check.canAutoFix).toBe("boolean");
      expect(check.platform).toBeTruthy();
    }
  });

  it("should use shopify CLI for Shopify checks", () => {
    const shopifyChecks = PLATFORM_CHECKS.filter(
      (c) =>
        c.platform === "shopify-theme" || c.platform === "shopify-hydrogen",
    );

    for (const check of shopifyChecks) {
      expect(check.command).toBe("shopify");
    }
  });

  it("should use phpcs/phpcbf for PHP platforms", () => {
    const phpChecks = PLATFORM_CHECKS.filter(
      (c) =>
        c.platform === "wordpress" ||
        c.platform === "magento" ||
        c.platform === "woocommerce",
    );

    for (const check of phpChecks) {
      expect(check.command).toBe("phpcs");
      if (check.canAutoFix) {
        expect(check.fixCommand).toBe("phpcbf");
      }
    }
  });

  it("should have appropriate coding standards for each PHP platform", () => {
    const wordpressCheck = PLATFORM_CHECKS.find(
      (c) => c.platform === "wordpress",
    );
    const magentoCheck = PLATFORM_CHECKS.find((c) => c.platform === "magento");
    const wooCheck = PLATFORM_CHECKS.find((c) => c.platform === "woocommerce");

    expect(wordpressCheck?.args).toContain("--standard=WordPress");
    expect(magentoCheck?.args).toContain("--standard=Magento2");
    expect(wooCheck?.args).toContain("--standard=WooCommerce-Core");
  });

  it("should have shopify theme check use correct command", () => {
    const themeCheck = PLATFORM_CHECKS.find(
      (c) => c.platform === "shopify-theme",
    );

    expect(themeCheck?.args).toContain("theme");
    expect(themeCheck?.args).toContain("check");
  });

  it("should have shopify hydrogen check use correct command", () => {
    const hydrogenCheck = PLATFORM_CHECKS.find(
      (c) => c.platform === "shopify-hydrogen",
    );

    expect(hydrogenCheck?.args).toContain("hydrogen");
    expect(hydrogenCheck?.args).toContain("check");
  });

  it("should have auto-fix enabled for PHP platforms", () => {
    const phpChecks = PLATFORM_CHECKS.filter(
      (c) =>
        c.platform === "wordpress" ||
        c.platform === "magento" ||
        c.platform === "woocommerce",
    );

    for (const check of phpChecks) {
      expect(check.canAutoFix).toBe(true);
      expect(check.fixCommand).toBe("phpcbf");
      expect(check.fixArgs).toBeDefined();
    }
  });

  it("should NOT have auto-fix for Shopify platforms", () => {
    const shopifyChecks = PLATFORM_CHECKS.filter(
      (c) =>
        c.platform === "shopify-theme" || c.platform === "shopify-hydrogen",
    );

    for (const check of shopifyChecks) {
      expect(check.canAutoFix).toBe(false);
    }
  });
});

describe("Platform type mapping", () => {
  it("should have matching platforms between CLI_INSTALL and CHECKS", () => {
    const cliPlatforms = Object.keys(PLATFORM_CLI_INSTALL) as PlatformType[];
    const checkPlatforms = [...new Set(PLATFORM_CHECKS.map((c) => c.platform))];

    // Every platform in checks should have CLI config
    for (const platform of checkPlatforms) {
      expect(cliPlatforms).toContain(platform);
    }

    // Every platform with CLI config should have checks
    for (const platform of cliPlatforms) {
      expect(checkPlatforms).toContain(platform);
    }
  });
});
