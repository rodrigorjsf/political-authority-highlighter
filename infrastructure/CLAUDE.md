# Infrastructure and DevOps Guide -- Political Authority Highlighter

# Stack: Docker Compose | PostgreSQL 16 | Hetzner CX22 VPS | Vercel Free | GitHub Actions

# Last Updated: 2026-02-28 | PRD Version: 1.0

## Core Principles

> Primary: 12-Factor App (Wiggins), The Pragmatic Programmer (Hunt/Thomas)
> Secondary: Clean Code (Martin) -- naming and structure

1. **Config in Environment (12-Factor)**: All configuration that varies between environments (development, staging, production) is stored in environment variables. Database passwords, API keys, encryption keys -- nothing is hardcoded. Docker Compose uses `.env` files with `600` permissions on the VPS.

2. **Dev/Prod Parity (12-Factor)**: The development environment uses Docker Compose with the same PostgreSQL version, the same schema initialization, and the same dual-role setup as production. Developers run `docker compose up` and get an identical stack locally.

3. **Disposable Infrastructure (Pragmatic Programmer)**: All state lives in PostgreSQL data volumes and backups. The VPS, containers, and configuration are reproducible from version-controlled files. A complete environment rebuild takes under 30 minutes including data restoration.

4. **Least Privilege (Security)**: The `api_reader` PostgreSQL role has SELECT-only access to `public_data`. The `pipeline_admin` role has full access to both schemas. Docker containers run as non-root users. SSH access uses key-based authentication only.

5. **Cost Discipline**: Total infrastructure cost must stay under $100/month. Every infrastructure decision is evaluated against this budget. Current target: ~$7/month for MVP.

---

## Architecture Boundaries

### What Infrastructure IS responsible for

- Docker Compose service orchestration on Hetzner VPS
- PostgreSQL configuration, schema initialization, role management
- Nginx reverse proxy with TLS termination
- Backup strategy and restoration procedures
- CI/CD pipeline (GitHub Actions)
- Monitoring and alerting
- Secret management

### What Infrastructure is NOT responsible for

- Application code logic (that is the API, pipeline, and frontend)
- Vercel deployment configuration (managed by Next.js config and Vercel dashboard)
- Cloudflare CDN configuration (managed via Cloudflare dashboard)
- Data ingestion scheduling (managed by pg-boss in the pipeline app)

---

## File and Directory Conventions

```
infrastructure/
+-- CLAUDE.md                       # THIS FILE
+-- docker-compose.yml              # Production service definitions
+-- docker-compose.dev.yml          # Development overrides (hot reload, debug ports)
+-- Dockerfile.api                  # Multi-stage build for Fastify API
+-- Dockerfile.pipeline             # Multi-stage build for pipeline worker
+-- nginx/
|   +-- nginx.conf                  # Reverse proxy configuration
|   +-- ssl-params.conf             # TLS security parameters
+-- postgres/
|   +-- init-schemas.sql            # Schema + role initialization script
|   +-- postgresql.conf             # Custom PostgreSQL tuning for CX22
+-- scripts/
|   +-- backup.sh                   # Daily pg_dump to Hetzner Object Storage
|   +-- restore.sh                  # Restore from backup
|   +-- deploy.sh                   # Pull and restart containers
|   +-- health-check.sh             # Verify all services are running
+-- .env.example                    # Template for production environment variables
```

---

## Docker Compose Configuration

### Production (`docker-compose.yml`)

