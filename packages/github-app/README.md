# Workflow GitHub App

A GitHub App for automated pipeline monitoring, self-healing CI/CD, and visual UI testing powered by LLM vision.

## Features

### 🔄 Auto-Heal Pipeline Failures

When a CI/CD pipeline fails, the app automatically:

1. **Detects failures** via GitHub webhooks
2. **Parses error logs** to identify the root cause
3. **Generates fixes** using LLM (Anthropic Claude or OpenAI GPT-4)
4. **Applies fixes** via shell-executed CLI commands
5. **Retries with exponential backoff** (up to 10 attempts)
6. **Persists state** in SQLite for crash recovery

### 👁️ Visual UI Testing

Replace flaky DOM-based assertions with AI-powered visual verification:

1. **Capture baselines** using Playwright screenshots
2. **Compare visually** using LLM vision capabilities
3. **Detect differences** with semantic understanding (not pixel-perfect)
4. **Report results** as GitHub check runs or PR comments

## Quick Start

### 1. Create a GitHub App

1. Go to **GitHub Settings > Developer settings > GitHub Apps**
2. Click **New GitHub App**
3. Configure:
   - **App name**: `Workflow Agent` (or your choice)
   - **Homepage URL**: Your deployment URL
   - **Webhook URL**: `https://your-domain.com/webhook`
   - **Webhook secret**: Generate a secure secret
4. Permissions:
   - **Repository permissions**:
     - Actions: Read & write
     - Checks: Read & write
     - Contents: Read & write
     - Issues: Read & write
     - Pull requests: Read & write
   - **Subscribe to events**:
     - Check run
     - Workflow run
     - Pull request
5. Generate a **Private Key** (download the `.pem` file)
6. Note the **App ID**

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:

```env
GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GITHUB_WEBHOOK_SECRET=your-webhook-secret

# At least one LLM provider
ANTHROPIC_API_KEY=sk-ant-...
# or
OPENAI_API_KEY=sk-...

LLM_PROVIDER=anthropic
```

### 3. Run Locally with Docker Compose

```bash
# Start the server with webhook proxy for local development
docker-compose --profile dev up

# Or without the smee proxy (for production-like testing)
docker-compose up
```

### 4. Set Up Webhook Forwarding (Development)

