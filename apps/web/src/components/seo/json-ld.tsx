import type { PoliticianProfile } from '../../lib/api-types'
import { Role } from '@pah/shared'
interface PoliticianJsonLdProps {
  politician: PoliticianProfile
}

export function PoliticianJsonLd({ politician }: PoliticianJsonLdProps): React.JSX.Element {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: politician.name,
    image: politician.photoUrl,
    url: `https://autoridade-politica.com.br/politicos/${politician.slug}`,
    jobTitle: politician.role === Role.SENADOR ? 'Senador da República' : 'Deputado Federal',
    memberOf: {
      '@type': 'Organization',
      name: politician.party,
    },
    affiliation: {
      '@type': 'Organization',
      name: 'Congresso Nacional do Brasil',
      url: 'https://www.congressonacional.leg.br',
    },
    nationality: {
      '@type': 'Country',
      name: 'Brasil',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c'),
      }}
    />
  )
}
