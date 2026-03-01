import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'Autoridade Política — Transparência Política no Brasil',
  description: 'Dados públicos de integridade de deputados federais e senadores brasileiros.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-background font-sans antialiased">{children}</body>
    </html>
  )
}