For local development, use [Smee.io](https://smee.io/) to forward webhooks:

1. Create a channel at https://smee.io/new
2. Add `SMEE_URL` to your `.env`
3. Run with the `dev` profile: `docker-compose --profile dev up`

## Configuration

### Workflow Config (`workflow.config.json`)

Add pipeline and visual testing configuration to your project:

```json
{
  "projectName": "my-project",
  "scopes": [...],
  "pipeline": {
    "autoHeal": true,
    "maxRetries": 10,
    "backoffMinutes": 1,
    "maxBackoffMinutes": 30,
    "minConfidence": 0.7,
    "createPullRequest": true,
    "branches": ["main", "develop"],
    "excludeWorkflows": ["release"]
  },
  "visualTesting": {
    "enabled": true,
    "llmProvider": "anthropic",
    "baselineDir": ".visual-baselines",
    "viewportWidth": 1280,
    "viewportHeight": 720,
    "runOnPullRequest": true,
    "blockOnDifference": false,
    "urls": [
      { "name": "homepage", "url": "http://localhost:3000" },
      { "name": "dashboard", "url": "http://localhost:3000/dashboard" }
    ]
  }
}
```

## CLI Commands

### Server Commands

```bash
# Start the webhook server
workflow-github-app serve

# Start in development mode
workflow-github-app serve --dev

# Check status
workflow-github-app status
```

### Visual Testing Commands

```bash
# Capture a baseline
workflow-github-app visual capture homepage http://localhost:3000

# Compare against baseline
workflow-github-app visual compare http://localhost:3000 --baseline homepage

# Run all visual tests
workflow-github-app visual test

# List all baselines
workflow-github-app visual list
```

### Manual Auto-Heal

```bash
# Trigger auto-heal manually
workflow-github-app heal owner repo commit-sha "error message"
```

## Deployment

### Docker (Recommended)

Build and push the Docker image:

```bash
docker build -t workflow-github-app .
docker push your-registry/workflow-github-app
```

### Production Docker Compose

```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Environment Variables for Production

| Variable                | Description                  | Default                    |
| ----------------------- | ---------------------------- | -------------------------- |
| `GITHUB_APP_ID`         | GitHub App ID                | Required                   |
| `GITHUB_PRIVATE_KEY`    | GitHub App private key (PEM) | Required                   |
| `GITHUB_WEBHOOK_SECRET` | Webhook signature secret     | Required                   |
| `ANTHROPIC_API_KEY`     | Anthropic API key            | -                          |
| `OPENAI_API_KEY`        | OpenAI API key               | -                          |
| `LLM_PROVIDER`          | Which LLM to use             | `anthropic`                |
| `PORT`                  | Server port                  | `3000`                     |
| `DATABASE_PATH`         | SQLite database path         | `./data/workflow-agent.db` |
| `MAX_RETRIES`           | Max auto-heal attempts       | `10`                       |
| `BACKOFF_BASE_MINUTES`  | Initial backoff              | `1`                        |
| `BACKOFF_MAX_MINUTES`   | Max backoff cap              | `30`                       |

### Deployment Platforms

The app can be deployed to:

- **DigitalOcean App Platform** - Easy container deployment
- **Fly.io** - Global edge deployment
- **Railway** - Simple PaaS deployment
- **AWS ECS/Fargate** - Enterprise deployment
- **Self-hosted VPS** - Full control

## Architecture

```
packages/github-app/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── server.ts           # Hono HTTP server
│   ├── index.ts            # Package exports
│   ├── config/
│   │   └── env.ts          # Environment validation (Zod)
│   ├── db/
│   │   ├── client.ts       # SQLite client (better-sqlite3)
│   │   ├── schema.ts       # Database schema
│   │   └── queries.ts      # Query functions
│   ├── github/
│   │   └── client.ts       # Octokit GitHub API client
│   ├── webhooks/
│   │   ├── index.ts        # Webhook router
│   │   └── workflow-run.ts # Workflow run handler
│   ├── orchestrator/
│   │   └── auto-heal.ts    # Self-healing logic
│   ├── llm/
│   │   ├── client.ts       # LLM abstraction
│   │   ├── anthropic.ts    # Claude implementation
│   │   ├── openai.ts       # GPT-4V implementation
│   │   └── types.ts        # Type definitions
│   └── visual/
│       ├── screenshot.ts   # Playwright capture
│       ├── compare.ts      # LLM comparison
│       └── report.ts       # GitHub reporting
├── Dockerfile
├── docker-compose.yml
├── docker-compose.prod.yml
└── .env.example
```

## API Endpoints

| Endpoint   | Method | Description             |
| ---------- | ------ | ----------------------- |
| `/health`  | GET    | Health check            |
| `/status`  | GET    | Status dashboard        |
| `/webhook` | POST   | GitHub webhook receiver |

## Database Schema

The app uses SQLite for persistence:

- **retry_attempts** - Tracks auto-heal attempts per commit
- **visual_baselines** - Stores baseline screenshot metadata
- **visual_comparisons** - Records comparison history
- **webhook_events** - Logs all webhook events
- **auto_heal_history** - Audit trail of fix attempts

## How It Works

### Auto-Heal Flow

```
1. GitHub sends workflow_run.completed webhook
   ↓
2. Server verifies signature and routes to handler
   ↓
3. Check if workflow conclusion === "failure"
   ↓
4. Query SQLite for existing retry attempts
   ↓
5. If attempts < 10, calculate backoff delay
   ↓
6. Fetch workflow logs via GitHub API
   ↓
7. Parse errors and identify affected files
   ↓
8. Shell exec: workflow-agent fix --error "..." --auto
   ↓
9. LLM generates fix, applies changes, commits, pushes
   ↓
10. Wait for next workflow_run webhook to confirm fix
```

### Visual Testing Flow

```
1. Developer captures baseline:
   workflow-github-app visual capture homepage http://localhost:3000
   ↓
2. Playwright takes screenshot, saves to disk + SQLite
   ↓
3. On PR, compare:
   workflow-github-app visual compare http://localhost:3000 --baseline homepage
   ↓
4. Capture current screenshot
   ↓
5. Send both images to LLM (Claude Vision / GPT-4V)
   ↓
6. LLM returns structured diff with:
   - hasDifferences: boolean
   - summary: string
   - differences: [{ area, description, severity }]
   - confidence: number
   ↓
7. Post results as GitHub check run or PR comment
```

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## License

MIT - See [LICENSE](../../LICENSE) for details.
