import type { FastifyRequest, FastifyReply } from 'fastify'

/** Domain-specific error for resource not found cases. */
export class NotFoundError extends Error {
  constructor(
    public readonly resource: string,
    public readonly identifier: string,
  ) {
    super(`${resource} '${identifier}' not found`)
    this.name = 'NotFoundError'
  }
}

/** Domain-specific error for invalid input that passes schema validation. */
export class ValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly reason: string,
  ) {
    super(`Invalid ${field}: ${reason}`)
    this.name = 'ValidationError'
  }
}

/**
 * Global error handler — maps domain errors to RFC 7807 Problem Details.
 * Unexpected errors are logged and return a generic 500.
 */
export function errorHandler(error: Error, request: FastifyRequest, reply: FastifyReply): void {
  if (error instanceof NotFoundError) {
    void reply.status(404).send({
      type: 'https://autoridade-politica.com.br/errors/not-found',
      title: `${error.resource} not found`,
      status: 404,
      detail: error.message,
      instance: request.url,
    })
    return
  }

  if (error instanceof ValidationError) {
    void reply.status(400).send({
      type: 'https://autoridade-politica.com.br/errors/validation',
      title: 'Validation error',
      status: 400,
      detail: error.message,
      instance: request.url,
    })
    return
  }

  // Log unexpected errors, return generic 500
  request.log.error(error, 'Unhandled error')
  void reply.status(500).send({
    type: 'https://autoridade-politica.com.br/errors/internal',
    title: 'Internal server error',
    status: 500,
    detail: 'An unexpected error occurred',
    instance: request.url,
  })
}
