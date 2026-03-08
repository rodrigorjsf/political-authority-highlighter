# Next.js 15 Content-Security-Policy with App Router on Vercel

> Researched: 2026-03-07
> Sources: nextjs.org/docs (v16.1.6 page, last updated 2026-02-27), vercel.com/docs, tailwindcss.com/docs
> Applicability: Next.js 15 App Router, Vercel Free tier, ISR, Tailwind CSS, no external scripts

---

## TL;DR for Political Authority Highlighter

**Use the static CSP approach (no nonces) via `next.config.ts` `headers()`.** Nonces are incompatible with ISR because they require dynamic rendering on every request. Since this project has no external scripts, no user input forms, and uses Tailwind CSS (which compiles to static CSS files), a static CSP with `'unsafe-inline'` for `style-src` and `'self'` for `script-src` provides strong protection without sacrificing ISR performance.

For JSON-LD inline scripts, use `'unsafe-inline'` in `script-src` (acceptable for a read-only app with no user-generated content) or migrate to the experimental SRI feature when it stabilizes.

---

## Key Finding 1: Nonces Are Incompatible with ISR

From the official Next.js CSP guide (nextjs.org/docs/app/guides/content-security-policy):

> "When you use nonces in your CSP, **all pages must be dynamically rendered**."

Specific consequences of nonce-based CSP:

- **ISR is disabled** -- pages cannot use `revalidate` with nonces
- **No CDN caching** -- dynamic pages set `Cache-Control: private, no-cache, no-store`
- **PPR (Partial Prerendering) is incompatible** with nonce-based CSP
- **Every request triggers SSR** -- increased server load and latency
- **Higher hosting costs** -- more compute per request

**Why:** Nonces must be unique per request. ISR serves cached HTML across multiple requests. A cached nonce would be reused, defeating its security purpose.

### Nonce Implementation (for reference, NOT recommended for this project)

If nonces were needed, the approach uses `proxy.ts` (formerly `middleware.ts`):

```ts
// proxy.ts -- generates per-request nonce
import { NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    ...
  `
  // Sets x-nonce header for Server Components to read
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', cspHeader)
  // ...
}
```

Pages would need `await connection()` to force dynamic rendering.

---

## Key Finding 2: Recommended Approach -- Static CSP via `next.config.ts`

For apps that use ISR (like this project), Next.js recommends setting CSP headers directly in `next.config.ts` using `headers()`:

```ts
// next.config.ts
const isDev = process.env.NODE_ENV === 'development'

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`

export default {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\n/g, ''),
          },
        ],
      },
    ]
  },
}
```

### Why `'unsafe-inline'` is acceptable here

- **No user-generated content** -- the app is read-only public data
- **No external scripts** -- no Google Analytics, no third-party widgets
- **No authentication** -- no session tokens to steal via XSS
- **JSON-LD scripts** are inline `<script type="application/ld+json">` tags rendered by Server Components; nonces cannot be applied to them with ISR, so `'unsafe-inline'` in `script-src` is needed
- **Tailwind CSS** compiles to static `.css` files with class selectors; it does NOT inject inline `style` attributes at runtime, so `'unsafe-inline'` for `style-src` is a belt-and-suspenders approach (some Next.js internal styles may need it)

---

## Key Finding 3: Experimental SRI (Subresource Integrity) -- Future Option

Next.js has an experimental feature that enables hash-based CSP with static generation:

```ts
// next.config.ts
export default {
  experimental: {
    sri: {
      algorithm: 'sha256', // or 'sha384' or 'sha512'
    },
  },
}
```

**Benefits:**

- Maintains static generation and ISR compatibility
- Adds `integrity` attributes to `<script>` tags at build time
- Browsers verify scripts haven't been tampered with
- Can use strict `script-src 'self'` without `'unsafe-inline'`

**Limitations (as of 2026-03-07):**

- **Experimental** -- may change or be removed
- **Webpack only** -- NOT available with Turbopack
- **App Router only** -- not supported in Pages Router
- **Build-time only** -- cannot handle dynamically generated scripts (like JSON-LD with dynamic data)
- Does NOT solve inline `<script type="application/ld+json">` -- those still need `'unsafe-inline'` or a nonce

**Recommendation:** Monitor this feature. When it stabilizes and supports Turbopack, it could replace `'unsafe-inline'` in `script-src` for framework scripts. JSON-LD would still need a separate solution.

