---
name: project-compliance
description: Legal compliance enforcement for LGPD, LAI, Marco Civil da Internet, and security standards. Use when handling personal data, creating privacy-related features, or configuring security.
---

# Legal Compliance Enforcement

## Purpose

Enforces compliance with Brazilian data protection and transparency laws applicable to the Political Authority Highlighter platform.

## Applicable Laws

| Law | Scope | Key Articles |
|-----|-------|-------------|
| LGPD (Lei 13.709/2018) | Personal data protection | Art. 6, 7, 8, 9, 10, 37, 41, 46 |
| LAI (Lei 12.527/2011) | Access to public information | Art. 3, 8 |
| Marco Civil (Lei 12.965/2014) | Internet framework | Art. 7, 15 |
| Lei da Ficha Limpa (LC 135/2010) | Electoral ineligibility | Used as exclusion filter input |
| Lei 14.129/2021 | Digital Government / Open Data | Art. 29, 30 |

---

## LGPD Compliance Checklist

### A. Legal Basis for Processing Politicians' Public Data

- [ ] Legal basis documented: **Legitimate Interest (Art. 7, IX)** combined with **Publicly Accessible Data (Art. 7, par. 3)**
- [ ] LIA (Legitimate Interest Assessment) document exists at `docs/compliance/LIA.md`
- [ ] LIA includes three-phase balancing test: (i) legitimate purpose, (ii) necessity, (iii) rights balancing + safeguards
- [ ] Processing purpose aligned with public interest and transparency (Art. 7, par. 3)
- [ ] No purpose deviation: data NOT used for marketing, political campaigns, or profiling

### B. Privacy Policy

- [ ] Privacy policy page exists at `/privacidade` (or `/privacy`)
- [ ] Written in pt-BR, clear and accessible language
- [ ] Content includes:
  - Data controller identity and contact
  - DPO (encarregado) contact information
  - Data sources listed (all 6 government APIs)
  - Processing purposes described
  - Legal basis stated (Art. 7, IX + Art. 7, par. 3)
  - Data categories processed
  - Data retention periods
  - Data subject rights (Art. 18): access, correction, deletion, portability
  - Cookie policy
- [ ] Linked from every page (footer)
- [ ] Last update date displayed

### C. DPO (Data Protection Officer / Encarregado)

- [ ] DPO contact information published on the platform
- [ ] Accessible from privacy policy page
- [ ] Email address functional and monitored
- [ ] If qualifying for simplified regime (Resolution CD/ANPD n. 2/2022): alternative contact channel documented

### D. CPF Data Protection

- [ ] CPFs stored encrypted using AES-256-GCM in `internal_data.politician_identifiers`
- [ ] Encryption key stored as environment variable (`CPF_ENCRYPTION_KEY`)
- [ ] SHA-256 hash used for cross-source matching (no decryption needed for matching)
- [ ] `api_reader` database role has ZERO permissions on `internal_data` schema
- [ ] No CPF in API responses, frontend code, URLs, or accessible logs
- [ ] CPF decryption confined to `apps/pipeline/src/crypto/cpf.ts` only

### E. Data Processing Records (Art. 37)

- [ ] Processing activities documented in `docs/compliance/ROPA.md` (Record of Processing Activities)
- [ ] Each processing activity includes: purpose, legal basis, data categories, recipients, retention, security measures
- [ ] Updated when new data sources are added or processing changes

### F. Cookie Consent

- [ ] If analytics/tracking cookies are used: consent banner shown BEFORE cookies are set
- [ ] Essential cookies (no consent needed): session, preferences
- [ ] Non-essential cookies (consent required): analytics (Google Analytics, Plausible, etc.)
- [ ] User can reject non-essential cookies and still use the platform
- [ ] Cookie preferences stored and respected

### G. Data Subject Rights (Art. 18)

If user registration is added post-MVP:

- [ ] Right to access: users can view their data
- [ ] Right to correction: users can update their data
- [ ] Right to deletion: users can delete their account
- [ ] Right to portability: users can export their data
- [ ] Right to revoke consent: clear and accessible procedure
- [ ] Requests processed within 15 days (ANPD recommended timeline)

---

## LAI Compliance Checklist

### Source Attribution

- [ ] Every data point displayed on the platform references its official government source
- [ ] Source URLs point to official `.gov.br`, `.leg.br`, or `.jus.br` domains
- [ ] Data freshness indicator shows when each source was last updated (RF-014)
- [ ] No data from unofficial or private sources (DR-003)

