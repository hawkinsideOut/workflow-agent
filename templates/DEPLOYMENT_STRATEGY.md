# Deployment Strategy

> **Purpose**: This document defines the deployment workflow, environment management, database migration strategy, and rollback procedures for {{projectName}}.

---

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Environments](#environments)
3. [Environment Variables](#environment-variables)
4. [Deployment Workflow](#deployment-workflow)
5. [Database Migrations](#database-migrations)
6. [Preview/Staging Deployments](#previewstaging-deployments)
7. [Production Deployment](#production-deployment)
8. [Rollback Procedures](#rollback-procedures)
9. [Monitoring](#monitoring)

---

## Deployment Overview

<!-- PROJECT-SPECIFIC: Define your deployment architecture below -->

{{projectName}} uses the following deployment architecture:

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Git Push      │────▶│  Build System    │────▶│  Deployment     │
│   (Repository)  │     │  (CI/CD)         │     │  (Hosting)      │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                           │
                                                           ▼
                                                 ┌─────────────────┐
                                                 │   Data Layer    │
                                                 │   (Database)    │
                                                 └─────────────────┘
```

### Key Components

<!-- PROJECT-SPECIFIC: Update this table with your actual stack -->

| Component      | Platform/Service | Purpose                          |
| -------------- | ---------------- | -------------------------------- |
| Application    | [HOSTING]        | Application runtime              |
| Database       | [DATABASE]       | Data persistence                 |
| Auth           | [AUTH_PROVIDER]  | Authentication & session mgmt    |
| CDN/Assets     | [CDN]            | Static assets, caching           |

---

## Environments

### Environment Types

| Environment | Branch           | Purpose              | URL Pattern                    |
| ----------- | ---------------- | -------------------- | ------------------------------ |
| Production  | `main`           | Live application     | `[PROD_URL]`                   |
| Staging     | `develop`        | Pre-prod testing     | `[STAGING_URL]`                |
| Preview     | Feature branches | PR previews, testing | `[PREVIEW_URL_PATTERN]`        |
| Local       | N/A              | Development          | `localhost:[PORT]`             |

### Database Environments

<!-- PROJECT-SPECIFIC: Define your database environments -->

| Environment | Database Instance  | Purpose                |
| ----------- | ------------------ | ---------------------- |
| Production  | `[prod-instance]`  | Live data              |
| Staging     | `[stage-instance]` | Pre-production testing |
| Local       | Local instance     | Development            |

---

## Environment Variables

### Required Variables

<!-- PROJECT-SPECIFIC: List your required environment variables -->

| Variable                  | Description              | Source                     |
| ------------------------- | ------------------------ | -------------------------- |
| `DATABASE_URL`            | Database connection      | Database provider dashboard |
| `API_KEY`                 | API authentication       | Secret manager             |

### Optional Variables

| Variable              | Description                    | Default                   |
| --------------------- | ------------------------------ | ------------------------- |
| `APP_URL`             | Application URL                | Auto-detected             |
| `LOG_LEVEL`           | Logging verbosity              | `info`                    |

### Secret Management

1. **Never commit secrets** to the repository
2. **Use your platform's secret management** for all secrets
3. **Scope secrets by environment**:
   - Production: Only production values
   - Staging/Preview: Staging or development values
   - Development: Local `.env.local` or `.env` file

---

## Deployment Workflow

### Standard Flow (Feature Branch)

```
1. Developer creates branch
   └── feature/[scope]/description

2. Developer pushes changes
   └── git push origin feature/[scope]/description

3. CI/CD creates preview deployment (if configured)
   └── [preview-url]

4. Developer creates PR
   └── Title: feat([scope]): description

5. Automated checks run
   ├── Build verification
   ├── Linting and type checks
   ├── Test suite
   └── Preview deployment

6. Review and approval
   └── Code review, manual testing on preview

7. Merge to main
   └── Squash and merge (recommended)

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

<!-- PROJECT-SPECIFIC: Define your migration directory -->

```
migrations/
├── 001_initial_schema.sql
├── 002_add_users_table.sql
└── 003_add_indexes.sql
```

### Creating Migrations

```bash
# Create new migration file
touch migrations/$(date +%Y%m%d%H%M%S)_description.sql

# Or using your ORM's migration tool
[orm] migrate:make description
```

### Migration File Format

```sql
-- migrations/20260108120000_add_feature.sql

-- Description: Add feature table
-- Author: Developer Name
-- Date: 2026-01-08

-- Up Migration
CREATE TABLE IF NOT EXISTS features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_features_name ON features(name);

-- ============================================
-- ROLLBACK SQL (Keep at bottom of file)
-- ============================================
-- DROP INDEX IF EXISTS idx_features_name;
-- DROP TABLE IF EXISTS features;
```

### Running Migrations

#### Local Development

```bash
# Run pending migrations
[migration-command] migrate

# Reset database (warning: destroys data)
[migration-command] reset

# Check migration status
[migration-command] status
```

### Migration Checklist

Before deploying a migration:

- [ ] **Test locally** with sample data
- [ ] **Include rollback SQL** in migration file
- [ ] **Update types/schemas** if using code generation
- [ ] **Check indexes** for query performance
- [ ] **Document breaking changes** - if any

---

## Preview/Staging Deployments

### Purpose

Preview deployments allow testing changes before production:
- Automatic deployments for each PR
- Isolated environment for testing
- Shareable URLs for review

### Testing on Preview

1. Access the preview URL from PR
2. Test the specific feature
3. Verify no regressions
4. Check responsive behavior
5. Test authentication flow

---

## Production Deployment

### Pre-Deployment Checklist

Before merging to `main`:

- [ ] All tests pass
- [ ] Type checking passes
- [ ] Linting passes
- [ ] PR approved by required reviewers
- [ ] Preview deployment tested
- [ ] Database migrations tested (if any)
- [ ] Environment variables configured
- [ ] No breaking changes (or documented)

### Post-Deployment Verification

After deployment:

- [ ] Verify production URL is accessible
- [ ] Test critical paths (login, core features)
- [ ] Check application logs for errors
- [ ] Monitor database for issues
- [ ] Verify integrations work

---

## Rollback Procedures

### When to Rollback

- Critical bug affecting all users
- Security vulnerability discovered
- Data corruption
- Performance degradation

### Application Rollback

1. Go to your deployment platform's dashboard
2. Find the last working deployment
3. Click "Rollback" or "Promote to Production"

### Database Rollback

Run the rollback SQL from the migration file (usually commented at the bottom):

```sql
-- Example rollback
DROP INDEX IF EXISTS idx_features_name;
DROP TABLE IF EXISTS features;
```

### Rollback Checklist

- [ ] Identify the issue and scope
- [ ] Notify team of rollback
- [ ] Execute rollback (app and/or database)
- [ ] Verify rollback successful
- [ ] Document what went wrong
- [ ] Create fix and re-deploy

---

## Monitoring

### Application Monitoring

| Metric            | Action Threshold |
| ----------------- | ---------------- |
| Build Time        | > 5 minutes      |
| Response Time     | > 500ms          |
| Error Rate        | > 1%             |
| Uptime            | < 99.9%          |

### Database Monitoring

| Metric             | Action Threshold |
| ------------------ | ---------------- |
| Database Size      | 80% of limit     |
| Active Connections | 80% of limit     |
| Query Performance  | > 1 second       |

---

## Related Documents

- [BRANCHING_STRATEGY.md](BRANCHING_STRATEGY.md) - Branch and PR workflow
- [TESTING_STRATEGY.md](TESTING_STRATEGY.md) - Testing requirements
- [SINGLE_SOURCE_OF_TRUTH.md](SINGLE_SOURCE_OF_TRUTH.md) - Service locations
