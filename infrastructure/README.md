# Infrastructure & DevOps Guide

Configuration and scripts for orchestrating the Political Authority Highlighter's infrastructure. Built with **Docker Compose**, **PostgreSQL 16**, and **Nginx**.

## Deployment Architecture

- **Backend (API + Database)**: Docker Compose on a Hetzner Cloud VPS (CX22).
- **Frontend (Web)**: Vercel Free tier.
- **CDN/DNS**: Cloudflare Free.

## Stack

| Component | Technology | Role |
|-----------|------------|------|
| **PostgreSQL 16** | Database | Dual-schema storage (`public_data` + `internal_data`). |
| **Nginx** | Reverse Proxy | TLS termination (Let's Encrypt) and basic rate limiting. |
| **Docker** | Containerization | Reproducible environments across Dev and Prod. |
| **GitHub Actions** | CI/CD | Automated testing, build, and VPS deployment. |

## Core Principles

- **12-Factor App**: Configuration strictly in environment variables.
- **Dev/Prod Parity**: Identical PostgreSQL and schema setup locally and in production.
- **Least Privilege**: Application-specific database roles (`api_reader` vs `pipeline_admin`).
- **Disposable Infrastructure**: Entire stack reproducible from code in < 30 minutes.

## Structure

```
infrastructure/
├── docker-compose.yml       # Production service definitions
├── docker-compose.dev.yml   # Development overrides (hot reload)
├── init-schemas.sql         # Database schema and role initialization script
├── postgresql.conf          # Custom PostgreSQL tuning for Hetzner CX22
├── nginx/                   # Reverse proxy and TLS configuration
└── scripts/                 # Backup, restoration, and deployment scripts
```

## Workflows

### Setup Production

```bash
# Copy and configure environment variables
cp .env.example .env.prod

# Deploy with Docker Compose
docker compose up -d
```

### Backups & Restoration

- **Backups**: `scripts/backup.sh` runs daily via cron (01:00 UTC).
- **Restoration**: `scripts/restore.sh <backup-filename>`.

## CI/CD Pipeline

- **CI**: Runs lint, typecheck, and tests (Vitest + Playwright) on every PR.
- **Deploy**: Automatically builds Docker images and pushes to the VPS on `main` branch updates.

## Cost Target

Infrastructure is optimized for a **~$7/month** total budget:
- Hetzner CX22 (2 vCPU, 4GB RAM): ~$6/mo.
- Domain: ~$1/mo.
- Vercel/Cloudflare: Free tier.
