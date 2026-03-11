---
name: docs-stack
description: Use when researching external library documentation for this project (via WebFetch, WebSearch, or context7). Saves key patterns and gotchas to docs/stack/ so future sessions skip the web search. Also use when a new gotcha is found during implementation that contradicts or extends existing docs.
license: Apache-2.0
version: 1.0.0
---

# docs-stack — Save and Update Stack Documentation

## Overview

Whenever external docs are fetched for a library this project uses, save the relevant portions to `docs/stack/{library}.md`. This prevents repeated web searches for the same patterns across sessions.

## Trigger Conditions

**Save docs when:**
- WebFetch/WebSearch/context7 is used to research a library in the stack
- A new pattern, gotcha, or breaking change is discovered during implementation
- A doc file exists but the newly found info contradicts or extends it

**Skip when:**
- Docs are for a one-off CLI tool or utility not in package.json
- The info is already fully captured in the existing doc file

## What to Save

For each library, capture:
1. **Version** — from `package.json` (document the actual version in use)
2. **Key patterns** — copy-paste ready code snippets with file paths as comments
3. **Gotchas** — things that burned time, non-obvious requirements, breaking changes
4. **References** — direct links to specific doc sections (not homepages)

Omit: tutorial prose, marketing copy, features not used in the project.

## File Locations

| What | Where |
|------|-------|
| Stack doc files | `docs/stack/{library-name}.md` |
| Index | `docs/stack/README.md` |

**Naming convention:** Use lowercase, hyphenated library name matching the npm package (e.g., `nextjs-15.md`, `drizzle-orm.md`, `fastify-5.md`).

## Template for New Doc Files

```markdown
# {Library Name} — Stack Documentation

> Version used: `{package}@{version}` (resolved: {exact version})
> Last updated: {YYYY-MM-DD}
> Source: {official docs homepage}

---

## {Topic / Feature}

{1-2 sentence context}

```{lang}
// Pattern with inline comments
```

**Gotcha:** {non-obvious issue}

**Reference:** {direct URL to specific doc section}

---
```

## How to Update Existing Files

When a file already exists and new info is found:
1. **Add a new section** at the bottom for new topics
2. **Add a Gotcha** note to an existing section if a new pitfall is discovered
3. **Update version** in the header if the library was upgraded
4. **Do NOT** overwrite correct existing content — merge, don't replace

After updating, also check `docs/stack/README.md`:
- Update `Last Updated` date in the table row
- Add a new row if the library wasn't listed yet

## README.md Index Table

Keep this table accurate in `docs/stack/README.md`:

```markdown
| File | Library | Version | Last Updated |
|------|---------|---------|-------------|
| [nextjs-15.md](./nextjs-15.md) | Next.js | ^15.0.0 | {date} |
```

## Quick Reference — Existing Files

| Library | File | Key Sections |
|---------|------|-------------|
| Next.js 15 | `docs/stack/nextjs-15.md` | searchParams Promise, useSearchParams/Suspense, Vitest mocking |
| Fastify 5 | `docs/stack/fastify-5.md` | TypeBox plugin pattern, response schema, async plugin eslint |
| Drizzle ORM | `docs/stack/drizzle-orm.md` | dual-schema, cursor pagination, noUncheckedIndexedAccess |

**Before fetching external docs:** Check this table — the info may already be saved.
