import Link from 'next/link'

export default function NotFound(): React.JSX.Element {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 focus:outline-none"
    >
      <h1 className="text-2xl font-bold">Página não encontrada</h1>
      <p className="text-muted-foreground">O político ou página que você procura não existe.</p>
      <Link
        href="/politicos"
        className="text-primary underline focus:outline-none focus:ring-2 focus:ring-ring"
      >
        Ver todos os políticos
      </Link>
    </main>
  )
}
