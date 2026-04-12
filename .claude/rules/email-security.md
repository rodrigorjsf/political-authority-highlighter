---
description: Email PII handling — encryption, hashing, shared key between API and pipeline
paths: ["**/*email*", "**/*subscription*", "**/*alert*", "**/*score-alert*"]
---

# Email Security Rules (LGPD)

Email addresses in the alert subscription system are protected personal data.

## Architecture

- **API**: `apps/api/src/crypto/email.ts` — encrypts emails on subscription creation
- **Pipeline**: `apps/pipeline/src/crypto/email.ts` — decrypts emails for score-change notifications
- **DB**: `alertSubscriptions` table in `public` schema (encrypted email + hash)
- **Worker**: `apps/pipeline/src/workers/score-alert.worker.ts`

## Rules

1. Emails encrypted with **AES-256-GCM** at rest — same pattern as CPF
2. Email hash (**SHA-256**) used for dedup/lookup — never store plaintext
3. `EMAIL_ENCRYPTION_KEY` env var must be **identical** in API and pipeline deployments
4. Never log plaintext email addresses
5. Subscription tokens hashed before storage — raw token sent only in confirmation email
6. The subscription endpoints are the **only write operations** in the otherwise read-only API
