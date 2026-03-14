'use strict'

module.exports = {
  rules: {
    'no-restricted-imports': ['error', {
      patterns: [
        {
          group: ['@pah/db', '@pah/db/*'],
          message: 'Database package must never be imported in the frontend. Use the API client instead.',
        },
        {
          group: ['pg', 'pg-pool', 'postgres'],
          message: 'PostgreSQL drivers must never be imported in the frontend.',
        },
        {
          group: ['drizzle-orm', 'drizzle-orm/*'],
          message: 'Drizzle ORM must never be imported in the frontend.',
        },
        {
          group: ['pg-boss'],
          message: 'pg-boss is a server-only package.',
        },
      ],
    }],
  },
}
