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
  // Solution Pattern Schemas
  SolutionCategoryEnum,
  FileRoleEnum,
  SolutionFileSchema,
  ProblemDefinitionSchema,
  EnvVarSchema,
  DataModelSchema,
  ImplementationSchema,
  ArchitectureSchema,
  SolutionPatternSchema,
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
  type SolutionPattern,
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
    const categories = [
      "framework",
      "tool",
      "error-type",
      "file-type",
      "custom",
    ];
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
    const actions = [
      "run",
      "create",
      "modify",
      "delete",
      "install",
      "uninstall",
    ];
    actions.forEach((action) => {
      expect(StepActionEnum.safeParse(action).success).toBe(true);
    });
  });
});

describe("PatternSourceEnum", () => {
  it("should accept all valid sources", () => {
    const sources = [
      "manual",
      "auto-heal",
      "verify-fix",
      "imported",
      "community",
    ];
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

  it("should set isPrivate default to false", () => {
    const pattern = createValidFixPattern();
    const { isPrivate, ...withoutIsPrivate } = pattern;
    const result = FixPatternSchema.safeParse(withoutIsPrivate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPrivate).toBe(false);
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

  it("should set isPrivate default to false", () => {
    const blueprint = createValidBlueprint();
    const { isPrivate, ...withoutIsPrivate } = blueprint;
    const result = BlueprintSchema.safeParse(withoutIsPrivate);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isPrivate).toBe(false);
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
    expect(generatePatternHash(pattern1)).not.toBe(
      generatePatternHash(pattern2),
    );
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
        dependencies: [
          { name: "next", version: "14.0.0", compatibleRange: "^14.0.0" },
        ],
        devDependencies: [],
      },
      structure: {
        directories: [{ path: "src", purpose: "Source code" }],
        keyFiles: [{ path: "src/app/page.tsx", purpose: "Home page" }],
      },
      setup: {
        prerequisites: ["Node.js 20+", "pnpm"],
        steps: [
          {
            order: 1,
            command: "pnpm install",
            description: "Install dependencies",
          },
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

// ============================================
// Solution Pattern Schema Tests
// ============================================

// Test Fixtures for Solution Patterns (matching actual schema)
const createValidSolutionEnvVar = () => ({
  name: "DATABASE_URL",
  description: "PostgreSQL connection string",
  required: true,
  example: "postgresql://user:pass@localhost:5432/db",
});

const createValidSolutionDataModel = () => ({
  name: "User",
  description: "User account model",
  schema: "model User { id String @id email String @unique }",
});

const createValidSolutionFile = () => ({
  path: "src/auth/login.ts",
  purpose: "Login handler with password verification",
  role: "service" as const,
  content: `export async function login(email: string, password: string) {
  const user = await findUserByEmail(email);
  if (!user || !await verifyPassword(password, user.passwordHash)) {
    throw new Error('Invalid credentials');
  }
  return createSession(user.id);
}`,
  exports: ["login"],
  imports: ["bcrypt", "@prisma/client"],
  lineCount: 8,
});

const createValidSolutionProblem = () => ({
  keywords: ["authentication", "login", "password", "session"],
  description: "User authentication with email and password for secure login",
  errorPatterns: ["Invalid credentials", "User not found"],
});

const createValidSolutionImplementation = () => ({
  files: [createValidSolutionFile()],
  dependencies: [
    { name: "bcrypt", version: "5.1.0", compatibleRange: "^5.0.0" },
  ],
  devDependencies: [
    { name: "@types/bcrypt", version: "5.0.0", compatibleRange: "^5.0.0" },
  ],
  envVars: [createValidSolutionEnvVar()],
  dataModels: [createValidSolutionDataModel()],
});

const createValidSolutionArchitecture = () => ({
  entryPoints: ["src/auth/login.ts"],
  dataFlow: "Request → Controller → Service → Repository → Database",
  keyDecisions: [
    "Separate auth logic from user management",
    "Use repository pattern for database access",
  ],
  diagram: "graph LR; A[Request] --> B[Auth]; B --> C[DB]",
});

const createValidSolutionPattern = (): SolutionPattern => ({
  id: "550e8400-e29b-41d4-a716-446655440001",
  name: "Email/Password Authentication",
  description:
    "Complete authentication flow with email and password using bcrypt and sessions",
  category: "auth",
  tags: [
    { name: "authentication", category: "custom" },
    { name: "typescript", category: "tool" },
  ],
  problem: createValidSolutionProblem(),
  implementation: createValidSolutionImplementation(),
  architecture: createValidSolutionArchitecture(),
  compatibility: {
    framework: "next",
    frameworkVersion: "^14.0.0",
    runtime: "node",
    runtimeVersion: "^20.0.0",
    dependencies: [
      { name: "bcrypt", version: "5.0.0", compatibleRange: "^5.0.0" },
    ],
  },
  metrics: createValidMetrics(),
  relatedPatterns: [],
  source: "community",
  sourceProject: "project-123",
  isPrivate: true,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-15T00:00:00.000Z",
});

describe("SolutionCategoryEnum", () => {
  const validCategories = [
    "auth",
    "database",
    "api",
    "state",
    "forms",
    "ui",
    "testing",
    "deployment",
    "error-handling",
    "caching",
    "security",
    "performance",
    "integrations",
    "other",
  ];

  it.each(validCategories)("should accept valid category: %s", (category) => {
    const result = SolutionCategoryEnum.safeParse(category);
    expect(result.success).toBe(true);
  });

  it("should reject invalid category", () => {
    const result = SolutionCategoryEnum.safeParse("invalid-category");
    expect(result.success).toBe(false);
  });

  it("should reject empty string", () => {
    const result = SolutionCategoryEnum.safeParse("");
    expect(result.success).toBe(false);
  });
});

describe("FileRoleEnum", () => {
  const validRoles = [
    "entry",
    "config",
    "util",
    "component",
    "hook",
    "middleware",
    "model",
    "service",
    "test",
    "type",
  ];

  it.each(validRoles)("should accept valid role: %s", (role) => {
    const result = FileRoleEnum.safeParse(role);
    expect(result.success).toBe(true);
  });

  it("should reject invalid role", () => {
    const result = FileRoleEnum.safeParse("invalid-role");
    expect(result.success).toBe(false);
  });
});

describe("EnvVarSchema (Solution)", () => {
  it("should validate a complete env var", () => {
    const result = EnvVarSchema.safeParse(createValidSolutionEnvVar());
    expect(result.success).toBe(true);
  });

  it("should accept env var without optional example", () => {
    const { example, ...envVar } = createValidSolutionEnvVar();
    const result = EnvVarSchema.safeParse(envVar);
    expect(result.success).toBe(true);
  });

  it("should reject env var without name", () => {
    const { name, ...envVar } = createValidSolutionEnvVar();
    const result = EnvVarSchema.safeParse(envVar);
    expect(result.success).toBe(false);
  });

  it("should reject env var without description", () => {
    const { description, ...envVar } = createValidSolutionEnvVar();
    const result = EnvVarSchema.safeParse(envVar);
    expect(result.success).toBe(false);
  });

  it("should accept env var with required=false", () => {
    const envVar = { ...createValidSolutionEnvVar(), required: false };
    const result = EnvVarSchema.safeParse(envVar);
    expect(result.success).toBe(true);
  });
});

describe("DataModelSchema (Solution)", () => {
  it("should validate a complete data model", () => {
    const result = DataModelSchema.safeParse(createValidSolutionDataModel());
    expect(result.success).toBe(true);
  });

  it("should accept data model without optional schema", () => {
    const { schema, ...model } = createValidSolutionDataModel();
    const result = DataModelSchema.safeParse(model);
    expect(result.success).toBe(true);
  });

  it("should reject data model without name", () => {
    const { name, ...model } = createValidSolutionDataModel();
    const result = DataModelSchema.safeParse(model);
    expect(result.success).toBe(false);
  });

  it("should reject data model without description", () => {
    const { description, ...model } = createValidSolutionDataModel();
    const result = DataModelSchema.safeParse(model);
    expect(result.success).toBe(false);
  });
});

describe("SolutionFileSchema", () => {
  it("should validate a complete solution file", () => {
    const result = SolutionFileSchema.safeParse(createValidSolutionFile());
    expect(result.success).toBe(true);
  });

  it("should reject file without path", () => {
    const { path, ...file } = createValidSolutionFile();
    const result = SolutionFileSchema.safeParse(file);
    expect(result.success).toBe(false);
  });

  it("should reject file with invalid role", () => {
    const file = { ...createValidSolutionFile(), role: "invalid-role" };
    const result = SolutionFileSchema.safeParse(file);
    expect(result.success).toBe(false);
  });

  it("should reject file without content", () => {
    const { content, ...file } = createValidSolutionFile();
    const result = SolutionFileSchema.safeParse(file);
    expect(result.success).toBe(false);
  });

  it("should reject file without purpose", () => {
    const { purpose, ...file } = createValidSolutionFile();
    const result = SolutionFileSchema.safeParse(file);
    expect(result.success).toBe(false);
  });

  it("should reject file with purpose exceeding max length", () => {
    const file = { ...createValidSolutionFile(), purpose: "x".repeat(201) };
    const result = SolutionFileSchema.safeParse(file);
    expect(result.success).toBe(false);
  });

  it("should validate lineCount as positive integer", () => {
    const file = { ...createValidSolutionFile(), lineCount: 1 };
    const result = SolutionFileSchema.safeParse(file);
    expect(result.success).toBe(true);
  });

  it("should reject lineCount of 0", () => {
    const file = { ...createValidSolutionFile(), lineCount: 0 };
    const result = SolutionFileSchema.safeParse(file);
    expect(result.success).toBe(false);
  });

  it("should reject negative lineCount", () => {
    const file = { ...createValidSolutionFile(), lineCount: -1 };
    const result = SolutionFileSchema.safeParse(file);
    expect(result.success).toBe(false);
  });

  it("should reject non-integer lineCount", () => {
    const file = { ...createValidSolutionFile(), lineCount: 5.5 };
    const result = SolutionFileSchema.safeParse(file);
    expect(result.success).toBe(false);
  });
});

describe("ProblemDefinitionSchema (Solution)", () => {
  it("should validate a complete problem definition", () => {
    const result = ProblemDefinitionSchema.safeParse(
      createValidSolutionProblem(),
    );
    expect(result.success).toBe(true);
  });

  it("should reject problem without description", () => {
    const { description, ...problem } = createValidSolutionProblem();
    const result = ProblemDefinitionSchema.safeParse(problem);
    expect(result.success).toBe(false);
  });

  it("should reject problem with short description", () => {
    const problem = { ...createValidSolutionProblem(), description: "short" };
    const result = ProblemDefinitionSchema.safeParse(problem);
    expect(result.success).toBe(false);
  });

  it("should reject problem with description exceeding max", () => {
    const problem = {
      ...createValidSolutionProblem(),
      description: "x".repeat(501),
    };
    const result = ProblemDefinitionSchema.safeParse(problem);
    expect(result.success).toBe(false);
  });

  it("should reject problem with empty keywords", () => {
    const problem = { ...createValidSolutionProblem(), keywords: [] };
    const result = ProblemDefinitionSchema.safeParse(problem);
    expect(result.success).toBe(false);
  });

  it("should accept problem without optional errorPatterns", () => {
    const { errorPatterns, ...problem } = createValidSolutionProblem();
    const result = ProblemDefinitionSchema.safeParse(problem);
    expect(result.success).toBe(true);
  });

  it("should accept problem with empty errorPatterns", () => {
    const problem = { ...createValidSolutionProblem(), errorPatterns: [] };
    const result = ProblemDefinitionSchema.safeParse(problem);
    expect(result.success).toBe(true);
  });
});

describe("ImplementationSchema (Solution)", () => {
  it("should validate a complete implementation", () => {
    const result = ImplementationSchema.safeParse(
      createValidSolutionImplementation(),
    );
    expect(result.success).toBe(true);
  });

  it("should reject implementation with empty files", () => {
    const impl = { ...createValidSolutionImplementation(), files: [] };
    const result = ImplementationSchema.safeParse(impl);
    expect(result.success).toBe(false);
  });

  it("should accept implementation without optional dataModels", () => {
    const { dataModels, ...impl } = createValidSolutionImplementation();
    const result = ImplementationSchema.safeParse(impl);
    expect(result.success).toBe(true);
  });

  it("should accept implementation with empty dependencies", () => {
    const impl = { ...createValidSolutionImplementation(), dependencies: [] };
    const result = ImplementationSchema.safeParse(impl);
    expect(result.success).toBe(true);
  });

  it("should accept implementation with empty devDependencies", () => {
    const impl = {
      ...createValidSolutionImplementation(),
      devDependencies: [],
    };
    const result = ImplementationSchema.safeParse(impl);
    expect(result.success).toBe(true);
  });

  it("should accept implementation with empty envVars", () => {
    const impl = { ...createValidSolutionImplementation(), envVars: [] };
    const result = ImplementationSchema.safeParse(impl);
    expect(result.success).toBe(true);
  });

  it("should validate multiple files", () => {
    const impl = {
      ...createValidSolutionImplementation(),
      files: [
        createValidSolutionFile(),
        {
          path: "src/auth/session.ts",
          purpose: "Session management service",
          role: "service" as const,
          content: "export function createSession() {}",
          exports: ["createSession"],
          imports: [],
          lineCount: 1,
        },
      ],
    };
    const result = ImplementationSchema.safeParse(impl);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.files).toHaveLength(2);
    }
  });
});

describe("ArchitectureSchema (Solution)", () => {
  it("should validate a complete architecture", () => {
    const result = ArchitectureSchema.safeParse(
      createValidSolutionArchitecture(),
    );
    expect(result.success).toBe(true);
  });

  it("should reject architecture without entryPoints", () => {
    const { entryPoints, ...arch } = createValidSolutionArchitecture();
    const result = ArchitectureSchema.safeParse(arch);
    expect(result.success).toBe(false);
  });

  it("should reject architecture without dataFlow", () => {
    const { dataFlow, ...arch } = createValidSolutionArchitecture();
    const result = ArchitectureSchema.safeParse(arch);
    expect(result.success).toBe(false);
  });

  it("should reject architecture with dataFlow exceeding max", () => {
    const arch = {
      ...createValidSolutionArchitecture(),
      dataFlow: "x".repeat(1001),
    };
    const result = ArchitectureSchema.safeParse(arch);
    expect(result.success).toBe(false);
  });

  it("should reject architecture without keyDecisions", () => {
    const { keyDecisions, ...arch } = createValidSolutionArchitecture();
    const result = ArchitectureSchema.safeParse(arch);
    expect(result.success).toBe(false);
  });

  it("should accept architecture without optional diagram", () => {
    const { diagram, ...arch } = createValidSolutionArchitecture();
    const result = ArchitectureSchema.safeParse(arch);
    expect(result.success).toBe(true);
  });

  it("should accept architecture with empty keyDecisions", () => {
    const arch = { ...createValidSolutionArchitecture(), keyDecisions: [] };
    const result = ArchitectureSchema.safeParse(arch);
    expect(result.success).toBe(true);
  });
});

describe("SolutionPatternSchema", () => {
  it("should validate a complete solution pattern", () => {
    const result = SolutionPatternSchema.safeParse(
      createValidSolutionPattern(),
    );
    expect(result.success).toBe(true);
  });

  it("should reject solution pattern without id", () => {
    const { id, ...pattern } = createValidSolutionPattern();
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(false);
  });

  it("should reject solution pattern with invalid uuid", () => {
    const pattern = { ...createValidSolutionPattern(), id: "not-a-uuid" };
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(false);
  });

  it("should reject solution pattern without name", () => {
    const { name, ...pattern } = createValidSolutionPattern();
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(false);
  });

  it("should reject solution pattern with short name", () => {
    const pattern = { ...createValidSolutionPattern(), name: "ab" };
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(false);
  });

  it("should reject solution pattern with name exceeding max", () => {
    const pattern = { ...createValidSolutionPattern(), name: "x".repeat(101) };
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(false);
  });

  it("should reject solution pattern with invalid category", () => {
    const pattern = {
      ...createValidSolutionPattern(),
      category: "invalid-category",
    };
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(false);
  });

  it("should reject solution pattern without problem", () => {
    const { problem, ...pattern } = createValidSolutionPattern();
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(false);
  });

  it("should reject solution pattern without implementation", () => {
    const { implementation, ...pattern } = createValidSolutionPattern();
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(false);
  });

  it("should reject solution pattern without architecture", () => {
    const { architecture, ...pattern } = createValidSolutionPattern();
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(false);
  });

  it("should accept solution pattern without optional sourceProject", () => {
    const { sourceProject, ...pattern } = createValidSolutionPattern();
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(true);
  });

  it("should validate related patterns as uuid array", () => {
    const pattern = {
      ...createValidSolutionPattern(),
      relatedPatterns: [
        "550e8400-e29b-41d4-a716-446655440002",
        "550e8400-e29b-41d4-a716-446655440003",
      ],
    };
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(true);
  });

  it("should reject invalid uuid in relatedPatterns", () => {
    const pattern = {
      ...createValidSolutionPattern(),
      relatedPatterns: ["not-a-uuid"],
    };
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(false);
  });

  it("should validate deprecatedAt as ISO datetime", () => {
    const pattern = {
      ...createValidSolutionPattern(),
      deprecatedAt: "2024-06-01T00:00:00.000Z",
    };
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(true);
  });

  it("should accept solution pattern with all valid sources", () => {
    const sources = ["manual", "auto-heal", "verify-fix", "community"];
    for (const source of sources) {
      const pattern = { ...createValidSolutionPattern(), source };
      const result = SolutionPatternSchema.safeParse(pattern);
      expect(result.success).toBe(true);
    }
  });

  it("should validate isPrivate as boolean", () => {
    const patternPrivate = { ...createValidSolutionPattern(), isPrivate: true };
    const patternPublic = { ...createValidSolutionPattern(), isPrivate: false };
    expect(SolutionPatternSchema.safeParse(patternPrivate).success).toBe(true);
    expect(SolutionPatternSchema.safeParse(patternPublic).success).toBe(true);
  });

  it("should accept optional syncedAt datetime", () => {
    const pattern = {
      ...createValidSolutionPattern(),
      syncedAt: "2024-03-01T12:00:00.000Z",
    };
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(true);
  });

  it("should accept optional contributorId", () => {
    const pattern = {
      ...createValidSolutionPattern(),
      contributorId: "contributor-abc123",
    };
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(true);
  });

  it("should accept optional conflictVersion", () => {
    const pattern = {
      ...createValidSolutionPattern(),
      conflictVersion: 2,
    };
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(true);
  });

  it("should reject conflictVersion less than 1", () => {
    const pattern = {
      ...createValidSolutionPattern(),
      conflictVersion: 0,
    };
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(false);
  });

  it("should accept optional originalId as uuid", () => {
    const pattern = {
      ...createValidSolutionPattern(),
      originalId: "550e8400-e29b-41d4-a716-446655440099",
    };
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(true);
  });

  it("should reject invalid originalId", () => {
    const pattern = {
      ...createValidSolutionPattern(),
      originalId: "not-a-uuid",
    };
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(false);
  });

  it("should accept optional deprecationReason", () => {
    const pattern = {
      ...createValidSolutionPattern(),
      deprecatedAt: "2024-06-01T00:00:00.000Z",
      deprecationReason: "Replaced by new implementation",
    };
    const result = SolutionPatternSchema.safeParse(pattern);
    expect(result.success).toBe(true);
  });
});

describe("Solution Pattern Integration Tests", () => {
  it("should create and validate a complete authentication solution", () => {
    const authSolution: SolutionPattern = {
      id: crypto.randomUUID(),
      name: "JWT Authentication with Refresh Tokens",
      description:
        "Complete JWT auth implementation with access and refresh token rotation",
      category: "auth",
      tags: [
        { name: "jwt", category: "custom" },
        { name: "security", category: "custom" },
        { name: "typescript", category: "tool" },
      ],
      problem: {
        keywords: ["jwt", "authentication", "refresh-token", "security"],
        description:
          "Implement secure token-based authentication with automatic refresh capability",
        errorPatterns: ["Token expired", "Invalid token"],
      },
      implementation: {
        files: [
          {
            path: "src/auth/jwt.ts",
            purpose: "JWT token generation service",
            role: "service",
            content: `import jwt from 'jsonwebtoken';
export function generateTokens(userId: string) {
  const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET!, { expiresIn: '15m' });
  const refreshToken = jwt.sign({ userId }, process.env.REFRESH_SECRET!, { expiresIn: '7d' });
  return { accessToken, refreshToken };
}`,
            exports: ["generateTokens"],
            imports: ["jsonwebtoken"],
            lineCount: 7,
          },
        ],
        dependencies: [
          { name: "jsonwebtoken", version: "9.0.0", compatibleRange: "^9.0.0" },
        ],
        devDependencies: [
          {
            name: "@types/jsonwebtoken",
            version: "9.0.0",
            compatibleRange: "^9.0.0",
          },
        ],
        envVars: [
          {
            name: "JWT_SECRET",
            description: "Secret for access tokens",
            required: true,
            example: "your-secret-key",
          },
          {
            name: "REFRESH_SECRET",
            description: "Secret for refresh tokens",
            required: true,
            example: "refresh-secret",
          },
        ],
      },
      architecture: {
        entryPoints: ["src/auth/jwt.ts"],
        dataFlow:
          "Request → Verify Token → Controller → Response with new tokens",
        keyDecisions: [
          "Separate secrets for access and refresh tokens",
          "Short-lived access tokens",
        ],
      },
      compatibility: {
        framework: "express",
        frameworkVersion: "^4.18.0",
        runtime: "node",
        runtimeVersion: "^20.0.0",
        dependencies: [],
      },
      metrics: createDefaultMetrics(),
      relatedPatterns: [],
      source: "community",
      isPrivate: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = SolutionPatternSchema.safeParse(authSolution);
    expect(result.success).toBe(true);
  });

  it("should create and validate a database pattern with multiple files", () => {
    const dbPattern: SolutionPattern = {
      id: crypto.randomUUID(),
      name: "Prisma Repository Pattern",
      description: "Database access layer using Prisma with repository pattern",
      category: "database",
      tags: [
        { name: "prisma", category: "tool" },
        { name: "repository", category: "custom" },
      ],
      problem: {
        keywords: ["database", "prisma", "repository", "orm"],
        description:
          "Abstract database operations using repository pattern for clean architecture",
      },
      implementation: {
        files: [
          {
            path: "src/repositories/base.repository.ts",
            purpose: "Base repository interface",
            role: "model",
            content:
              "export abstract class BaseRepository<T> { abstract findById(id: string): Promise<T | null>; }",
            exports: ["BaseRepository"],
            imports: [],
            lineCount: 3,
          },
          {
            path: "src/repositories/user.repository.ts",
            purpose: "User repository implementation",
            role: "service",
            content:
              "export class UserRepository extends BaseRepository<User> { async findById(id: string) { return prisma.user.findUnique({ where: { id } }); } }",
            exports: ["UserRepository"],
            imports: ["@prisma/client"],
            lineCount: 5,
          },
        ],
        dependencies: [
          {
            name: "@prisma/client",
            version: "5.0.0",
            compatibleRange: "^5.0.0",
          },
        ],
        devDependencies: [
          { name: "prisma", version: "5.0.0", compatibleRange: "^5.0.0" },
        ],
        envVars: [],
        dataModels: [{ name: "User", description: "User entity model" }],
      },
      architecture: {
        entryPoints: ["src/repositories/user.repository.ts"],
        dataFlow: "Controller → Repository → Prisma → Database",
        keyDecisions: ["Abstract CRUD operations", "Type-safe queries"],
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
      source: "manual",
      isPrivate: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = SolutionPatternSchema.safeParse(dbPattern);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.implementation.files).toHaveLength(2);
      expect(result.data.implementation.dataModels).toHaveLength(1);
    }
  });

  it("should validate UI component solution pattern", () => {
    const uiPattern: SolutionPattern = {
      id: crypto.randomUUID(),
      name: "Accessible Modal Component",
      description:
        "ARIA-compliant modal dialog with focus trap for accessibility",
      category: "ui",
      tags: [
        { name: "react", category: "framework" },
        { name: "accessibility", category: "custom" },
      ],
      problem: {
        keywords: ["modal", "dialog", "accessibility", "focus-trap"],
        description:
          "Create accessible modal component with proper focus management and ARIA attributes",
      },
      implementation: {
        files: [
          {
            path: "src/components/Modal.tsx",
            purpose: "Accessible modal component",
            role: "component",
            content: `import { useEffect, useRef } from 'react';
export function Modal({ isOpen, onClose, children }) {
  const modalRef = useRef(null);
  useEffect(() => { if (isOpen) modalRef.current?.focus(); }, [isOpen]);
  return isOpen ? <div role="dialog" ref={modalRef}>{children}</div> : null;
}`,
            exports: ["Modal"],
            imports: ["react"],
            lineCount: 7,
          },
        ],
        dependencies: [],
        devDependencies: [],
        envVars: [],
      },
      architecture: {
        entryPoints: ["src/components/Modal.tsx"],
        dataFlow: "Parent → Modal → Focus trap → Child content",
        keyDecisions: ["Use ref for focus management", "ARIA role attribute"],
      },
      compatibility: {
        framework: "react",
        frameworkVersion: "^18.0.0",
        runtime: "browser",
        runtimeVersion: "*",
        dependencies: [],
      },
      metrics: createDefaultMetrics(),
      relatedPatterns: [],
      source: "auto-heal",
      isPrivate: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = SolutionPatternSchema.safeParse(uiPattern);
    expect(result.success).toBe(true);
  });

  it("should validate solution pattern with all sync-related fields", () => {
    const syncPattern: SolutionPattern = {
      ...createValidSolutionPattern(),
      syncedAt: new Date().toISOString(),
      contributorId: "contrib-123",
      conflictVersion: 3,
      originalId: "550e8400-e29b-41d4-a716-446655440099",
    };

    const result = SolutionPatternSchema.safeParse(syncPattern);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.syncedAt).toBeDefined();
      expect(result.data.contributorId).toBe("contrib-123");
      expect(result.data.conflictVersion).toBe(3);
      expect(result.data.originalId).toBe(
        "550e8400-e29b-41d4-a716-446655440099",
      );
    }
  });

  it("should validate deprecated solution pattern", () => {
    const deprecatedPattern: SolutionPattern = {
      ...createValidSolutionPattern(),
      deprecatedAt: new Date().toISOString(),
      deprecationReason:
        "Replaced by improved implementation with better performance",
    };

    const result = SolutionPatternSchema.safeParse(deprecatedPattern);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.deprecatedAt).toBeDefined();
      expect(result.data.deprecationReason).toContain("Replaced");
    }
  });
});
