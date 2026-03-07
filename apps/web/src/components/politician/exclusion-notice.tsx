/**
 * Displays a factual notice when exclusionFlag is true.
 * DR-001: No source name, record ID, or date shown. Boolean only.
 */
export function ExclusionNotice(): React.JSX.Element {
  return (
    <div
      className="rounded-md border border-border bg-muted p-4"
      role="note"
      aria-label="Aviso sobre dados de anticorrupção"
    >
      <p className="text-sm text-muted-foreground">
        Informações de bases públicas de anticorrupção influenciaram este componente da pontuação.
        Para detalhes, consulte o{' '}
        <a
          href="https://www.portaltransparencia.gov.br"
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline"
        >
          Portal da Transparência
        </a>
        .
      </p>
    </div>
  )
}
