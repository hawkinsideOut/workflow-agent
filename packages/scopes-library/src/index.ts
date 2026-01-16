import type { Scope } from "workflow-agent-cli/config";

export const scopes: Scope[] = [
  {
    name: "types",
    description: "TypeScript types, interfaces, type definitions",
    emoji: "📘",
    category: "features",
  },
  {
    name: "ui",
    description: "UI components, component library, Storybook stories",
    emoji: "🎨",
    category: "features",
  },
  {
    name: "core",
    description: "Core library functionality, main API surface",
    emoji: "🔧",
    category: "features",
  },
  {
    name: "bundler",
    description: "Build configuration, bundling, tooling setup",
    emoji: "🔨",
    category: "infrastructure",
  },
  {
    name: "documentation",
    description: "Documentation, API docs, guides, examples",
    emoji: "📚",
    category: "documentation",
  },
  {
    name: "testing",
    description: "Test suites, test utilities, testing infrastructure",
    emoji: "🧪",
    category: "testing",
  },
  {
    name: "examples",
    description: "Example code, demo applications, usage samples",
    emoji: "💡",
    category: "documentation",
  },
  {
    name: "packages",
    description: "Dependency updates, peer dependencies, version bumps",
    emoji: "📦",
    category: "infrastructure",
  },
  {
    name: "perf",
    description: "Performance improvements, optimizations, benchmarks",
    emoji: "⚡",
    category: "performance",
  },
  {
    name: "api",
    description: "Public API changes, breaking changes, exports",
    emoji: "🔌",
    category: "features",
  },
];

export const preset = {
  name: "Library/Package",
  description: "Scope configuration for component libraries and npm packages",
  scopes,
  version: "1.0.0",
};

export default preset;
