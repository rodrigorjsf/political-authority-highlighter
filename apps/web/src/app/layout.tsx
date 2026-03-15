import type { Metadata } from 'next'
import PlausibleProvider from 'next-plausible'
import '../styles/globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env['NEXT_PUBLIC_BASE_URL'] ?? 'https://autoridade-politica.com.br',
  ),
  title: {
    default: 'Autoridade Política — Transparência Política no Brasil',
    template: '%s — Autoridade Política',
  },
  description: 'Dados públicos de integridade de deputados federais e senadores brasileiros.',
  openGraph: {
    siteName: 'Autoridade Política',
    locale: 'pt_BR',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <html lang="pt-BR">
      <PlausibleProvider
        domain={process.env['NEXT_PUBLIC_PLAUSIBLE_DOMAIN'] ?? 'autoridade-politica.com.br'}
        enabled={process.env['NEXT_PUBLIC_PLAUSIBLE_ENABLED'] === 'true'}
        trackOutboundLinks
      >
        <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
      </PlausibleProvider>
    </html>
  )
}
