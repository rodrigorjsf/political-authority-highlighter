# Google Stitch DESIGN.md & Effective Prompting — Stack Documentation

> Last updated: 2026-03-22
> Source: <https://stitch.withgoogle.com/docs/design-md/overview>

---

## DESIGN.md Overview

DESIGN.md is an agent-friendly markdown file introduced with Google Stitch 2.0 that captures a project's design system — colors, typography, spacing, component patterns, and layout principles — in a structured format readable by both humans and AI agents.

Its primary purpose is to serve as the **"source of truth"** for prompting Stitch to generate new screens that align perfectly with an existing design language. Stitch interprets design through **"Visual Descriptions"** supported by specific color values, making DESIGN.md the bridge between technical CSS/Tailwind tokens and the natural language that Stitch's AI model (Gemini 2.5 Pro) consumes.

Key characteristics:

- **Agent-friendly markdown**: Structured sections that AI tools can parse and apply
- **Bidirectional**: Can be exported from Stitch projects or imported into them
- **Interoperable**: Works with coding agents (Claude Code, Cursor, etc.), design tools, and Stitch's own generation pipeline
- **Descriptive over technical**: Uses natural language with hex codes in parentheses, not raw CSS values

---

## DESIGN.md Format & Structure

The canonical structure has 5 core sections plus an optional 6th for Stitch-specific generation notes. The format was established by the official `google-labs-code/stitch-skills` repository.

### Full Structure

```markdown
# Design System: [Project Title]
**Project ID:** [Stitch Project ID]

## 1. Visual Theme & Atmosphere
(2-3 sentences describing the mood, density, and aesthetic philosophy.
Use evocative adjectives: "Airy," "Dense," "Minimalist," "Utilitarian,"
"sophisticated minimalist sanctuary," "gallery-like spaciousness.")

## 2. Color Palette & Roles
(List 6-10 colors grouped by function. Each entry has:
  - Descriptive Name + Hex Code + Functional Role)

**Primary Foundation:**
- Warm Barely-There Cream (#FCFAFA) – Primary background
- Crisp Very Light Gray (#F5F5F5) – Secondary surface color

**Accent & Interactive:**
- Deep Muted Teal-Navy (#294056) – Primary CTAs, active navigation

**Typography & Text Hierarchy:**
- Charcoal Near-Black (#2C2C2C) – Headlines and product names
- Soft Warm Gray (#6B6B6B) – Body copy and descriptions
- Ultra-Soft Silver Gray (#E0E0E0) – Borders and dividers

**Functional States:**
- Success Moss (#10B981) – Stock availability
- Alert Terracotta (#EF4444) – Low stock warnings

## 3. Typography Rules
(Font family name with character description.
 Hierarchy with weights, sizes, line-heights, letter-spacing.)

**Font Family:** [Name] ([character description, e.g. "modern geometric sans-serif"])

**Hierarchy:**
- H1: Semi-bold (600), 2.75-3.5rem, 0.02em letter-spacing
- H2: Semi-bold (600), 2-2.5rem, 0.01em letter-spacing
- H3: Medium (500), 1.5-1.75rem
- Body: Regular (400), 1rem, 1.7 line-height
- Small Text: Regular (400), 0.875rem, 1.5 line-height
- CTA Buttons: Medium (500), 1rem, 0.01em letter-spacing

**Spacing:** 2-3rem between text blocks; 4-6rem between major sections

## 4. Component Stylings
* **Buttons:** Shape description, color assignment, padding, hover behavior
* **Cards/Containers:** Corner roundness, background, shadow depth, hover
* **Navigation:** Spacing, weight, active state indicators
* **Inputs/Forms:** Stroke style, background, focus behavior

## 5. Layout Principles
(Grid structure, max-width, breakpoints, whitespace strategy,
 responsive behavior, alignment philosophy.)

## 6. Design System Notes for Stitch Generation (optional)
(Stitch-specific prompt snippets and language references.)
```

### Section Details

#### 1. Visual Theme & Atmosphere

Captures the overall "vibe" using evocative, designer-friendly language. Evaluate mood, density, and aesthetic philosophy. Examples of descriptive terms:

- "Airy yet grounded"
- "Sophisticated minimalist sanctuary"
- "Gallery-like, photography-first approach"
- "Dense and utilitarian"
- "Aspirational yet approachable"

