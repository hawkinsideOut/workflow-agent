import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  // Schemas
  DependencyVersionSchema,
  CompatibilitySchema,
  PatternTagSchema,
  FixCategoryEnum,
  SolutionTypeEnum,
  StepActionEnum,
  PatternSourceEnum,
  SolutionStepSchema,
  PatternMetricsSchema,
  PatternTriggerSchema,
  PatternSolutionSchema,
  FixPatternSchema,
  LanguageEnum,
  PackageManagerEnum,
  StackSchema,
  DirectoryEntrySchema,
  KeyFileSchema,
  StructureSchema,
  SetupStepSchema,
  ConfigEntrySchema,
  SetupSchema,
  BlueprintSchema,
  TelemetryEventTypeEnum,
  PatternTypeEnum,
  TelemetryEventSchema,
  // Constants
  DEPRECATION_THRESHOLD_DAYS,
  PATTERNS_DIR,
  CONTRIBUTOR_ID_FILE,
  TELEMETRY_BATCH_SIZE,
  // Functions
  isPatternDeprecated,
  generatePatternHash,
  createDefaultMetrics,
  updateMetrics,
  // Types
  type FixPattern,
  type Blueprint,
  type PatternMetrics,
} from "./patterns-schema";

// ============================================
// Test Fixtures
// ============================================

const createValidDependency = () => ({
  name: "react",
  version: "18.2.0",
  compatibleRange: "^18.0.0",
});

const createValidCompatibility = () => ({
  framework: "next",
  frameworkVersion: "^14.0.0",
  runtime: "node",
  runtimeVersion: "^20.0.0",
  dependencies: [createValidDependency()],
});

const createValidTag = () => ({
  name: "react",
  category: "framework" as const,
});

const createValidTrigger = () => ({
  errorPattern: "Cannot find module '(.+)'",
  errorMessage: "Cannot find module 'lodash'",
  filePattern: "*.ts",
  context: "import statement",
});

const createValidSolutionStep = () => ({
  order: 1,
  action: "install" as const,
  target: "lodash",
  description: "Install missing package",
});

const createValidSolution = () => ({
  type: "dependency-add" as const,
  steps: [createValidSolutionStep()],
});

const createValidMetrics = (): PatternMetrics => ({
  successRate: 85.5,
  applications: 100,
  successes: 85,
  failures: 15,
  lastUsed: "2024-01-15T10:30:00.000Z",
  lastSuccessful: "2024-01-15T10:30:00.000Z",
});

const createValidFixPattern = (): FixPattern => ({
  id: "550e8400-e29b-41d4-a716-446655440000",
  name: "Missing Module Fix",
  description: "Fixes missing module errors by installing the package",
  category: "dependency",
  tags: [createValidTag()],
  trigger: createValidTrigger(),
  solution: createValidSolution(),
  compatibility: createValidCompatibility(),
  metrics: createValidMetrics(),
  source: "verify-fix",
  isPrivate: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-15T00:00:00.000Z",
});

const createValidStack = () => ({
  framework: "next",
  language: "typescript" as const,
  runtime: "node",
  packageManager: "pnpm" as const,
  dependencies: [createValidDependency()],
  devDependencies: [
    { name: "typescript", version: "5.3.0", compatibleRange: "^5.0.0" },
  ],
});

const createValidStructure = () => ({
  directories: [{ path: "src", purpose: "Source code" }],
  keyFiles: [
    {
      path: "src/index.ts",
      purpose: "Entry point",
      template: "export const app = {}",
    },
  ],
});

const createValidSetup = () => ({
  prerequisites: ["Node.js 20+"],
  steps: [
    {
      order: 1,
      command: "pnpm install",
      description: "Install dependencies",
      optional: false,
    },
  ],
  configs: [
    {
      file: "tsconfig.json",
      content: '{"compilerOptions": {}}',
      description: "TypeScript config",
    },
  ],
  postSetup: ["pnpm dev"],
});

