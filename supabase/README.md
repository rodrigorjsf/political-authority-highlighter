# Supabase Configuration

This directory contains the Supabase CLI configuration for managed infrastructure.

## Migration Flow (Drizzle -> Supabase)

We use **Drizzle ORM** to manage database schemas and migrations.

1.  **Generate Migration**: Run `pnpm --filter @pah/db drizzle-kit generate` to create SQL migrations in `packages/db/migrations`.
2.  **Local Execution**: Local development uses standard Docker Compose (PostgreSQL 16) for dev/prod parity.
3.  **Managed Deployment**: In CI/CD, we use the Supabase CLI to apply migrations to the remote instance:
    ```bash
    npx supabase db push --db-url "$DATABASE_URL"
    ```

## Project Structure

- `config.toml`: CLI configuration (Region, Ports, Versions).
- `migrations/`: (Optional) Can be linked to `packages/db/migrations` if using Supabase local dev.