#### 2. Color Palette & Roles

Each color gets three components:

1. **Descriptive natural language name** that conveys character (not "blue" but "Deep Muted Teal-Navy")
2. **Hex code** in parentheses for precision (e.g., `(#294056)`)
3. **Functional role** explaining what it is used for (e.g., "Primary CTAs, active navigation")

Colors are grouped by function: Foundation, Accent/Interactive, Typography/Text, Functional States.

#### 3. Typography Rules

Includes font family with a character description, full hierarchy from H1 through captions/labels, with specific weights (numeric, e.g., 600 not "semi-bold" alone), sizes in rem, line-heights, and letter-spacing values.

#### 4. Component Stylings

Translates technical CSS into physical descriptions:

- `rounded-full` becomes "Pill-shaped"
- `rounded-lg` (12px) becomes "Gently rounded corners"
- `rounded-md` (8px) becomes "Subtly rounded corners"
- `rounded-none` becomes "Sharp, squared-off edges"
- Shadows described as "Whisper-soft diffused shadow" or "Heavy drop shadow"

Each component type documents: shape, color, padding, hover/focus behavior, and transitions.

#### 5. Layout Principles

Covers:

- Grid system (columns, gutters, max-width)
- Breakpoints with pixel values
- Whitespace strategy (base unit, vertical rhythm, section margins)
- Alignment philosophy (left-aligned body, centered heroes, image-to-text ratios)
- Responsive behavior (mobile-first, touch targets, collapse patterns)

#### 6. Design System Notes for Stitch Generation

Optional section with:

- Prompt-ready language snippets to reuse
- Color reference reminders
- Component prompt examples
- Incremental iteration guidance

---

## Creating DESIGN.md

### From URL (Stitch UI)

Stitch can extract a design system directly from any publicly accessible URL:

1. Visit `stitch.withgoogle.com` and sign in
2. Start a new project
3. Paste a publicly accessible URL into the input field
4. Wait 15-45 seconds for Gemini 2.5 Pro to analyze the rendered page
5. Review extracted design tokens (colors, fonts, spacing, component styling)
6. The extracted tokens form the design system; DESIGN.md can then be exported

**Tips for URL extraction:**

- Use clean, simple URLs — marketing sites and landing pages work best
- Pages with heavy overlays, cookie banners, login walls, or JS-loaded content confuse extraction
- Always review what Stitch extracted before generating screens
- Correct misidentified colors/fonts at the token level, not per-screen

### From Prompt (Stitch UI)

When starting a new project without an existing URL:

1. Provide a detailed initial prompt describing the design aesthetic
2. Include product context, target audience, and visual style
3. Stitch generates an initial screen with a design system
4. The design system (colors, typography, spacing) is captured and can be exported as DESIGN.md

Example initial prompt:

```
Product detail page for a Japandi-styled tea store. Sells herbal teas,
ceramics. Neutral, minimal colors, black buttons. Soft, elegant font.
```

### From Existing Stitch Project (design-md Skill)

The official `design-md` skill from `google-labs-code/stitch-skills` generates DESIGN.md by analyzing existing Stitch screens:

**Installation:**

```bash
npx skills add google-labs-code/stitch-skills --skill design-md --global
```

**Workflow (5 steps):**

1. **Retrieval** — Uses Stitch MCP Server to fetch project screens, HTML code, and design metadata via tools: `list_projects`, `list_screens`, `get_screen`, `get_project`
2. **Extraction** — Identifies design tokens (colors, typography, spacing, component patterns) from HTML/CSS/Tailwind
3. **Translation** — Converts technical CSS values into descriptive design language
4. **Synthesis** — Generates comprehensive DESIGN.md following the semantic design system format
5. **Alignment** — Ensures output follows Stitch Effective Prompting Guide principles

**MCP Server Tools Used:**

| Tool | Purpose |
|------|---------|
| `list_projects` | Find target project by title (filter: `"view=owned"`) |
| `list_screens` | List screens in a project by numeric ID |
| `get_screen` | Fetch screen metadata: screenshot URL, HTML code URL, dimensions, device type |
| `get_project` | Fetch project-level `designTheme` with color mode, fonts, roundness, custom colors |

### From Code (Custom Script)

For projects like PAH that have an existing code-based design system, DESIGN.md can be generated by parsing:

