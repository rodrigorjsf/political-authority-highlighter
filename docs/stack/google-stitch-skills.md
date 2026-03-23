# Google Stitch Agent Skills — Stack Documentation

> Last updated: 2026-03-22
> Source: <https://github.com/google-labs-code/stitch-skills>
> License: Apache-2.0

---

## Overview

Official agent skills for [Google Stitch](https://stitch.withgoogle.com/), a design-to-code platform. Each skill follows the **Agent Skills open standard**, making them compatible with Claude Code, Gemini CLI, Cursor, and other MCP-compatible coding agents.

The skills enable a workflow where Stitch generates high-fidelity UI designs (HTML/CSS/screenshots) from text prompts, and agent skills orchestrate prompt enhancement, design system documentation, iterative generation, and conversion to framework-specific code (React, shadcn/ui, Remotion video).

All skills communicate with Stitch via **Stitch MCP Server** tools (`list_projects`, `list_screens`, `get_screen`, `generate_screen_from_text`, `edit_screens`, etc.).

---

## Installation

Install any skill using the `skills` CLI. It auto-detects your active coding agent and places the skill in the correct directory.

```bash
# List all available skills in the repository
npx skills add google-labs-code/stitch-skills --list

# Install a specific skill globally
npx skills add google-labs-code/stitch-skills --skill <skill-name> --global
```

Skill names for install:

| Skill | Install Name |
|-------|-------------|
| design-md | `design-md` |
| stitch-design | `stitch-design` |
| react-components | `react:components` |
| enhance-prompt | `enhance-prompt` |
| stitch-loop | `stitch-loop` |
| remotion | `remotion` |
| shadcn-ui | `shadcn-ui` |

---

## Available Skills

### design-md

**Purpose:** Analyze Stitch projects and generate comprehensive `DESIGN.md` files documenting the design system in semantic, natural language optimized for Stitch screen generation.

**Allowed tools:** `stitch*:*`, `Read`, `Write`, `web_fetch`

**5-Stage Pipeline:**

1. **Extract Project Identity** — Locate project title and ID from Stitch MCP metadata
2. **Define the Atmosphere** — Evaluate screenshots and HTML to capture the overall "vibe" using evocative adjectives (e.g., "Airy," "Minimalist," "Utilitarian")
3. **Map the Color Palette** — Identify key colors with descriptive natural-language names + hex codes + functional roles (e.g., "Deep Muted Teal-Navy (#294056) for primary actions")
4. **Translate Geometry & Shape** — Convert technical CSS/Tailwind values into physical descriptions (`rounded-full` becomes "Pill-shaped," `rounded-lg` becomes "Subtly rounded corners")
5. **Describe Depth & Elevation** — Document shadow styles and layering strategy ("Flat," "Whisper-soft diffused shadows," etc.)

**Output format** (saved to `.stitch/DESIGN.md`):

```markdown
# Design System: [Project Title]
**Project ID:** [ID]

## 1. Visual Theme & Atmosphere
## 2. Color Palette & Roles
## 3. Typography Rules
## 4. Component Stylings (Buttons, Cards, Inputs)
## 5. Layout Principles
```

**Retrieval flow:**

1. Discover Stitch MCP namespace via `list_tools`
2. `list_projects` (filter: `view=owned`) to find project
3. `list_screens` to find target screens
4. `get_screen` for metadata (screenshot URL, HTML URL, dimensions, `designTheme`)
5. Download HTML via `web_fetch` and parse Tailwind classes, custom CSS, component patterns
6. `get_project` for project-level `designTheme` (color mode, fonts, roundness, custom colors)

**Usage prompts:**

- "Analyze my Stitch project and generate a DESIGN.md"
- "Create a design system document from the Home screen"

---

### stitch-design

**Purpose:** Unified entry point for all Stitch design work. Handles prompt enhancement, design system synthesis, and high-fidelity screen generation/editing via Stitch MCP.

**Allowed tools:** `StitchMCP`, `Read`, `Write`

**Core responsibilities:**

1. **Prompt Enhancement** — Transform rough intent into structured prompts with professional UI/UX terminology
2. **Design System Synthesis** — Analyze existing projects to create `.stitch/DESIGN.md`
3. **Workflow Routing** — Route user requests to the correct specialized workflow
4. **Consistency Management** — Ensure all new screens use the project's established visual language
5. **Asset Management** — Download generated HTML and screenshots to `.stitch/designs/`

**Three workflows** (in `workflows/` directory):

| User Intent | Workflow File | Primary MCP Tool |
|:---|:---|:---|
| "Design a [page]..." | `text-to-design.md` | `generate_screen_from_text` |
| "Edit this [screen]..." | `edit-design.md` | `edit_screens` |
| "Create/Update DESIGN.md" | `generate-design-md.md` | `get_screen` + `Write` |

**Prompt Enhancement Pipeline** (runs before every generation/edit):

1. **Analyze Context** — Check for `.stitch/DESIGN.md`; if absent, suggest `generate-design-md` workflow
2. **Refine Terminology** — Replace vague terms with professional UI/UX keywords (e.g., "nice header" becomes "Sticky navigation bar with glassmorphism effect and centered logo")
3. **Structure the Final Prompt** — Format as: overall vibe + DESIGN SYSTEM block (palette, styles) + PAGE STRUCTURE (numbered sections)
4. **Present AI Insights** — Surface `outputComponents` (text description and suggestions) to the user after every tool call

**Reference files** (in `references/`):

- `tool-schemas.md` — Stitch MCP tool call schemas
- `design-mappings.md` — UI/UX keyword translations
- `prompt-keywords.md` — Technical terms Stitch understands best

---

### react-components

**Purpose:** Convert Stitch design screens into modular React + TypeScript component systems with automated AST-based validation and design token consistency.

**Allowed tools:** `stitch*:*`, `Bash`, `Read`, `Write`, `web_fetch`

**Architectural rules:**

- **Modular components** — Break designs into independent files; no monolithic single-file outputs
- **Logic isolation** — Event handlers and business logic go into custom hooks in `src/hooks/`
- **Data decoupling** — All static text, image URLs, and lists go into `src/data/mockData.ts`
- **Type safety** — Every component must include a `Readonly<T>` TypeScript interface named `[ComponentName]Props`
- **Style mapping** — Extract `tailwind.config` from the HTML `<head>`, sync with `resources/style-guide.json`, use theme-mapped Tailwind classes instead of arbitrary hex codes

**Execution steps:**

1. **Environment setup** — `npm install` if `node_modules` is missing
2. **Data layer** — Create `src/data/mockData.ts` from design content
3. **Component drafting** — Use `resources/component-template.tsx` as base template (replace all `StitchComponent` placeholders)
4. **Application wiring** — Update `App.tsx` to render new components
5. **Quality check** — Run `npm run validate <file_path>` per component; verify against `resources/architecture-checklist.md`; start dev server for visual verification

**Architecture checklist** (quality gate):

- Logic extracted to custom hooks in `src/hooks/`
- No monolithic files; atomic/composite modularity
- All static text/URLs in `src/data/mockData.ts`
- Props use `Readonly<T>` interfaces
- Valid TypeScript syntax
- Dark mode (`dark:`) applied to all color classes
- No hardcoded hex values; theme-mapped Tailwind classes only

**Asset download:** Uses `scripts/fetch-stitch.sh` for reliable downloads from Google Cloud Storage (handles redirects and security handshakes). Screenshot URLs need `=w{width}` suffix appended for full resolution.

**Scripts:**

- `scripts/fetch-stitch.sh` — Reliable Stitch asset downloader (handles GCS redirects)
- `scripts/validate.js` — AST-based component validation

**Resources:**

- `resources/component-template.tsx` — Base component template
- `resources/style-guide.json` — Design token mappings
- `resources/architecture-checklist.md` — Quality gate checklist
- `resources/stitch-api-reference.md` — Stitch API reference

---

### enhance-prompt

**Purpose:** Transform vague UI ideas into polished, Stitch-optimized prompts. Enhances specificity, adds UI/UX keywords, injects design system context, and structures output for better generation results.

**Allowed tools:** `Read`, `Write`

**When to use:**

- Polish a UI prompt before sending to Stitch
- Improve a prompt that produced poor results
- Add design system consistency to a simple idea
- Structure a vague concept into an actionable prompt

**Enhancement pipeline (4 steps):**

1. **Assess the Input** — Check for missing elements: platform, page type, structure, visual style, colors, components
2. **Check for DESIGN.md** — If `.stitch/DESIGN.md` exists, extract and incorporate design system tokens. If not, add a tip suggesting the `design-md` skill.
3. **Apply Enhancements:**
   - **Add UI/UX Keywords** — "menu at the top" becomes "navigation bar with logo and menu items"; "button" becomes "primary call-to-action button"
   - **Amplify the Vibe** — "modern" becomes "clean, minimal, with generous whitespace"; "dark mode" becomes "dark theme with high-contrast accents on deep backgrounds"
   - **Structure the Page** — Organize into numbered sections (Header, Hero, Content, Footer)
   - **Format Colors** — "Descriptive Name (#hexcode) for functional role"
4. **Format the Output** — One-line description + DESIGN SYSTEM block + Page Structure

**Example transformation:**

- Input: "make me a login page"
- Output: Structured prompt with platform (Web, Desktop-first), theme (Light, minimal, professional), 5 named colors with hex codes, 4 numbered page sections, component details

**Output options:**

- Default: return enhanced prompt as text
- Optional: write to `next-prompt.md` (for use with `stitch-loop` skill) or custom filename

---

### stitch-loop

**Purpose:** Generate complete multi-page websites from a single prompt using Stitch, with an autonomous baton-passing loop pattern. Each iteration reads a task from `.stitch/next-prompt.md`, generates a page, integrates it, and writes the next task.

**Allowed tools:** `stitch*:*`, `chrome*:*`, `Read`, `Write`, `Bash`

**Key concepts:**

- **Baton system** — `.stitch/next-prompt.md` (YAML frontmatter with `page` field + prompt body) acts as a relay between iterations
- **Context files** — `.stitch/SITE.md` (site vision, sitemap, roadmap) + `.stitch/DESIGN.md` (visual design system)
- **Metadata persistence** — `.stitch/metadata.json` stores project ID, screen IDs, `designTheme`, canvas positions
- **Orchestration-agnostic** — Can be driven by CI/CD, human-in-loop, agent chains, or manual runs

**Execution protocol:** Read baton, consult context, generate with Stitch MCP, download to `.stitch/designs/`, integrate into `site/public/`, update `.stitch/SITE.md` sitemap, prepare next baton.

**Optional:** Chrome DevTools MCP for visual verification of generated pages.

---

### remotion

**Purpose:** Generate walkthrough videos from Stitch projects using Remotion with smooth transitions, zooming, and text overlays to showcase app screens professionally.

**Allowed tools:** `stitch*:*`, `remotion*:*`, `Bash`, `Read`, `Write`, `web_fetch`

**Workflow:** Retrieve screens from Stitch, download screenshots, set up Remotion project, create `ScreenSlide.tsx` and `WalkthroughComposition.tsx` components, preview in Remotion Studio, render to MP4.

**Patterns:** Simple slide show (fade transitions), feature highlight (zoom + animated circles), user flow (sequential screens with numbered steps).

---

### shadcn-ui

**Purpose:** Expert guidance for integrating and building applications with shadcn/ui components. Helps discover, install, customize, and optimize shadcn/ui components with best practices.

**Allowed tools:** `shadcn*:*`, `mcp_shadcn*`, `Read`, `Write`, `Bash`, `web_fetch`

**Key points:** shadcn/ui is not a library — components are copied into your project for full ownership. Supports both Radix UI and Base UI primitives. Uses `cn()` utility (clsx + tailwind-merge) for class composition.

---

## Skill Structure

Every skill follows a standardized directory structure:

```text
skills/[skill-name]/
├── SKILL.md           # "Mission Control" — main instructions for the agent
│                      #   YAML frontmatter: name, description, allowed-tools
│                      #   Markdown body: overview, steps, examples, tips
├── README.md          # Human-readable documentation
├── scripts/           # Executable tools (validation, networking)
│   ├── fetch-stitch.sh    # (react-components) GCS download handler
│   └── validate.js        # (react-components) AST-based validation
├── resources/         # Knowledge base (checklists, style guides, references)
│   ├── style-guide.json
│   ├── architecture-checklist.md
│   └── component-template.tsx
├── workflows/         # (stitch-design) Sub-workflow definitions
│   ├── text-to-design.md
│   ├── edit-design.md
│   └── generate-design-md.md
├── references/        # (stitch-design, enhance-prompt) Reference data
│   ├── design-mappings.md
│   ├── prompt-keywords.md
│   └── tool-schemas.md
└── examples/          # "Gold Standard" syntactically valid references
```

**SKILL.md frontmatter format:**

```yaml
---
name: skill-name          # or namespaced: react:components
description: One-line description of what the skill does
allowed-tools:
  - "stitch*:*"           # glob patterns for MCP tool access
  - "Read"
  - "Write"
---
```

---

## Compatibility

| Agent | Support |
|-------|---------|
| Claude Code | Full support (primary target) |
| Gemini CLI | Full support |
| Cursor | Full support |
| Antigravity | Full support |
| Any MCP-compatible agent | Should work via Agent Skills open standard |

---

## Usage in This Project

- `design-md`: Used to generate `.stitch/DESIGN.md` from Stitch project analysis, capturing the project's visual language for consistent screen generation
- `stitch-design`: Used by `/stitch-design` skill as the unified entry point for new design work — prompt enhancement, generation, and editing
- `react-components`: Used to convert Stitch screens to React components matching project design tokens (with adaptations for our Next.js 15 + Tailwind v4 stack)

---

## Gotchas

- **Screenshot resolution**: Google CDN serves low-res thumbnails by default. Always append `=w{width}` to `screenshot.downloadUrl` (where `{width}` is the screen's `width` metadata) before downloading
- **GCS download failures**: Internal AI fetch tools can fail on Google Cloud Storage domains. Use the `scripts/fetch-stitch.sh` shell script from `react-components` for reliable downloads with redirect handling
- **Stitch MCP namespace**: The prefix varies by setup (e.g., `mcp_stitch:`, `stitch:`, `mcp_StitchMCP_`). Always run `list_tools` first to discover the correct prefix
- **DESIGN.md location**: `design-md` skill writes to project root by default; `stitch-loop` expects it at `.stitch/DESIGN.md`. Ensure consistent paths
- **react-components install name**: Uses `react:components` (colon separator), not `react-components`
- **Prompt enhancement is mandatory**: `stitch-design` requires running the prompt enhancement pipeline before every `generate_screen_from_text` or `edit_screens` call
- **Stitch MCP IDs**: `get_screen` and `list_screens` expect numeric IDs only (e.g., `13534454087919359824`), not the full resource path (`projects/13534454087919359824`)
- **pg-boss metadata.json**: `stitch-loop` persists all Stitch identifiers in `.stitch/metadata.json`. Losing this file means losing the mapping between page names and screen IDs

---

## References

- Repository: <https://github.com/google-labs-code/stitch-skills>
- Stitch Platform: <https://stitch.withgoogle.com/>
- Stitch Effective Prompting Guide: <https://stitch.withgoogle.com/docs/learn/prompting/>
- Stitch Documentation: <https://stitch.withgoogle.com/docs/>
- Agent Skills Open Standard: referenced in repo README (no standalone URL)
- Skills CLI: `npx skills add` (from `@anthropic-ai/skills` or similar)
