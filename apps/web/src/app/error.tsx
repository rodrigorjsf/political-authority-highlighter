'use client'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}): React.JSX.Element {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-bold">An unexpected error occurred</h1>
      <p className="text-muted-foreground">
        We are working to resolve this issue. Please try again later.
      </p>
      {error.digest !== undefined && (
        <p className="text-xs text-muted-foreground">Reference: {error.digest}</p>
      )}
      <button
        onClick={reset}
        className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
      >
        Try again
      </button>
    </main>
  )
}