- CSS custom properties (`tokens.css`, `globals.css`)
- Tailwind configuration (`tailwind.config.ts`)
- Component source files

The script translates technical values into the descriptive format Stitch expects. This is the approach used in the PAH project's `scripts/stitch-sync-push.mjs`.

---

## Importing DESIGN.md into Stitch

### Via Stitch UI

1. Open the design system panel in a Stitch project
2. The DESIGN.md panel sits alongside the "Theme" panel for color palettes
3. Paste or upload the DESIGN.md content as custom instructions
4. Stitch reads the markdown and applies the design rules to subsequent screen generation

### What Stitch Does With It

When DESIGN.md is imported, Stitch uses the descriptive language to:

- Apply the specified color palette to generated components
- Use the typography hierarchy for text elements
- Follow component styling rules (border-radius, shadows, spacing)
- Maintain the described visual atmosphere across new screens
- Ensure layout principles are respected (grid, whitespace, responsive)

### Via MCP Server (Programmatic)

Using the Stitch MCP tools, DESIGN.md can be synced programmatically:

- `create_project` or `update_project` with design theme data
- `update_screen` to apply design rules to specific screens

---

## Exporting DESIGN.md from Stitch

### Via Stitch UI

1. Open a Stitch project with designed screens
2. Access the design system / DESIGN.md panel
3. Stitch outputs a structured markdown document capturing every design decision
4. Copy or download the DESIGN.md file

### Via design-md Skill

The skill generates DESIGN.md by analyzing screen HTML/CSS and project metadata through the MCP Server, producing the standard 5-section format.

### Output Format

The exported DESIGN.md follows the exact structure described in the Format & Structure section above. Stitch packages the entire design system (colors, typography, spacing) into the standardized markdown file.

### Developer Handoff

The exported DESIGN.md can be:

- Passed to coding agents (Claude Code, Cursor) as design context
- Committed to the repository as the design system contract
- Used to generate Tailwind config, CSS custom properties, or component tokens
- Imported into other Stitch projects for cross-project consistency

---

## Effective Prompting Best Practices

### Zoom-Out/Zoom-In Framework

Recommended by designer Nick Babich, this is the core framework for Stitch prompting:

1. **Zoom Out** — Start with product context:
   - What type of application?
   - Who is the target user?
   - What is the overall goal/mood?

2. **Zoom In** — Focus on the specific screen:
   - What is the goal of this particular screen?
   - What is the layout hierarchy?
   - What design constraints should the AI consider?

3. **Expectations** — State what you expect:
   - Specific components to include
   - Visual style requirements
   - Interaction patterns

**Example applying the framework:**

```
[Zoom Out] A Brazilian political transparency platform that presents
factual public data. Target users are citizens researching politicians.
Neutral, trustworthy, data-focused aesthetic.

[Zoom In] This is the politician profile page showing an integrity
score breakdown. Layout: score card at top, tabbed sections below
for bills, votes, expenses. Clean data presentation with clear hierarchy.

[Expectations] Use a neutral gray/blue palette — no party colors.
Score displayed as "72/100" not "Good politician." Cards with subtle
rounded corners and light shadows.
```

### Prompt Structure

Stitch performs best with **clear, specific instructions**. Key principles:

1. **One screen, one focus**: Focus on one screen/component per prompt
2. **One or two changes at a time**: Make one major change per iteration
3. **Specific over vague**: "Add a search bar to the header" beats "make it more usable"
4. **Use UI/UX terminology**: navigation bar, call-to-action button, card layout, hero section
5. **Reference elements precisely**: "the primary CTA button on the login screen"

### Do's and Don'ts

**Do:**

- Be clear and concise — avoid ambiguity
- Use descriptive adjectives for visual style ("A vibrant and encouraging fitness tracking app")
- Specify hierarchy, component types, and visual direction
- Reference exact elements when requesting changes
- Save screenshots after successful changes
- Iterate incrementally — refine screen by screen
- Lock design tokens before generating additional screens
- Review typography pairings early to prevent cascading corrections
- Use mood-based language when applicable ("warm, inviting color palette")
- Coordinate visual changes explicitly ("Update theme to light orange. Ensure all images match")

**Don't:**

- Combine multiple unrelated changes in one prompt — Stitch can lose context
- Use vague descriptions ("make it better", "more modern")
- Use raw CSS values instead of descriptive language in DESIGN.md
- Forget to specify the screen/component you're targeting
- Skip reviewing extracted tokens before generating screens
- Use URLs with login walls, cookie banners, or heavy JS overlays for extraction
- Assume Stitch remembers all previous context — be explicit

