import type { Scope } from "workflow-agent-cli/config";

export const scopes: Scope[] = [
  {
    name: "auth",
    description: "Authentication, authorization, sessions, roles, permissions",
    emoji: "🔐",
    category: "auth",
  },
  {
    name: "tasks",
    description: "Task CRUD operations, task details, assignments, task types",
    emoji: "📋",
    category: "features",
  },
  {
    name: "boards",
    description:
      "Kanban boards, columns, board views, drag-and-drop functionality",
    emoji: "📋",
    category: "features",
  },
  {
    name: "sprints",
    description: "Sprint management, sprint planning, sprint completion",
    emoji: "📋",
    category: "features",
  },
  {
    name: "epics",
    description: "Epic management, epic hierarchy, epic linking",
    emoji: "📋",
    category: "features",
  },
  {
    name: "comments",
    description: "Comments, @mentions, activity feed",
    emoji: "💬",
    category: "features",
  },
  {
    name: "notifications",
    description: "Notification system, real-time updates, toasts",
    emoji: "💬",
    category: "features",
  },
  {
    name: "settings",
    description: "User preferences, organization settings, configuration",
    emoji: "⚙️",
    category: "features",
  },
  {
    name: "admin",
    description: "Super admin features, organization admin, user management",
    emoji: "🔐",
    category: "auth",
  },
  {
    name: "ui",
    description: "General UI components, styling, themes, responsive design",
    emoji: "🎨",
    category: "features",
  },
  {
    name: "api",
    description: "Server actions, API patterns, data fetching",
    emoji: "🔧",
    category: "infrastructure",
  },
  {
    name: "db",
    description: "Database migrations, schema changes, RLS policies",
    emoji: "🔧",
    category: "infrastructure",
  },
  {
    name: "deps",
    description: "Dependency updates, package management",
    emoji: "🔧",
    category: "infrastructure",
  },
  {
    name: "docs",
    description: "Documentation changes, guides, README updates",
    emoji: "📚",
    category: "documentation",
  },
  {
    name: "test",
    description: "Test additions, test fixes, test infrastructure",
    emoji: "🧪",
    category: "testing",
  },
  {
    name: "perf",
    description: "Performance improvements, optimizations",
    emoji: "⚡",
    category: "performance",
  },
  {
    name: "infra",
    description: "Build configuration, CI/CD, deployment config",
    emoji: "🔧",
    category: "infrastructure",
  },
];

export const preset = {
  name: "SaaS Application",
  description:
    "Comprehensive scope configuration for SaaS applications with user management, project features, and infrastructure",
  scopes,
  version: "1.0.0",
};

export default preset;
