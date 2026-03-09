import type { CommitteeRepository, CommitteeRow } from '../repositories/committee.repository.js'
import type { CommitteeDto, CommitteeListResponseDto } from '../schemas/committee.schema.js'

function toCommitteeDto(row: CommitteeRow): CommitteeDto {
  return {
    id: row.id,
    externalId: row.externalId,
    source: row.source,
    committeeName: row.committeeName,
    role: row.role,
    startDate: row.startDate,
    endDate: row.endDate,
  }
}

/** Service for committee queries: response shaping (no pagination). */
export function createCommitteeService(committeeRepository: CommitteeRepository): {
  findByPoliticianSlug: (slug: string) => Promise<CommitteeListResponseDto>
} {
  return {
    async findByPoliticianSlug(slug: string): Promise<CommitteeListResponseDto> {
      const rows = await committeeRepository.selectByPoliticianSlug(slug)
      return { data: rows.map(toCommitteeDto) }
    },
  }
}

export type CommitteeService = ReturnType<typeof createCommitteeService>