### Good Prompt Examples

**Setting visual direction:**

```
A minimalist and focused app for meditation. Clean white space,
soft rounded corners, calming blue-green palette.
```

**Specific component change:**

```
On the homepage, add a search bar to the header with a subtle
gray border and rounded corners.
```

**Detailed screen specification:**

```
Product detail page for a Japandi-styled tea store. Sells herbal teas,
ceramics. Neutral, minimal colors, black buttons. Soft, elegant font.
```

**Image modification:**

```
Change background of all product images on landing page to light taupe.
```

**Theme control:**

```
Change primary color to forest green. Make all buttons have fully
rounded corners. Use a playful sans-serif font.
```

**Localization:**

```
Switch all product copy and button text to Brazilian Portuguese.
```

### Design System Description in Prompts

When describing design system elements in prompts:

- **Colors**: Use descriptive names with hex codes — "Deep Muted Teal-Navy (#294056)" not "dark blue"
- **Typography**: Describe character — "modern geometric sans-serif" not just "sans-serif"
- **Shapes**: Use physical descriptions — "Pill-shaped buttons" or "Gently rounded cards (12px)" not "rounded-lg"
- **Shadows**: Describe quality — "Whisper-soft diffused shadow" not "box-shadow: 0 2px 8px"
- **Spacing**: Use spatial metaphors — "Generous breathing room" or "Expansive whitespace" supplemented with specific values

### Maintaining Consistency Across Iterations

1. **Define tokens first**: Establish the design system before generating individual screens
2. **Reference DESIGN.md consistently**: Use the same descriptive terms across all prompts
3. **One change at a time**: Break complex layouts into focused, sequential prompts
4. **Correct at the token level**: If a color is wrong, fix the token, not each screen individually
5. **Save after success**: Save/screenshot after each successful iteration
6. **Review and rephrase**: If results don't match expectations, rephrase the prompt
7. **Use Section 6 snippets**: Keep reusable prompt fragments in the "Design System Notes" section

---

## Complete Example: Furniture Collections DESIGN.md

The official example from `google-labs-code/stitch-skills` demonstrates the full format for a furniture e-commerce project:

```markdown
# Design System: Furniture Collections List
**Project ID:** 13534454087919359824

## 1. Visual Theme & Atmosphere
The Furniture Collections List embodies a "sophisticated, minimalist
sanctuary" that marries Scandinavian design with luxury editorial
presentation. The interface prioritizes "spacious and tranquil"
aesthetics with gallery-like, photography-first approach.

## 2. Color Palette & Roles
**Primary Foundation:**
- Warm Barely-There Cream (#FCFAFA) – Primary background
- Crisp Very Light Gray (#F5F5F5) – Secondary surface color

**Accent & Interactive:**
- Deep Muted Teal-Navy (#294056) – Primary CTAs, active navigation

**Typography & Text Hierarchy:**
- Charcoal Near-Black (#2C2C2C) – Headlines and product names
- Soft Warm Gray (#6B6B6B) – Body copy and descriptions
- Ultra-Soft Silver Gray (#E0E0E0) – Borders and dividers

**Functional States:**
- Success Moss (#10B981) – Stock availability
- Alert Terracotta (#EF4444) – Low stock warnings
- Informational Slate (#64748B) – System messages

## 3. Typography Rules
**Font Family:** Manrope (modern, geometric sans-serif)
**Hierarchy:**
- H1: Semi-bold (600), 2.75-3.5rem, 0.02em letter-spacing
- H2: Semi-bold (600), 2-2.5rem, 0.01em letter-spacing
- Body: Regular (400), 1rem, 1.7 line-height
- CTA Buttons: Medium (500), 1rem, 0.01em letter-spacing

## 4. Component Stylings
* **Buttons:** Subtly rounded corners (8px), Deep Muted Teal-Navy
  background, white text. Hover: Deeper navy, 250ms transition.
* **Cards:** Gently rounded corners (12px), whisper-soft shadow on
  hover "0 2px 8px rgba(0,0,0,0.06)", generous 2-2.5rem padding.
* **Navigation:** 2-3rem spacing, medium weight, subtle uppercase.
  Active: Deep Muted Teal-Navy with 2px underline.
* **Inputs:** 1px Soft Warm Gray border, 8px radius. Focus: Deep
  Muted Teal-Navy border with glow.

## 5. Layout Principles
Max width: 1440px. 12-column responsive grid. Gutters: 24px mobile,
32px desktop. Product grid: 4 col (large), 3 (desktop), 2 (tablet),
1 (mobile). Base unit: 8px. Section margins: 5-8rem. Mobile-first.
Touch targets: min 44x44px (WCAG AAA).

## 6. Design System Notes for Stitch Generation
**Language to Use:**
- "Sophisticated minimalist sanctuary with gallery-like spaciousness"
- "Subtly rounded corners"
- "Whisper-soft diffused shadows on hover"

**Component Prompts Example:**
"Create a product card with gently rounded corners, full-bleed square
product image, and whisper-soft shadow on hover"
```

