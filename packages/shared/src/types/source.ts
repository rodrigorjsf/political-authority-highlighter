/** Status of a government data source sync (RF-014). */
export interface DataSourceStatus {
  source: string
  lastSyncAt: string | null
  recordCount: number
  status: 'pending' | 'syncing' | 'synced' | 'failed'
  updatedAt: string
}

export interface SourceListResponse {
  data: DataSourceStatus[]
}
