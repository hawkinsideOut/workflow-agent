# Project Template README

> **Purpose**: This document provides guidance for using the ProjectHub guidelines as a template for new projects. It explains which files to copy, what to customize, and how to adapt the patterns to different tech stacks.

---

## Table of Contents

1. [Overview](#overview)
2. [Files to Copy](#files-to-copy)
3. [Customization Guide](#customization-guide)
4. [Tech Stack Adaptations](#tech-stack-adaptations)
5. [Checklist for New Projects](#checklist-for-new-projects)

---

## Overview

The ProjectHub guidelines provide a comprehensive framework for:

- **Agent-assisted development** - Rules for AI coding assistants
- **Code organization** - Single source of truth patterns
- **Quality assurance** - Testing and review strategies
- **Workflow standardization** - Branching and deployment

These patterns are designed to be **tech-stack agnostic** at their core, with specific sections that need customization for each project.

---

## Files to Copy

### Required Files (Copy These)

| File                                       | Purpose          | Customization Level        |
| ------------------------------------------ | ---------------- | -------------------------- |
| `guidelines/AGENT_EDITING_INSTRUCTIONS.md` | AI editing rules | Medium - Update file paths |
| `guidelines/BRANCHING_STRATEGY.md`         | Git workflow     | Low - Update scopes list   |
| `guidelines/TESTING_STRATEGY.md`           | Testing patterns | High - Update tooling      |
| `.github/PULL_REQUEST_TEMPLATE.md`         | PR template      | Low - Update scopes list   |

### Recommended Files (Create Fresh)

| File                                   | Purpose         | Why Create Fresh         |
| -------------------------------------- | --------------- | ------------------------ |
| `guidelines/SINGLE_SOURCE_OF_TRUTH.md` | File locations  | Unique to each project   |
| `guidelines/LIBRARY_INVENTORY.md`      | Dependencies    | Different for each stack |
| `guidelines/DEPLOYMENT_STRATEGY.md`    | Deployment flow | Platform-specific        |

### Directory Structure

```
your-project/
├── .github/
│   └── PULL_REQUEST_TEMPLATE.md    # Copy from template
├── guidelines/
│   ├── AGENT_EDITING_INSTRUCTIONS.md   # Copy + customize
│   ├── BRANCHING_STRATEGY.md           # Copy + update scopes
│   ├── TESTING_STRATEGY.md             # Copy + update tools
│   ├── SINGLE_SOURCE_OF_TRUTH.md       # Create fresh
│   ├── LIBRARY_INVENTORY.md            # Create fresh
│   ├── DEPLOYMENT_STRATEGY.md          # Create fresh
│   └── PROJECT_TEMPLATE_README.md      # Optional meta-doc
└── ...
```

---

## Customization Guide

### AGENT_EDITING_INSTRUCTIONS.md

#### Sections to Keep As-Is

- File analysis checklist format
- Library usage policy
- PR workflow structure
- Quality standards

#### Sections to Customize

| Section                  | What to Change                                   |
| ------------------------ | ------------------------------------------------ |
| Required File Checklists | Update file paths for your project structure     |
| Import Ordering          | Adjust for your project's conventions            |
| Architecture Rules       | Update for your framework (not Next.js specific) |
| Data Flow                | Document your auth/authorization patterns        |

#### Example Adaptations

**For a Python/FastAPI Project:**

```markdown
## Required Files by Change Type

### Adding API Endpoint

- [ ] Endpoint in `app/api/routes/`
- [ ] Schema in `app/schemas/`
- [ ] Tests in `tests/api/`
- [ ] Types in `app/models/`
```

**For a React SPA (Vite):**

```markdown
## Required Files by Change Type

### Adding Feature

- [ ] Component in `src/components/`
- [ ] Hook in `src/hooks/` (if stateful)
- [ ] Types in `src/types/`
- [ ] Tests in `src/__tests__/`
```

### BRANCHING_STRATEGY.md

#### Sections to Keep As-Is

- Branch naming format
- PR title format (conventional commits)
- Workflow steps
- Merge requirements structure

#### Sections to Customize

| Section             | What to Change                           |
| ------------------- | ---------------------------------------- |
| Allowed Scopes      | Define scopes for your project's domains |
| Review Requirements | Adjust for your team size                |
| Hotfix Workflow     | Update deployment references             |

#### Defining Scopes

Choose scopes that match your project's domains:

**E-commerce Example:**

```markdown
| Scope      | Description                  |
| ---------- | ---------------------------- |
| `cart`     | Shopping cart functionality  |
| `checkout` | Payment and order processing |
| `products` | Product catalog, search      |
| `users`    | User accounts, profiles      |
| `orders`   | Order management             |
| `admin`    | Admin dashboard              |
```

**SaaS Example:**

```markdown
| Scope          | Description              |
| -------------- | ------------------------ |
| `billing`      | Subscriptions, payments  |
| `dashboard`    | Main dashboard           |
| `reports`      | Analytics and reporting  |
| `integrations` | Third-party integrations |
| `teams`        | Team management          |
| `settings`     | Configuration            |
```

### TESTING_STRATEGY.md

#### Sections to Keep As-Is

- Testing pyramid concept
- Coverage requirements
- Pre-merge checklist structure

#### Sections to Customize

| Section             | What to Change                             |
| ------------------- | ------------------------------------------ |
| Test Tooling        | Update for your stack (Jest, pytest, etc.) |
| Test Patterns       | Update examples for your framework         |
| E2E Configuration   | Update for your E2E tool                   |
| Test Infrastructure | Update setup files                         |

#### Tooling Adaptations

**For React + Jest:**

```markdown
## Unit Testing with Jest

### Configuration

- Config: `jest.config.js`
- Setup: `src/setupTests.ts`
- Run: `npm test`
```

**For Python + pytest:**

```markdown
## Unit Testing with pytest

### Configuration

- Config: `pyproject.toml` or `pytest.ini`
- Fixtures: `tests/conftest.py`
- Run: `pytest`
```

### PULL_REQUEST_TEMPLATE.md

#### Sections to Keep As-Is

- Type of Change checkboxes
- Quality Checklist
- Breaking Changes section
- New Dependencies section

#### Sections to Customize

| Section                 | What to Change              |
| ----------------------- | --------------------------- |
| Scope checkboxes        | Update to match your scopes |
| Files Changed Checklist | Update file paths           |
| Testing Performed       | Update test commands        |

---

## Tech Stack Adaptations

### Next.js → Other React Frameworks

| Concept        | Next.js        | Vite/CRA      | Remix              |
| -------------- | -------------- | ------------- | ------------------ |
| Server Actions | `app/actions/` | N/A (use API) | `app/routes/*.tsx` |
| API Routes     | `app/api/`     | External API  | Loaders/Actions    |
| SSR            | Automatic      | Manual        | Automatic          |
| File routing   | `app/`         | React Router  | `app/routes/`      |

### React → Vue/Svelte/Angular

| Concept    | React           | Vue            | Svelte    | Angular         |
| ---------- | --------------- | -------------- | --------- | --------------- |
| Components | `.tsx`          | `.vue`         | `.svelte` | `.component.ts` |
| State      | Context/Zustand | Pinia          | Stores    | Services        |
| Hooks      | `hooks/`        | `composables/` | `stores/` | `services/`     |
| Testing    | Vitest/RTL      | Vitest/VTU     | Vitest    | Karma/Jest      |

### Supabase → Other Backends

| Concept    | Supabase               | Firebase        | Prisma + PostgreSQL  |
| ---------- | ---------------------- | --------------- | -------------------- |
| Client     | `lib/supabase/`        | `lib/firebase/` | `lib/prisma/`        |
| Auth       | Supabase Auth          | Firebase Auth   | NextAuth/Clerk       |
| Types      | Generated              | N/A             | Generated            |
| Migrations | `supabase/migrations/` | N/A             | `prisma/migrations/` |

### Vercel → Other Platforms

| Concept        | Vercel    | Netlify   | Railway   | AWS         |
| -------------- | --------- | --------- | --------- | ----------- |
| Preview URLs   | Automatic | Automatic | Manual    | Manual      |
| Env Variables  | Dashboard | Dashboard | Dashboard | SSM         |
| Rollback       | Dashboard | Dashboard | CLI       | CLI         |
| Edge Functions | Yes       | Yes       | No        | Lambda@Edge |

---

## Checklist for New Projects

### Initial Setup

- [ ] Create `guidelines/` directory
- [ ] Copy `AGENT_EDITING_INSTRUCTIONS.md` and customize
- [ ] Copy `BRANCHING_STRATEGY.md` and update scopes
- [ ] Copy `TESTING_STRATEGY.md` and update tooling
- [ ] Copy `.github/PULL_REQUEST_TEMPLATE.md` and update scopes

### Create Fresh Documents

- [ ] Create `SINGLE_SOURCE_OF_TRUTH.md` with your file locations
- [ ] Create `LIBRARY_INVENTORY.md` with your dependencies
- [ ] Create `DEPLOYMENT_STRATEGY.md` for your platform

### Validation

- [ ] All file paths in guidelines match actual project structure
- [ ] Scopes list covers all major areas of the project
- [ ] Testing commands in guidelines actually work
- [ ] PR template scopes match branching strategy scopes

### Team Onboarding

- [ ] Team has reviewed all guidelines
- [ ] Guidelines are linked from main README
- [ ] First few PRs use the new template
- [ ] Iterate based on team feedback

---

## Template Maintenance

### When to Update Guidelines

- Adding major new feature area → Add new scope
- Changing tech stack → Update tooling sections
- New team members have questions → Clarify documentation
- Recurring review comments → Add to checklist

### Version Control

Consider versioning your guidelines:

```markdown
<!-- At top of each file -->

> **Version**: 1.0.0  
> **Last Updated**: 2026-01-08  
> **Changelog**: See bottom of document
```

---

## Quick Copy Commands

```bash
# Create guidelines directory
mkdir -p guidelines

# Copy core files (adjust source path)
cp ~/templates/projecthub/guidelines/AGENT_EDITING_INSTRUCTIONS.md guidelines/
cp ~/templates/projecthub/guidelines/BRANCHING_STRATEGY.md guidelines/
cp ~/templates/projecthub/guidelines/TESTING_STRATEGY.md guidelines/
cp ~/templates/projecthub/.github/PULL_REQUEST_TEMPLATE.md .github/

# Create fresh files
touch guidelines/SINGLE_SOURCE_OF_TRUTH.md
touch guidelines/LIBRARY_INVENTORY.md
touch guidelines/DEPLOYMENT_STRATEGY.md
```

---

## Related Documents

- [AGENT_EDITING_INSTRUCTIONS.md](AGENT_EDITING_INSTRUCTIONS.md) - Core editing rules
- [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) - Git workflow
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing patterns
- [SINGLE_SOURCE_OF_TRUTH.md](SINGLE_SOURCE_OF_TRUTH.md) - File locations
- [LIBRARY_INVENTORY.md](LIBRARY_INVENTORY.md) - Dependencies
- [DEPLOYMENT_STRATEGY.md](DEPLOYMENT_STRATEGY.md) - Deployment flow