---

## Usage in This Project

The `.stitch/DESIGN.md` file serves as the bidirectional contract:

- Generated from `tokens.css` + `globals.css` + `tailwind.config.ts` via `scripts/stitch-sync-push.mjs`
- Imported into Stitch for design generation context
- Updated automatically via PostToolUse hook when design files change
- Pulled from Stitch via `/stitch-pull` skill when design iterations happen in Stitch UI
- Committed to the repository as the shared source of truth

The PAH project's DESIGN.md must enforce domain-specific constraints:

- No party colors — neutral gray/blue palette only (DR-002)
- Factual, neutral language in all UI descriptions
- Dark mode support documented as a separate theme within the same file
- CSS custom property names mapped to descriptive Stitch-friendly names

---

## Gotchas

- **Stitch docs are SPA-rendered**: The official docs at `stitch.withgoogle.com/docs/*` are client-side rendered Angular apps; `curl`/`wget` cannot extract content. Use a browser or Playwright MCP to read them.
- **Descriptive over technical is mandatory**: Stitch ignores raw CSS — always translate `border-radius: 12px` to "Gently rounded corners (12px)". The hex code must accompany every color reference.
- **URL extraction limitations**: Pages with heavy JavaScript, login walls, cookie banners, or dynamically loaded content produce unreliable extraction results. Static marketing pages work best.
- **One change per prompt**: Stitch can lose previous design context when processing multiple simultaneous changes. Break complex modifications into sequential, focused prompts.
- **Project ID is numeric only**: When calling MCP tools like `list_screens` or `get_screen`, pass only the numeric ID (e.g., `13534454087919359824`), not the full path (`projects/13534454087919359824`).
- **DESIGN.md is not CSS**: It does not replace `tokens.css` or `tailwind.config.ts`. It is a parallel representation optimized for AI consumption. Keep both in sync.
- **Section 6 is optional but valuable**: The "Design System Notes for Stitch Generation" section with reusable prompt snippets significantly improves consistency across multi-screen builds.
- **Lock tokens before generating screens**: Correct any misidentified colors or fonts at the design system level first, then generate screens. Per-screen fixes cascade into inconsistency.

---

## References

- Official DESIGN.md docs: <https://stitch.withgoogle.com/docs/design-md/overview>
- Effective Prompting guide: <https://stitch.withgoogle.com/docs/learn/prompting/>
- Official design-md skill (google-labs-code): <https://github.com/google-labs-code/stitch-skills/tree/main/skills/design-md>
- Example DESIGN.md file: <https://github.com/google-labs-code/stitch-skills/blob/main/skills/design-md/examples/DESIGN.md>
- Stitch Prompt Guide (Google AI Forum): <https://discuss.ai.google.dev/t/stitch-prompt-guide/83844>
- Google Blog announcement: <https://blog.google/innovation-and-ai/models-and-research/google-labs/stitch-ai-ui-design/>
- Stitch + Claude Code tutorial: <https://marketingagent.blog/2026/03/20/tutorial-google-stitch-2-0-claude-code-web-design/>
- Stitch 2.0 overview: <https://aitoolsclub.com/google-stitch-2-0-your-vibe-design-partner-with-new-ai-agent-infinite-canvas-and-design-md/>
- Design system from URL guide: <https://www.mindstudio.ai/blog/how-to-use-google-stitch-website-design-system>
- Skill marketplace listing: <https://agentskills.so/skills/google-labs-code-stitch-skills-design-md>
