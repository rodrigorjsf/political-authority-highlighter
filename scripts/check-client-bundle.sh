#!/usr/bin/env bash
set -euo pipefail

CLIENT_CHUNKS_DIR="apps/web/.next/static/chunks"

if [ ! -d "$CLIENT_CHUNKS_DIR" ]; then
  echo "ERROR: $CLIENT_CHUNKS_DIR does not exist. Run 'pnpm build' first."
  exit 1
fi

FORBIDDEN_PATTERNS=(
  "drizzle-orm"
  "@pah/db"
  "public-schema"
  "internal-schema"
  "pg-boss"
  "CPF_ENCRYPTION_KEY"
  "DATABASE_URL"
  "VERCEL_REVALIDATE_TOKEN"
)

FOUND=0

for pattern in "${FORBIDDEN_PATTERNS[@]}"; do
  if grep -rl "$pattern" "$CLIENT_CHUNKS_DIR" 2>/dev/null; then
    echo "SECURITY VIOLATION: Found '$pattern' in client bundle!"
    FOUND=1
  fi
done

if [ "$FOUND" -eq 1 ]; then
  echo ""
  echo "Client bundle check FAILED: forbidden patterns found in client chunks."
  exit 1
fi

echo "Client bundle check passed: no forbidden patterns found."
exit 0
