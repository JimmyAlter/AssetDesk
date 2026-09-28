// Error handling, CORS and proxy-aware rate limiting.
const test = require('node:test')
const assert = require('node:assert/strict')
const { setup } = require('./helpers')

const ctx = setup()
const { createApp, parseTrustProxy } = require('../src/server')

test('unknown routes return a JSON 404', async () => {
  for (const url of ['/api/nope', '/', '/api/tickets/1/comments']) {
    const res = await ctx.request('GET', url)
    assert.equal(res.status, 404, url)
    assert.deepEqual(res.body, { error: 'Not found' })
  }
})

test('malformed JSON is a 400, not a stack trace', async () => {
  const res = await ctx.request('POST', '/api/auth/login', { raw: '{"email": "demo@' })
  assert.equal(res.status, 400)
  assert.deepEqual(res.body, { error: 'Request body is not valid JSON' })
})

test('oversized bodies are rejected with 413', async () => {
  const res = await ctx.request('POST', '/api/tickets', {
    token: ctx.tokens.admin,
    body: { title: 'Big', description: 'x'.repeat(300 * 1024) },
  })
  assert.equal(res.status, 413)
  assert.deepEqual(res.body, { error: 'Request body is too large' })
})

test('unexpected errors return a generic 500 without internals', async () => {
  const originalPrepare = ctx.db.prepare
  const originalConsoleError = console.error
  ctx.db.prepare = () => { throw new Error('SQLITE_CORRUPT: secret internals') }
  console.error = () => {}
  try {
    const res = await ctx.request('GET', '/api/assets', { token: ctx.tokens.admin })
    assert.equal(res.status, 500)
    assert.deepEqual(res.body, { error: 'Internal server error' })
  } finally {
    ctx.db.prepare = originalPrepare
    console.error = originalConsoleError
  }
})

test('CORS allows the configured origin and localhost only outside production', async () => {
  const dev = await ctx.serve(createApp({ production: false, corsOrigins: ['https://assetdesk-demo.vercel.app'] }))
  const prod = await ctx.serve(createApp({ production: true, corsOrigins: ['https://assetdesk-demo.vercel.app'] }))

  const allowed = await prod('GET', '/api/health', { headers: { Origin: 'https://assetdesk-demo.vercel.app' } })
  assert.equal(allowed.status, 200)
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'https://assetdesk-demo.vercel.app')

  const devLocal = await dev('GET', '/api/health', { headers: { Origin: 'http://localhost:5173' } })
  assert.equal(devLocal.status, 200)
  assert.equal(devLocal.headers.get('access-control-allow-origin'), 'http://localhost:5173')

  for (const origin of ['http://localhost:5173', 'https://evil.example', 'http://localhost.evil.example']) {
    const res = await prod('GET', '/api/health', { headers: { Origin: origin } })
    assert.equal(res.status, 403, origin)
    assert.deepEqual(res.body, { error: 'Origin not allowed' })
    assert.equal(res.headers.get('access-control-allow-origin'), null)
  }
})

test('TRUST_PROXY parsing', () => {
  assert.equal(parseTrustProxy(undefined, true), 1)
  assert.equal(parseTrustProxy(undefined, false), false)
  assert.equal(parseTrustProxy('', true), 1)
  assert.equal(parseTrustProxy('2', false), 2)
  assert.equal(parseTrustProxy('true', false), true)
  assert.equal(parseTrustProxy('false', true), false)
  assert.equal(parseTrustProxy('loopback', false), 'loopback')
})

test('behind a trusted proxy, the login rate limit is per client', async () => {
  const request = await ctx.serve(createApp({ trustProxy: 1, loginLimit: 2 }))
  const attempt = (ip) =>
    request('POST', '/api/auth/login', { headers: { 'X-Forwarded-For': ip }, body: {} })

  assert.equal((await attempt('203.0.113.1')).status, 400)
  assert.equal((await attempt('203.0.113.1')).status, 400)
  const limited = await attempt('203.0.113.1')
  assert.equal(limited.status, 429)
  assert.match(limited.body.error, /Too many login attempts/)

  // A different client behind the same proxy has its own budget.
  assert.equal((await attempt('203.0.113.2')).status, 400)
})

test('without trust proxy, X-Forwarded-For cannot be used to dodge the limit', async () => {
  const request = await ctx.serve(createApp({ trustProxy: false, loginLimit: 2 }))
  const attempt = (ip) =>
    request('POST', '/api/auth/login', { headers: { 'X-Forwarded-For': ip }, body: {} })

  assert.equal((await attempt('198.51.100.1')).status, 400)
  assert.equal((await attempt('198.51.100.2')).status, 400)
  assert.equal((await attempt('198.51.100.3')).status, 429)
})
