import Image from 'next/image'
import Link from 'next/link'
import type { PoliticianCard } from '@pah/shared'
import { Role } from '@pah/shared'

interface PoliticianCardProps {
  politician: PoliticianCard
  /** True for first N cards visible without scroll — enables preload (prevents LCP regression) */
  isAboveFold?: boolean
}

/**
 * Card component for the politician listing page (RF-001).
 * Server Component — no client-side JavaScript.
 * DR-002: no qualitative labels, no party colors.
 * WCAG 2.1 AA: semantic <article>, descriptive alt text, keyboard navigable via <a>.
 */
export function PoliticianCard({
  politician,
  isAboveFold = false,
}: PoliticianCardProps): React.JSX.Element {
  const { slug, name, party, state, role, photoUrl, tenureStartDate, overallScore } = politician

  const roleLabel = role === Role.DEPUTADO ? 'Deputado Federal' : 'Senadora Federal'
  const tenureDisplay = tenureStartDate
    ? new Intl.DateTimeFormat('pt-BR', { year: 'numeric', month: 'short' }).format(
        new Date(tenureStartDate),
      )
    : '—'

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
      <Link
        href={`/politicos/${slug}`}
        className="block rounded-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <div className="flex items-start gap-3">
          {/* Photo — 60x60 with SVG placeholder fallback */}
          <div className="relative h-[60px] w-[60px] shrink-0 overflow-hidden rounded-full bg-muted">
            <Image
              src={photoUrl ?? '/images/politician-placeholder.svg'}
              alt={`Foto de ${name}, ${party}-${state}`}
              fill
              sizes="60px"
              // In Next.js 15 use priority; preload prop exists only in Next.js 16+
              priority={isAboveFold}
              loading={isAboveFold ? 'eager' : 'lazy'}
              style={{ objectFit: 'cover' }}
            />
          </div>

          <div className="min-w-0 flex-1">
            {/* Name */}
            <h2 className="truncate text-sm font-semibold text-foreground">{name}</h2>

            {/* Party + State badges — neutral gray, no party colors (DR-002) */}
            <div className="mt-1 flex flex-wrap gap-1">
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {party}
              </span>
              <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                {state}
              </span>
            </div>

            {/* Role + Tenure start */}
            <p className="mt-1 text-xs text-muted-foreground">
              {roleLabel} · Desde {tenureDisplay}
            </p>
          </div>
        </div>

        {/* Score — factual numeric display, no qualitative label (DR-002) */}
        <div
          className="mt-3 flex items-center justify-between"
          aria-label={`Pontuação de integridade: ${overallScore} de 100`}
        >
          <span className="text-xs text-muted-foreground">Pontuação de integridade</span>
          <span className="tabular-nums text-sm font-semibold text-primary">
            {overallScore}/100
          </span>
        </div>
      </Link>
    </article>
  )
}