const createValidBlueprint = (): Blueprint => ({
  id: "660e8400-e29b-41d4-a716-446655440000",
  name: "Next.js TypeScript Starter",
  description: "A starter template for Next.js with TypeScript",
  tags: [createValidTag()],
  stack: createValidStack(),
  structure: createValidStructure(),
  setup: createValidSetup(),
  compatibility: createValidCompatibility(),
  metrics: createValidMetrics(),
  relatedPatterns: ["550e8400-e29b-41d4-a716-446655440000"],
  isPrivate: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-15T00:00:00.000Z",
});

const createValidTelemetryEvent = () => ({
  id: "770e8400-e29b-41d4-a716-446655440000",
  type: "pattern-success" as const,
  patternId: "550e8400-e29b-41d4-a716-446655440000",
  patternType: "fix" as const,
  contributorId: "anon-abc123",
  framework: "next",
  frameworkVersion: "14.0.0",
  success: true,
  timestamp: "2024-01-15T10:30:00.000Z",
});

// ============================================
// Constants Tests
// ============================================

describe("Constants", () => {
  it("should export correct DEPRECATION_THRESHOLD_DAYS", () => {
    expect(DEPRECATION_THRESHOLD_DAYS).toBe(365);
  });

  it("should export correct PATTERNS_DIR", () => {
    expect(PATTERNS_DIR).toBe(".workflow/patterns");
  });

  it("should export correct CONTRIBUTOR_ID_FILE", () => {
    expect(CONTRIBUTOR_ID_FILE).toBe(".workflow/.contributor-id");
  });

  it("should export correct TELEMETRY_BATCH_SIZE", () => {
    expect(TELEMETRY_BATCH_SIZE).toBe(10);
  });
});

// ============================================
// DependencyVersionSchema Tests
// ============================================