```yaml
services:
  postgres:
    image: postgres:16-alpine
    container_name: pah-postgres
    environment:
      POSTGRES_DB: authority_highlighter
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./postgres/init-schemas.sql:/docker-entrypoint-initdb.d/01-schemas.sql:ro
      - ./postgres/postgresql.conf:/etc/postgresql/postgresql.conf:ro
    command: postgres -c config_file=/etc/postgresql/postgresql.conf
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d authority_highlighter"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 30s
    restart: unless-stopped
    ports:
      - "127.0.0.1:5432:5432"  # Only accessible from localhost
    networks:
      - backend
    deploy:
      resources:
        limits:
          memory: 1.5G

  api:
    build:
      context: ..
      dockerfile: apps/api/Dockerfile.api
    container_name: pah-api
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://api_reader:${API_READER_PASSWORD}@postgres:5432/authority_highlighter?search_path=public_data
      LOG_LEVEL: info
      CORS_ORIGIN: https://autoridade-politica.com.br
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    user: "1000:1000"
    read_only: true
    tmpfs:
      - /tmp
    networks:
      - backend
    deploy:
      resources:
        limits:
          memory: 512M

  pipeline:
    build:
      context: ..
      dockerfile: apps/pipeline/Dockerfile.pipeline
    container_name: pah-pipeline
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://pipeline_admin:${PIPELINE_ADMIN_PASSWORD}@postgres:5432/authority_highlighter
      CPF_ENCRYPTION_KEY: ${CPF_ENCRYPTION_KEY}
      TRANSPARENCIA_API_KEY: ${TRANSPARENCIA_API_KEY}
      VERCEL_REVALIDATE_TOKEN: ${VERCEL_REVALIDATE_TOKEN}
      VERCEL_REVALIDATE_URL: ${VERCEL_REVALIDATE_URL}
      LOG_LEVEL: info
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    user: "1000:1000"
    read_only: true
    tmpfs:
      - /tmp
    networks:
      - backend
    deploy:
      resources:
        limits:
          memory: 1G

  nginx:
    image: nginx:1.27-alpine
    container_name: pah-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl-params.conf:/etc/nginx/ssl-params.conf:ro
      - /etc/letsencrypt:/etc/letsencrypt:ro
      - /var/www/certbot:/var/www/certbot:ro
    depends_on:
      - api
    restart: unless-stopped
    networks:
      - backend

volumes:
  pgdata:
    driver: local

networks:
  backend:
    driver: bridge
```

### Development Overrides (`docker-compose.dev.yml`)

```yaml
# Usage: docker compose -f docker-compose.yml -f docker-compose.dev.yml up
services:
  postgres:
    ports:
      - "127.0.0.1:5433:5432"  # Expose to host for local development tools (5433 avoids conflict with local PostgreSQL)
    environment:
      POSTGRES_PASSWORD: dev_password

  api:
    build:
      target: development
    volumes:
      - ../apps/api/src:/app/apps/api/src:ro  # Hot reload
    environment:
      NODE_ENV: development
      LOG_LEVEL: debug
      DATABASE_URL: postgresql://api_reader:dev_reader_pass@postgres:5432/authority_highlighter?search_path=public_data
    ports:
      - "3000:3000"  # Direct access (no nginx)

  pipeline:
    build:
      target: development
    volumes:
      - ../apps/pipeline/src:/app/apps/pipeline/src:ro
    environment:
      NODE_ENV: development
      LOG_LEVEL: debug
      DATABASE_URL: postgresql://pipeline_admin:dev_admin_pass@postgres:5432/authority_highlighter
      CPF_ENCRYPTION_KEY: 0000000000000000000000000000000000000000000000000000000000000000
```

---

## Dockerfile Patterns

### Multi-Stage Build (API)

```dockerfile
# Dockerfile.api
FROM node:22-alpine AS base
RUN corepack enable pnpm
WORKDIR /app

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile --prod

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @pah/api build

FROM base AS production
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/packages/db/dist ./packages/db/dist

USER 1000:1000
EXPOSE 3000
CMD ["node", "apps/api/dist/server.js"]

FROM base AS development
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/ ./apps/api/
RUN pnpm install --frozen-lockfile
CMD ["pnpm", "--filter", "@pah/api", "dev"]
## Code Standards

### Formatting Rules (CLAUDE.md)

- **YAML/JSON**: 2-space indentation (enforced)
- **Shell Scripts**: 2-space indentation, `set -euo pipefail` required
- **Dockerfiles**: Multi-stage builds, non-root USER
- **Import order**: external → internal → types (where applicable)

### Dockerfile Patterns
...
### Build Rules

- Always use `node:22-alpine` for smallest image size (~50MB base).
- Always use `--frozen-lockfile` to ensure reproducible builds.
- Always run as non-root user (`USER 1000:1000`).
- Always use multi-stage builds to exclude dev dependencies from production image.
- Never copy `.env` files into Docker images.
- Tag images with git SHA: `ghcr.io/user/pah-api:sha-abc1234`.
- **Use `ms` package** for time-related environment variables and script timeouts.
...
---

## PostgreSQL Configuration

### Schema and Role Initialization

```sql
-- postgres/init-schemas.sql
-- This script runs automatically on first container start

-- Create schemas
CREATE SCHEMA IF NOT EXISTS public_data;
CREATE SCHEMA IF NOT EXISTS internal_data;

-- Create roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'api_reader') THEN
    CREATE ROLE api_reader WITH LOGIN PASSWORD :'API_READER_PASSWORD';
  END IF;
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'pipeline_admin') THEN
    CREATE ROLE pipeline_admin WITH LOGIN PASSWORD :'PIPELINE_ADMIN_PASSWORD';
  END IF;
