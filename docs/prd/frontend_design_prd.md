# Project Requirements Document (PRD) & AI Design System Directives

**Project Name:** Positive Transparency Portal (Portal da Transparência Positiva)
**Document Purpose:** System prompt, architectural guideline, and behavioral rulebook for AI Coding Agents (e.g., Claude Code, Gemini) executing UI/UX and frontend engineering tasks.
**Target Audience:** General Brazilian Public (Mobile-first, highly accessible, simplified civic engagement).

---

## 1. AI Agent Behavioral Directives

As an AI acting on this project, you are expected to operate as a **rigorous intellectual partner and senior frontend engineer**, not a submissive assistant. When generating code or suggesting UI patterns, you must strictly adhere to the following behavioral rules:

* **Constructive Rigor:** Do not blindly agree with initial human prompts if they violate accessibility, mobile-responsiveness, or modern UI best practices. If a requested layout is flawed for the target audience, flag it and propose the optimal alternative.
* **Prioritize Truth and Usability:** Your goal is clarity, precision, and intellectual honesty. If a design choice obscures data or makes navigation complex for a low-literacy user, reject it and provide a better solution.
* **Strong Opinions, Weakly Held:** Provide the single best implementation for a component rather than five mediocre options. Test assumptions logically before generating the code.
* **Vibe Adherence:** You are generating a modern, high-trust, SaaS-like interface ("Vibe Coding"). Do not generate legacy government-style UIs (e.g., heavy drop shadows, cluttered navbars, dense legal jargon).

---

## 2. Core Design Philosophy

The mission of this platform is to shift the Brazilian political narrative from "hunting corruption" to "highlighting integrity." The design must evoke **trust, modernity, and extreme simplicity**.

* **Simplicity Over Complexity:** The primary user might be accessing this on a low-end smartphone on a 3G network. Data must be digestible at a glance.
* **Data as the Hero:** Use progressive disclosure. Show the "Integrity Score" and a clean gauge chart first. Hide complex legislative history behind "View Details" interactions.
* **The "Vibe" Aesthetic:** Clean lines, subtle glassmorphism, bento grids for data visualization, high-contrast borders, and deep, immersive dark modes.

---

## 3. Design Tokens & Theming

The color palette is derived from the Brazilian Flag (Green, Yellow, Blue, White) but strictly adapted for digital UI/UX compliance (WCAG AA minimum contrast). Do not use the raw, saturated flag colors for backgrounds or text. Use the defined semantic tokens below.

### 3.1. Color Palette (Tailwind CSS Semantic Mapping)

| Semantic Role | Light Mode (Hex) | Dark Mode (Hex) | Usage Guidelines |
| --- | --- | --- | --- |
| **Background Base** | `#FFFFFF` | `#0B0E14` | Main application background. |
| **Surface/Card** | `#F8FAFC` | `#161B22` | Background for Bento Grid cards, sidebars, modals. |
| **Border/Divider** | `#E2E8F0` | `#30363D` | Subtle dividers, card outlines (1px solid). |
| **Primary (Trust Blue)** | `#1D4ED8` | `#3B82F6` | Primary buttons, active tabs, standard links. |
| **Success (Integrity Green)** | `#16A34A` | `#22C55E` | "Clean Record" badges, positive scores, progress bars. |
| **Warning/Accent (Yellow)** | `#D97706` | `#FACC15` | Highlighted terms, attention-requiring tooltips, star ratings. |
| **Text Primary** | `#0F172A` | `#F8FAFC` | Main body text, headings. |
| **Text Muted** | `#64748B` | `#94A3B8` | Subtitles, table headers, metadata. |

### 3.2. Typography Scale

* **Font Family (UI/Reading):** `Inter` or `Plus Jakarta Sans` (Sans-serif, clean, highly legible).
* **Font Family (Data/Numbers):** `JetBrains Mono` or `Roboto Mono` (Used strictly for integrity scores, financial data, and process numbers to enforce the "analytical" vibe).
* **Base Size:** `16px` (`1rem`). Never go below `14px` (`0.875rem`) for accessibility.
* **Headings:** Heavy weight (`font-bold` or `font-extrabold`), tight tracking (`tracking-tight`).

### 3.3. Spacing & Border Radius

