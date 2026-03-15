'use client'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): React.JSX.Element {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 focus:outline-none"
    >
      <h1 className="text-2xl font-bold">Ocorreu um erro inesperado</h1>
      <p className="text-muted-foreground">
        Estamos trabalhando para resolver este problema. Por favor, tente novamente mais tarde.
      </p>
      {error.digest !== undefined && (
        <p className="text-xs text-muted-foreground">Referência: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        Tentar novamente
      </button>
    </main>
  )
}
