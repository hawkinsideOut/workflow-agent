import { describe, test, expect, beforeEach, afterEach } from "vitest";
import { mkdir, writeFile, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  extractReferences,
  scanDocumentReferences,
  validateDocumentReferences,
  findSimilarFiles,
  applyReferenceFix,
  type DocumentReference,
} from "./document-references.js";

describe("document-references", () => {
  let testDir: string;

  beforeEach(async () => {
    // Create a temporary test directory
    testDir = join(tmpdir(), `workflow-test-${Date.now()}`);
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    await rm(testDir, { recursive: true, force: true });
  });

  describe("extractReferences", () => {
    test("should extract inline links", async () => {
      const content = `
# Test Document

Check out [this link](./other-file.md) for more info.
Also see [another link](../parent/file.md).
`;
      const filePath = join(testDir, "test.md");
      await writeFile(filePath, content);

      const refs = await extractReferences(filePath, testDir);

      expect(refs).toHaveLength(2);
      expect(refs[0]).toMatchObject({
        file: filePath,
        line: 4,
        targetPath: "./other-file.md",
        type: "link",
      });
      expect(refs[1]).toMatchObject({
        file: filePath,
        line: 5,
        targetPath: "../parent/file.md",
        type: "link",
      });
    });

    test("should extract image references", async () => {
      const content = `
# Test Document

![Alt text](./images/screenshot.png)
![Another](../assets/logo.svg)
`;
      const filePath = join(testDir, "test.md");
      await writeFile(filePath, content);

      const refs = await extractReferences(filePath, testDir);

      // Images are matched by the image pattern
      const imageRefs = refs.filter(r => r.type === "image");
      expect(imageRefs).toHaveLength(2);
      expect(imageRefs[0]).toMatchObject({
        file: filePath,
        line: 4,
        targetPath: "./images/screenshot.png",
        type: "image",
      });
      expect(imageRefs[1]).toMatchObject({
        targetPath: "../assets/logo.svg",
        type: "image",
      });
    });

    test("should extract reference-style links", async () => {
      const content = `
# Test Document

Check [this link][1] and [that link][2].

[1]: ./reference1.md
[2]: ../reference2.md
`;
      const filePath = join(testDir, "test.md");
      await writeFile(filePath, content);

      const refs = await extractReferences(filePath, testDir);

      expect(refs).toHaveLength(2);
      expect(refs.some((r) => r.targetPath === "./reference1.md")).toBe(true);
      expect(refs.some((r) => r.targetPath === "../reference2.md")).toBe(true);
    });

    test("should skip external URLs", async () => {
      const content = `
# Test Document

[External](https://example.com)
[HTTP](http://example.com)
![Image](https://example.com/image.png)
`;
      const filePath = join(testDir, "test.md");
      await writeFile(filePath, content);

      const refs = await extractReferences(filePath, testDir);

      expect(refs).toHaveLength(0);
    });

    test("should skip anchor-only links", async () => {
      const content = `
# Test Document

[Jump to section](#section)
[Another anchor](#another-section)
`;
      const filePath = join(testDir, "test.md");
      await writeFile(filePath, content);

      const refs = await extractReferences(filePath, testDir);

      expect(refs).toHaveLength(0);
    });

    test("should handle links with anchors", async () => {
      const content = `
# Test Document

[Link with anchor](./file.md#section)
`;
      const filePath = join(testDir, "test.md");
      await writeFile(filePath, content);

      const refs = await extractReferences(filePath, testDir);

      expect(refs).toHaveLength(1);
      expect(refs[0].targetPath).toBe("./file.md#section");
    });
  });

  describe("scanDocumentReferences", () => {
    test("should scan multiple markdown files", async () => {
      await writeFile(
        join(testDir, "file1.md"),
        "[Link](./target.md)",
      );
      await writeFile(
        join(testDir, "file2.md"),
        "![Image](./image.png)",
      );

      const refs = await scanDocumentReferences(testDir);

      // Should find both link and image references
      expect(refs.length).toBeGreaterThanOrEqual(2);
      expect(refs.some((r) => r.targetPath === "./target.md")).toBe(true);
      expect(refs.some((r) => r.targetPath === "./image.png")).toBe(true);
    });

    test("should respect ignore patterns", async () => {
      await mkdir(join(testDir, "node_modules"), { recursive: true });
      await writeFile(
        join(testDir, "node_modules", "file.md"),
        "[Link](./target.md)",
      );
      await writeFile(
        join(testDir, "valid.md"),
        "[Link](./other.md)",
      );

      const refs = await scanDocumentReferences(testDir);

      expect(refs).toHaveLength(1);
      expect(refs[0].file).toContain("valid.md");
    });

    test("should support custom patterns", async () => {
      await mkdir(join(testDir, "docs"), { recursive: true });
      await writeFile(
        join(testDir, "docs", "guide.md"),
        "[Link](./api.md)",
      );
      await writeFile(
        join(testDir, "README.md"),
        "[Link](./docs.md)",
      );

      const refs = await scanDocumentReferences(testDir, {
        patterns: ["docs/**/*.md"],
      });

      expect(refs).toHaveLength(1);
      expect(refs[0].file).toContain("guide.md");
    });
  });

  describe("validateDocumentReferences", () => {
    test("should detect broken references", async () => {
      await writeFile(
        join(testDir, "source.md"),
        "[Link](./missing-file.md)",
      );

      const result = await validateDocumentReferences(testDir);

      expect(result.valid).toBe(false);
      expect(result.brokenReferences).toHaveLength(1);
      expect(result.brokenReferences[0].targetPath).toBe("./missing-file.md");
    });

    test("should validate existing references", async () => {
      await writeFile(
        join(testDir, "source.md"),
        "[Link](./target.md)",
      );
      await writeFile(join(testDir, "target.md"), "# Target");

      const result = await validateDocumentReferences(testDir);

      expect(result.valid).toBe(true);
      expect(result.brokenReferences).toHaveLength(0);
    });

    test("should resolve relative paths correctly", async () => {
      await mkdir(join(testDir, "docs"), { recursive: true });
      await mkdir(join(testDir, "assets"), { recursive: true });
      await writeFile(
        join(testDir, "docs", "guide.md"),
        "[Link](../assets/image.png)",
      );
      await writeFile(join(testDir, "assets", "image.png"), "fake image");

      const result = await validateDocumentReferences(testDir);

      expect(result.valid).toBe(true);
      expect(result.brokenReferences).toHaveLength(0);
    });

    test("should handle absolute paths from project root", async () => {
      await mkdir(join(testDir, "docs"), { recursive: true });
      await writeFile(
        join(testDir, "docs", "guide.md"),
        "[Link](/README.md)",
      );
      await writeFile(join(testDir, "README.md"), "# README");

      const result = await validateDocumentReferences(testDir);

      expect(result.valid).toBe(true);
      expect(result.brokenReferences).toHaveLength(0);
    });

    test("should provide statistics", async () => {
      await writeFile(
        join(testDir, "file1.md"),
        "[Link1](./target1.md)\n[Link2](./target2.md)",
      );
      await writeFile(
        join(testDir, "file2.md"),
        "![Image](./image.png)",
      );

      const result = await validateDocumentReferences(testDir);

      expect(result.scannedFiles).toBe(2);
      // 2 links in file1.md + 1 image in file2.md = 3+ references
      expect(result.totalReferences).toBeGreaterThanOrEqual(3);
    });
  });

  describe("findSimilarFiles", () => {
    test("should find files with similar names", async () => {
      await mkdir(join(testDir, "docs"), { recursive: true });
      await writeFile(join(testDir, "docs", "getting-started.md"), "");
      await writeFile(join(testDir, "docs", "getting-started-guide.md"), "");
      await writeFile(join(testDir, "setup.md"), "");

      const similar = await findSimilarFiles(
        "./getting-started.md",
        testDir,
      );

      expect(similar.length).toBeGreaterThan(0);
      expect(
        similar.some((f) => f.includes("getting-started")),
      ).toBe(true);
    });

    test("should limit suggestions", async () => {
      // Create more than 10 files
      for (let i = 0; i < 15; i++) {
        await writeFile(join(testDir, `file${i}.md`), "");
      }

      const similar = await findSimilarFiles("./missing.md", testDir);

      expect(similar.length).toBeLessThanOrEqual(10);
    });

    test("should match by basename", async () => {
      await mkdir(join(testDir, "docs", "api"), { recursive: true });
      await writeFile(join(testDir, "docs", "api", "auth.md"), "");
      await writeFile(join(testDir, "auth-guide.md"), "");

      const similar = await findSimilarFiles("./auth.md", testDir);

      expect(similar.length).toBeGreaterThan(0);
      expect(similar.some((f) => f.includes("auth"))).toBe(true);
    });
  });

  describe("applyReferenceFix", () => {
    test("should fix inline link", async () => {
      const filePath = join(testDir, "test.md");
      const content = "Check [this link](./old-path.md) for info.";
      await writeFile(filePath, content);

      await applyReferenceFix(
        filePath,
        "[this link](./old-path.md)",
        "./new-path.md",
      );

      const fs = await import("fs/promises");
      const updated = await fs.readFile(filePath, "utf-8");
      expect(updated).toContain("./new-path.md");
      expect(updated).not.toContain("./old-path.md");
      expect(updated).toContain("[this link]"); // Preserve link text
    });

    test("should fix image reference", async () => {
      const filePath = join(testDir, "test.md");
      const content = "See ![screenshot](./old-image.png) above.";
      await writeFile(filePath, content);

      await applyReferenceFix(
        filePath,
        "![screenshot](./old-image.png)",
        "./new-image.png",
      );

      const fs = await import("fs/promises");
      const updated = await fs.readFile(filePath, "utf-8");
      expect(updated).toContain("./new-image.png");
      expect(updated).toContain("![screenshot]"); // Preserve alt text
    });

    test("should fix reference-style link", async () => {
      const filePath = join(testDir, "test.md");
      const content = `
[link1]: ./old-ref.md
[link2]: ./other.md
`;
      await writeFile(filePath, content);

      await applyReferenceFix(
        filePath,
        "[link1]: ./old-ref.md",
        "./new-ref.md",
      );

      const fs = await import("fs/promises");
      const updated = await fs.readFile(filePath, "utf-8");
      expect(updated).toContain("[link1]: ./new-ref.md");
      expect(updated).toContain("[link2]: ./other.md"); // Don't affect other links
    });
  });
});
