import React from 'react'

export default function ExpensesLoading(): React.JSX.Element {
  return (
    <main className="container mx-auto px-4 py-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-4 h-5 w-32 animate-pulse rounded bg-muted" />

      {/* Title skeleton */}
      <div className="mb-2 h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="mb-6 h-5 w-20 animate-pulse rounded bg-muted" />

      {/* Yearly totals skeleton */}
      <div className="mb-6 space-y-2">
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        <div className="h-4 w-40 animate-pulse rounded bg-muted" />
      </div>

      {/* Table skeleton */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-3 pr-4 text-left">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </th>
              <th className="pb-3 pr-4 text-left">
                <div className="h-4 w-24 animate-pulse rounded bg-muted" />
              </th>
              <th className="pb-3 pr-4 text-left">
                <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              </th>
              <th className="pb-3 pr-4 text-right">
                <div className="h-4 w-16 animate-pulse rounded bg-muted" />
              </th>
              <th className="pb-3 text-left">
                <div className="h-4 w-20 animate-pulse rounded bg-muted" />
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="border-b border-border">
                <td className="py-3 pr-4">
                  <div className="h-4 w-16 animate-pulse rounded bg-muted" />
                </td>
                <td className="py-3 pr-4">
                  <div className="h-4 w-32 animate-pulse rounded bg-muted" />
                </td>
                <td className="py-3 pr-4">
                  <div className="h-4 w-40 animate-pulse rounded bg-muted" />
                </td>
                <td className="py-3 pr-4">
                  <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                </td>
                <td className="py-3">
                  <div className="h-4 w-12 animate-pulse rounded bg-muted" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination skeleton */}
      <div className="mt-8 flex justify-center gap-4">
        <div className="h-10 w-24 animate-pulse rounded bg-muted" />
        <div className="h-10 w-24 animate-pulse rounded bg-muted" />
      </div>
    </main>
  )
}
