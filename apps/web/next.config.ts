import type { NextConfig } from 'next'

const config: NextConfig = {
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
