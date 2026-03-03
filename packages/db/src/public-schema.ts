import {
  pgSchema,
  uuid,
  varchar,
  boolean,
  smallint,
  timestamp,
  text,
  date,
  index,
  customType,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

// RF-015: tsvector custom type for PostgreSQL FTS (not natively supported by Drizzle)
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

export const publicData = pgSchema('public_data')

/**
 * Central entity: a Brazilian federal legislator (deputado or senador).
 * All fields are publicly available government data (LAI compliant).
 * No CPF, no exclusion details — see internal-schema.ts for sensitive data.
 */
export const politicians = publicData.table(
  'politicians',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    externalId: varchar('external_id', { length: 100 }).unique().notNull(),
    source: varchar('source', { length: 20 }).notNull(), // 'camara' | 'senado'
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).unique().notNull(),
    state: varchar('state', { length: 2 }).notNull(), // UF abbreviation
    party: varchar('party', { length: 50 }).notNull(),
    role: varchar('role', { length: 20 }).notNull(), // 'deputado' | 'senador'
    photoUrl: varchar('photo_url', { length: 500 }), // nullable — fallback shown in UI
    active: boolean('active').notNull().default(true),
    bioSummary: text('bio_summary'),
    // RF-001 AC #1: tenure start date for card display
    // Added vs ER.md v1.0 — populated from Camara dataPosse / Senado dataInicioAtividade
    tenureStartDate: date('tenure_start_date'),
    // DR-001: Silent exclusion — only boolean crosses schema boundary
    exclusionFlag: boolean('exclusion_flag').notNull().default(false),
    // RF-015: FTS generated column — kept in sync with name by PostgreSQL automatically
    searchVector: tsvector('search_vector').generatedAlwaysAs(
      sql`to_tsvector('simple', unaccent(coalesce(name, '')))`,
    ),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_politicians_slug').on(table.slug),
    index('idx_politicians_state').on(table.state),
    index('idx_politicians_party').on(table.party),
    index('idx_politicians_role').on(table.role),
    index('idx_politicians_active').on(table.active),
    // RF-015: GIN index for sub-100ms full-text search
    index('idx_politicians_search').using('gin', table.searchVector),
  ],
)

/**
 * Pre-computed integrity scores per politician.
 * Versioned by methodology_version to support algorithm evolution.
 * All scores are computed by the pipeline — never by the API.
 */
export const integrityScores = publicData.table(
  'integrity_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    politicianId: uuid('politician_id').references(() => politicians.id).notNull(),
    overallScore: smallint('overall_score').notNull(), // 0-100
    transparencyScore: smallint('transparency_score').notNull(), // 0-25
    legislativeScore: smallint('legislative_score').notNull(), // 0-25
    financialScore: smallint('financial_score').notNull(), // 0-25
    anticorruptionScore: smallint('anticorruption_score').notNull(), // 0 or 25 (binary, DR-001)
    exclusionFlag: boolean('exclusion_flag').notNull().default(false),
    methodologyVersion: varchar('methodology_version', { length: 20 }).notNull(),
    calculatedAt: timestamp('calculated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_scores_politician').on(table.politicianId),
    // Composite DESC index for stable cursor pagination (RF-001 AC #4)
    index('idx_scores_overall_desc').on(table.overallScore, table.politicianId),
  ],
)
