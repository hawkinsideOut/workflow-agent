export {
  Suggestion,
  TrustScore,
  ModerationRule,
  SuggestionSchema,
  TrustScoreSchema,
  ModerationRuleSchema,
  defaultModerationRules,
} from "./schema.js";

export {
  SuggestionStore,
  FileSystemStore,
  TrustScoreManager,
  Moderator,
} from "./moderator.js";

export { ImprovementTracker, createTracker } from "./tracker.js";

// Agent Learning System - Pattern Schemas
export {
  // Constants
  DEPRECATION_THRESHOLD_DAYS,
  PATTERNS_DIR,
  CONTRIBUTOR_ID_FILE,
  TELEMETRY_BATCH_SIZE,
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
  // Utility Functions
  isPatternDeprecated,
  generatePatternHash,
  createDefaultMetrics,
  updateMetrics,
  // Types
  type DependencyVersion,
  type Compatibility,
  type PatternTag,
  type SolutionStep,
  type PatternMetrics,
  type PatternTrigger,
  type PatternSolution,
  type FixPattern,
  type Stack,
  type DirectoryEntry,
  type KeyFile,
  type Structure,
  type SetupStep,
  type ConfigEntry,
  type Setup,
  type Blueprint,
  type TelemetryEvent,
  type FixCategory,
  type SolutionType,
  type StepAction,
  type PatternSource,
  type Language,
  type PackageManager,
  type TelemetryEventType,
  type PatternType,
  // Solution Pattern Types
  type SolutionPattern,
  type SolutionFile,
  type SolutionCategory,
  type FileRole,
  type ProblemDefinition,
  type Implementation,
  type Architecture,
  type EnvVar,
  type DataModel,
} from "./patterns-schema.js";

// Agent Learning System - Pattern Store
export {
  PatternStore,
  createPatternStore,
  type PatternQuery,
  type SolutionQuery,
  type PatternResult,
  type ConflictResult,
  type PatternStats,
  type PatternValidationError,
} from "./pattern-store.js";

// Agent Learning System - Contributor ID Management
export {
  ContributorManager,
  createContributorManager,
  type ContributorConfig,
  type ContributorResult,
} from "./contributor.js";

// Agent Learning System - Data Anonymization
export {
  PatternAnonymizer,
  createAnonymizer,
  anonymizeFixPattern,
  anonymizeBlueprint,
  DEFAULT_ANONYMIZATION_OPTIONS,
  type AnonymizationOptions,
  type AnonymizationResult,
} from "./anonymizer.js";

// Agent Learning System - Telemetry Collection
export {
  TelemetryCollector,
  createTelemetryCollector,
  createMockSender,
  type TelemetryQueue,
  type TelemetryResult,
  type TelemetrySender,
} from "./telemetry.js";

// Agent Learning System - Code Analyzer
export {
  CodeAnalyzer,
  createCodeAnalyzer,
  DEFAULT_ANALYZER_OPTIONS,
  type AnalyzerOptions,
  type FileAnalysis,
  type SolutionAnalysis,
  type ArchitectureAnalysis,
} from "./code-analyzer.js";