* **Spacing System:** Strict 4px grid (Tailwind defaults: `p-4`, `m-6`, `gap-8`).
* **Border Radius:** * Outer Containers/Cards: `rounded-2xl` or `rounded-xl`.
* Inner Elements (Buttons/Badges): `rounded-lg` or `rounded-md`.
* Tags/Pills: `rounded-full`.



---

## 4. Layout Architecture & Responsiveness

The application must be fully responsive, prioritizing the mobile experience without degrading the desktop dashboard aesthetic.

### 4.1. Breakpoints & Grid Behavior

* **Mobile (< 640px):** * 1-column layout (`grid-cols-1`).
* Desktop sidebars convert into a **Bottom Tab Navigation Bar** (Touch-friendly).
* Complex data tables convert into stacked vertical cards.


* **Tablet (640px - 1024px):**
* 2-column Bento Grid layouts.
* Collapsible side drawer navigation.


* **Desktop (> 1024px):**
* Fixed left sidebar navigation (Width: `280px`).
* Max-width constraint on main content area (`max-w-7xl`) to maintain readability.
* 3 to 4-column Bento Grids for data dashboards.



### 4.2. Global Navigation Elements

* **Header:** Glassmorphism effect (`backdrop-blur-md bg-white/70` in light mode, `bg-[#0B0E14]/70` in dark mode). Sticky top. Contains the Search Bar and Theme Toggle (Sun/Moon icon).
* **Sidebar (Desktop):** Flat design, active states indicated by a subtle background fill (`bg-slate-100` / `bg-white/5`) and primary color text.

---

## 5. Component Specifications

When building UI elements, AI agents must implement the following states: `default`, `hover`, `focus` (ring), `active`, and `disabled`.

### 5.1. Politician Profile Card (Bento Grid Item)

* **Structure:** Avatar (rounded), Name (`h2`), Current Role (`text-muted`).
* **Integrity Gauge Chart:** A semi-circle SVG chart. The stroke color must dynamically map to the score (e.g., Green for >80, Yellow for 50-79). Use `JetBrains Mono` for the center number.
* **Tags:** Use muted backgrounds with solid text for political parties and core competencies (e.g., `<span class="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Ficha Limpa</span>`).

### 5.2. Data Tables (For Proposals & Voting History)

* **Style:** Borderless inner rows, separated by a 1px subtle bottom border (`border-b border-slate-200 dark:border-slate-800`).
* **Hover State:** Entire row must highlight subtly on desktop (`hover:bg-slate-50 dark:hover:bg-white/5`).
* **Actions:** Right-aligned standard actions (e.g., a "chevron-right" icon to view details).

### 5.3. Buttons

* **Primary:** Solid background (`bg-blue-600`), white text, subtle shadow (`shadow-sm`).
* **Secondary/Outline:** Transparent background, 1px border (`border-slate-300`), text matches current theme.
* **Hover Effects:** Slight translation upwards (`-translate-y-[1px]`) and opacity shift, transitioned smoothly (`transition-all duration-200 ease-in-out`).

---

## 6. Micro-Interactions & Animation

Motion should be purposeful, indicating state changes or loading data, never purely decorative.

* **Page Transitions:** Fade in (`opacity-0` to `opacity-100` over `300ms`).
* **Data Loading (Skeleton Screens):** Do not use generic spinners for main content. Use animated pulse skeletons (`animate-pulse bg-slate-200 dark:bg-slate-800`) matching the shape of the incoming data (cards, text rows).
* **Tooltips (Hints):** Crucial for explaining political/civic terminology. Must appear on `hover` (desktop) or `tap` (mobile) with a fast fade-in (`duration-150`). Use dark backgrounds for tooltips in both modes for high contrast.

---

## 7. UX Copywriting & Accessibility (a11y)

* **Language Tone:** Neutral, educational, optimistic, and highly accessible (targeting reading level of an average citizen, avoiding "juridiquês" / legal jargon).
* **Clarity:** Instead of "Ato de Improbidade Administrativa", use a tooltip to explain "Condenação por mau uso de dinheiro público" (Conviction for misuse of public funds).
* **Aria Attributes:** All charts, icons, and interactive elements MUST have descriptive `aria-labels`.
* **Touch Targets:** Minimum `44x44px` clickable area for all interactive elements (especially crucial for the mobile Tab Navigation).
* **Focus Management:** Keyboard navigation must be fully supported with clear, high-contrast focus rings (`focus:ring-2 focus:ring-blue-500 focus:outline-none`).