# @workflow/agent

> A self-evolving workflow management system for AI agent development

[![npm version](https://badge.fury.io/js/@workflow%2Fagent.svg)](https://www.npmjs.com/package/@workflow/agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code Extension](https://img.shields.io/visual-studio-marketplace/v/workflow-agent.workflow-agent)](https://marketplace.visualstudio.com/items?itemName=workflow-agent.workflow-agent)

**@workflow/agent** is a standalone, framework-agnostic tool that brings structure, consistency, and AI-powered automation to your development workflow. Install it in ANY project (Next.js, React, Vue, Rails, Django, Go, etc.) to enforce branch naming conventions, scope-based commits, and automated improvement suggestions.

## ✨ Features

- 🎯 **Scope-based workflow** - Organize commits, branches, and PRs with customizable scopes
- 🤖 **AI-powered suggestions** - Proactive recommendations to improve your workflow
- 🔄 **Self-improving** - Learn from usage patterns and automatically suggest optimizations
- 🌐 **Framework agnostic** - Works with any tech stack or project structure
- 🛠️ **IDE integrations** - VS Code, JetBrains IDEs, and Vim/Neovim support
- 👥 **Team sync** - Keep workflow configurations synchronized across teams
- 📊 **Analytics** - Track adoption and improvement metrics (opt-in)
- 🌍 **Multilingual** - Full support for ES, FR, DE, JP, ZH-CN
- 📦 **Preset libraries** - Ready-to-use scope configurations for SaaS, APIs, libraries, e-commerce, CMS

## 🚀 Quick Start

Install workflow-agent in any project in 3 commands:

```bash
# 1. Install the CLI
npm install -D @workflow/agent

# 2. Initialize workflow in your project (auto-detects patterns)
npx @workflow/agent init --migrate

# 3. Start using validated branches and commits
npx @workflow/agent validate branch
```

## 📦 Tech Stack Agnostic

Works with **any** framework or language:

| Framework/Language | Adapter | Status |
|--------------------|---------|--------|
| Next.js (App Router) | `nextjs-app-router` | ✅ |
| Next.js (Pages) | `nextjs-pages` | ✅ |
| Vite + React | `vite-react` | ✅ |
| Remix | `remix` | ✅ |
| Astro | `astro` | ✅ |
| SvelteKit | `sveltekit` | ✅ |
| Nuxt | `nuxt` | ✅ |
| Ruby on Rails | `rails` | ✅ |
| Django | `django` | ✅ |
| Laravel | `laravel` | ✅ |
| Go (std layout) | `go-standard` | ✅ |
| Generic | `generic` | ✅ |

## 🎨 IDE Support

| IDE | Extension | Status |
|-----|-----------|--------|
| VS Code | [Workflow Agent](https://marketplace.visualstudio.com/items?itemName=workflow-agent.workflow-agent) | ✅ |
| JetBrains IDEs | [Workflow Agent](https://plugins.jetbrains.com/plugin/workflow-agent) | ✅ |
| Vim/Neovim | [workflow-agent.nvim](https://github.com/workflow-agent/workflow-agent.nvim) | ✅ |

## 🔄 Self-Improvement System

Workflow Agent learns from your usage and **automatically suggests improvements**:

```bash
# Submit improvement suggestions
workflow suggest "Add alias for commonly mistyped scope"

# View pending suggestions
workflow suggestions list

# Apply suggested improvements
workflow suggestions apply <id>

# Run health check with optimization suggestions
workflow doctor
```

Every improvement is tracked, prioritized by community voting, and automatically integrated in future releases.

## 📚 Documentation

Visit [workflow.dev](https://workflow.dev) for comprehensive documentation:

- [Getting Started Guide](https://workflow.dev/docs/quick-start)
- [Concepts & Best Practices](https://workflow.dev/docs/concepts)
- [Preset Selection Guide](https://workflow.dev/docs/presets)
- [IDE Setup Instructions](https://workflow.dev/docs/ide-setup)
- [Team Workflows](https://workflow.dev/docs/team-workflows)
- [API Reference](https://workflow.dev/docs/api)

## 🤝 Community

- [Discord](https://discord.gg/workflow-agent)
- [GitHub Discussions](https://github.com/workflow-agent/workflow-agent/discussions)
- [Marketplace](https://marketplace.workflow.dev) - Share presets, guidelines, and improvements

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🌟 Reference Implementation

This tool was extracted from [ProjectHub](https://github.com/hawkinsideOut/projecthub) - a comprehensive SaaS project management application that uses @workflow/agent for its own development.