END
$$;

-- api_reader: SELECT only on public_data, NOTHING on internal_data
GRANT USAGE ON SCHEMA public_data TO api_reader;
GRANT SELECT ON ALL TABLES IN SCHEMA public_data TO api_reader;
ALTER DEFAULT PRIVILEGES IN SCHEMA public_data GRANT SELECT ON TABLES TO api_reader;
REVOKE ALL ON SCHEMA internal_data FROM api_reader;

-- pipeline_admin: ALL on both schemas
GRANT USAGE, CREATE ON SCHEMA public_data TO pipeline_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public_data TO pipeline_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public_data TO pipeline_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public_data GRANT ALL ON TABLES TO pipeline_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA public_data GRANT ALL ON SEQUENCES TO pipeline_admin;

GRANT USAGE, CREATE ON SCHEMA internal_data TO pipeline_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA internal_data TO pipeline_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA internal_data TO pipeline_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA internal_data GRANT ALL ON TABLES TO pipeline_admin;
ALTER DEFAULT PRIVILEGES IN SCHEMA internal_data GRANT ALL ON SEQUENCES TO pipeline_admin;
```

### PostgreSQL Tuning for CX22 (2 vCPU, 4GB RAM)

```ini
# postgres/postgresql.conf -- Tuned for Hetzner CX22

# Memory
shared_buffers = 1GB                   # 25% of 4GB RAM
effective_cache_size = 3GB             # 75% of RAM
work_mem = 16MB                        # Per-operation memory
maintenance_work_mem = 256MB           # For VACUUM, CREATE INDEX

# WAL
wal_buffers = 32MB
min_wal_size = 256MB
max_wal_size = 1GB
checkpoint_completion_target = 0.9

# Query Planner
random_page_cost = 1.1                 # NVMe SSD: nearly sequential
effective_io_concurrency = 200         # NVMe SSD

# Connections
max_connections = 50                   # API (5) + Pipeline (5) + pgboss (10) + buffer
listen_addresses = '*'

# Logging
log_min_duration_statement = 500       # Log queries slower than 500ms
log_checkpoints = on
log_lock_waits = on
log_statement = 'ddl'                  # Log schema changes

# Locale
lc_messages = 'en_US.utf8'
lc_monetary = 'pt_BR.utf8'
lc_numeric = 'pt_BR.utf8'
lc_time = 'pt_BR.utf8'

# Extensions
shared_preload_libraries = 'pg_stat_statements'
```

### Connection Pooling

- API connects with a pool of 5 connections (read-only, short-lived queries).
- Pipeline connects with a pool of 5 connections (write-heavy during ingestion, idle otherwise).
- pg-boss uses its own internal pool of up to 10 connections.
- Total maximum: ~30 connections, well within the 50 limit.

---

## Nginx Reverse Proxy

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    upstream api {
        server api:3000;
    }

    # Rate limiting zone
    limit_req_zone $binary_remote_addr zone=api_rate:10m rate=60r/m;

    # Redirect HTTP to HTTPS
    server {
        listen 80;
        server_name api.autoridade-politica.com.br;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    server {
        listen 443 ssl http2;
        server_name api.autoridade-politica.com.br;

        ssl_certificate /etc/letsencrypt/live/api.autoridade-politica.com.br/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/api.autoridade-politica.com.br/privkey.pem;
        include /etc/nginx/ssl-params.conf;

        # Security headers
        add_header X-Frame-Options "DENY" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "no-referrer" always;
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        location /api/ {
            limit_req zone=api_rate burst=20 nodelay;
            proxy_pass http://api;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /health {
            proxy_pass http://api;
            # No rate limiting on health checks
        }

        # Deny all other paths
        location / {
            return 404;
        }
    }
}
```

---

## Backup Strategy

### Daily Backups

