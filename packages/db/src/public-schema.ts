import {
  pgSchema,
  uuid,
  varchar,
  boolean,
  smallint,
  timestamp,
  text,
  date,
  numeric,
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

export const publicData = pgSchema('public')

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
      sql`to_tsvector('simple', public.unaccent_immutable(coalesce(name, '')))`,
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

/**
 * Legislative bills authored or co-authored by a politician (RF-008).
 * Populated by the pipeline from Camara and Senado sources.
 */
export const bills = publicData.table(
  'bills',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    politicianId: uuid('politician_id').references(() => politicians.id).notNull(),
    externalId: varchar('external_id', { length: 100 }).notNull(),
    source: varchar('source', { length: 20 }).notNull(), // 'camara' | 'senado'
    title: text('title').notNull(),
    billType: varchar('bill_type', { length: 20 }).notNull(), // 'PL', 'PEC', etc.
    billNumber: varchar('bill_number', { length: 20 }).notNull(),
    billYear: smallint('bill_year').notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    submissionDate: date('submission_date').notNull(),
    sourceUrl: varchar('source_url', { length: 500 }), // nullable
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_bills_politician').on(table.politicianId),
    // Composite index for keyset pagination (politician_id, date DESC, id DESC)
    index('idx_bills_pagination').on(table.politicianId, table.submissionDate, table.id),
  ],
)

/**
 * Parliamentary voting records for a politician (RF-009).
 * Populated by the pipeline from Camara and Senado sources.
 */
export const votes = publicData.table(
  'votes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    politicianId: uuid('politician_id').references(() => politicians.id).notNull(),
    externalId: varchar('external_id', { length: 100 }).notNull(),
    source: varchar('source', { length: 20 }).notNull(), // 'camara' | 'senado'
    sessionDate: date('session_date').notNull(),
    matterDescription: text('matter_description').notNull(),
    voteCast: varchar('vote_cast', { length: 20 }).notNull(), // 'sim'|'não'|'abstenção'|'ausente'
    sessionResult: varchar('session_result', { length: 100 }).notNull(),
    sourceUrl: varchar('source_url', { length: 500 }), // nullable
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_votes_politician').on(table.politicianId),
    // Composite index for keyset pagination (politician_id, date DESC, id DESC)
    index('idx_votes_pagination').on(table.politicianId, table.sessionDate, table.id),
  ],
)

/**
 * Parliamentary proposals authored or co-authored by a politician (RF-010).
 * Covers all proposal types: PL, PEC, PLP, MP, PDL, etc.
 * Populated by the pipeline from Camara and Senado sources.
 */
export const proposals = publicData.table(
  'proposals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    politicianId: uuid('politician_id').references(() => politicians.id).notNull(),
    externalId: varchar('external_id', { length: 100 }).notNull(),
    source: varchar('source', { length: 20 }).notNull(), // 'camara' | 'senado'
    proposalType: varchar('proposal_type', { length: 20 }).notNull(), // 'PL', 'PEC', 'PLP', 'MP', etc.
    proposalNumber: varchar('proposal_number', { length: 20 }).notNull(),
    proposalYear: smallint('proposal_year').notNull(),
    summary: text('summary').notNull(),
    status: varchar('status', { length: 50 }).notNull(),
    submissionDate: date('submission_date').notNull(),
    sourceUrl: varchar('source_url', { length: 500 }), // nullable
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_proposals_politician').on(table.politicianId),
    index('idx_proposals_pagination').on(table.politicianId, table.submissionDate, table.id),
  ],
)

/**
 * Committee memberships for a politician (RF-011).
 * end_date null means current active membership.
 * Populated by the pipeline from Camara and Senado sources.
 */
export const committees = publicData.table(
  'committees',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    politicianId: uuid('politician_id').references(() => politicians.id).notNull(),
    externalId: varchar('external_id', { length: 100 }).notNull(),
    source: varchar('source', { length: 20 }).notNull(), // 'camara' | 'senado'
    committeeName: text('committee_name').notNull(),
    role: varchar('role', { length: 50 }).notNull(), // 'Titular', 'Suplente', 'Presidente', etc.
    startDate: date('start_date').notNull(),
    endDate: date('end_date'), // nullable — null = current
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_committees_politician').on(table.politicianId),
  ],
)

/**
 * Parliamentary expenses (CEAP/CEAPS) for a politician (RF-012).
 * Populated by the pipeline from Portal da Transparencia (Camara/Senado sources).
 * Keyset pagination on (year DESC, month DESC, id DESC) for stable ordering.
 */
export const expenses = publicData.table(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    politicianId: uuid('politician_id').references(() => politicians.id).notNull(),
    externalId: varchar('external_id', { length: 100 }).notNull(),
    source: varchar('source', { length: 20 }).notNull(), // 'camara' | 'senado'
    year: smallint('year').notNull(),
    month: smallint('month').notNull(),
    category: varchar('category', { length: 255 }).notNull(),
    supplierName: varchar('supplier_name', { length: 255 }).notNull(),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    documentNumber: varchar('document_number', { length: 100 }), // nullable
    sourceUrl: varchar('source_url', { length: 500 }), // nullable
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_expenses_politician').on(table.politicianId),
    // Composite index for keyset pagination (year DESC, month DESC, id DESC)
    index('idx_expenses_pagination').on(table.year, table.month, table.id),
    // Unique constraint: prevent duplicate ingestion via idempotency key
    { unique: 'uq_expenses_external' },
  ],
)
