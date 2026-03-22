# Google Stitch SDK — Stack Documentation

> Version used: `@google/stitch-sdk@0.0.3`
> Last updated: 2026-03-22
> Source: <https://github.com/google-labs-code/stitch-sdk>

---

## Installation

```bash
pnpm add @google/stitch-sdk
```

For Vercel AI SDK integration (needed for `stitchTools()`):

```bash
pnpm add @google/stitch-sdk ai @ai-sdk/google
```

Requires Node.js >= 18. ESM-only (`"type": "module"`).

Dependencies: `@modelcontextprotocol/sdk@^1.23.0`, `zod@^4.3.5`.

---

## Authentication

The SDK reads `STITCH_API_KEY` from the environment by default. Add to `.env.local`:

```env
STITCH_API_KEY=your-api-key-here
```

You can also pass the key explicitly via config:

```typescript
import { StitchToolClient } from '@google/stitch-sdk'

const client = new StitchToolClient({ apiKey: 'your-api-key' })
```

The SDK also supports OAuth via `accessToken` (injects `Authorization: Bearer` + `X-Goog-User-Project` headers), but API key auth (`X-Goog-Api-Key` header) is the primary method.

### Config Schema (Zod-validated)

```typescript
interface StitchConfig {
  apiKey?: string          // API key authentication
  accessToken?: string     // OAuth token (alternative to apiKey)
  projectId?: string       // Default project ID
  baseUrl: string          // Default: 'https://stitch.googleapis.com/mcp'
  timeout: number          // Default: ms value (check SDK defaults)
}
```

### Environment Variables

| Variable         | Required | Description                                          |
| ---------------- | -------- | ---------------------------------------------------- |
| `STITCH_API_KEY` | Yes      | API authentication key                               |
| `STITCH_BASE_URL`| No       | Override API endpoint (default: production googleapis)|

---

## Exports Map

The package has two entry points:

| Import Path              | Provides                                                      |
| ------------------------ | ------------------------------------------------------------- |
| `@google/stitch-sdk`     | `stitch`, `Stitch`, `Project`, `Screen`, `StitchToolClient`, `StitchProxy`, `StitchError`, `StitchErrorCode`, types |
| `@google/stitch-sdk/ai`  | `stitchTools()` — Vercel AI SDK adapter                       |

---

## Core API

### `stitch` Singleton

Pre-configured instance that reads `STITCH_API_KEY` from environment. Lazily initialized on first access. Exposes both domain methods (from `Stitch` class) AND tool methods (`listTools`, `callTool`, `close` from `StitchToolClient`).

```typescript
import { stitch } from '@google/stitch-sdk'

// Domain API
const projects = await stitch.projects()
const project = stitch.project('4044680601076201931')

// Tool API (low-level)
const tools = await stitch.listTools()
await stitch.callTool('create_project', { title: 'My App' })
```

Type signature:

```typescript
const stitch: Stitch & Pick<StitchToolClient, 'listTools' | 'callTool' | 'close'>
```

### `Stitch` Class

Main entry point. Manages projects.

```typescript
import { Stitch } from '@google/stitch-sdk'
```

| Method                    | Parameters      | Returns             | Description                                |
| ------------------------- | --------------- | ------------------- | ------------------------------------------ |
| `projects()`              | —               | `Promise<Project[]>`| List all accessible projects               |
| `createProject(title?)`   | `title?: string`| `Promise<Project>`  | Create a new project (tool: `create_project`) |
| `project(id)`             | `id: string`    | `Project`           | Reference by ID — **no API call**, returns handle |

### `Project` Class

A Stitch project containing screens.

```typescript
import { Project } from '@google/stitch-sdk'
```

**Properties:**

- `id: string` — Alias for `projectId`
- `projectId: string` — Bare project ID (no `projects/` prefix)
- `data: any` — Raw project data from API

**Methods:**

| Method                              | Returns             | Description                     |
| ----------------------------------- | ------------------- | ------------------------------- |
| `generate(prompt, deviceType?, modelId?)` | `Promise<Screen>`   | Generate screen from text prompt |
| `screens()`                         | `Promise<Screen[]>` | List all screens in project     |
| `getScreen(screenId)`               | `Promise<Screen>`   | Retrieve specific screen by ID  |

