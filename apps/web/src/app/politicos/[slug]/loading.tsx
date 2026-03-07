export default function PoliticianProfileLoading(): React.JSX.Element {
  return (
    <main className="container mx-auto px-4 py-8" aria-label="Carregando perfil do político">
      <div className="mb-8 flex flex-col gap-6 sm:flex-row">
        {/* Photo skeleton */}
        <div className="h-32 w-32 flex-shrink-0 animate-pulse rounded-full bg-muted" />

        {/* Identity skeleton */}
        <div className="flex-1 space-y-3">
          <div className="h-7 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-16 w-full animate-pulse rounded bg-muted" />
        </div>

        {/* Score skeleton */}
        <div className="flex h-24 w-32 flex-col items-center justify-center rounded-lg border border-border">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-10 w-16 animate-pulse rounded bg-muted" />
        </div>
      </div>

      {/* Score breakdown skeleton */}
      <div className="mb-8">
        <div className="mb-4 h-6 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                <div className="h-4 w-10 animate-pulse rounded bg-muted" />
              </div>
              <div className="h-2 w-full animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>

      {/* Tab nav skeleton */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 w-28 animate-pulse rounded-md bg-muted" />
        ))}
      </div>
    </main>
  )
}
