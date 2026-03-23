---
description: CPF handling — encryption, hashing, and access rules (LGPD DR-005)
paths: ["**/cpf*", "**/crypto/**", "**/internal*", "**/politician_identifiers*"]
---

# CPF Security Rules (DR-005 — Non-Negotiable)

CPFs are protected personal data under LGPD. Violations are a compliance incident.

1. CPFs exist **only** in `internal_data.politician_identifiers` — never in `public` schema
2. `api_reader` database role has **zero** permissions on `internal_data` — enforced at DB level
3. **Never log, return, or include a CPF** in any API endpoint, response body, log line, or error message
4. Cross-source identity matching uses **SHA-256 hash** — decryption only for admin debugging
5. Encryption key (`CPF_ENCRYPTION_KEY`) is an environment variable — never in code or config files

## Implementation Details

- Crypto module: `apps/pipeline/src/crypto/cpf.ts`
- `encryptCpf(cpf, key)` — AES-256-GCM, IV prepended, stores `IV + AuthTag + Ciphertext`
- `hashCpf(cpf)` — SHA-256 of normalized CPF (digits only, zero-padded to 11)
- CGU source field: `CPF_SERVIDOR` is a raw CPF string — always call `hashCPF(raw.CPF_SERVIDOR)` before any lookup
- Tests: must use `vi.stubEnv({ CPF_ENCRYPTION_KEY: '...' })` before dynamic import of the crypto module
