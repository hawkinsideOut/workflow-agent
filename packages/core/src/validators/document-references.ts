/**
 * Document reference validator for checking broken markdown links
 * and file references in documentation
 */

import { existsSync } from "fs";
import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import fg from "fast-glob";

export interface DocumentReference {
  /** Source file containing the reference */
  file: string;
  /** Line number (1-indexed) */
  line: number;
  /** Column position (1-indexed) */
  column: number;
  /** Original markdown link text (e.g., "[text](path)") */
  rawLink: string;
  /** Extracted target path */
  targetPath: string;
  /** Type of reference */
  type: "link" | "image" | "reference";
}

export interface BrokenReference extends DocumentReference {
  /** Possible correct paths (from glob matching) */
  suggestions: string[];
}

export interface DocumentValidationResult {
  valid: boolean;
  scannedFiles: number;
  totalReferences: number;
  brokenReferences: BrokenReference[];
  errors: string[];
}

/**
 * Regex patterns for detecting markdown links
 */
const LINK_PATTERNS = {
  // Inline links: [text](path)
  inline: /\[([^\]]+)\]\(([^)]+)\)/g,
  // Images: ![alt](path)
  image: /!\[([^\]]*)\]\(([^)]+)\)/g,
  // Reference-style: [text]: path
  reference: /^\[([^\]]+)\]:\s*(.+)$/gm,
};

/**
 * Check if a URL is external (http/https)
 */
function isExternalUrl(path: string): boolean {
  return /^https?:\/\//i.test(path);
}

/**
 * Check if a path is an anchor link (starts with #)
 */
function isAnchorLink(path: string): boolean {
  return path.startsWith("#");
}

/**
 * Resolve a relative path from a source file
 */
function resolveReferencePath(
  sourcePath: string,
  targetPath: string,
  projectRoot: string,
): string {
  // Remove any anchor fragments
  const pathWithoutAnchor = targetPath.split("#")[0];
  if (!pathWithoutAnchor) return targetPath;

  const sourceDir = dirname(sourcePath);

  // If absolute path from project root, resolve from project root
  if (pathWithoutAnchor.startsWith("/")) {
    return resolve(projectRoot, pathWithoutAnchor.slice(1));
  }

  // Otherwise resolve relative to source file
  return resolve(sourceDir, pathWithoutAnchor);
}

/**
 * Extract all document references from a markdown file
 */
export async function extractReferences(
  filePath: string,
  _projectRoot: string,
): Promise<DocumentReference[]> {
  const content = await readFile(filePath, "utf-8");
  const references: DocumentReference[] = [];
  const lines = content.split("\n");

  // Process inline links [text](path)
  lines.forEach((line, index) => {
    let match;
    const inlineRegex = new RegExp(LINK_PATTERNS.inline);
    while ((match = inlineRegex.exec(line)) !== null) {
      const targetPath = match[2].trim();

      // Skip external URLs and anchor-only links
      if (isExternalUrl(targetPath) || isAnchorLink(targetPath)) {
        continue;
      }

      references.push({
        file: filePath,
        line: index + 1,
        column: match.index + 1,
        rawLink: match[0],
        targetPath,
        type: "link",
      });
    }
  });

  // Process images ![alt](path)
  lines.forEach((line, index) => {
    let match;
    const imageRegex = new RegExp(LINK_PATTERNS.image);
    while ((match = imageRegex.exec(line)) !== null) {
      const targetPath = match[2].trim();

      // Skip external URLs
      if (isExternalUrl(targetPath)) {
        continue;
      }

      references.push({
        file: filePath,
        line: index + 1,
        column: match.index + 1,
        rawLink: match[0],
        targetPath,
        type: "image",
      });
    }
  });

  // Process reference-style links [ref]: path
  let match;
  const referenceRegex = new RegExp(LINK_PATTERNS.reference);
  while ((match = referenceRegex.exec(content)) !== null) {
    const targetPath = match[2].trim();

    // Skip external URLs and anchor-only links
    if (isExternalUrl(targetPath) || isAnchorLink(targetPath)) {
      continue;
    }

    // Find line number
    const beforeMatch = content.substring(0, match.index);
    const lineNumber = beforeMatch.split("\n").length;

    references.push({
      file: filePath,
      line: lineNumber,
      column: match.index - beforeMatch.lastIndexOf("\n"),
      rawLink: match[0],
      targetPath,
      type: "reference",
    });
  }

  return references;
}

/**
 * Find similar files using glob patterns
 */
