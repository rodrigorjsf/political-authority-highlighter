# Infrastructure & DevOps

Orchestration for the Political Authority Highlighter via **Docker Compose**, **PostgreSQL 16**, and **Nginx**.

## Architecture

- **Backend** — Docker Compose on Hetzner VPS (CX22).
- **Frontend** — Vercel Free.
- **CDN/DNS** — Cloudflare Free.

## Tech Stack

- **Database:** PostgreSQL 16 (dual-schema).
- **Proxy:** Nginx (TLS + Rate limiting).
- **CI/CD:** GitHub Actions.

## Principles

- **12-Factor** — Config in environment variables.
- **Parity** — Identical PostgreSQL setup for Dev and Prod.
- **Least Privilege** — `api_reader` vs `pipeline_admin` roles.
- **Disposable** — Full stack reproducible in < 30 minutes.

## Structure

```
├── docker-compose.yml     # Production services
├── docker-compose.dev.yml # Development overrides
├── init-schemas.sql       # Schema & role init
└── scripts/               # Backup and deploy scripts
```

## Workflows

- **Deploy:** `docker compose up -d`.
- **Backups:** `scripts/backup.sh` daily (01:00 UTC).
- **Restore:** `scripts/restore.sh <file>`.

## Cost

Optimized for **~$7/month**:
- Hetzner CX22 (2 vCPU, 4GB RAM): ~$6/mo.
- Domain: ~$1/mo.
- Vercel/Cloudflare: Free.
