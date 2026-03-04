import type { PoliticianProfile } from '../../lib/api-types'

interface ScoreBreakdownProps {
  politician: Pick<
    PoliticianProfile,
    | 'overallScore'
    | 'transparencyScore'
    | 'legislativeScore'
    | 'financialScore'
    | 'anticorruptionScore'
  >
  showMethodologyLink?: boolean | undefined
}

interface ScoreItemProps {
  label: string
  value: number
  maxValue: number
}

function ScoreItem({ label, value, maxValue }: ScoreItemProps): React.JSX.Element {
  const percentage = Math.round((value / maxValue) * 100)
  return (
    <div role="listitem">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="text-sm font-medium tabular-nums">
          {value}/{maxValue}
        </span>
      </div>
      <div
        className="h-2 w-full rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={maxValue}
        aria-label={`${label}: ${value} de ${maxValue}`}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Displays the 4 integrity score components with neutral progress bars.
 * DR-002: No qualitative labels. Scores displayed numerically only.
 */
export function ScoreBreakdown({
  politician,
  showMethodologyLink = false,
}: ScoreBreakdownProps): React.JSX.Element {
  return (
    <section aria-labelledby="score-breakdown-heading">
      <h2 id="score-breakdown-heading" className="mb-4 text-lg font-semibold">
        Composição da Pontuação
      </h2>
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        role="list"
        aria-label="Componentes da pontuação de integridade"
      >
        <ScoreItem label="Transparência" value={politician.transparencyScore} maxValue={25} />
        <ScoreItem
          label="Atividade Legislativa"
          value={politician.legislativeScore}
          maxValue={25}
        />
        <ScoreItem
          label="Regularidade Financeira"
          value={politician.financialScore}
          maxValue={25}
        />
        <ScoreItem label="Anti-Corrupção" value={politician.anticorruptionScore} maxValue={25} />
      </div>
      {showMethodologyLink && (
        <p className="mt-4 text-sm text-muted-foreground">
          Saiba mais sobre o cálculo em{' '}
          <a href="/metodologia" className="text-primary underline">
            nossa metodologia
          </a>
          .
        </p>
      )}
    </section>
  )
}