**`generate()` full signature:**

```typescript
generate(
  prompt: string,
  deviceType?: 'DEVICE_TYPE_UNSPECIFIED' | 'MOBILE' | 'DESKTOP' | 'TABLET' | 'AGNOSTIC',
  modelId?: 'MODEL_ID_UNSPECIFIED' | 'GEMINI_3_PRO' | 'GEMINI_3_FLASH',
): Promise<Screen>
```

### `Screen` Class

A generated UI screen. Provides access to HTML and screenshots.

```typescript
import { Screen } from '@google/stitch-sdk'
```

**Properties:**

- `id: string` — Alias for `screenId`
- `screenId: string` — Bare screen ID
- `projectId: string` — Parent project ID
- `data: any` — Raw screen data from API

**Methods:**

| Method                                            | Returns             | Description                        |
| ------------------------------------------------- | ------------------- | ---------------------------------- |
| `edit(prompt, deviceType?, modelId?)`             | `Promise<Screen>`   | Edit screen with text prompt       |
| `variants(prompt, variantOptions, deviceType?, modelId?)` | `Promise<Screen[]>` | Generate design variants    |
| `getHtml()`                                       | `Promise<string>`   | Get HTML download URL              |
| `getImage()`                                      | `Promise<string>`   | Get screenshot download URL        |

`getHtml()` and `getImage()` use cached data from generation when available; otherwise auto-call `get_screen` API.

---

## Complete Usage Examples

### Generate and extract HTML

```typescript
import { stitch } from '@google/stitch-sdk'

const project = stitch.project('your-project-id')
const screen = await project.generate(
  'A login page with email and password fields',
  'DESKTOP',
  'GEMINI_3_PRO',
)
const html = await screen.getHtml()
const imageUrl = await screen.getImage()
```

### Create project, generate, edit

```typescript
import { stitch } from '@google/stitch-sdk'

const project = await stitch.createProject('Political Dashboard')
const screen = await project.generate('A dashboard with charts')
const edited = await screen.edit('Make the background dark and add a sidebar')
const editedHtml = await edited.getHtml()
```

### List projects and screens

```typescript
import { stitch } from '@google/stitch-sdk'

const projects = await stitch.projects()
for (const project of projects) {
  console.log(project.id, project.projectId)
  const screens = await project.screens()
  console.log(` ${screens.length} screens`)
}
```

### Generate variants

```typescript
const variants = await screen.variants(
  'Try different color schemes',
  {
    variantCount: 3,
    creativeRange: 'EXPLORE',
    aspects: ['COLOR_SCHEME', 'LAYOUT'],
  },
  'DESKTOP',
  'GEMINI_3_PRO',
)

for (const variant of variants) {
  console.log(variant.id, await variant.getHtml())
}
```

---

## Device Types

```typescript
type DeviceType =
  | 'DEVICE_TYPE_UNSPECIFIED'  // Unspecified
  | 'MOBILE'                   // Mobile device design
  | 'DESKTOP'                  // Desktop device design
  | 'TABLET'                   // Tablet device design
  | 'AGNOSTIC'                 // Not tied to a specific device
```

## Model Selection

```typescript
type ModelId =
  | 'MODEL_ID_UNSPECIFIED'  // Server default
  | 'GEMINI_3_PRO'          // Gemini 3 Pro (higher quality)
  | 'GEMINI_3_FLASH'        // Gemini 3 Flash (faster)
```

## Variant Options

```typescript
interface VariantOptions {
  variantCount?: number      // 1-5, default: 3
  creativeRange?: CreativeRange
  aspects?: VariantAspect[]  // If empty, all aspects may be varied
}

type CreativeRange =
  | 'CREATIVE_RANGE_UNSPECIFIED'
  | 'REFINE'      // Subtle refinements, closely adhering to original
  | 'EXPLORE'     // Balanced exploration (default)
  | 'REIMAGINE'   // Radical explorations, fundamentally challenging the original

type VariantAspect =
  | 'VARIANT_ASPECT_UNSPECIFIED'
  | 'LAYOUT'        // Arrangement of elements
  | 'COLOR_SCHEME'  // Colors used
  | 'IMAGES'        // Images used
  | 'TEXT_FONT'     // Fonts used for text
  | 'TEXT_CONTENT'  // Text content
```