```bash
#!/bin/bash
# scripts/backup.sh -- Run via cron at 01:00 UTC daily

set -euo pipefail

BACKUP_DIR="/tmp/pah-backups"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="pah-backup-${DATE}.dump"
S3_BUCKET="s3://pah-backups"

# Create compressed custom-format dump
docker exec pah-postgres pg_dump \
  --format=custom \
  --compress=9 \
  --username=postgres \
  --dbname=authority_highlighter \
  > "${BACKUP_DIR}/${BACKUP_FILE}"

# Upload to Hetzner Object Storage (S3-compatible)
aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" "${S3_BUCKET}/${BACKUP_FILE}" \
  --endpoint-url https://fsn1.your-objectstorage.com

# Clean up local file
rm "${BACKUP_DIR}/${BACKUP_FILE}"

# Retention: delete backups older than 7 days (keep weekly ones for 4 weeks)
aws s3 ls "${S3_BUCKET}/" --endpoint-url https://fsn1.your-objectstorage.com \
  | awk '{print $4}' \
  | while read -r file; do
      file_date=$(echo "$file" | grep -oP '\d{8}')
      if [[ $(date -d "$file_date" +%s) -lt $(date -d "7 days ago" +%s) ]]; then
        day_of_week=$(date -d "$file_date" +%u)
        # Keep Monday backups for 4 weeks
        if [[ $day_of_week -ne 1 ]] || [[ $(date -d "$file_date" +%s) -lt $(date -d "28 days ago" +%s) ]]; then
          aws s3 rm "${S3_BUCKET}/${file}" --endpoint-url https://fsn1.your-objectstorage.com
        fi
      fi
    done

echo "Backup completed: ${BACKUP_FILE}"
```

### Restoration

```bash
#!/bin/bash
# scripts/restore.sh -- Restore from a specific backup

set -euo pipefail

BACKUP_FILE="${1:?Usage: restore.sh <backup-filename>}"
S3_BUCKET="s3://pah-backups"

# Download backup
aws s3 cp "${S3_BUCKET}/${BACKUP_FILE}" /tmp/restore.dump \
  --endpoint-url https://fsn1.your-objectstorage.com

# Stop API and pipeline (keep postgres running)
docker compose stop api pipeline

# Restore
docker exec -i pah-postgres pg_restore \
  --clean \
  --if-exists \
  --username=postgres \
  --dbname=authority_highlighter \
  < /tmp/restore.dump

# Restart all services
docker compose up -d

rm /tmp/restore.dump
echo "Restore completed from: ${BACKUP_FILE}"
```

### Backup Verification

- Every Monday, the CI pipeline downloads the latest backup and restores it to a test container.
- Verify that `SELECT count(*) FROM public_data.politicians` returns a reasonable number.
- Verify that both schemas exist and roles are configured.
- Alert if backup is older than 36 hours.

---

## Vercel Frontend Deployment

### Configuration

- Vercel project is connected to the GitHub repository.
- Framework preset: Next.js.
- Root directory: `apps/web`.
- Build command: `cd ../.. && pnpm turbo build --filter=@pah/web`.
- Output directory: `.next`.
- Environment variables configured in Vercel dashboard.

### Environment Variables (Vercel)

| Variable | Value | Scope |
|----------|-------|-------|
| `NEXT_PUBLIC_API_URL` | `https://api.autoridade-politica.com.br/api/v1` | Production |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3000/api/v1` | Preview |
| `VERCEL_REVALIDATE_TOKEN` | (secret) | Production |

### Deployment Rules

- Automatic deployment on push to `main` branch.
- Preview deployments for all PRs.
- No manual deployments. All changes go through CI.
- Monitor bandwidth usage in Vercel dashboard. Alert at 80GB/month (80% of 100GB free limit).

---

## CI/CD Pipeline (GitHub Actions)

### CI Workflow (`ci.yml`)

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_DB: authority_highlighter_test
          POSTGRES_PASSWORD: test_password
        ports:
          - 5432:5432
        options: >-
          --health-cmd "pg_isready -U postgres"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm test
        env:
          DATABASE_URL: postgresql://postgres:test_password@localhost:5432/authority_highlighter_test

  build:
    runs-on: ubuntu-latest
    needs: [lint-and-typecheck, test]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

### Deploy Workflow (`deploy.yml`)

```yaml
name: Deploy Backend
on:
  push:
    branches: [main]
    paths:
      - 'apps/api/**'
      - 'apps/pipeline/**'
      - 'packages/**'
      - 'infrastructure/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    needs: [ci]  # Reference the CI workflow
    steps:
      - uses: actions/checkout@v4

      - name: Build and push Docker images
        run: |
          echo "${{ secrets.GHCR_TOKEN }}" | docker login ghcr.io -u ${{ github.actor }} --password-stdin
          docker build -f apps/api/Dockerfile.api -t ghcr.io/${{ github.repository }}/api:${{ github.sha }} .
          docker build -f apps/pipeline/Dockerfile.pipeline -t ghcr.io/${{ github.repository }}/pipeline:${{ github.sha }} .
          docker push ghcr.io/${{ github.repository }}/api:${{ github.sha }}
          docker push ghcr.io/${{ github.repository }}/pipeline:${{ github.sha }}

      - name: Deploy to Hetzner VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: deploy
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/pah
            docker compose pull
            docker compose up -d --remove-orphans
            docker system prune -f
            sleep 5
            curl -sf http://localhost:3000/health || exit 1
