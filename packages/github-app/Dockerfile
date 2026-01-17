# Multi-stage build for workflow-github-app
# Stage 1: Build
FROM node:20-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy package files first for better caching
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source files
COPY tsconfig.json tsup.config.ts ./
COPY src ./src

# Build the application
RUN pnpm build

# Stage 2: Production
FROM node:20-slim AS production

# Install Playwright dependencies
RUN apt-get update && apt-get install -y \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpango-1.0-0 \
    libcairo2 \
    libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN groupadd -r workflow && useradd -r -g workflow workflow

WORKDIR /app

# Copy package files
COPY package.json ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Install Playwright browsers
RUN npx playwright install chromium

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create data directory
RUN mkdir -p /app/data /app/visual-baselines && chown -R workflow:workflow /app

# Switch to non-root user
USER workflow

# Environment defaults
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV DATABASE_PATH=/app/data/workflow-agent.db
ENV VISUAL_BASELINE_DIR=/app/visual-baselines

# Expose the webhook port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "fetch('http://localhost:3000/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start the server
CMD ["node", "dist/cli.js", "serve"]
