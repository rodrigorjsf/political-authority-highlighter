import { asc } from 'drizzle-orm'
import { dataSourceStatus } from '@pah/db/public-schema'
import type { PublicDb } from '@pah/db/clients'

export type SourceStatusRow = typeof dataSourceStatus.$inferSelect

export function createSourceRepository(db: PublicDb): {
  selectAll: () => Promise<SourceStatusRow[]>
} {
  return {
    async selectAll(): Promise<SourceStatusRow[]> {
      return db.select().from(dataSourceStatus).orderBy(asc(dataSourceStatus.source))
    },
  }
}

export type SourceRepository = ReturnType<typeof createSourceRepository>