```

---

## Monitoring and Alerting

### Health Checks

| Check | Endpoint/Method | Frequency | Alert Threshold |
|-------|----------------|-----------|----------------|
| API health | `GET /health` | 5 min | 2 consecutive failures |
| PostgreSQL | `pg_isready` (Docker healthcheck) | 10s | 5 consecutive failures |
| Frontend | HTTPS GET on homepage | 5 min | 2 consecutive failures |
| Backup age | S3 list latest backup | Daily | Older than 36 hours |
| Pipeline status | Query `data_source_status` table | Daily | Any source stale > 48 hours |

### API Health Endpoint

```typescript
// The health check verifies database connectivity
app.get('/health', async (_request, reply) => {
  try {
    await db.execute(sql`SELECT 1`)
    reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version,
    })
  } catch {
    reply.status(503).send({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
    })
  }
})
```

### UptimeRobot Configuration

| Monitor | Type | URL | Interval | Alert |
|---------|------|-----|----------|-------|
| API | HTTP(S) | `https://api.autoridade-politica.com.br/health` | 5 min | Email + Telegram |
| Frontend | HTTP(S) | `https://autoridade-politica.com.br` | 5 min | Email + Telegram |

### Log Monitoring

- Structured JSON logs via Pino.
- Logs stored on disk with `logrotate` (7-day retention).
- Grep for `"level":50` (error) or `"level":60` (fatal) in daily review.
- Future: ship to Grafana Cloud free tier (10k series).

---

## Secret Management

### Production Secrets

| Secret | Where Stored | Used By |
|--------|-------------|---------|
| `POSTGRES_PASSWORD` | VPS `.env` file (600 permissions) | Docker Compose |
| `API_READER_PASSWORD` | VPS `.env` file | API container |
| `PIPELINE_ADMIN_PASSWORD` | VPS `.env` file | Pipeline container |
| `CPF_ENCRYPTION_KEY` | VPS `.env` file | Pipeline container |
| `TRANSPARENCIA_API_KEY` | VPS `.env` file | Pipeline container |
| `VERCEL_REVALIDATE_TOKEN` | VPS `.env` + Vercel dashboard | Pipeline + Vercel |
| `VPS_SSH_KEY` | GitHub Actions secrets | CI/CD deployment |
| `GHCR_TOKEN` | GitHub Actions secrets | Docker image push |

### Rules

1. **Never commit secrets** to version control. The `.env` file is in `.gitignore`.
2. **`.env.example`** contains placeholder values for documentation.
3. **File permissions**: `.env` on VPS has `chmod 600` (owner read/write only).
4. **Rotation**: change database passwords and encryption key quarterly. Document rotation in runbook.
5. **CI secrets** are set in GitHub repository Settings > Secrets and variables > Actions.
6. **Never log secrets**. Validate that Pino logger does not include environment variables in output.

---

## Cost Monitoring

### Monthly Budget

| Service | Budgeted | Alert At |
|---------|----------|----------|
| Hetzner VPS (CX22) | $5.50 | N/A (fixed) |
| Hetzner Object Storage | $0.10 | $1.00 |
| Vercel | $0.00 | Upgrade if bandwidth > 80GB |
| Cloudflare | $0.00 | N/A (free tier) |
| GitHub Actions | $0.00 | N/A (free for public repos) |
| Domain | $1.50 | N/A (annual) |
| **Total** | **~$7** | **$20** |

### Scaling Cost Triggers

| Trigger | Action | New Cost |
|---------|--------|----------|
| API p95 > 500ms consistently | Upgrade VPS to CX32 | ~$11 |
| Vercel bandwidth > 80GB/month | Evaluate Cloudflare caching; upgrade to Pro if needed | +$20 |
| PostgreSQL disk > 30GB | Upgrade VPS to CX32 (80GB disk) | ~$11 |
| Pipeline OOM | Upgrade VPS to CX32 (8GB RAM) | ~$11 |

---

## Naming Conventions (Infrastructure)

### Docker