---

## AI SDK Integration

Import from `@google/stitch-sdk/ai`. Returns Stitch MCP tools as Vercel AI SDK `Tool` objects, each pre-wired with `execute` -> `callTool`.

```typescript
import { generateText, stepCountIs } from 'ai'
import { google } from '@ai-sdk/google'
import { stitchTools } from '@google/stitch-sdk/ai'

const { text, steps } = await generateText({
  model: google('gemini-2.5-flash'),
  tools: stitchTools(),
  prompt: 'Create a project and generate a modern dashboard with a stat card',
  stopWhen: stepCountIs(5),
})

const toolCalls = steps.flatMap((s) => s.toolCalls)
console.log(`Model called ${toolCalls.length} tools`)
```

### Filter to specific tools

```typescript
const tools = stitchTools({
  include: ['create_project', 'generate_screen_from_text', 'get_screen'],
})
```

### `stitchTools()` Options

| Option    | Type       | Default          | Description                      |
| --------- | ---------- | ---------------- | -------------------------------- |
| `apiKey`  | `string`   | `STITCH_API_KEY` | Override environment variable    |
| `include` | `string[]` | all tools        | Only expose specific tool names  |

---

## MCP Proxy

Forwards MCP requests to Stitch. Used to expose Stitch as an MCP server for AI agents.

```typescript
import { StitchProxy } from '@google/stitch-sdk'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'

const proxy = new StitchProxy({ apiKey: 'your-api-key' })
const transport = new StdioServerTransport()
await proxy.start(transport)
```

### Proxy Config

```typescript
interface StitchProxyConfig {
  apiKey?: string           // API key (reads STITCH_API_KEY if omitted)
  url: string               // Default: production endpoint
  name: string              // Server name (default provided)
  version: string           // Server version (default provided)
  protocolVersion: string   // MCP protocol version (default provided)
}
```

### Proxy Utilities

```typescript
import {
  forwardToStitch,
  initializeStitchConnection,
  refreshTools,
} from '@google/stitch-sdk'
import type { ProxyContext } from '@google/stitch-sdk'
```

- `forwardToStitch(config, method, params?)` — Forward a JSON-RPC request to Stitch
- `initializeStitchConnection(ctx)` — Initialize connection and fetch tools
- `refreshTools(ctx)` — Refresh the cached tools list

---

## Tool Client (Low-level)

Direct MCP tool access. Auto-connects on first `callTool` or `listTools`.

```typescript
import { StitchToolClient } from '@google/stitch-sdk'

const client = new StitchToolClient({ apiKey: 'your-api-key' })

// List available tools
const { tools } = await client.listTools()
for (const tool of tools) {
  console.log(tool.name, tool.description)
}

// Call a tool
const result = await client.callTool<ProjectData>('create_project', {
  title: 'Agent Project',
})

// Clean up
await client.close()
```

| Method                | Parameters                          | Returns        | Description                |
| --------------------- | ----------------------------------- | -------------- | -------------------------- |
| `connect()`           | —                                   | `Promise<void>`| Explicitly connect (auto-called) |
| `callTool<T>(name, args)` | `name: string`, `args: Record<string, unknown>` | `Promise<T>` | Call an MCP tool |
| `listTools()`         | —                                   | `Promise<{ tools }>` | List available tools  |
| `close()`             | —                                   | `Promise<void>`| Close connection           |

### Available MCP Tools

| Tool Name                    | Description                                      | Required Params                     |
| ---------------------------- | ------------------------------------------------ | ----------------------------------- |
| `create_project`             | Create a new project container                   | `title?: string`                    |
| `get_project`                | Get project details                              | `name: string` (format: `projects/{id}`) |
| `list_projects`              | List accessible projects                         | `filter?: string`                   |
| `list_screens`               | List screens in a project                        | `projectId: string`                 |
| `get_screen`                 | Get screen details (HTML/image URLs)             | `name: string`, `projectId`, `screenId` |
| `generate_screen_from_text`  | Generate screen from text prompt                 | `projectId: string`, `prompt: string` |
| `edit_screens`               | Edit existing screens with text prompt            | `projectId`, `selectedScreenIds[]`, `prompt` |
| `generate_variants`          | Generate variants of existing screens            | `projectId`, `selectedScreenIds[]`, `prompt`, `variantOptions` |

