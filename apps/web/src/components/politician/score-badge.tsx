interface ScoreBadgeProps {
  score: number
  maxScore?: number
}

/**
 * Displays a numeric integrity score badge.
 * DR-002: no qualitative labels — score shown as "X/Y" only.
 */
export function ScoreBadge({ score, maxScore = 100 }: ScoreBadgeProps): React.JSX.Element {
  return (
    <span
      className="tabular-nums text-sm font-semibold text-primary"
      aria-label={`Pontuação: ${score} de ${maxScore}`}
    >
      {score}/{maxScore}
    </span>
  )
}
