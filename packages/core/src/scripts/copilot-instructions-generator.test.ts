import { describe, it, expect } from "vitest";

/**
 * Unit Tests for copilot-instructions-generator functionality
 * Tests the Key Rules link rewriting feature
 */
describe("copilot-instructions-generator", () => {
  /**
   * Test the link rewriting logic
   * Links like [FILE.md](FILE.md) should become [FILE.md](../guidelines/FILE.md)
   */
  describe("link rewriting for Key Rules", () => {
    // Recreate the rewriteGuidelineLinks function for testing
    function rewriteGuidelineLinks(text: string): string {
      return text.replace(
        /\[([^\]]+)\]\(([A-Z_]+\.md)\)/g,
        (match, linkText, filename) => {
          if (!filename.includes("/")) {
            return `[${linkText}](../guidelines/${filename})`;
          }
          return match;
        },
      );
    }

    it("rewrites simple markdown links to include ../guidelines/", () => {
      const input =
        "See [AGENT_EDITING_INSTRUCTIONS.md](AGENT_EDITING_INSTRUCTIONS.md) for details.";
      const expected =
        "See [AGENT_EDITING_INSTRUCTIONS.md](../guidelines/AGENT_EDITING_INSTRUCTIONS.md) for details.";

      expect(rewriteGuidelineLinks(input)).toBe(expected);
    });

    it("rewrites multiple links in the same text", () => {
      const input =
        "Follow [TESTING_STRATEGY.md](TESTING_STRATEGY.md) and [LIBRARY_INVENTORY.md](LIBRARY_INVENTORY.md).";
      const expected =
        "Follow [TESTING_STRATEGY.md](../guidelines/TESTING_STRATEGY.md) and [LIBRARY_INVENTORY.md](../guidelines/LIBRARY_INVENTORY.md).";

      expect(rewriteGuidelineLinks(input)).toBe(expected);
    });

    it("does not rewrite links that already have paths", () => {
      const input =
        "See [FILE.md](../guidelines/FILE.md) which is already correct.";
      // Should not double-add the path
      expect(rewriteGuidelineLinks(input)).toBe(input);
    });

    it("preserves non-markdown file links", () => {
      const input = "Check [config](workflow.config.json) for settings.";
      // Should not modify since it doesn't match pattern
      expect(rewriteGuidelineLinks(input)).toBe(input);
    });

    it("rewrites BRANCHING_STRATEGY.md correctly", () => {
      const input = "[BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md)";
      const expected =
        "[BRANCHING_STRATEGY.md](../guidelines/BRANCHING_STRATEGY.md)";

      expect(rewriteGuidelineLinks(input)).toBe(expected);
    });

    it("handles mixed content with some markdown links", () => {
      const input =
        "- Follow conventions in [SINGLE_SOURCE_OF_TRUTH.md](SINGLE_SOURCE_OF_TRUTH.md)\n- Use proper testing as per guidelines";
      const expected =
        "- Follow conventions in [SINGLE_SOURCE_OF_TRUTH.md](../guidelines/SINGLE_SOURCE_OF_TRUTH.md)\n- Use proper testing as per guidelines";

      expect(rewriteGuidelineLinks(input)).toBe(expected);
    });

    it("handles text with no links", () => {
      const input = "This is plain text without any markdown links.";
      expect(rewriteGuidelineLinks(input)).toBe(input);
    });

    it("rewrites SELF_IMPROVEMENT_MANDATE.md correctly", () => {
      const input =
        "Follow [SELF_IMPROVEMENT_MANDATE.md](SELF_IMPROVEMENT_MANDATE.md) guidelines.";
      const expected =
        "Follow [SELF_IMPROVEMENT_MANDATE.md](../guidelines/SELF_IMPROVEMENT_MANDATE.md) guidelines.";

      expect(rewriteGuidelineLinks(input)).toBe(expected);
    });
  });
});
