# Google Stitch MCP Server — Stack Documentation

> Last updated: 2026-03-22
> Sources: <https://stitch.withgoogle.com/docs/mcp/setup/>, <https://stitch.withgoogle.com/docs/mcp/guide/>, <https://github.com/davideast/stitch-mcp>, <https://github.com/google-labs-code/stitch-sdk>, <https://github.com/google-labs-code/stitch-skills>

---

## Overview

Google Stitch is a Google Labs experiment powered by Gemini that generates professional UI designs and frontend HTML/CSS from text prompts. The Stitch MCP server exposes design generation, project management, and design context extraction tools via the Model Context Protocol, enabling AI coding agents (Claude Code, Cursor, Gemini CLI, etc.) to interact with Stitch programmatically.

There are two ways to connect:

1. **Official Remote HTTP Server** — Google-hosted at `stitch.googleapis.com/mcp`, authenticated via API key. Zero local dependencies.
2. **Local Proxy via `@_davideast/stitch-mcp`** — NPX-based proxy that wraps the remote server and adds higher-level "virtual" tools (`build_site`, `get_screen_code`, `get_screen_image`). Supports both API key and OAuth authentication.

This project uses **Option 1** (remote HTTP) for simplicity, with the proxy available as a fallback.

---

## Server Configuration

### Option 1: Official Remote HTTP Server (Recommended)

- **Endpoint**: `https://stitch.googleapis.com/mcp`
- **Transport**: HTTP (Streamable HTTP)
- **Auth**: API Key via `X-Goog-Api-Key` header

#### Claude Code CLI Setup

```bash
claude mcp add stitch \
  --transport http \
  https://stitch.googleapis.com/mcp \
  --header "X-Goog-Api-Key: ${STITCH_API_KEY}" \
  -s project
```

The `-s project` flag scopes the server to this project only (writes to `.mcp.json`). Use `-s user` for global configuration.

#### `.mcp.json` Configuration

```json
{
  "mcpServers": {
    "stitch": {
      "type": "http",
      "url": "https://stitch.googleapis.com/mcp",
      "headers": {
        "Accept": "application/json",
        "X-Goog-Api-Key": "${STITCH_API_KEY}"
      }
    }
  }
}
```

### Option 2: Local Proxy (`@_davideast/stitch-mcp`)

The proxy wraps the remote server and adds virtual tools. Useful for `build_site` or if OAuth is preferred over API keys.

#### `.mcp.json` Configuration

```json
{
  "mcpServers": {
    "stitch": {
      "command": "npx",
      "args": ["@_davideast/stitch-mcp", "proxy"]
    }
  }
}
```

The proxy reads `STITCH_API_KEY` from the environment. If not set, it falls back to OAuth via `gcloud auth application-default login`.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `STITCH_API_KEY` | Yes | API key from Stitch Settings (stitch.withgoogle.com > Profile > Stitch Settings) |
| `STITCH_PROJECT_ID` | No | Default project ID for hooks/skills (avoids repeated `list_projects` calls) |
| `STITCH_ACCESS_TOKEN` | No | Pre-existing OAuth token (alternative to API key) |
| `STITCH_USE_SYSTEM_GCLOUD` | No | Set to `1` to use system gcloud config for OAuth |
| `STITCH_HOST` | No | Custom API endpoint (overrides default `stitch.googleapis.com`) |
| `GOOGLE_CLOUD_PROJECT` | No | GCP project ID (needed only for OAuth flow, not API key) |

### Getting an API Key

1. Go to <https://stitch.withgoogle.com>
2. Click profile picture (top right) > **Stitch Settings**
3. Generate API Key
4. Add to `.env.local`: `STITCH_API_KEY=your-key-here`

---

## Available MCP Tools

The remote server at `stitch.googleapis.com/mcp` exposes the following tools. Parameter schemas below are reconstructed from the SDK source (`@google/stitch-sdk@0.0.3`), official documentation, and community implementations.

### `create_project`

Creates a new Stitch project (workspace).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `title` | `string` | No | Project title. Defaults to auto-generated name if omitted. |

**Returns**: Project object with `projectId`, `title`, `createTime`.

**SDK equivalent**: `stitch.createProject(title?)`

---

### `list_projects`

Lists all accessible Stitch projects for the authenticated user.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| (none) | — | — | No parameters required. |

**Returns**: Array of project objects (`projectId`, `title`, `createTime`, `screenCount`).

**SDK equivalent**: `stitch.projects()`

---

### `get_project`

Retrieves metadata for a specific project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | `string` | Yes | The project ID. |

**Returns**: Project object with full metadata.

**SDK equivalent**: `stitch.project(id)` (lazy reference, fetches on property access)

---

### `list_screens`

Lists all screens within a specific project.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | `string` | Yes | The project ID containing the screens. |