| Resource | Pattern | Example |
|----------|---------|---------|
| Container name | `pah-<service>` | `pah-postgres`, `pah-api`, `pah-pipeline` |
| Image tag | `ghcr.io/<owner>/pah-<service>:<git-sha>` | `ghcr.io/user/pah-api:sha-abc1234` |
| Volume | `pah_<resource>` | `pah_pgdata` |
| Network | `pah_<purpose>` | `pah_backend` |

### PostgreSQL

| Resource | Pattern | Example |
|----------|---------|---------|
| Database | `authority_highlighter` | -- |
| Schema | `snake_case` purpose | `public_data`, `internal_data` |
| Role | `snake_case` purpose | `api_reader`, `pipeline_admin` |
| Table | `snake_case` plural noun | `politicians`, `integrity_scores`, `exclusion_records` |
| Column | `snake_case` | `overall_score`, `created_at`, `cpf_hash` |
| Index | `idx_<table>_<columns>` | `idx_politicians_slug`, `idx_scores_overall` |
| Migration | `<nnnn>_<description>.sql` | `0001_create_politicians.sql` |

### GitHub Actions

| Resource | Pattern | Example |
|----------|---------|---------|
| Workflow file | `kebab-case.yml` | `ci.yml`, `deploy.yml` |
| Job name | `kebab-case` | `lint-and-typecheck`, `deploy-backend` |
| Secret name | `SCREAMING_SNAKE_CASE` | `VPS_SSH_KEY`, `GHCR_TOKEN` |

---

## What NEVER to Do

| Anti-Pattern | Why It Is Prohibited |
|-------------|---------------------|
| Store secrets in Docker images or Dockerfiles | Images may be pushed to registries. Secrets leak. Use environment variables |
| Run containers as root | Security risk. Always use `USER 1000:1000` |
| Expose PostgreSQL port to the internet | Only bind to `127.0.0.1`. External access only through the API |
| Use `docker compose down -v` in production | Deletes the PostgreSQL data volume. Use `docker compose down` (no `-v`) |
| Skip backup verification | Untested backups are not backups. Verify weekly via restore to test container |
| Give `api_reader` write permissions | Violates ADR-001. The API is read-only by design |
| Disable Docker restart policies | Containers must restart on failure. Use `restart: unless-stopped` |
| Store `.env` in git | Secrets leak. Only `.env.example` is committed |
| Use `latest` tag for Docker images | Non-reproducible. Always use specific version tags or git SHA |
| Deploy without health check verification | The deploy script must verify `/health` after restart |
| Allow SSH password authentication | Use key-based SSH only. Disable `PasswordAuthentication` in sshd_config |
| Skip `--frozen-lockfile` in CI/Dockerfiles | Non-reproducible builds. Lock file must match |

---

## Disaster Recovery

### Recovery Time Objectives

| Scenario | RTO | Procedure |
|----------|-----|-----------|
| Container crash | < 1 minute | Docker `restart: unless-stopped` auto-recovers |
| VPS reboot | < 5 minutes | Docker Compose auto-starts on boot |
| Data corruption | < 30 minutes | Restore from latest backup + re-run pipeline |
| VPS total failure | < 2 hours | Provision new CX22, restore from backup, redeploy |
| Hetzner region failure | < 4 hours | Provision in alternate region, restore from Object Storage |

### Key Insight

All source data is public government data. The database can be fully reconstructed by running the pipeline against all sources. Backups are a speed optimization, not a necessity. The worst case is waiting for a full pipeline run (~2-4 hours for all 6 sources).

---

## Security Baseline

### VPS Hardening

1. **SSH**: Key-based only. Disable root login. Non-standard port (optional).
2. **Firewall (ufw)**: Allow only ports 80, 443, and SSH.
3. **Automatic updates**: `unattended-upgrades` for security patches.
4. **Fail2ban**: Protect SSH from brute force.
5. **Docker**: Official Docker CE packages. Pin versions.

### Network Security

1. PostgreSQL binds to `127.0.0.1` only (not exposed to internet).
2. API container communicates with PostgreSQL via Docker network.
3. Nginx terminates TLS with Let's Encrypt certificates (auto-renewed via certbot).
4. Cloudflare provides DDoS protection and WAF (free tier).

### Dependency Security

1. `npm audit` runs in CI on every PR.
2. Dependabot enabled for automated security updates.
3. Docker base images rebuilt weekly to pick up Alpine security patches.

---

## Changelog

| Date | PRD Version | Summary |
|------|-------------|---------|
| 2026-02-28 | 1.0 | Initial infrastructure and DevOps guide |
