export default function VotesLoading(): React.JSX.Element {
  return (
    <main className="container mx-auto px-4 py-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-4 h-4 w-32 motion-safe:animate-pulse rounded bg-muted" />

      {/* Title skeleton */}
      <div className="mb-2 h-8 w-48 motion-safe:animate-pulse rounded bg-muted" />
      <div className="mb-4 h-4 w-20 motion-safe:animate-pulse rounded bg-muted" />

      {/* Participation rate skeleton */}
      <div className="mb-6 h-4 w-40 motion-safe:animate-pulse rounded bg-muted" />

      {/* Table skeleton — 5 rows */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-border pb-3">
            <div className="h-4 w-20 motion-safe:animate-pulse rounded bg-muted" />
            <div className="h-4 flex-1 motion-safe:animate-pulse rounded bg-muted" />
            <div className="h-4 w-16 motion-safe:animate-pulse rounded bg-muted" />
            <div className="h-4 w-20 motion-safe:animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>
    </main>
  )
}
