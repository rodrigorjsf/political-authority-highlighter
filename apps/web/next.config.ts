import type { NextConfig } from 'next'

const isDev = process.env['NODE_ENV'] === 'development'
const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001'

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? ` 'unsafe-eval'` : ''};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https:;
  font-src 'self';
  connect-src 'self' ${apiUrl};
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  ${isDev ? '' : 'upgrade-insecure-requests;'}
`

const config: NextConfig = {
  // Enables webpack to resolve .js → .ts for workspace packages that use TypeScript ESM imports
  transpilePackages: ['@pah/shared'],
  images: {
    remotePatterns: [
      // Camara dos Deputados official photo CDN
      new URL('https://www.camara.leg.br/internet/deputado/bandep/**'),
      // Senado Federal official photo CDN
      new URL('https://www.senado.leg.br/senadores/img/fotos-oficiais/**'),
    ],
  },
  // Security headers (DR-002, DR-006)
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy-Report-Only', value: cspHeader.replace(/\s{2,}/g, ' ').trim() },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default config
