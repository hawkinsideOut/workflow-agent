# Deployment Strategy

> **Purpose**: This document defines the deployment workflow, environment management, database migration strategy, and rollback procedures for ProjectHub.

---

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Environments](#environments)
3. [Environment Variables](#environment-variables)
4. [Deployment Workflow](#deployment-workflow)
5. [Database Migrations](#database-migrations)
6. [Preview Deployments](#preview-deployments)
7. [Production Deployment](#production-deployment)
8. [Rollback Procedures](#rollback-procedures)
9. [Monitoring](#monitoring)

---

## Deployment Overview

ProjectHub uses **Vercel** for deployment with the following architecture:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Git Push      │────▶│  Vercel Build    │────▶│  Deployment     │
│   (GitHub)      │     │  (Next.js)       │     │  (Edge Network) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                           │
                                                           ▼
                                                 ┌─────────────────┐
                                                 │   Supabase      │
                                                 │   (PostgreSQL)  │
                                                 └─────────────────┘
```

### Key Components

| Component      | Platform      | Purpose                                     |
| -------------- | ------------- | ------------------------------------------- |
| Frontend + API | Vercel        | Next.js app, server actions, edge functions |
| Database       | Supabase      | PostgreSQL, RLS, real-time subscriptions    |
| Auth           | Supabase Auth | Session management, OAuth providers         |
| CDN            | Vercel Edge   | Static assets, caching                      |

---

## Environments

### Environment Types

| Environment | Branch           | Purpose              | URL Pattern                    |
| ----------- | ---------------- | -------------------- | ------------------------------ |
| Production  | `main`           | Live application     | `projecthub.vercel.app`        |
| Preview     | Feature branches | PR previews, testing | `projecthub-<hash>.vercel.app` |
| Local       | N/A              | Development          | `localhost:3000`               |

### Supabase Projects

| Environment | Supabase Project     | Purpose                |
| ----------- | -------------------- | ---------------------- |
| Production  | `projecthub-prod`    | Live data              |
| Staging     | `projecthub-staging` | Pre-production testing |
| Local       | Local Docker         | Development            |

---

## Environment Variables

### Required Variables

| Variable                        | Description              | Source                              |
| ------------------------------- | ------------------------ | ----------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase project URL     | Supabase Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key | Supabase Dashboard → Settings → API |

### Optional Variables

| Variable                    | Description                    | Default                   |
| --------------------------- | ------------------------------ | ------------------------- |
| `NEXT_PUBLIC_APP_URL`       | Application URL                | Auto-detected by Vercel   |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side Supabase admin key | Only for admin operations |

### Secret Management

1. **Never commit secrets** to the repository
2. **Use Vercel environment variables** for all secrets
3. **Scope secrets by environment**:
   - Production: Only production values
   - Preview: Staging or development values
   - Development: Local `.env.local` file

### Setting Environment Variables

```bash
# Via Vercel CLI
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_URL preview

# Or via Vercel Dashboard
# Project → Settings → Environment Variables
```

---

## Deployment Workflow

### Standard Flow (Feature Branch)

```
1. Developer creates branch
   └── feature/tasks/add-reminder

2. Developer pushes changes
   └── git push origin feature/tasks/add-reminder

3. Vercel creates preview deployment
   └── https://projecthub-abc123.vercel.app

4. Developer creates PR
   └── Title: feat(tasks): add reminder functionality

5. Automated checks run
   ├── Vercel build (Next.js compile)
   ├── GitHub Actions (if configured)
   └── Preview URL available

6. Review and approval
   └── Code review, manual testing on preview

7. Merge to main
   └── Squash and merge

8. Production deployment
   └── Automatic on merge to main
```

### Deployment Triggers

| Trigger                | Environment | Automatic    |
| ---------------------- | ----------- | ------------ |
| Push to feature branch | Preview     | ✅ Yes       |
| PR created/updated     | Preview     | ✅ Yes       |
| Merge to `main`        | Production  | ✅ Yes       |
| Manual via CLI         | Any         | ✅ On-demand |

---

## Database Migrations

### Migration File Location

```
supabase/
└── migrations/
    ├── 001_initial_schema.sql
    ├── 002_add_sprints.sql
    └── 003_add_notifications.sql
```

### Creating Migrations

```bash
# Create new migration file
touch supabase/migrations/$(date +%Y%m%d%H%M%S)_description.sql

# Or using Supabase CLI
supabase migration new add_feature_table
```

### Migration File Format

```sql
-- supabase/migrations/20260108120000_add_due_date_reminders.sql

-- Description: Add due date reminder functionality
-- Author: Developer Name
-- Date: 2026-01-08

-- Up Migration
CREATE TABLE IF NOT EXISTS task_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    remind_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE task_reminders ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their task reminders"
ON task_reminders
FOR ALL
USING (
    task_id IN (
        SELECT id FROM tasks WHERE assignee = auth.uid()
    )
);

-- ============================================
-- ROLLBACK SQL (Keep at bottom of file)
-- ============================================
-- DROP POLICY IF EXISTS "Users can manage their task reminders" ON task_reminders;
-- DROP TABLE IF EXISTS task_reminders;
```

### Running Migrations

#### Local Development

```bash
# Start local Supabase
supabase start

# Run pending migrations
supabase db push

# Reset database (warning: destroys data)
supabase db reset
```

#### Staging/Production

```bash
# Link to Supabase project
supabase link --project-ref your-project-ref

# Push migrations to remote
supabase db push

# Or run manually in SQL Editor (Supabase Dashboard)
```

### Migration Checklist

Before deploying a migration:

- [ ] **Test locally** with `supabase db push`
- [ ] **Include rollback SQL** in migration file
- [ ] **Update types** - regenerate `types/supabase.ts`
- [ ] **Check RLS policies** - ensure security
- [ ] **Test with sample data** - verify queries work
- [ ] **Document breaking changes** - if any

### Dual-Database Migration (REQUIRED)

> **⚠️ MANDATORY**: All migrations MUST be run on both dev and prod databases.

**Preferred Method (Automated):**

```bash
# Runs dev first, then prod (stops on dev failure)
./scripts/db.sh migrate-both
```

**Manual Method (Step-by-Step):**

```bash
# Step 1: Run on DEV
./scripts/db.sh link dev
./scripts/db.sh migrate
./scripts/db.sh status   # ✓ Verify migration applied

# Step 2: Run on PROD (only if dev succeeded)
./scripts/db.sh link prod
./scripts/db.sh migrate
./scripts/db.sh status   # ✓ Verify migration applied
```

**Migration Execution Checklist:**

- [ ] DEV migration executed successfully
- [ ] DEV migration status verified (`./scripts/db.sh status`)
- [ ] PROD migration executed successfully
- [ ] PROD migration status verified (`./scripts/db.sh status`)

---

## Preview Deployments

### Automatic Preview URLs

Every PR gets an automatic preview deployment:

```
https://projecthub-<hash>-<team>.vercel.app
```

### Preview Environment Configuration

Preview deployments use:

- **Preview environment variables** (from Vercel)
- **Staging Supabase project** (recommended) OR
- **Production Supabase** with read-only access

### Testing on Preview

1. Click preview URL in PR
2. Test the specific feature
3. Verify no regressions
4. Check mobile responsiveness
5. Test authentication flow

### Preview Deployment Limitations

- Preview deployments expire after inactivity
- Database changes require separate staging environment
- Real-time features may behave differently

---

## Production Deployment

### Pre-Deployment Checklist

Before merging to `main`:

- [ ] All tests pass (`pnpm test`)
- [ ] TypeScript compiles (`pnpm typecheck`)
- [ ] Linting passes (`pnpm lint`)
- [ ] PR approved by required reviewers
- [ ] Preview deployment tested
- [ ] Database migrations tested (if any)
- [ ] Environment variables set in Vercel
- [ ] No breaking changes (or documented)

### Deployment Process

```bash
# Automatic: Just merge PR to main
# Vercel automatically deploys on merge

# Manual: Using Vercel CLI
vercel --prod

# Manual: Using GitHub
# 1. Go to Actions tab
# 2. Run "Deploy to Production" workflow
```

### Post-Deployment Verification

After deployment:

- [ ] Verify production URL is accessible
- [ ] Test critical paths (login, create task, etc.)
- [ ] Check Vercel function logs for errors
- [ ] Monitor Supabase dashboard for issues
- [ ] Verify real-time subscriptions work

---

## Rollback Procedures

### When to Rollback

- Critical bug affecting all users
- Security vulnerability discovered
- Database corruption
- Performance degradation

### Application Rollback (Vercel)

#### Via Dashboard

1. Go to Vercel Dashboard → Project → Deployments
2. Find the last working deployment
3. Click "..." menu → "Promote to Production"

#### Via CLI

```bash
# List recent deployments
vercel ls

# Rollback to specific deployment
vercel rollback <deployment-url>
```

### Database Rollback

#### If Migration Included Rollback SQL

```sql
-- Run the rollback SQL from the migration file
-- Usually commented at the bottom

DROP POLICY IF EXISTS "Users can manage their task reminders" ON task_reminders;
DROP TABLE IF EXISTS task_reminders;
```

#### If No Rollback SQL (Emergency)

1. **Restore from backup** (Supabase Dashboard → Settings → Backups)
2. Or **manually reverse changes** using SQL Editor

### Rollback Checklist

- [ ] Identify the issue and scope
- [ ] Notify team of rollback
- [ ] Execute rollback (app and/or database)
- [ ] Verify rollback successful
- [ ] Document what went wrong
- [ ] Create fix and re-deploy

---

## Monitoring

### Vercel Monitoring

| Metric            | Location         | Action Threshold |
| ----------------- | ---------------- | ---------------- |
| Build Time        | Deployments tab  | > 5 minutes      |
| Function Duration | Functions tab    | > 10 seconds     |
| Function Errors   | Functions → Logs | Any error        |
| Edge Latency      | Analytics        | > 500ms          |

### Supabase Monitoring

| Metric             | Location              | Action Threshold |
| ------------------ | --------------------- | ---------------- |
| Database Size      | Settings → Billing    | 80% of limit     |
| Active Connections | Database → Roles      | 80% of limit     |
| API Requests       | Settings → Billing    | Unusual spikes   |
| Auth Events        | Authentication → Logs | Failed attempts  |

### Recommended Integrations

| Service          | Purpose                       |
| ---------------- | ----------------------------- |
| Sentry           | Error tracking, stack traces  |
| Vercel Analytics | Web vitals, performance       |
| Supabase Logs    | Database queries, auth events |

### Setting Up Error Alerts

```bash
# Add Sentry (optional)
pnpm add @sentry/nextjs

# Configure in sentry.client.config.ts
# Configure in sentry.server.config.ts
# Add SENTRY_DSN to environment variables
```

---

## Quick Reference

### Deploy Commands

```bash
# Local development
pnpm dev

# Build locally
pnpm build

# Deploy to preview
vercel

# Deploy to production
vercel --prod

# Check deployment status
vercel ls
```

### Migration Commands

```bash
# Start local Supabase
supabase start

# Run migrations locally
supabase db push

# Generate types
supabase gen types typescript --local > types/supabase.ts

# Link to remote project
supabase link --project-ref <ref>

# Push migrations to remote
supabase db push
```

### Rollback Commands

```bash
# Rollback to previous deployment
vercel rollback

# Rollback to specific deployment
vercel rollback <deployment-url>
```

---

## Related Documents

- [VERCEL_DEPLOYMENT_GUIDE.md](../VERCEL_DEPLOYMENT_GUIDE.md) - Initial setup guide
- [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) - Branch and PR workflow
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing requirements
- [SINGLE_SOURCE_OF_TRUTH.md](SINGLE_SOURCE_OF_TRUTH.md) - Service locations
