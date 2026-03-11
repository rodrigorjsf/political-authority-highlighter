import {
  pgSchema,
  uuid,
  varchar,
  text,
  timestamp,
  jsonb,
  integer,
  index,
  unique,
} from 'drizzle-orm/pg-core'

export const internalData = pgSchema('internal_data')

/**
 * Audit trail of raw API responses from government sources.
 * Stores the original JSON payload for debugging and data lineage.
 * UNIQUE(source, external_id) ensures idempotent ingestion.
 */
export const rawSourceData = internalData.table(
  'raw_source_data',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: varchar('source', { length: 50 }).notNull(),
    externalId: varchar('external_id', { length: 255 }).notNull(),
    rawJson: jsonb('raw_json').notNull(),
    fetchedAt: timestamp('fetched_at').notNull().defaultNow(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    unique('uq_raw_source_external').on(table.source, table.externalId),
    index('idx_raw_source_data_source_date').on(table.source, table.fetchedAt),
  ],
)

/**
 * CPF matches with anti-corruption databases (CEIS, CNEP, CEAF, TCU, CGU).
 * DR-001: Only the boolean exclusion_flag crosses to public schema.
 * Record details stay internal — never exposed via API.
 */
export const exclusionRecords = internalData.table(
  'exclusion_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    politicianId: uuid('politician_id').notNull(),
    source: varchar('source', { length: 50 }).notNull(),
    cpfHash: varchar('cpf_hash', { length: 64 }).notNull(),
    exclusionType: varchar('exclusion_type', { length: 100 }).notNull(),
    recordDate: timestamp('record_date'),
    recordUrl: text('record_url'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_exclusion_records_politician').on(table.politicianId),
    index('idx_exclusion_records_cpf_hash').on(table.cpfHash),
  ],
)

/**
 * Encrypted CPF mapping for cross-source identity matching.
 * DR-005: CPF encrypted (AES-256-GCM) at rest, hashed (SHA-256) for lookups.
 * UNIQUE(cpf_hash) prevents duplicate identities.
 */
export const politicianIdentifiers = internalData.table(
  'politician_identifiers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    politicianId: uuid('politician_id').notNull(),
    cpfEncrypted: text('cpf_encrypted').notNull(),
    cpfHash: varchar('cpf_hash', { length: 64 }).unique().notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    index('idx_politician_identifiers_politician').on(table.politicianId),
  ],
)

/**
 * Job execution history for pipeline ingestion runs.
 * One row per pg-boss job completion (success or failure).
 */
export const ingestionLogs = internalData.table(
  'ingestion_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: varchar('source', { length: 50 }).notNull(),
    jobId: varchar('job_id', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(), // 'success' | 'partial' | 'failed'
    recordsProcessed: integer('records_processed').notNull().default(0),
    recordsUpserted: integer('records_upserted').notNull().default(0),
    errors: jsonb('errors'),
    startedAt: timestamp('started_at').notNull(),
    completedAt: timestamp('completed_at'),
  },
  (table) => [
    index('idx_ingestion_logs_source').on(table.source),
    index('idx_ingestion_logs_started').on(table.startedAt),
  ],
)

/**
 * Data freshness metadata per government source.
 * Tracks when each source was last successfully synced.
 */
export const dataSourceStatus = internalData.table(
  'data_source_status',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    source: varchar('source', { length: 50 }).unique().notNull(),
    lastSyncAt: timestamp('last_sync_at'),
    recordCount: integer('record_count').notNull().default(0),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'syncing' | 'synced' | 'failed'
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
)
