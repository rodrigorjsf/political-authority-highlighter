/** Skeleton loader matching the card grid layout — prevents CLS (RNF-PERF-003) */
export default function Loading(): React.JSX.Element {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6 h-8 w-32 animate-pulse rounded bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className="h-32 animate-pulse rounded-lg border border-border bg-muted"
            aria-hidden="true"
          />
        ))}
      </div>
    </main>
  )
}
