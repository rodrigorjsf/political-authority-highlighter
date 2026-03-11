import type { SourceRepository, SourceStatusRow } from '../repositories/source.repository.js'
import type { SourceStatusDto, SourceListResponseDto } from '../schemas/source.schema.js'

function toSourceDto(row: SourceStatusRow): SourceStatusDto {
  return {
    source: row.source,
    lastSyncAt: row.lastSyncAt?.toISOString() ?? null,
    recordCount: row.recordCount,
    status: row.status as SourceStatusDto['status'],
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function createSourceService(repository: SourceRepository): {
  findAll: () => Promise<SourceListResponseDto>
} {
  return {
    async findAll(): Promise<SourceListResponseDto> {
      const rows = await repository.selectAll()
      return { data: rows.map(toSourceDto) }
    },
  }
}

export type SourceService = ReturnType<typeof createSourceService>
