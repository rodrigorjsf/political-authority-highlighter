interface SkeletonProps {
  className?: string
}

/** Pulse skeleton for loading states. Respects prefers-reduced-motion. */
export function Skeleton({ className = '' }: SkeletonProps): React.JSX.Element {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Carregando..."
      className={`motion-safe:animate-pulse rounded-md bg-muted ${className}`}
    />
  )
}

/** Row of skeleton text lines */
export function SkeletonText({
  lines = 3,
  className = '',
}: {
  lines?: number
  className?: string
}): React.JSX.Element {
  return (
    <div className={`space-y-2 ${className}`} role="status" aria-busy="true" aria-label="Carregando texto...">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${i === lines - 1 ? 'w-3/4' : 'w-full'}`}
        />
      ))}
    </div>
  )
}

/** Card-shaped skeleton */
export function SkeletonCard({ className = '' }: { className?: string }): React.JSX.Element {
  return (
    <div
      className={`rounded-xl border border-border bg-card p-4 ${className}`}
      role="status"
      aria-busy="true"
      aria-label="Carregando card..."
    >
      <div className="flex items-start gap-3">
        <Skeleton className="h-[60px] w-[60px] shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-5 w-16" />
      </div>
    </div>
  )
}