---

## Error Handling

```typescript
import { StitchError, StitchErrorCode } from '@google/stitch-sdk'

try {
  const screen = await project.generate('A login page')
} catch (error) {
  if (error instanceof StitchError) {
    console.error(error.code)        // e.g., 'RATE_LIMITED'
    console.error(error.message)
    console.error(error.suggestion)  // Optional remediation hint
    console.error(error.recoverable) // boolean
  }
}
```

### Error Codes

| Code                | Description                    |
| ------------------- | ------------------------------ |
| `AUTH_FAILED`       | Authentication failure         |
| `NOT_FOUND`         | Resource not found             |
| `PERMISSION_DENIED` | Insufficient permissions       |
| `RATE_LIMITED`      | Rate limit exceeded            |
| `NETWORK_ERROR`     | Network connectivity issue     |
| `VALIDATION_ERROR`  | Invalid input parameters       |
| `UNKNOWN_ERROR`     | Unclassified error             |

`StitchError.fromUnknown(error)` wraps any caught error into a `StitchError`.

---

## Types Reference

```typescript
import type {
  StitchConfig,
  StitchConfigInput,
  ProjectData,
  GenerateScreenParams,
  DesignTheme,
  ScreenInstance,
  ThumbnailScreenshot,
} from '@google/stitch-sdk'
```

### `ProjectData`

```typescript
interface ProjectData {
  name: string
  title?: string
  visibility: string
  createTime: string
  updateTime: string
  projectType?: string
  origin?: string
  deviceType?: string
  thumbnailScreenshot?: ThumbnailScreenshot
  designTheme: DesignTheme
  screenInstances?: ScreenInstance[]
}
```

### `DesignTheme`

```typescript
interface DesignTheme {
  colorMode?: string
  font?: string
  roundness?: string
  customColor?: string
  saturation?: number
}
```

### `GenerateScreenParams`

```typescript
interface GenerateScreenParams {
  prompt: string
  deviceType?: 'MOBILE' | 'DESKTOP' | 'DEVICE_TYPE_UNSPECIFIED'
}
```

---

## Gotchas

- **Generation is slow**: `generate_screen_from_text` and `edit_screens` can take minutes. The SDK docs explicitly say **DO NOT RETRY** on timeout. If connection fails, the generation may still succeed server-side — use `get_screen` to check later.
- **`getHtml()` / `getImage()` return download URLs, not raw content**: You need to fetch the URL to get actual HTML/image bytes.
- **`project(id)` does NOT make an API call**: It returns a lightweight handle. Use `getScreen()` or `screens()` to trigger actual requests.
- **`get_screen` tool requires all three params**: `name` (full resource path), `projectId`, and `screenId` are all marked required in the schema, despite `projectId`/`screenId` being deprecated in favor of `name`.
- **`output_components` in generate response**: May contain suggestions (e.g., "Yes, make them all"). When using the tool API directly, check for these and potentially pass them as the next prompt.
- **ESM-only**: Package uses `"type": "module"`. No CommonJS support.
- **Zod v4**: The SDK depends on `zod@^4.3.5` (not v3). If your project uses Zod v3, they may coexist as separate dependencies but watch for type incompatibilities if passing schemas between them.
- **`edit_screens` requires `selectedScreenIds` array**: Even when editing a single screen, pass it as `[screenId]`.
- **`data` property on `Project`/`Screen` is typed as `any`**: The raw API response is not strongly typed in the SDK.
- **`list_projects` filter**: Supports `view=owned` (default) and `view=shared`. Not exposed in the high-level `projects()` method.

---

## References

- GitHub: <https://github.com/google-labs-code/stitch-sdk>
- npm: <https://www.npmjs.com/package/@google/stitch-sdk>
- MCP SDK (dependency): <https://github.com/modelcontextprotocol/typescript-sdk>
- Vercel AI SDK: <https://sdk.vercel.ai/docs>
- Google Stitch (product): <https://stitch.withgoogle.com>