export async function findSimilarFiles(
  targetPath: string,
  projectRoot: string,
): Promise<string[]> {
  // Extract filename and extension
  const parts = targetPath.split("/");
  const filename = parts[parts.length - 1];
  const basename = filename.split(".")[0];
  const ext = filename.includes(".") ? filename.split(".").pop() : "";

  // Try multiple glob patterns for finding similar files
  const patterns = [
    `**/${filename}`, // Exact filename match anywhere
    ext ? `**/${basename}*.${ext}` : `**/${basename}*`, // Similar basename
    ext ? `**/*${basename}*.${ext}` : `**/*${basename}*`, // Contains basename
  ];

  const foundFiles = new Set<string>();

  for (const pattern of patterns) {
    try {
      const matches = await fg(pattern, {
        cwd: projectRoot,
        ignore: [
          "**/node_modules/**",
          "**/.git/**",
          "**/dist/**",
          "**/build/**",
        ],
        absolute: false,
        onlyFiles: true,
      });

      matches.forEach((file) => foundFiles.add(file));

      // Limit suggestions to 10 files
      if (foundFiles.size >= 10) break;
    } catch (error) {
      // Continue with next pattern
    }
  }

  return Array.from(foundFiles).slice(0, 10);
}

/**
 * Scan all markdown files in a project for references
 */
export async function scanDocumentReferences(
  projectPath: string,
  options?: { patterns?: string[]; ignore?: string[] },
): Promise<DocumentReference[]> {
  const patterns = options?.patterns || ["**/*.md"];
  const ignore = options?.ignore || [
    "**/node_modules/**",
    "**/.git/**",
    "**/dist/**",
    "**/build/**",
  ];

  const files = await fg(patterns, {
    cwd: projectPath,
    ignore,
    absolute: true,
    onlyFiles: true,
  });

  const allReferences: DocumentReference[] = [];

  for (const file of files) {
    try {
      const references = await extractReferences(file, projectPath);
      allReferences.push(...references);
    } catch (error) {
      // Skip files that can't be read
      continue;
    }
  }

  return allReferences;
}

/**
 * Validate document references and find broken links
 */
export async function validateDocumentReferences(
  projectPath: string,
  options?: { patterns?: string[]; ignore?: string[] },
): Promise<DocumentValidationResult> {
  const errors: string[] = [];
  const brokenReferences: BrokenReference[] = [];

  try {
    // Scan all references
    const references = await scanDocumentReferences(projectPath, options);

    // Count unique files scanned
    const scannedFiles = new Set(references.map((ref) => ref.file)).size;

    // Check each reference
    for (const ref of references) {
      try {
        const resolvedPath = resolveReferencePath(
          ref.file,
          ref.targetPath,
          projectPath,
        );

        // Check if the file exists
        if (!existsSync(resolvedPath)) {
          // Find similar files for suggestions
          const suggestions = await findSimilarFiles(
            ref.targetPath,
            projectPath,
          );

          brokenReferences.push({
            ...ref,
            suggestions,
          });
        }
      } catch (error) {
        // Path resolution error
        const suggestions = await findSimilarFiles(ref.targetPath, projectPath);
        brokenReferences.push({
          ...ref,
          suggestions,
        });
      }
    }

    return {
      valid: brokenReferences.length === 0,
      scannedFiles,
      totalReferences: references.length,
      brokenReferences,
      errors,
    };
  } catch (error) {
    errors.push(
      error instanceof Error
        ? error.message
        : "Unknown error during validation",
    );

    return {
      valid: false,
      scannedFiles: 0,
      totalReferences: 0,
      brokenReferences: [],
      errors,
    };
  }
}

/**
 * Apply a fix to a broken reference
 */
export async function applyReferenceFix(
  filePath: string,
  oldLink: string,
  newPath: string,
): Promise<void> {
  const content = await readFile(filePath, "utf-8");

  // Replace the old link with the new path
  const updatedContent = content.replace(oldLink, (match) => {
    // Extract the link text and replace only the path part
    if (match.startsWith("![")) {
      // Image: ![alt](oldPath) -> ![alt](newPath)
      return match.replace(/\(([^)]+)\)/, `(${newPath})`);
    } else if (match.startsWith("[") && match.includes("](")) {
      // Inline link: [text](oldPath) -> [text](newPath)
      return match.replace(/\(([^)]+)\)/, `(${newPath})`);
    } else {
      // Reference-style: [ref]: oldPath -> [ref]: newPath
      return match.replace(/:\s*(.+)$/, `: ${newPath}`);
    }
  });

  const fs = await import("fs/promises");
  await fs.writeFile(filePath, updatedContent, "utf-8");
}