**Returns**: Array of screen objects (`screenId`, `title`, `deviceType`, `createTime`, `modelId`).

**SDK equivalent**: `project.screens()`

---

### `get_screen`

Retrieves metadata for a specific screen.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | `string` | Yes | The project ID. |
| `screenId` | `string` | Yes | The screen ID. |

**Returns**: Screen object with metadata (title, deviceType, dimensions, model used).

**SDK equivalent**: `project.getScreen(screenId)`

---

### `generate_screen_from_text`

Generates a new UI screen from a text prompt using Gemini models.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | `string` | Yes | The project to generate the screen in. |
| `prompt` | `string` | Yes | Natural language description of the desired UI. |
| `deviceType` | `string` | No | Target device. One of: `"MOBILE"`, `"DESKTOP"`, `"TABLET"`, `"AGNOSTIC"`. Default: `"DESKTOP"`. |
| `modelId` | `string` | No | Gemini model to use. One of: `"GEMINI_3_PRO"`, `"GEMINI_3_FLASH"`. Default: `"GEMINI_3_FLASH"`. |

**Returns**: Screen object with `screenId`, plus access to generated HTML and screenshot.

**SDK equivalent**: `project.generate(prompt, deviceType?)`

**Prompting tips** (from <https://stitch.withgoogle.com/docs/learn/prompting/>):

- Start with product context, then zoom into screen details.
- One change at a time for focused iterations.
- Use concrete UI terminology: "navigation bar", "CTA button", "card grid".
- Include vibe adjectives: "clean, neutral, trustworthy".
- Reference existing screens for visual consistency.

---

### `get_screen_code`

Downloads the generated HTML/CSS code for a screen.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | `string` | Yes | The project ID. |
| `screenId` | `string` | Yes | The screen ID. |

**Returns**: String containing the full HTML/CSS frontend code.

**SDK equivalent**: `screen.getHtml()` (returns download URL)

---

### `get_screen_image`

Downloads a high-resolution screenshot of a screen as base64-encoded data.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | `string` | Yes | The project ID. |
| `screenId` | `string` | Yes | The screen ID. |

**Returns**: Base64-encoded image string (PNG).

**SDK equivalent**: `screen.getImage()` (returns download URL)

---

### `extract_design_context`

Scans a screen and extracts its "Design DNA" — fonts, colors, layouts, and component patterns. Used to maintain visual consistency when generating new screens.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | `string` | Yes | The project ID. |
| `screenId` | `string` | Yes | The screen to extract context from. |

**Returns**: Design context object containing:

- **Colors**: Extracted palette (aligned with Tailwind naming)
- **Typography**: Font families, weights, sizes
- **Layouts**: Spacing, structural patterns (headers, navbars, cards, buttons)

**Recommended workflow** (2-step consistency pattern):

1. **Extract**: `extract_design_context` from an existing reference screen
2. **Generate**: Pass the extracted context in the prompt of `generate_screen_from_text`

---

### Proxy-Only Virtual Tools

These tools are only available when using the `@_davideast/stitch-mcp` proxy (Option 2), not the direct remote server.

#### `build_site`

Builds a multi-page site from a project by mapping screens to routes.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `projectId` | `string` | Yes | The project ID. |
| `routes` | `array` | Yes | Array of `{ screenId: string, route: string }` objects mapping screens to URL paths. |

**Returns**: Object with design HTML for each route.

---

### Additional SDK-Only Methods (Not MCP Tools)

These are available via the `@google/stitch-sdk` programmatic API but not exposed as MCP tools:

| Method | Description |
|--------|-------------|
| `screen.edit(prompt, deviceType?, modelId?)` | Modify an existing screen |
| `screen.variants(prompt, variantOptions, deviceType?, modelId?)` | Generate design variations (1-5 variants) |
| `stitchTools({ include? })` | Vercel AI SDK integration (from `@google/stitch-sdk/ai`) |
| `new StitchProxy({ apiKey })` | Run a local MCP proxy server |

Variant options: `variantCount` (1-5, default 3), `creativeRange` (`"REFINE"` | `"EXPLORE"` | `"REIMAGINE"`), `aspects` (`"LAYOUT"` | `"COLOR_SCHEME"` | `"IMAGES"` | `"TEXT_FONT"` | `"TEXT_CONTENT"`).

See `docs/stack/google-stitch-sdk.md` for full SDK documentation.

---

## Official Agent Skills

Install via the `skills` CLI from `google-labs-code/stitch-skills`:

```bash
npx skills add google-labs-code/stitch-skills --skill design-md --global
npx skills add google-labs-code/stitch-skills --skill stitch-design --global
npx skills add google-labs-code/stitch-skills --skill react-components --global
```

| Skill | Purpose |
|-------|---------|
| `design-md` | Analyze Stitch project, extract tokens, generate `DESIGN.md` |
| `stitch-design` | Unified entry point: prompt enhancement + generation + synthesis |
| `stitch-loop` | Create complete multi-page websites from single prompts |
| `enhance-prompt` | Transform vague concepts into optimized Stitch prompts |
| `react-components` | Convert Stitch screens to React component systems |
| `remotion` | Generate walkthrough videos from projects |
| `shadcn-ui` | Guidance for integrating shadcn/ui components |

The CLI auto-detects the active coding agent and places skill files in the appropriate directory.

---

## Usage in This Project

The MCP server is configured in `.mcp.json` and used by:

- **PostToolUse hook** (`scripts/stitch-sync-push.mjs`) — auto-pushes design token changes to Stitch when design files are edited
- **`/stitch-pull` skill** — pulls design changes from Stitch back to code (tokens.css, globals.css, tailwind.config.ts)
- **`/stitch-sync` skill** — bidirectional reconciliation between local tokens and Stitch project state
- **`/stitch-design` skill** — new design work: generates screens in Stitch, previews screenshots, translates to React

The shared contract between code and Stitch is `.stitch/DESIGN.md` (committed to git). See `docs/plans/2026-03-22-stitch-design-sync-design.md` for the full integration architecture.

---

## Generation Limits (Free Tier)

Google Stitch is currently free as part of Google Labs (no credit card required):

| Mode | Model | Monthly Limit |
|------|-------|---------------|
| Standard | Gemini Flash | ~350 generations/month |
| Experimental | Gemini Pro | ~50 generations/month |

These limits apply per Google account. The Stitch API (MCP and SDK) shares the same quota as the web interface. Limits may change as the product evolves beyond Labs.

---

## Gotchas

1. **Official docs are a JavaScript SPA** — the pages at `stitch.withgoogle.com/docs/mcp/*` render client-side and cannot be scraped by simple HTTP fetches. Use the web browser directly for reference.

2. **OAuth tokens expire hourly** — if using OAuth instead of API keys, the access token must be refreshed every 60 minutes. API keys are strongly preferred for automation and hooks.

3. **API key generation requires an active Stitch project** — you must have created at least one project on `stitch.withgoogle.com` before the Settings page shows the API key generation option.

4. **`get_screen_code` / `get_screen_image` naming varies** — the official remote server uses `get_screen_code` and `get_screen_image`, while the community MCP wrapper (`Kargatharaakash/stitch-mcp`) uses `fetch_screen_code` and `fetch_screen_image`. The proxy (`@_davideast/stitch-mcp`) uses the `get_` prefix. Always check available tools with `listTools()` after connecting.

5. **Generation timeout is 300 seconds** — the `StitchToolClient` defaults to a 5-minute timeout (`timeout: 300000`). Screen generation with Gemini Pro can take 30-60 seconds; complex prompts may take longer.

6. **`modelId` values changed** — older documentation references `"GEMINI_2_5_PRO"` and `"GEMINI_2_5_FLASH"`. Current values are `"GEMINI_3_PRO"` and `"GEMINI_3_FLASH"`. The server may accept both for backward compatibility.

7. **Design context is per-screen, not per-project** — `extract_design_context` requires a specific `screenId`. To get a full project design system, extract context from your most representative screen.

8. **Node.js 18+ required** — both the SDK and the proxy require Node.js >= 18.

9. **WSL/SSH/Docker OAuth** — in remote environments, the OAuth browser redirect may not work. Use API key auth or set `STITCH_API_KEY` in the environment.

10. **Proxy `init` wizard** — if using the proxy for the first time, run `npx @_davideast/stitch-mcp init` to configure gcloud and OAuth. Run `npx @_davideast/stitch-mcp doctor` to verify the configuration.

---

## References

- Official Docs: <https://stitch.withgoogle.com/docs/>
- MCP Setup: <https://stitch.withgoogle.com/docs/mcp/setup/>
- MCP Guide: <https://stitch.withgoogle.com/docs/mcp/guide/>
- DESIGN.md Docs: <https://stitch.withgoogle.com/docs/design-md/overview>
- Effective Prompting: <https://stitch.withgoogle.com/docs/learn/prompting/>
- SDK (official): <https://github.com/google-labs-code/stitch-sdk>
- Skills (official): <https://github.com/google-labs-code/stitch-skills>
- Proxy CLI (community): <https://github.com/davideast/stitch-mcp>
- Community MCP wrapper: <https://github.com/Kargatharaakash/stitch-mcp>
- Google Blog announcement: <https://developers.googleblog.com/en/stitch-a-new-way-to-design-uis/>
- Google Codelab: <https://codelabs.developers.google.com/design-to-code-with-antigravity-stitch>
