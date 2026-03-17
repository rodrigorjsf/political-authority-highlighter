---
applyTo: "apps/web/**"
---

# Frontend Code Review — Political Authority Highlighter

## Server Components by Default

Every component is a Server Component unless it needs `useState`, `useReducer`, `useEffect`, `useRef`, event handlers (`onClick`, `onChange`), or browser APIs (`window`, `document`, `localStorage`). Using `'use client'` on a component that only displays data is a violation — fetch data in Server Components.

REJECT: `useEffect` to fetch data that can be fetched on the server. This is the most common mistake.

## Next.js 15 Patterns

`searchParams` and `params` are Promises in Next.js 15 — must be awaited: `const { slug } = await params`. `searchParams` requires `Promise<{ [key: string]: string | string[] | undefined }>` type.

Use App Router exclusively — no Pages Router. ISR for politician pages with `export const revalidate = 3600`. Pre-generate top 100 pages via `generateStaticParams()`.

## Political Neutrality (DR-002) — REJECT violations

No party colors anywhere. Use only the neutral palette defined in CSS custom properties (`--primary`, `--muted`, `--border`). Score visualization uses a single-hue gradient (light blue to dark blue) or neutral gray — never red/green for bad/good. Party names displayed as text in neutral badges only.

No qualitative labels: never "good", "bad", "excellent", "poor", "corrupt", "clean", "best", "worst". Display scores as numbers only: "72/100". No `getPartyColor()` functions. No ideology-based grouping ("Left Wing", "Right Wing").

## Silent Exclusion Display (DR-001)

`ExclusionNotice` component renders ONLY: "Information from public anti-corruption databases affected this component of the score." with a link to Portal da Transparencia. No exclusion source names, dates, record types, counts, or reasons.

REJECT: Any UI element showing exclusion details. REJECT: Filtering excluded politicians from listings.

## State Management

No client-side state management libraries (Redux, Zustand, Jotai, Recoil). URL search params are the single source of truth. Filters, search, pagination cursors, and sorting stored in URL params. Every view must be shareable and bookmarkable.

## Accessibility (WCAG 2.1 AA)

All `<img>` need `alt` text. Politicians: `alt="${name}, ${party}-${state}"`. All `<input>` need `<label>`. Keyboard navigable with focus ring. Contrast 4.5:1 minimum. Touch targets 44x44px. `prefers-reduced-motion` respected. `<html lang="pt-BR">`.

REJECT: Icon-only buttons without `aria-label`. REJECT: `<img>` without `alt`. REJECT: Color as sole meaning indicator.

## Design Tokens

All visual styles must use tokens from `docs/prd/frontend_design_prd.md`. Typography: Inter or Plus Jakarta Sans for UI text; JetBrains Mono for scores, financial numbers, process IDs. Minimum font size: 14px. Spacing: strict 4px grid. Border radius: `rounded-xl`/`rounded-2xl` for containers, `rounded-lg`/`rounded-md` for buttons, `rounded-full` for tags/pills.

Dark mode is mandatory — every color must have both light and dark variants via CSS custom properties.

## Component Patterns

Use `next/image` for all images — never raw `<img>`. Set explicit `width`/`height` to prevent CLS. Dynamic import charts with `next/dynamic` and `{ ssr: false }`. No barrel exports. Use React `cache()` to deduplicate fetches. Loading: skeleton screens (`animate-pulse`) — NEVER generic spinners. Every async page needs `loading.tsx`.

## Security (DR-008)

No imports from `@pah/db`, `pg`, `drizzle-orm`, `pg-boss`. No `NEXT_PUBLIC_` except `NEXT_PUBLIC_API_URL`. No `dangerouslySetInnerHTML` except JSON-LD `<script>` with `JSON.stringify()`. Error boundaries show generic messages only. No external scripts without SRI.

## Styling

Tailwind only — no custom CSS except `globals.css` `@layer`. Use `cn()` for conditional classes. shadcn/ui from `src/components/ui/` only. No CSS-in-JS, no inline styles. Banned: client state libraries, form libraries.
