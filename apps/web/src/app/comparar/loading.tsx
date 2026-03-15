export default function ComparacaoLoading(): React.JSX.Element {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-6 h-8 w-48 rounded-md bg-muted motion-safe:animate-pulse" />
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-20 rounded-md bg-muted motion-safe:animate-pulse" />
        <div className="h-20 rounded-md bg-muted motion-safe:animate-pulse" />
      </div>
      <div className="h-64 rounded-lg bg-muted motion-safe:animate-pulse" />
    </main>
  )
}