describe("DependencyVersionSchema", () => {
  it("should validate a valid dependency", () => {
    const result = DependencyVersionSchema.safeParse(createValidDependency());
    expect(result.success).toBe(true);
  });

  it("should reject empty name", () => {
    const result = DependencyVersionSchema.safeParse({
      name: "",
      version: "1.0.0",
      compatibleRange: "^1.0.0",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty version", () => {
    const result = DependencyVersionSchema.safeParse({
      name: "package",
      version: "",
      compatibleRange: "^1.0.0",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty compatibleRange", () => {
    const result = DependencyVersionSchema.safeParse({
      name: "package",
      version: "1.0.0",
      compatibleRange: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing fields", () => {
    const result = DependencyVersionSchema.safeParse({ name: "package" });
    expect(result.success).toBe(false);
  });
});

// ============================================
// CompatibilitySchema Tests
// ============================================

describe("CompatibilitySchema", () => {
  it("should validate a full compatibility object", () => {
    const result = CompatibilitySchema.safeParse(createValidCompatibility());
    expect(result.success).toBe(true);
  });

  it("should validate without optional runtime fields", () => {
    const result = CompatibilitySchema.safeParse({
      framework: "react",
      frameworkVersion: "^18.0.0",
      dependencies: [],
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty framework", () => {
    const result = CompatibilitySchema.safeParse({
      framework: "",
      frameworkVersion: "^18.0.0",
      dependencies: [],
    });
    expect(result.success).toBe(false);
  });

  it("should validate with empty dependencies array", () => {
    const result = CompatibilitySchema.safeParse({
      framework: "vue",
      frameworkVersion: "^3.0.0",
      dependencies: [],
    });
    expect(result.success).toBe(true);
  });
});

// ============================================
// PatternTagSchema Tests
// ============================================

describe("PatternTagSchema", () => {
  it("should validate all category types", () => {
    const categories = ["framework", "tool", "error-type", "file-type", "custom"];
    categories.forEach((category) => {
      const result = PatternTagSchema.safeParse({ name: "test", category });
      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid category", () => {
    const result = PatternTagSchema.safeParse({
      name: "test",
      category: "invalid",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty name", () => {
    const result = PatternTagSchema.safeParse({
      name: "",
      category: "framework",
    });
    expect(result.success).toBe(false);
  });

  it("should reject name over 50 characters", () => {
    const result = PatternTagSchema.safeParse({
      name: "a".repeat(51),
      category: "framework",
    });
    expect(result.success).toBe(false);
  });

  it("should accept name at exactly 50 characters", () => {
    const result = PatternTagSchema.safeParse({
      name: "a".repeat(50),
      category: "framework",
    });
    expect(result.success).toBe(true);
  });
});

// ============================================
// Enum Tests
// ============================================

describe("FixCategoryEnum", () => {
  it("should accept all valid categories", () => {
    const categories = [
      "lint",
      "type-error",
      "dependency",
      "config",
      "runtime",
      "build",
      "test",
      "security",
    ];
    categories.forEach((cat) => {
      expect(FixCategoryEnum.safeParse(cat).success).toBe(true);
    });
  });

  it("should reject invalid category", () => {
    expect(FixCategoryEnum.safeParse("invalid").success).toBe(false);
  });
});

describe("SolutionTypeEnum", () => {
  it("should accept all valid solution types", () => {
    const types = [
      "command",
      "file-change",
      "config-update",
      "dependency-add",
      "dependency-remove",
      "multi-step",
    ];
    types.forEach((type) => {
      expect(SolutionTypeEnum.safeParse(type).success).toBe(true);
    });
  });
});

describe("StepActionEnum", () => {
  it("should accept all valid actions", () => {
    const actions = ["run", "create", "modify", "delete", "install", "uninstall"];
    actions.forEach((action) => {
      expect(StepActionEnum.safeParse(action).success).toBe(true);
    });
  });
});

describe("PatternSourceEnum", () => {
  it("should accept all valid sources", () => {
    const sources = ["manual", "auto-heal", "verify-fix", "imported", "community"];
    sources.forEach((source) => {
      expect(PatternSourceEnum.safeParse(source).success).toBe(true);
    });
  });
});

// ============================================
// SolutionStepSchema Tests
// ============================================

describe("SolutionStepSchema", () => {
  it("should validate a valid step", () => {
    const result = SolutionStepSchema.safeParse(createValidSolutionStep());
    expect(result.success).toBe(true);
  });

  it("should validate step with content", () => {
    const result = SolutionStepSchema.safeParse({
      ...createValidSolutionStep(),
      content: "console.log('hello')",
    });
    expect(result.success).toBe(true);
  });

  it("should reject order less than 1", () => {
    const result = SolutionStepSchema.safeParse({
      ...createValidSolutionStep(),
      order: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject non-integer order", () => {
    const result = SolutionStepSchema.safeParse({
      ...createValidSolutionStep(),
      order: 1.5,
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty target", () => {
    const result = SolutionStepSchema.safeParse({
      ...createValidSolutionStep(),
      target: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject description over 500 characters", () => {
    const result = SolutionStepSchema.safeParse({
      ...createValidSolutionStep(),
      description: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });
});

// ============================================
// PatternMetricsSchema Tests
// ============================================

describe("PatternMetricsSchema", () => {
  it("should validate valid metrics", () => {
    const result = PatternMetricsSchema.safeParse(createValidMetrics());
    expect(result.success).toBe(true);
  });

  it("should validate metrics without optional dates", () => {
    const result = PatternMetricsSchema.safeParse({
      successRate: 50,
      applications: 10,
      successes: 5,
      failures: 5,
    });
    expect(result.success).toBe(true);
  });

  it("should reject successRate below 0", () => {
    const result = PatternMetricsSchema.safeParse({
      ...createValidMetrics(),
      successRate: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject successRate above 100", () => {
    const result = PatternMetricsSchema.safeParse({
      ...createValidMetrics(),
      successRate: 101,
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative applications", () => {
    const result = PatternMetricsSchema.safeParse({
      ...createValidMetrics(),
      applications: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should accept edge case values (0, 100)", () => {
    const result = PatternMetricsSchema.safeParse({
      successRate: 100,
      applications: 0,
      successes: 0,
      failures: 0,
    });
    expect(result.success).toBe(true);
  });
});

// ============================================
// PatternTriggerSchema Tests
// ============================================

describe("PatternTriggerSchema", () => {
  it("should validate a full trigger", () => {
    const result = PatternTriggerSchema.safeParse(createValidTrigger());
    expect(result.success).toBe(true);
  });

  it("should validate with only required errorPattern", () => {
    const result = PatternTriggerSchema.safeParse({
      errorPattern: "Error: .*",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty errorPattern", () => {
    const result = PatternTriggerSchema.safeParse({
      errorPattern: "",
    });
    expect(result.success).toBe(false);
  });
});

// ============================================
// PatternSolutionSchema Tests
// ============================================

describe("PatternSolutionSchema", () => {
  it("should validate a valid solution", () => {
    const result = PatternSolutionSchema.safeParse(createValidSolution());
    expect(result.success).toBe(true);
  });

  it("should validate solution with multiple steps", () => {
    const result = PatternSolutionSchema.safeParse({
      type: "multi-step",
      steps: [
        { order: 1, action: "install", target: "pkg1", description: "Step 1" },
        { order: 2, action: "run", target: "npm build", description: "Step 2" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should reject solution with empty steps", () => {
    const result = PatternSolutionSchema.safeParse({
      type: "command",
      steps: [],
    });
    expect(result.success).toBe(false);
  });
});

// ============================================
// FixPatternSchema Tests
// ============================================

describe("FixPatternSchema", () => {
  it("should validate a complete fix pattern", () => {
    const result = FixPatternSchema.safeParse(createValidFixPattern());
    expect(result.success).toBe(true);
  });

  it("should set isPrivate default to true", () => {
    const pattern = createValidFixPattern();
    const { isPrivate, ...withoutIsPrivate } = pattern;
    const result = FixPatternSchema.safeParse(withoutIsPrivate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPrivate).toBe(true);
    }
  });

  it("should validate pattern with all optional fields", () => {
    const result = FixPatternSchema.safeParse({
      ...createValidFixPattern(),
      syncedAt: "2024-01-15T00:00:00.000Z",
      contributorId: "anon-123",
      conflictVersion: 2,
      originalId: "660e8400-e29b-41d4-a716-446655440000",
      deprecatedAt: "2024-06-01T00:00:00.000Z",
      deprecationReason: "Superseded by better pattern",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid UUID for id", () => {
    const result = FixPatternSchema.safeParse({
      ...createValidFixPattern(),
      id: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("should reject name shorter than 3 characters", () => {
    const result = FixPatternSchema.safeParse({
      ...createValidFixPattern(),
      name: "ab",
    });
    expect(result.success).toBe(false);
  });

  it("should reject name longer than 100 characters", () => {
    const result = FixPatternSchema.safeParse({
      ...createValidFixPattern(),
      name: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("should reject description longer than 500 characters", () => {
    const result = FixPatternSchema.safeParse({
      ...createValidFixPattern(),
      description: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid datetime format", () => {
    const result = FixPatternSchema.safeParse({
      ...createValidFixPattern(),
      createdAt: "invalid-date",
    });
    expect(result.success).toBe(false);
  });

  it("should reject conflictVersion less than 1", () => {
    const result = FixPatternSchema.safeParse({
      ...createValidFixPattern(),
      conflictVersion: 0,
    });
    expect(result.success).toBe(false);
  });
});

// ============================================
// Stack and Structure Schema Tests
// ============================================

describe("LanguageEnum", () => {
  it("should accept all valid languages", () => {
    const languages = [
      "typescript",
      "javascript",
      "python",
      "go",
      "rust",
      "other",
    ];
    languages.forEach((lang) => {
      expect(LanguageEnum.safeParse(lang).success).toBe(true);
    });
  });
});

describe("PackageManagerEnum", () => {
  it("should accept all valid package managers", () => {
    const managers = ["npm", "pnpm", "yarn", "bun"];
    managers.forEach((manager) => {
      expect(PackageManagerEnum.safeParse(manager).success).toBe(true);
    });
  });
});

describe("StackSchema", () => {
  it("should validate a valid stack", () => {
    const result = StackSchema.safeParse(createValidStack());
    expect(result.success).toBe(true);
  });

  it("should validate stack with empty dependency arrays", () => {
    const result = StackSchema.safeParse({
      framework: "express",
      language: "javascript",
      runtime: "node",
      packageManager: "npm",
      dependencies: [],
      devDependencies: [],
    });
    expect(result.success).toBe(true);
  });
});

describe("DirectoryEntrySchema", () => {
  it("should validate a valid directory entry", () => {
    const result = DirectoryEntrySchema.safeParse({
      path: "src/components",
      purpose: "React components",
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty path", () => {
    const result = DirectoryEntrySchema.safeParse({
      path: "",
      purpose: "Something",
    });
    expect(result.success).toBe(false);
  });
});

describe("KeyFileSchema", () => {
  it("should validate a key file with template", () => {
    const result = KeyFileSchema.safeParse({
      path: "src/index.ts",
      purpose: "Entry point",
      template: "export {}",
    });
    expect(result.success).toBe(true);
  });

  it("should validate without optional template", () => {
    const result = KeyFileSchema.safeParse({
      path: "README.md",
      purpose: "Documentation",
    });
    expect(result.success).toBe(true);
  });
});

describe("StructureSchema", () => {
  it("should validate a valid structure", () => {
    const result = StructureSchema.safeParse(createValidStructure());
    expect(result.success).toBe(true);
  });
});

// ============================================
// Setup Schema Tests
// ============================================

describe("SetupStepSchema", () => {
  it("should validate with default optional value", () => {
    const result = SetupStepSchema.safeParse({
      order: 1,
      command: "npm install",
      description: "Install deps",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.optional).toBe(false);
    }
  });

  it("should validate optional step", () => {
    const result = SetupStepSchema.safeParse({
      order: 1,
      command: "npm run lint",
      description: "Run linting",
      optional: true,
    });
    expect(result.success).toBe(true);
  });
});

describe("ConfigEntrySchema", () => {
  it("should validate a config entry", () => {
    const result = ConfigEntrySchema.safeParse({
      file: "eslint.config.js",
      content: "module.exports = {}",
      description: "ESLint configuration",
    });
    expect(result.success).toBe(true);
  });
});

describe("SetupSchema", () => {
  it("should validate a complete setup", () => {
    const result = SetupSchema.safeParse(createValidSetup());
    expect(result.success).toBe(true);
  });

  it("should validate without optional postSetup", () => {
    const setup = createValidSetup();
    const { postSetup, ...withoutPostSetup } = setup;
    const result = SetupSchema.safeParse(withoutPostSetup);
    expect(result.success).toBe(true);
  });
});

// ============================================
// BlueprintSchema Tests
// ============================================

describe("BlueprintSchema", () => {
  it("should validate a complete blueprint", () => {
    const result = BlueprintSchema.safeParse(createValidBlueprint());
    expect(result.success).toBe(true);
  });

  it("should set isPrivate default to true", () => {
    const blueprint = createValidBlueprint();
    const { isPrivate, ...withoutIsPrivate } = blueprint;
    const result = BlueprintSchema.safeParse(withoutIsPrivate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPrivate).toBe(true);
    }
  });

  it("should validate with empty relatedPatterns", () => {
    const result = BlueprintSchema.safeParse({
      ...createValidBlueprint(),
      relatedPatterns: [],
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid UUID in relatedPatterns", () => {
    const result = BlueprintSchema.safeParse({
      ...createValidBlueprint(),
      relatedPatterns: ["not-a-uuid"],
    });
    expect(result.success).toBe(false);
  });

  it("should reject description longer than 1000 characters", () => {
    const result = BlueprintSchema.safeParse({
      ...createValidBlueprint(),
      description: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("should validate blueprint with deprecation fields", () => {
    const result = BlueprintSchema.safeParse({
      ...createValidBlueprint(),
      deprecatedAt: "2024-06-01T00:00:00.000Z",
      deprecationReason: "No longer maintained",
    });
    expect(result.success).toBe(true);
  });
});

// ============================================
// TelemetryEventSchema Tests
// ============================================

describe("TelemetryEventTypeEnum", () => {
  it("should accept all valid event types", () => {
    const types = ["pattern-applied", "pattern-success", "pattern-failure"];
    types.forEach((type) => {
      expect(TelemetryEventTypeEnum.safeParse(type).success).toBe(true);
    });
  });
});

describe("PatternTypeEnum", () => {
  it("should accept fix and blueprint", () => {
    expect(PatternTypeEnum.safeParse("fix").success).toBe(true);
    expect(PatternTypeEnum.safeParse("blueprint").success).toBe(true);
  });
});

describe("TelemetryEventSchema", () => {
  it("should validate a complete telemetry event", () => {
    const result = TelemetryEventSchema.safeParse(createValidTelemetryEvent());
    expect(result.success).toBe(true);
  });

  it("should validate event without optional fields", () => {
    const result = TelemetryEventSchema.safeParse({
      id: "770e8400-e29b-41d4-a716-446655440000",
      type: "pattern-applied",
      patternId: "550e8400-e29b-41d4-a716-446655440000",
      patternType: "fix",
      contributorId: "anon-123",
      framework: "react",
      frameworkVersion: "18.2.0",
      timestamp: "2024-01-15T10:30:00.000Z",
    });
    expect(result.success).toBe(true);
  });

  it("should validate failure event with reason", () => {
    const result = TelemetryEventSchema.safeParse({
      ...createValidTelemetryEvent(),
      type: "pattern-failure",
      success: false,
      failureReason: "version-mismatch",
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid failure reason", () => {
    const result = TelemetryEventSchema.safeParse({
      ...createValidTelemetryEvent(),
      failureReason: "invalid-reason",
    });
    expect(result.success).toBe(false);
  });

  it("should validate all failure reasons", () => {
    const reasons = [
      "version-mismatch",
      "missing-dependency",
      "file-conflict",
      "permission-error",
      "syntax-error",
      "unknown",
    ];
    reasons.forEach((reason) => {
      const result = TelemetryEventSchema.safeParse({
        ...createValidTelemetryEvent(),
        failureReason: reason,
      });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================
// Utility Function Tests
// ============================================

describe("isPatternDeprecated", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return true for manually deprecated pattern", () => {
    const pattern = {
      ...createValidFixPattern(),
      deprecatedAt: "2024-01-01T00:00:00.000Z",
    };
    expect(isPatternDeprecated(pattern)).toBe(true);
  });

  it("should return true for pattern older than threshold", () => {
    vi.setSystemTime(new Date("2025-06-01T00:00:00.000Z"));
    const pattern = {
      ...createValidFixPattern(),
      updatedAt: "2024-01-01T00:00:00.000Z", // More than 365 days old
    };
    expect(isPatternDeprecated(pattern)).toBe(true);
  });

  it("should return false for recently updated pattern", () => {
    vi.setSystemTime(new Date("2024-02-01T00:00:00.000Z"));
    const pattern = {
      ...createValidFixPattern(),
      updatedAt: "2024-01-15T00:00:00.000Z", // 17 days old
    };
    expect(isPatternDeprecated(pattern)).toBe(false);
  });

  it("should use custom threshold", () => {
    vi.setSystemTime(new Date("2024-02-01T00:00:00.000Z"));
    const pattern = {
      ...createValidFixPattern(),
      updatedAt: "2024-01-01T00:00:00.000Z", // 31 days old
    };
    expect(isPatternDeprecated(pattern, 30)).toBe(true);
    expect(isPatternDeprecated(pattern, 60)).toBe(false);
  });

  it("should work with blueprints", () => {
    vi.setSystemTime(new Date("2025-06-01T00:00:00.000Z"));
    const blueprint = createValidBlueprint();
    expect(isPatternDeprecated(blueprint)).toBe(true);
  });
});

describe("generatePatternHash", () => {
  it("should generate consistent hash for same pattern", () => {
    const pattern = createValidFixPattern();
    const hash1 = generatePatternHash(pattern);
    const hash2 = generatePatternHash(pattern);
    expect(hash1).toBe(hash2);
  });

  it("should generate different hash for different patterns", () => {
    const pattern1 = createValidFixPattern();
    const pattern2 = {
      ...createValidFixPattern(),
      name: "Different Name",
    };
    expect(generatePatternHash(pattern1)).not.toBe(generatePatternHash(pattern2));
  });

  it("should ignore metadata fields when hashing", () => {
    const pattern1 = createValidFixPattern();
    const pattern2 = {
      ...createValidFixPattern(),
      createdAt: "2023-01-01T00:00:00.000Z",
      updatedAt: "2023-12-31T00:00:00.000Z",
      metrics: { ...createValidMetrics(), applications: 999 },
    };
    expect(generatePatternHash(pattern1)).toBe(generatePatternHash(pattern2));
  });

  it("should return 8-character hex string", () => {
    const hash = generatePatternHash(createValidFixPattern());
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });

  it("should work with blueprints", () => {
    const blueprint = createValidBlueprint();
    const hash = generatePatternHash(blueprint);
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("createDefaultMetrics", () => {
  it("should return metrics with zero values", () => {
    const metrics = createDefaultMetrics();
    expect(metrics).toEqual({
      successRate: 0,
      applications: 0,
      successes: 0,
      failures: 0,
      lastUsed: undefined,
      lastSuccessful: undefined,
    });
  });

  it("should return valid metrics object", () => {
    const metrics = createDefaultMetrics();
    const result = PatternMetricsSchema.safeParse(metrics);
    expect(result.success).toBe(true);
  });
});

describe("updateMetrics", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-15T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should increment counts on success", () => {
    const initial = createDefaultMetrics();
    const updated = updateMetrics(initial, true);
    expect(updated.applications).toBe(1);
    expect(updated.successes).toBe(1);
    expect(updated.failures).toBe(0);
    expect(updated.successRate).toBe(100);
  });

  it("should increment counts on failure", () => {
    const initial = createDefaultMetrics();
    const updated = updateMetrics(initial, false);
    expect(updated.applications).toBe(1);
    expect(updated.successes).toBe(0);
    expect(updated.failures).toBe(1);
    expect(updated.successRate).toBe(0);
  });

  it("should calculate correct success rate", () => {
    let metrics = createDefaultMetrics();
    // 3 successes, 1 failure = 75%
    metrics = updateMetrics(metrics, true);
    metrics = updateMetrics(metrics, true);
    metrics = updateMetrics(metrics, true);
    metrics = updateMetrics(metrics, false);
    expect(metrics.successRate).toBe(75);
    expect(metrics.applications).toBe(4);
    expect(metrics.successes).toBe(3);
    expect(metrics.failures).toBe(1);
  });

  it("should update lastUsed on every application", () => {
    const initial = createDefaultMetrics();
    const updated = updateMetrics(initial, false);
    expect(updated.lastUsed).toBe("2024-03-15T12:00:00.000Z");
  });

  it("should update lastSuccessful only on success", () => {
    const initial = createDefaultMetrics();
    const afterFailure = updateMetrics(initial, false);
    expect(afterFailure.lastSuccessful).toBeUndefined();

    const afterSuccess = updateMetrics(afterFailure, true);
    expect(afterSuccess.lastSuccessful).toBe("2024-03-15T12:00:00.000Z");
  });

  it("should preserve previous lastSuccessful on failure", () => {
    let metrics = createDefaultMetrics();
    metrics = updateMetrics(metrics, true);
    const lastSuccess = metrics.lastSuccessful;

    vi.setSystemTime(new Date("2024-03-16T12:00:00.000Z"));
    metrics = updateMetrics(metrics, false);
    expect(metrics.lastSuccessful).toBe(lastSuccess);
  });

  it("should round success rate to 2 decimal places", () => {
    let metrics = createDefaultMetrics();
    // 1 success, 2 failures = 33.333...%
    metrics = updateMetrics(metrics, true);
    metrics = updateMetrics(metrics, false);
    metrics = updateMetrics(metrics, false);
    expect(metrics.successRate).toBe(33.33);
  });
});

// ============================================
// Integration Tests
// ============================================

describe("Integration: Pattern validation flow", () => {
  it("should create and validate a complete fix pattern workflow", () => {
    // Create pattern
    const now = new Date().toISOString();
    const pattern: FixPattern = {
      id: crypto.randomUUID(),
      name: "Integration Test Pattern",
      description: "Tests the full pattern creation workflow",
      category: "lint",
      tags: [{ name: "eslint", category: "tool" }],
      trigger: { errorPattern: "no-unused-vars" },
      solution: {
        type: "file-change",
        steps: [
          {
            order: 1,
            action: "modify",
            target: "file.ts",
            description: "Add underscore prefix to unused var",
          },
        ],
      },
      compatibility: {
        framework: "typescript",
        frameworkVersion: "^5.0.0",
        dependencies: [],
      },
      metrics: createDefaultMetrics(),
      source: "manual",
      isPrivate: true,
      createdAt: now,
      updatedAt: now,
    };

    // Validate
    const result = FixPatternSchema.safeParse(pattern);
    expect(result.success).toBe(true);

    // Update metrics
    const updatedMetrics = updateMetrics(pattern.metrics, true);
    pattern.metrics = updatedMetrics;

    // Re-validate
    const result2 = FixPatternSchema.safeParse(pattern);
    expect(result2.success).toBe(true);
  });

  it("should create and validate a complete blueprint workflow", () => {
    const now = new Date().toISOString();
    const blueprint: Blueprint = {
      id: crypto.randomUUID(),
      name: "Integration Test Blueprint",
      description: "Tests the full blueprint creation workflow",
      tags: [
        { name: "next", category: "framework" },
        { name: "typescript", category: "tool" },
      ],
      stack: {
        framework: "next",
        language: "typescript",
        runtime: "node",
        packageManager: "pnpm",
        dependencies: [{ name: "next", version: "14.0.0", compatibleRange: "^14.0.0" }],
        devDependencies: [],
      },
      structure: {
        directories: [{ path: "src", purpose: "Source code" }],
        keyFiles: [{ path: "src/app/page.tsx", purpose: "Home page" }],
      },
      setup: {
        prerequisites: ["Node.js 20+", "pnpm"],
        steps: [
          { order: 1, command: "pnpm install", description: "Install dependencies" },
        ],
        configs: [],
      },
      compatibility: {
        framework: "next",
        frameworkVersion: "^14.0.0",
        runtime: "node",
        runtimeVersion: "^20.0.0",
        dependencies: [],
      },
      metrics: createDefaultMetrics(),
      relatedPatterns: [],
      isPrivate: true,
      createdAt: now,
      updatedAt: now,
    };

    const result = BlueprintSchema.safeParse(blueprint);
    expect(result.success).toBe(true);
  });
});
