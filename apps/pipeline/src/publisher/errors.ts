/** Error thrown when a database upsert operation fails. */
export class PublicationError extends Error {
  constructor(
    public readonly table: string,
    public readonly reason: 'upsert_failed' | 'constraint_violation' | 'unknown',
    message: string,
  ) {
    super(`Publication to ${table} failed (${reason}): ${message}`)
    this.name = 'PublicationError'
  }
}

/** Error thrown on duplicate external_id conflict beyond upsert handling. */
export class ConflictError extends Error {
  constructor(
    public readonly table: string,
    public readonly externalIds: string[],
  ) {
    super(`Conflict on ${table}: duplicate external_ids`)
    this.name = 'ConflictError'
  }
}

/** Error thrown when an adapter fails to fetch data from a government source. */
export class AdapterError extends Error {
  constructor(
    public readonly source: string,
    message: string,
  ) {
    super(`${source} adapter failed: ${message}`)
    this.name = 'AdapterError'
  }
}