---

## Key Finding 4: Tailwind CSS and CSP

From tailwindcss.com/docs/preflight and the Tailwind architecture:

- Tailwind CSS generates **static CSS files** with utility classes
- It does **NOT inject inline `style` attributes** at runtime
- All styles are delivered through compiled `.css` files using CSS layers
- CSS custom properties (variables) are declared in the stylesheet, not inline

**Conclusion:** Tailwind CSS is fully compatible with strict CSP. The `'unsafe-inline'` in `style-src` is NOT required for Tailwind itself. However, some Next.js internals or shadcn/ui components may use inline styles, so `'unsafe-inline'` in `style-src` provides a safety margin.

If you want to test without `'unsafe-inline'` in `style-src`, set CSP to `style-src 'self'` and monitor the browser console for violations. If none appear, you can drop `'unsafe-inline'`.

---

## Key Finding 5: Vercel Platform Considerations

From vercel.com/docs/headers/security-headers:

- Vercel recommends nonces for inline scripts/styles (but this conflicts with ISR)
- Vercel recommends starting with `Content-Security-Policy-Report-Only` before enforcing
- Vercel recommends avoiding `unsafe-inline` and `unsafe-eval` as a best practice
- The Vercel Toolbar (dev tool) has known issues with strict CSP -- not a concern for production
- CSP headers set via `next.config.ts` `headers()` are properly served by Vercel's CDN
- ISR-cached pages will include the static CSP header on every response

---

## Concrete CSP Policy for Political Authority Highlighter

### Production policy (recommended for MVP)

```
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' blob: data:;
font-src 'self';
connect-src 'self' https://<FASTIFY_API_DOMAIN>;
object-src 'none';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
upgrade-insecure-requests;
```

### Directive explanations

| Directive | Value | Reason |
|-----------|-------|--------|
| `default-src` | `'self'` | Only allow resources from same origin |
| `script-src` | `'self' 'unsafe-inline'` | Allow own scripts + JSON-LD inline scripts |
| `style-src` | `'self' 'unsafe-inline'` | Allow own stylesheets + any Next.js/shadcn inline styles |
| `img-src` | `'self' blob: data:` | Allow own images + Next.js Image optimization (blob/data URIs) |
| `font-src` | `'self'` | Allow self-hosted fonts only |
| `connect-src` | `'self' https://<API>` | Allow API calls to the Fastify backend |
| `object-src` | `'none'` | Block plugins (Flash, Java, etc.) |
| `base-uri` | `'self'` | Prevent base tag hijacking |
| `form-action` | `'self'` | No forms in MVP, but restrict as defense-in-depth |
| `frame-ancestors` | `'none'` | Prevent clickjacking (equivalent to X-Frame-Options: DENY) |
| `upgrade-insecure-requests` | (present) | Force HTTPS for all subresources |

### Development policy additions

Add `'unsafe-eval'` to `script-src` in development only (React debugging requires `eval()`).

### Implementation in next.config.ts

```ts
import type { NextConfig } from 'next'

const isDev = process.env.NODE_ENV === 'development'
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  connect-src 'self' ${apiUrl};
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  ${isDev ? '' : 'upgrade-insecure-requests;'}
`

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: cspHeader.replace(/\s{2,}/g, ' ').trim(),
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
```

> Note: `upgrade-insecure-requests` is excluded in dev to avoid issues with `http://localhost`.

---

## Rollout Strategy

1. **Phase 1:** Deploy with `Content-Security-Policy-Report-Only` header to detect violations without breaking the site
2. **Phase 2:** Monitor browser console and/or set up a `report-uri` endpoint to collect violations
3. **Phase 3:** Switch to enforcing `Content-Security-Policy` once no legitimate violations are detected
4. **Phase 4 (future):** When experimental SRI stabilizes, evaluate removing `'unsafe-inline'` from `script-src`

---

## Sources

- [Next.js CSP Guide (App Router)](https://nextjs.org/docs/app/guides/content-security-policy) -- official, last updated 2026-02-27
- [Vercel Security Headers](https://vercel.com/docs/headers/security-headers) -- official Vercel documentation
- [Tailwind CSS Preflight](https://tailwindcss.com/docs/preflight) -- confirms no inline style injection
- [MDN Content-Security-Policy](https://developer.mozilla.org/docs/Web/HTTP/CSP) -- reference standard