### Respect API Terms

- [ ] Portal da Transparencia rate limits respected: 90 req/min (peak), 300 req/min (off-peak)
- [ ] API key used as required by Portal da Transparencia
- [ ] No scraping of HTML pages when APIs are available
- [ ] Bulk CSV downloads used for large datasets (TSE, CGU-PAD)

---

## Marco Civil da Internet Compliance

### Content Policy

- [ ] No user-generated content about politicians in MVP (out of scope)
- [ ] No comment sections, ratings, or social features
- [ ] If UGC is added post-MVP: implement notice-and-takedown per Art. 19-21

### Log Retention

- [ ] If user authentication is added: server access logs retained for 6 months (Art. 15)
- [ ] Logs stored securely with restricted access
- [ ] Log retention policy documented

---

## Security Baseline

### Transport Security

- [ ] All traffic over HTTPS (TLS 1.2+)
- [ ] Automatic certificate renewal (Caddy/Let's Encrypt)
- [ ] HSTS header enabled (max-age: 31536000, includeSubDomains)
- [ ] SSL Labs grade A or above

### API Security

- [ ] Rate limiting: 60 req/min per IP on all public endpoints
- [ ] Input validation via TypeBox schemas on all parameters
- [ ] Response schemas defined (prevent field leakage via fast-json-stringify)
- [ ] Security headers via Helmet (CSP, X-Frame-Options, etc.)
- [ ] No CORS for API (same-origin) or restricted CORS for frontend domain only

### Secret Management

- [ ] Database passwords in environment variables, never in code
- [ ] Portal da Transparencia API key in environment variable
- [ ] CPF encryption key in environment variable
- [ ] No secrets in git history (`git log -p -- '*.env*'` returns nothing)
- [ ] `.env` files in `.gitignore`
- [ ] Secret scanning enabled in CI/CD pipeline

### Database Security

- [ ] Two PostgreSQL roles enforced:
  - `api_reader`: SELECT only on `public_data` schema
  - `pipeline_admin`: ALL on both schemas
- [ ] No superuser credentials in application code
- [ ] Database not exposed to public internet (Docker internal network)
- [ ] Encrypted connections to database (sslmode=require)

### Frontend Security Baseline

- [ ] Content-Security-Policy header configured in `next.config.ts` headers() (RNF-SEC-011)
- [ ] CSP deployed as `Content-Security-Policy-Report-Only` initially, then enforced after validation
- [ ] CSP policy: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data: https:; font-src 'self'; connect-src 'self' {API_URL}; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests`
- [ ] `server-only` package installed and imported in all `packages/db/src/` modules
- [ ] ESLint `no-restricted-imports` forbids `@pah/db`, `pg`, `drizzle-orm` in `apps/web/`
- [ ] CI post-build scan: grep `.next/static/chunks/` for forbidden patterns
- [ ] Only `NEXT_PUBLIC_API_URL` uses `NEXT_PUBLIC_` prefix
- [ ] All `error.tsx` boundaries show generic messages only
- [ ] Pipeline transformers strip HTML tags from government source text before storing in `public_data`
- [ ] No external scripts without SRI attributes
- [ ] Future auth implementation: httpOnly Secure SameSite=Strict cookies, CSRF protection, RS256 JWT, <=24h session

### Backup and Recovery

- [ ] Daily `pg_dump` automated
- [ ] Backups stored separately from VPS
- [ ] 7-day retention minimum
- [ ] Restore procedure documented and tested
- [ ] RPO: 24 hours, RTO: 4 hours

---

## Compliance Audit Schedule

| Check | Frequency |
|-------|-----------|
| Privacy policy review | Quarterly |
| LIA review | Quarterly or on methodology change |
| Secret scan | Every commit (CI/CD) |
| Dependency audit (`npm audit`) | Weekly |
| CPF leakage check | Every PR (automated) |
| Backup restore test | Monthly |
| SSL certificate validity | Automated (Caddy) |
| Frontend CSP validation | Every deploy (CI) |
| Client bundle leak scan | Every build (CI) |

---

## Changelog

| Date | PRD Version | Summary |
|------|-------------|---------|
| 2026-02-28 | 1.0 | Initial compliance enforcement skill |
| 2026-03-07 | 1.1 | Add Frontend Security Baseline section |
