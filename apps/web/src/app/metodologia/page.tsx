// ISR: revalidate every 7 days (methodology changes are infrequent)
export const revalidate = 604800

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Metodologia — Autoridade Política',
  description:
    'Como calculamos a pontuação de integridade de deputados federais e senadores brasileiros. Fórmula, componentes e fontes oficiais.',
  alternates: { canonical: 'https://autoridade-politica.com.br/metodologia' },
}

// TODO(RF-004): replace with API-fetched value when scoring engine is built
const METHODOLOGY_VERSION = 'v1.0'

/**
 * Static methodology page explaining how integrity scores are calculated.
 * RF-005: all 6 AC. DR-001: no exclusion details. DR-002: no qualitative labels.
 */
export default function MetodologiaPage(): React.JSX.Element {
  return (
    <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 focus:outline-none">
      <section aria-labelledby="how-scores-work">
        <h1 id="how-scores-work" className="mb-6 text-2xl font-bold text-foreground">
          Como calculamos a pontuação de integridade
        </h1>
        <p className="mb-8 text-sm text-muted-foreground">
          A plataforma Autoridade Política cruza dados públicos de 6 fontes governamentais oficiais
          para gerar uma pontuação composta de integridade (0–100) para cada parlamentar federal
          brasileiro. Todos os dados utilizados são públicos e acessíveis sob a Lei de Acesso à
          Informação (LAI).
        </p>
      </section>

      <section aria-labelledby="formula" className="mb-8">
        <h2 id="formula" className="mb-3 text-lg font-semibold text-foreground">
          Fórmula
        </h2>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="font-mono text-sm text-foreground">
            Pontuação = Transparência + Atividade Legislativa + Regularidade Financeira +
            Anti-Corrupção
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Cada componente contribui de 0 a 25 pontos, totalizando 0 a 100. Os pesos são uniformes
            (0,25 cada), garantindo tratamento igualitário entre todas as dimensões avaliadas.
          </p>
        </div>
      </section>

      <section aria-labelledby="components" className="mb-8">
        <h2 id="components" className="mb-3 text-lg font-semibold text-foreground">
          Componentes do Score
        </h2>
        <dl className="space-y-4">
          <div className="rounded-lg border border-border bg-card p-4">
            <dt className="font-semibold text-foreground">Transparência (0–25)</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              Mede a disponibilidade de dados públicos do parlamentar nas 6 fontes oficiais.
              Ausência de dados reduz este componente, não indica má conduta.
            </dd>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <dt className="font-semibold text-foreground">Atividade Legislativa (0–25)</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              Mede participação em votações nominais, autoria de projetos de lei e atuação em
              comissões parlamentares.
            </dd>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <dt className="font-semibold text-foreground">Regularidade Financeira (0–25)</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              Analisa despesas de gabinete (CEAP/CEAPS) e declarações de patrimônio ao TSE em
              relação a padrões históricos.
            </dd>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <dt className="font-semibold text-foreground">Anti-Corrupção (0 ou 25)</dt>
            <dd className="mt-1 text-sm text-muted-foreground">
              Componente binário: 25 pontos se nenhum registro encontrado em bases públicas de
              anticorrupção; 0 pontos se qualquer registro existir.
            </dd>
          </div>
        </dl>
      </section>

      <section aria-labelledby="sources" className="mb-8">
        <h2 id="sources" className="mb-3 text-lg font-semibold text-foreground">
          Fontes de Dados
        </h2>
        <ul className="space-y-2">
          <li>
            <a
              href="https://dadosabertos.camara.leg.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Câmara dos Deputados
            </a>
            <span className="text-sm text-muted-foreground">
              {' '}
              — Dados abertos da Câmara dos Deputados
            </span>
          </li>
          <li>
            <a
              href="https://legis.senado.leg.br/dadosabertos/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Senado Federal
            </a>
            <span className="text-sm text-muted-foreground">
              {' '}
              — Dados abertos do Senado Federal
            </span>
          </li>
          <li>
            <a
              href="https://www.portaltransparencia.gov.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              Portal da Transparência
            </a>
            <span className="text-sm text-muted-foreground">
              {' '}
              — Controladoria-Geral da União (CGU)
            </span>
          </li>
          <li>
            <a
              href="https://dadosabertos.tse.jus.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              TSE — Tribunal Superior Eleitoral
            </a>
            <span className="text-sm text-muted-foreground"> — Dados eleitorais e patrimônio</span>
          </li>
          <li>
            <a
              href="https://portal.tcu.gov.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              TCU — Tribunal de Contas da União
            </a>
            <span className="text-sm text-muted-foreground"> — Fiscalização de contas públicas</span>
          </li>
          <li>
            <a
              href="https://www.gov.br/cgu/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline"
            >
              CGU — Controladoria-Geral da União
            </a>
            <span className="text-sm text-muted-foreground">
              {' '}
              — Prevenção e combate à corrupção
            </span>
          </li>
        </ul>
      </section>

      <section aria-labelledby="anticorrupcao" className="mb-8">
        <h2 id="anticorrupcao" className="mb-3 text-lg font-semibold text-foreground">
          Componente Anti-Corrupção
        </h2>
        <div className="rounded-lg border border-border bg-muted p-4">
          <p className="text-sm text-muted-foreground">
            Quando informações de bases públicas de anticorrupção afetam este componente, o impacto
            é visível na pontuação, mas os detalhes do registro não são expostos. Para consultar as
            bases oficiais, acesse o{' '}
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
      </section>

      <footer className="border-t border-border pt-4 text-xs text-muted-foreground">
        <p>Versão da metodologia: {METHODOLOGY_VERSION}</p>
      </footer>
    </main>
  )
}
