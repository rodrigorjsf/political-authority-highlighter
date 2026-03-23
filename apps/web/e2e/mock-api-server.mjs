/**
 * Minimal mock API server for visual regression tests.
 * Runs on port 3001 so Next.js SSR fetches resolve deterministically.
 * Start before running playwright: `node e2e/mock-api-server.mjs`
 */
import http from 'node:http'

const POLITICIAN_CARD = {
  id: '11111111-0000-0000-0000-000000000001',
  slug: 'ana-lima-sp',
  name: 'Ana Lima',
  party: 'PSD',
  state: 'SP',
  role: 'deputado_federal',
  photoUrl: null,
  tenureStartDate: '2019-02-01',
  overallScore: 75,
}

const ROUTES = {
  '/api/v1/politicians/ana-lima-sp': {
    ...POLITICIAN_CARD,
    bioSummary: 'Deputada Federal pelo estado de São Paulo.',
    transparencyScore: 20,
    legislativeScore: 18,
    financialScore: 22,
    anticorruptionScore: 15,
    exclusionFlag: false,
    methodologyVersion: 'v1.0',
  },
  '/api/v1/politicians': { data: [POLITICIAN_CARD], cursor: null },
  '/api/v1/sources': {
    data: [
      { source: 'camara', lastSyncAt: '2024-01-15T10:00:00Z', recordCount: 513, status: 'synced', updatedAt: '2024-01-15T10:00:00Z' },
      { source: 'senado', lastSyncAt: '2024-01-15T10:00:00Z', recordCount: 81, status: 'synced', updatedAt: '2024-01-15T10:00:00Z' },
      { source: 'transparencia', lastSyncAt: '2024-01-15T10:00:00Z', recordCount: 594, status: 'synced', updatedAt: '2024-01-15T10:00:00Z' },
      { source: 'tse', lastSyncAt: '2024-01-14T08:00:00Z', recordCount: 594, status: 'synced', updatedAt: '2024-01-14T08:00:00Z' },
      { source: 'tcu', lastSyncAt: '2024-01-13T06:00:00Z', recordCount: 2, status: 'synced', updatedAt: '2024-01-13T06:00:00Z' },
      { source: 'cgu', lastSyncAt: '2024-01-12T04:00:00Z', recordCount: 0, status: 'synced', updatedAt: '2024-01-12T04:00:00Z' },
    ],
  },
  '/health': { status: 'ok' },
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:3001`)
  // Match longest prefix first (so /politicians/ana-lima-sp wins over /politicians)
  const match = Object.keys(ROUTES)
    .sort((a, b) => b.length - a.length)
    .find((route) => url.pathname === route || url.pathname.startsWith(route + '?'))

  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 'no-store')

  if (match) {
    res.writeHead(200)
    res.end(JSON.stringify(ROUTES[match]))
  } else {
    res.writeHead(404)
    res.end(JSON.stringify({ type: 'about:blank', title: 'Not Found', status: 404 }))
  }
})

const PORT = 3001
server.listen(PORT, () => {
  console.log(`Mock API server listening on http://localhost:${PORT}`)
})
