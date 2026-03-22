# Google Stitch Design Sync — Integration Design

**Date**: 2026-03-22
**Status**: Approved
**Approach**: Hook-Driven Auto-Sync (Bidirectional)

## Problem

The PAH project has a complete design system (tokens.css, dark mode, typography, components) but no visual design tool integration. Design changes in code are invisible until rendered in the browser. There is no way for non-developers to preview or iterate on the visual design collaboratively.

## Solution

Integrate Google Stitch as a bidirectional visual design companion. Code changes auto-push to Stitch via hooks; Stitch iterations pull back to code via skills. The `.stitch/DESIGN.md` file serves as the shared contract between both sides.

## Architecture

```
Code (tokens.css, components)
    ↓ PostToolUse hook (auto)
    ↓ scripts/stitch-sync-push.mjs
    ↓ Regenerates .stitch/DESIGN.md
    ↓ @google/stitch-sdk → sync to Stitch
    ↕
.stitch/DESIGN.md (committed, shared contract)
    ↕
Stitch (stitch.withgoogle.com)
    ↑ /stitch-pull skill (manual)
    ↑ MCP tools → extract_design_context
    ↑ Apply token changes → tokens.css
    ↓ Code
```

---

## Section 1: Base Infrastructure

### 1.1 Stitch MCP Server (Official Remote HTTP)

Endpoint: `https://stitch.googleapis.com/mcp`
Auth: API Key via `X-Goog-Api-Key` header

Configuration in `.mcp.json`:

```json
{
  "stitch": {
    "type": "http",
    "url": "https://stitch.googleapis.com/mcp",
    "headers": {
      "X-Goog-Api-Key": "${STITCH_API_KEY}"
    }
  }
}
```

Official MCP tools:

| Tool | Description |
|------|-------------|
| `create_project` | Create new Stitch project |
| `generate_screen_from_text` | Generate screen from text prompt |
| `get_screen` | Fetch specific screen data |
| `list_projects` | List accessible projects |
| `list_screens` | List screens in a project |
| `get_screen_code` | Download screen HTML |
| `get_screen_image` | Download screenshot as base64 |
| `extract_design_context` | Extract Design DNA (fonts, colors, layouts) |

### 1.2 Stitch SDK (`@google/stitch-sdk`)

Dev dependency in monorepo root for sync scripts.

Key APIs:

- `stitch.project(id).generate(prompt)` — generate screens
- `screen.getHtml()` / `screen.getImage()` — extract content
- `screen.edit(prompt)` — modify existing screens
- `screen.variants(prompt, options)` — generate alternatives
- `stitchTools()` — AI SDK integration
- `StitchProxy` — local MCP proxy server

Auth: `STITCH_API_KEY` env var (auto-read by SDK).

### 1.3 Official Skills (`google-labs-code/stitch-skills`)

```bash
npx skills add google-labs-code/stitch-skills --skill design-md --global
npx skills add google-labs-code/stitch-skills --skill stitch-design --global
npx skills add google-labs-code/stitch-skills --skill react-components --global
```

- **`design-md`**: Analyze Stitch project → extract tokens → generate DESIGN.md
- **`stitch-design`**: Unified entry point (prompt enhancement + generation + synthesis)
- **`react-components`**: Convert Stitch screens → React components with design tokens

### 1.4 Environment Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `STITCH_API_KEY` | MCP, SDK, hooks | Google Stitch API key |
| `STITCH_PROJECT_ID` | hooks, skills | PAH project ID in Stitch |

### 1.5 Effective Prompting (Official Best Practices)

Reference: <https://stitch.withgoogle.com/docs/learn/prompting/>

Rules for all Stitch interactions:

1. Zoom-out/Zoom-in: Product context first, then screen details
2. One change at a time: Focused prompts per component/screen
3. Clear UI terminology: "navigation bar", "CTA", "card grid"
4. Vibe adjectives: "Clean, neutral, trustworthy government transparency portal"
5. Concrete visual references: Screenshots/URLs over vague descriptions
6. Incremental iteration: Refine, don't recreate

---

## Section 2: Hooks and Bidirectional Sync

### 2.1 Code → Stitch (Auto-push via PostToolUse hook)

**Monitored file patterns:**

