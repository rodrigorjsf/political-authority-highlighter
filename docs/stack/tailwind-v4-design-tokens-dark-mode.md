# Tailwind CSS v4 Design Tokens & Dark Mode — Stack Reference

> **Versions locked**: tailwindcss `4.2.1` · next `^15.0.0` · react `^19.0.0`  
> **Research date**: 2025-07  
> **Sources**: Official Tailwind v4 docs, Next.js 15 font docs, next-themes README, live doc pages

---

## Table of Contents

1. [Tailwind CSS v4 — `@theme` Directive](#1-tailwind-css-v4--theme-directive)
2. [v3 → v4 Migration: From `tailwind.config.ts` to CSS](#2-v3--v4-migration-from-tailwindconfigts-to-css)
3. [`@tailwind` Directives Status in v4](#3-tailwind-directives-status-in-v4)
4. [`@config` Directive — Keeping `tailwind.config.ts`](#4-config-directive--keeping-tailwindconfigts)
5. [CSS Custom Properties in `@theme`](#5-css-custom-properties-in-theme)
6. [Dark Mode Configuration in v4](#6-dark-mode-configuration-in-v4)
7. [Next.js 15 `next/font` — Inter & JetBrains Mono](#7-nextjs-15-nextfont--inter--jetbrains-mono)
8. [Dark Mode FOUC Prevention — `next-themes`](#8-dark-mode-fouc-prevention--next-themes)
9. [CSS Variable Naming Conventions](#9-css-variable-naming-conventions)
10. [Project-Specific Conflicts & Migration Path](#10-project-specific-conflicts--migration-path)

---

## 1. Tailwind CSS v4 — `@theme` Directive

**Source**: [tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme)

### What it is

`@theme` is the **v4 replacement for `tailwind.config.ts`'s `theme` object**. It's a special CSS at-rule that:

1. Defines design tokens as CSS custom properties
2. Automatically generates corresponding Tailwind utility classes
3. Emits all tokens into `:root` as native CSS variables

> *"Theme variables aren't just CSS variables — they also instruct Tailwind to create new utility classes that you can use in your HTML."*

> *"Use `@theme` when you want a design token to map directly to a utility class, and use `:root` for defining regular CSS variables that shouldn't have corresponding utility classes."*

### Basic syntax

```css
@import "tailwindcss";

@theme {
  /* Colors → bg-*, text-*, border-*, fill-* etc. */
  --color-primary: oklch(0.55 0.22 260);
  --color-brand-500: oklch(0.65 0.20 260);

  /* Fonts → font-sans, font-mono utilities */
  --font-sans: var(--font-inter);
  --font-mono: var(--font-jetbrains-mono);

  /* Border radius → rounded-md, rounded-lg */
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
}
```

### `@theme inline` — required when referencing other CSS vars

Use `@theme inline` when the token value itself is a CSS variable (e.g., from `next/font`). Without `inline`, Tailwind resolves the variable at build time; with `inline`, the `var()` reference is preserved into utilities:

```css
/* ✅ Correct for next/font integration */
@theme inline {
  --font-sans: var(--font-inter);
  --font-mono: var(--font-jetbrains-mono);
}
/* Generates: .font-sans { font-family: var(--font-inter); } */

/* ❌ Without inline — would try to resolve var() at build time */
@theme {
  --font-sans: var(--font-inter); /* may break */
}
```

### Namespace → Utility Class Mapping

| `@theme` Variable Namespace | Tailwind Utilities Generated |
|-----------------------------|------------------------------|
| `--color-*` | `bg-*`, `text-*`, `border-*`, `fill-*`, `ring-*` |
| `--font-*` | `font-sans`, `font-mono`, `font-display` |
| `--text-*` | `text-xl`, `text-2xl` (font-size) |
| `--radius-*` | `rounded-sm`, `rounded-xl` |
| `--spacing-*` | `px-4`, `mt-8`, `w-*`, `h-*`, `gap-*` |
| `--shadow-*` | `shadow-md`, `shadow-xl` |
| `--breakpoint-*` | `sm:*`, `lg:*`, `3xl:*` responsive variants |
| `--animate-*` | `animate-spin`, `animate-pulse` |
| `--ease-*` | `ease-in-out`, `ease-fluid` |

### Resetting namespaces

```css
@theme {
  /* Wipe ALL default colors, start fresh */
  --color-*: initial;
  --color-white: #fff;
  --color-primary: oklch(0.55 0.22 260);

  /* Wipe everything */
  --*: initial;
}
```

---

## 2. v3 → v4 Migration: From `tailwind.config.ts` to CSS

**Sources**: [tailwindcss.com/docs/upgrade-guide](https://tailwindcss.com/docs/upgrade-guide) · [tailwindcss.com/blog/tailwindcss-v4](https://tailwindcss.com/blog/tailwindcss-v4)

### Automated migration tool

```bash
npx @tailwindcss/upgrade
```

> *"For most projects, the upgrade tool will automate the entire migration process including updating your dependencies, migrating your configuration file to CSS, and handling any changes to your template files."*

### v3 → v4 mapping table

| Feature | v3 (`tailwind.config.ts`) | v4 (CSS-native) |
|---------|---------------------------|-----------------|
| Theme extension | `theme.extend.colors: {}` | `@theme { --color-*: }` |
| Font family | `theme.extend.fontFamily.sans: [...]` | `@theme inline { --font-sans: var(...) }` |
| Border radius | `theme.extend.borderRadius: {}` | `@theme { --radius-*: }` |
| Custom utilities | `@layer utilities { }` | `@utility name { }` |
| Content paths | `content: [...]` array | **Auto-detected** (no config needed) |
| CSS variables | `theme(colors.red.500)` | `var(--color-red-500)` |
| Media queries | `theme(screens.xl)` | `theme(--breakpoint-xl)` |

### v3 `theme.extend` → v4 `@theme` (no "extend" concept needed)

```ts
// v3 tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        primary: { DEFAULT: 'var(--color-primary)' },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius-lg)',
        md: 'var(--radius-md)',
      },
    },
  },
}
```

```css
/* v4 globals.css — CSS-native equivalent */
@import "tailwindcss";

@theme inline {
  --color-background: var(--color-background);   /* from tokens.css */
  --color-foreground: var(--color-text-primary);
  --color-primary: var(--color-primary);
  --color-muted: var(--color-surface);
  --color-border: var(--color-border);

  --font-sans: var(--font-inter);
  --font-mono: var(--font-jetbrains-mono);

  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
}
```

### Breaking changes to watch for

| Change | v3 | v4 Fix |
|--------|-----|--------|
| `ring` default width | `3px` | Becomes `1px` → use `ring-3` |
| Default border color | `gray-200` | `currentColor` → set explicitly |
| `shadow-sm` | small shadow | Now called `shadow-xs` |
| `shadow` | medium shadow | Now called `shadow-sm` |
| `bg-opacity-*` | removed | Use `bg-black/50` modifiers |
| `outline-none` | removes outline | Now `outline-hidden`; new `outline-none` = `outline-style:none` |

---

## 3. `@tailwind` Directives Status in v4

**Source**: [tailwindcss.com/docs/upgrade-guide](https://tailwindcss.com/docs/upgrade-guide)

### ⚠️ `@tailwind` directives are REMOVED in v4

The three v3 directives **no longer work** in v4:

```css
/* ❌ v3 — these are REMOVED in v4 */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### ✅ v4 replacement: single `@import`

```css
/* ✅ v4 — replaces all three directives */
@import "tailwindcss";
```

This single import expands to the native CSS equivalent internally:

```css
/* What @import "tailwindcss" compiles to: */
@layer theme, base, components, utilities;
@import "./theme.css" layer(theme);
@import "./preflight.css" layer(base);
@import "./utilities.css" layer(utilities);
```

### ⚠️ No "compat mode" exists

There is **no official compatibility mode** to re-enable `@tailwind` directives. The migration is a hard cutover; the upgrade tool handles it automatically.

### `@layer` behavior changed

In v3, `@layer utilities {}` registered styles as Tailwind utilities. In v4, native CSS cascade layers are used:

```css
/* ❌ v3 way — no longer registers as Tailwind utility in v4 */
@layer utilities {
  .tab-4 { tab-size: 4; }
}

/* ✅ v4 way */
@utility tab-4 {
  tab-size: 4;
}
```

### PostCSS setup also changes

```js
// ❌ v3 postcss.config.mjs
export default { plugins: { "postcss-import": {}, tailwindcss: {}, autoprefixer: {} } };

// ✅ v4 postcss.config.mjs
export default { plugins: { "@tailwindcss/postcss": {} } };
// postcss-import and autoprefixer are now built into Tailwind v4 (via Lightning CSS)
```

---

## 4. `@config` Directive — Keeping `tailwind.config.ts`

**Source**: [tailwindcss.com/docs/functions-and-directives](https://tailwindcss.com/docs/functions-and-directives)

### Purpose

JS config files are still supported for **backward compatibility** but are **no longer auto-detected** in v4. Use `@config` to load one explicitly:

```css
@import "tailwindcss";
@config "../../tailwind.config.js";
```

> *"JavaScript config files are still supported for backward compatibility, but they are no longer detected automatically in v4."*

### Limitations of `@config` in v4

The following options from JS config are **not supported** when loaded via `@config`:
- `corePlugins`
- `safelist` → use `@source inline()` instead
- `separator`

### Incremental migration: mix `@config` + `@theme`

This is the recommended path for existing projects:

```css
@import "tailwindcss";

/* Keep JS config during migration */
@config "../../tailwind.config.js";

/* Gradually move tokens to CSS */
@theme inline {
  --font-sans: var(--font-inter);
  --font-mono: var(--font-jetbrains-mono);
}
```

> CSS-defined values **take precedence** over JS config values where they overlap, so you can migrate incrementally without conflicts.

### `@plugin` for v3 plugins

```css
@plugin "@tailwindcss/typography";
@plugin "./my-local-plugin.js";
```

---

## 5. CSS Custom Properties in `@theme`

**Source**: [tailwindcss.com/docs/theme](https://tailwindcss.com/docs/theme)

### Auto-emission to `:root`

Every `@theme` variable is automatically emitted as a `:root` CSS custom property:

```css
/* Input */
@theme {
  --color-brand: oklch(0.65 0.20 260);
}

/* Output — generated in :root */
:root {
  --color-brand: oklch(0.65 0.20 260);
  /* ...plus all Tailwind defaults... */
}
```

### Using theme variables in CSS

```css
/* In any CSS rule — direct var() reference */
.card {
  background-color: var(--color-card-background);
  border-radius: var(--radius-lg);
  color: var(--color-text-primary);
}
```

### Using in arbitrary Tailwind class values

```html
<!-- v4 syntax: parentheses, not brackets -->
<div class="bg-(--color-brand)">...</div>
<div class="text-(--color-text-primary)">...</div>

<!-- ❌ v3 syntax — no longer works in v4 -->
<div class="bg-[--brand-color]">...</div>
```

### `theme()` function in CSS — deprecated but still works

```css
/* ❌ deprecated but functional */
.foo { color: theme(colors.red.500); }

/* ✅ recommended in v4 */
.foo { color: var(--color-red-500); }

/* For media queries (CSS vars can't be used there) */
@media (width >= theme(--breakpoint-xl)) { ... }
```

---

## 6. Dark Mode Configuration in v4

**Source**: [tailwindcss.com/docs/dark-mode](https://tailwindcss.com/docs/dark-mode)

### Default: media query based

By default, `dark:*` utilities respond to `prefers-color-scheme: dark`.

### Manual toggle: `@custom-variant`

For `class`-based dark mode (e.g. `<html class="dark">`):

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));
```

```html
<html class="dark">
  <div class="bg-white dark:bg-black">...</div>
</html>
```

### `data-theme` attribute approach (recommended for this project)

```css
@import "tailwindcss";

@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

```html
<html data-theme="dark">
  <div class="bg-white dark:bg-black">...</div>
</html>
```

**This is the approach that aligns with the existing `tokens.css`** which already defines `[data-theme="dark"]` overrides.

### Three-way toggle (light / dark / system) — Tailwind official snippet

> *"Best to add inline in `head` to avoid FOUC"*

```js
// Add this inline in <head> as a blocking script
document.documentElement.classList.toggle(
  "dark",
  localStorage.theme === "dark" ||
    (!("theme" in localStorage) && window.matchMedia("(prefers-color-scheme: dark)").matches),
);

// User chooses light
localStorage.theme = "light";

// User chooses dark
localStorage.theme = "dark";

// User follows OS preference
localStorage.removeItem("theme");
```

---

## 7. Next.js 15 `next/font` — Inter & JetBrains Mono

**Sources**: [nextjs.org/docs/app/api-reference/components/font](https://nextjs.org/docs/app/api-reference/components/font) · [nextjs.org/docs/app/building-your-application/optimizing/fonts](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)

### Import syntax

```ts
import { Inter, JetBrains_Mono } from 'next/font/google'
```

> *"Use an underscore (\_) for font names with multiple words. E.g. `Roboto Mono` should be imported as `Roboto_Mono`."*

### Both are variable fonts — no `weight` required

> *"If loading a variable font, you don't need to specify the font weight."*

Both `Inter` and `JetBrains_Mono` are variable fonts on Google Fonts. `weight` is optional.

### Constructor options

```ts
const inter = Inter({
  subsets: ['latin'],   // Required (warns if missing when preload=true)
  display: 'swap',      // Optional — 'swap' IS the default, explicit for clarity
  variable: '--font-inter',  // You define this name
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
})
```

### `display: 'swap'` — the default

> *"The font `display` with possible string values of `'auto'`, `'block'`, `'swap'`, `'fallback'` or `'optional'` with **default value of `'swap'`**."*

`'swap'` renders a fallback font immediately, then swaps when the custom font loads. Next.js also injects `adjustFontFallback: true` by default, which generates a metric-adjusted fallback to minimize CLS.

### Applying fonts in `layout.tsx`

```tsx
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Apply BOTH .variable classNames to <html> to expose CSS custom properties globally
    <html lang="pt-BR" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

**How it works:**
- `inter.variable` is an **opaque generated class string** (e.g., `__variable_abc123`) — never hardcode it
- Applying it to `<html>` scopes `--font-inter: 'Inter', ...fallbacks` to the entire document
- The CSS variable `--font-inter` is then available to reference in any CSS

### Consuming in Tailwind v4

```css
/* globals.css */
@import "tailwindcss";

/* @theme inline required when value is a CSS var() reference */
@theme inline {
  --font-sans: var(--font-inter);
  --font-mono: var(--font-jetbrains-mono);
}
```

Now `font-sans` and `font-mono` Tailwind utilities resolve to the Next.js font variables.

### Hydration caveat

The `className` on `<html>` will differ between server render and client, so add `suppressHydrationWarning` when using `next-themes` (see section 8). The font `.variable` classNames themselves are stable and don't cause this issue.

---

## 8. Dark Mode FOUC Prevention — `next-themes`

**Source**: [github.com/pacocoursey/next-themes](https://github.com/pacocoursey/next-themes)

### What it solves

FOUC (Flash of Unstyled Content) in dark mode occurs because:
1. The HTML is server-rendered without knowing the user's theme preference
2. The browser briefly shows the wrong theme before JS runs and corrects it
3. React hydration can mismatch if the server and client render different `class`/`data-theme` attributes

`next-themes` solves this by injecting a **blocking inline script** into `<head>` that runs synchronously before any HTML paints.

### Installation

```bash
pnpm add next-themes
```

### Setup in `app/layout.tsx`

```tsx
// app/layout.tsx
import { ThemeProvider } from 'next-themes'
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning required — next-themes mutates the html element
    <html
      lang="pt-BR"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <body>
        <ThemeProvider
          attribute="data-theme"     // matches existing [data-theme="dark"] CSS
          defaultTheme="system"       // respects OS preference by default
          enableSystem                // enables prefers-color-scheme detection
          disableTransitionOnChange   // prevents CSS transition flash on theme change
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```

### `ThemeProvider` key props

| Prop | Default | Description |
|------|---------|-------------|
| `attribute` | `"data-theme"` | HTML attribute to set (`"class"` or any `"data-*"`) |
| `defaultTheme` | `"system"` | Initial theme if none stored |
| `enableSystem` | `true` | Detect `prefers-color-scheme` |
| `disableTransitionOnChange` | `false` | Kill CSS transitions during theme switch |
| `storageKey` | `"theme"` | localStorage key |
| `nonce` | — | For CSP nonces on the injected script |
| `scriptProps` | — | Additional props for injected `<script>` (e.g., `data-cfasync="false"` for Cloudflare) |

### `useTheme` hook — hydration-safe pattern

```tsx
// ThemeToggle.tsx (client component)
'use client'
import { useState, useEffect } from 'react'
import { useTheme } from 'next-themes'

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { theme, setTheme } = useTheme()

  // Must wait for mount — theme is undefined on server
  useEffect(() => setMounted(true), [])
  if (!mounted) return null  // or a skeleton

  return (
    <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle theme
    </button>
  )
}
```

> **⚠️ Critical**: `theme` and `resolvedTheme` from `useTheme()` are `undefined` during SSR. Always gate theme-dependent UI behind a `mounted` check.

### How it prevents FOUC

next-themes injects a synchronous script like this **before** any content renders:

```html
<script>
  // Simplified — actual script reads localStorage and sets data-theme
  (function() {
    var stored = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    var theme = stored || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
  })();
</script>
```

Because this runs **synchronously in `<head>`** before the browser parses `<body>`, there is zero flash.

### Cloudflare Rocket Loader caveat

If using Cloudflare Rocket Loader, it defers inline scripts and breaks FOUC prevention:

```tsx
<ThemeProvider scriptProps={{ 'data-cfasync': 'false' }}>
```

### `data-theme` vs `class` for this project

The project already uses `[data-theme="dark"]` selectors in `tokens.css`. Use `attribute="data-theme"` in ThemeProvider to match. **Do not** switch to `attribute="class"` unless also adding `@custom-variant dark (&:where(.dark, .dark *))` to the Tailwind CSS.

---

## 9. CSS Variable Naming Conventions

### Two separate namespaces to understand

**Tokens (`:root` / `[data-theme]` in `tokens.css`)** — raw design values, not Tailwind utilities:
```css
:root {
  --color-background: #FFFFFF;   /* actual color value */
  --color-primary: #1D4ED8;
  --font-sans: 'Inter', sans-serif;
  --radius-md: 0.375rem;
}
```

**Tailwind `@theme` variables** — mapped to utility classes:
```css
@theme inline {
  --color-background: var(--color-background);  /* references the token */
  --font-sans: var(--font-inter);               /* references next/font var */
  --radius-md: var(--radius-md);               /* references the token */
}
```

### Naming convention table

| Token Type | `:root` convention | `@theme` namespace | Utility class |
|------------|-------------------|--------------------|---------------|
| Background color | `--color-background` | `--color-background` | `bg-background` |
| Primary color | `--color-primary` | `--color-primary` | `bg-primary`, `text-primary` |
| Text color | `--color-text-primary` | `--color-foreground` | `text-foreground` |
| Font family | `--font-sans` | `--font-sans` | `font-sans` |
| Border radius | `--radius-md` | `--radius-md` | `rounded-md` |
| Spacing | `--space-4` | `--spacing` (multiplier) | `p-4`, `m-4` |

### next/font variable names

You define these — convention is `--font-{kebab-font-name}`:

```ts
Inter    → variable: '--font-inter'
JetBrains_Mono → variable: '--font-jetbrains-mono'
```

These are scoped to the element where `inter.variable` class is applied (typically `<html>`).

---

## 10. Project-Specific Conflicts & Migration Path

### Current state audit

| File | Status | Issue |
|------|--------|-------|
| `globals.css` | ❌ Uses v3 directives | `@tailwind base/components/utilities` must change to `@import "tailwindcss"` |
| `globals.css` | ❌ Import order wrong | `@tailwind` before `@import "./tokens.css"` — in v4, `@import` must come first |
| `tailwind.config.ts` | ✅ Valid but v3-style | Works via `@config` directive; can migrate incrementally |
| `tokens.css` | ✅ Correct architecture | `[data-theme="dark"]` CSS approach is compatible with `next-themes` |
| `layout.tsx` | ⚠️ Missing fonts | No `next/font` integration yet — font comes from `tokens.css` string literals |
| `layout.tsx` | ⚠️ Missing `suppressHydrationWarning` | Required when adding `next-themes` |

### Recommended migration sequence

**Step 1 — Fix `globals.css` (breaking)**

```css
/* Before (v3 — broken in v4) */
@tailwind base;
@tailwind components;
@tailwind utilities;
@import "./tokens.css";

/* After (v4 — correct) */
@import "tailwindcss";
@import "./tokens.css";
@config "../../tailwind.config.ts";  /* keep JS config during transition */
```

**Step 2 — Add `next/font` to `layout.tsx`**

```tsx
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-jetbrains-mono' })

// In layout: <html className={`${inter.variable} ${jetbrainsMono.variable}`}>
```

**Step 3 — Update `tokens.css` font references**

```css
/* Before — static string */
:root { --font-sans: 'Inter', 'Plus Jakarta Sans', sans-serif; }

/* After — reference next/font variable */
:root { --font-sans: var(--font-inter), 'Plus Jakarta Sans', sans-serif; }
```

**Step 4 — Add `next-themes` ThemeProvider**

```tsx
import { ThemeProvider } from 'next-themes'

// Wrap body children, add suppressHydrationWarning to <html>
<ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
  {children}
</ThemeProvider>
```

**Step 5 — (Optional) Migrate `tailwind.config.ts` tokens to `@theme`**

```css
@import "tailwindcss";
@import "./tokens.css";
/* Remove @config once fully migrated */

@theme inline {
  --color-background: var(--color-background);
  --color-foreground: var(--color-text-primary);
  --color-muted: var(--color-surface);
  --color-muted-foreground: var(--color-text-muted);
  --color-primary: var(--color-primary);
  --color-primary-foreground: var(--color-primary-foreground);
  --color-destructive: var(--color-destructive);
  --color-border: var(--color-border);
  --color-ring: var(--color-ring);
  --color-card: var(--color-card-background);
  --color-card-foreground: var(--color-card-foreground);

  --font-sans: var(--font-inter);
  --font-mono: var(--font-jetbrains-mono);

  --radius-lg: var(--radius-lg);
  --radius-md: var(--radius-md);
}
```

### Key gotchas

| Gotcha | Mitigation |
|--------|-----------|
| `@tailwind` directives silently produce no output in v4 | Replace with `@import "tailwindcss"` immediately |
| `@import` must come before `@config` in v4 | Order: `@import` → `@import tokens` → `@config` → `@theme` |
| `next-themes` requires `suppressHydrationWarning` on `<html>` | Always add it when using ThemeProvider |
| `useTheme()` returns `undefined` on server | Always gate with `mounted` state |
| `@theme inline` required for `var()` font references | Use `@theme inline { --font-sans: var(--font-inter) }` |
| `bg-(--var)` not `bg-[--var]` for arbitrary CSS vars | v4 uses parentheses syntax for CSS var arbitrary values |
| Cloudflare Rocket Loader breaks FOUC prevention | Pass `scriptProps={{ 'data-cfasync': 'false' }}` to ThemeProvider |
| v4 removes `resolveConfig` from JS | Use `getComputedStyle` or CSS vars in JS instead |

---

## Quick Reference — Final Working Setup

```css
/* apps/web/src/styles/globals.css — v4 final */
@import "tailwindcss";
@import "./tokens.css";

@theme inline {
  /* Map tokens.css vars → Tailwind utility classes */
  --color-background: var(--color-background);
  --color-foreground: var(--color-text-primary);
  --color-primary: var(--color-primary);
  --color-border: var(--color-border);
  --font-sans: var(--font-inter);
  --font-mono: var(--font-jetbrains-mono);
  --radius-md: var(--radius-md);
  --radius-lg: var(--radius-lg);
}

/* Dark mode variant for Tailwind dark: utilities */
@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));
```

```tsx
/* apps/web/src/app/layout.tsx — final */
import { Inter, JetBrains_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes'
import '../styles/globals.css'

const inter = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-inter' })
const jbMono = JetBrains_Mono({ subsets: ['latin'], display: 'swap', variable: '--font-jetbrains-mono' })

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${jbMono.variable}`} suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
```