```
apps/web/src/styles/tokens.css
apps/web/src/styles/globals.css
apps/web/src/components/ui/**
apps/web/src/components/navigation/**
apps/web/src/components/theme-*.tsx
apps/web/tailwind.config.ts
docs/prd/frontend_design_prd.md
```

**Hook flow:**

1. Detect design file edit (pattern match on `file_path`)
2. Run `scripts/stitch-sync-push.mjs`:
   - Parse tokens.css + globals.css + tailwind.config.ts
   - Compare with current `.stitch/DESIGN.md`
   - If changed: regenerate DESIGN.md
   - If `STITCH_API_KEY` available: sync via SDK
3. Return status as `additionalContext`

**Hook config** (project settings.json):

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/stitch-sync-push.mjs",
            "timeout": 15000
          }
        ]
      }
    ]
  }
}
```

**Graceful fallback:** Without `STITCH_API_KEY`, regenerates DESIGN.md locally only.

### 2.2 Stitch → Code (Pull via `/stitch-pull` skill)

1. `list_screens` → list modified screens
2. `get_screen_code` → download HTML per screen
3. `extract_design_context` → extract Design DNA
4. Compare with `.stitch/DESIGN.md`
5. Apply changes to tokens.css, globals.css, tailwind.config.ts
6. Update `.stitch/DESIGN.md`

### 2.3 Bidirectional Reconciliation (`/stitch-sync` skill)

1. Read local state (tokens.css → DESIGN.md)
2. Read remote state (Stitch MCP → extract_design_context)
3. Compare both sides
4. If conflicts: present diff, ask user for resolution
5. Apply resolution to both sides
6. Commit updated DESIGN.md

### 2.4 New Design Work (`/stitch-design` skill)

1. Read `.stitch/DESIGN.md` for context
2. Build prompt following Effective Prompting guidelines
3. `generate_screen_from_text` via MCP
4. Present screenshot via `get_screen_image`
5. If approved: pull HTML via `get_screen_code`, translate to React

### 2.5 PR Gate

Add to `finishing-a-development-branch` skill:

- If design files changed in branch, verify `.stitch/DESIGN.md` is up to date
- Warning on uncommitted DESIGN.md diff

---

## Section 3: File Structure and DESIGN.md Template

### 3.1 New Files

```
.stitch/
  DESIGN.md                    # Bidirectional contract (committed)
scripts/
  stitch-sync-push.mjs        # Hook script
.claude/skills/
  stitch-pull/SKILL.md         # Pull from Stitch
  stitch-sync/SKILL.md         # Bidirectional reconciliation
  stitch-design/SKILL.md       # New design work in Stitch
.agents/skills/
  stitch-pull/SKILL.md         # Replica
  stitch-sync/SKILL.md         # Replica
  stitch-design/SKILL.md       # Replica
```

### 3.2 DESIGN.md Template

See `.stitch/DESIGN.md` — contains full design system: product context, constraints (political neutrality), color palette (light + dark), typography, spacing, border radius, animation timing, and component patterns (navigation, cards, buttons, scores, tables).

### 3.3 Git

- `.stitch/DESIGN.md` is committed (shared contract)
- `.stitch/cache/` and `.stitch/.credentials` in `.gitignore`

---

## Section 4: PRD Integration

Add as **Phase 11** to RF-018 PRD (after Phase 10: Skills + CI/CD + Docs):

**Phase 11: Stitch Design Sync**

- Depends on: Phase 5 (components), Phase 1 (tokens), Phase 10 (skills infrastructure)
- Scope: MCP setup, SDK install, DESIGN.md generation, push hook, pull/sync/design skills, PR gate
- Success: DESIGN.md generated and imported in Stitch; hook fires on token edits; /stitch-pull works; Stitch project shows all 5 PAH pages

---

## References

- Official Docs: <https://stitch.withgoogle.com/docs/>
- MCP Setup: <https://stitch.withgoogle.com/docs/mcp/setup/>
- DESIGN.md: <https://stitch.withgoogle.com/docs/design-md/overview>
- Effective Prompting: <https://stitch.withgoogle.com/docs/learn/prompting/>
- SDK: <https://github.com/google-labs-code/stitch-sdk>
- Skills: <https://github.com/google-labs-code/stitch-skills>
- Google Blog: <https://developers.googleblog.com/stitch-a-new-way-to-design-uis/>
