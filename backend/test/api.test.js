const test = require('node:test')
const assert = require('node:assert/strict')
const jwt = require('jsonwebtoken')
const { setup, PASSWORD } = require('./helpers')

const ctx = setup()

test('health check is public', async () => {
  const res = await ctx.request('GET', '/api/health')
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, { status: 'ok' })
})

test('login rejects bad credentials without saying which part was wrong', async () => {
  const wrongPassword = await ctx.request('POST', '/api/auth/login', { body: { email: 'demo@assetdesk.dev', password: 'nope' } })
  const unknownUser = await ctx.request('POST', '/api/auth/login', { body: { email: 'ghost@assetdesk.dev', password: PASSWORD } })
  assert.equal(wrongPassword.status, 401)
  assert.equal(unknownUser.status, 401)
  assert.deepEqual(wrongPassword.body, unknownUser.body)
})

test('login only accepts string credentials', async () => {
  const bodies = [
    {},
    { email: 'demo@assetdesk.dev' },
    { email: ['demo@assetdesk.dev'], password: PASSWORD },
    { email: 'demo@assetdesk.dev', password: { $ne: '' } },
    { email: 'demo@assetdesk.dev', password: 123456 },
    { email: '   ', password: PASSWORD },
    { email: 'demo@assetdesk.dev', password: 'x'.repeat(201) },
  ]
  for (const body of bodies) {
    const res = await ctx.request('POST', '/api/auth/login', { body })
    assert.equal(res.status, 400, JSON.stringify(body))
    assert.equal(res.body.error, 'Email and password are required')
  }
})

test('login returns a token, the user and never the password hash', async () => {
  const res = await ctx.request('POST', '/api/auth/login', { body: { email: 'Demo@AssetDesk.dev', password: PASSWORD } })
  assert.equal(res.status, 200)
  assert.ok(res.body.token)
  assert.deepEqual(Object.keys(res.body.user).sort(), ['email', 'id', 'name', 'role'])
  assert.equal(res.body.user.role, 'Admin')
  assert.equal(jwt.decode(res.body.token, { complete: true }).header.alg, 'HS256')
})

test('every data route requires a valid bearer token', async () => {
  const valid = ctx.tokens.admin
  const forged = jwt.sign({ sub: 1, role: 'Admin' }, 'some-other-secret')
  const wrongAlgorithm = jwt.sign({ sub: 1, role: 'Admin' }, 'test-secret', { algorithm: 'HS512' })
  const unsigned = jwt.sign({ sub: 1, role: 'Admin' }, null, { algorithm: 'none' })
  const unknownUser = jwt.sign({ sub: 9999, role: 'Admin' }, 'test-secret')
  const badHeaders = [
    undefined,
    'Bearer not-a-jwt',
    `Token ${valid}`,
    valid,
    `Bearer ${forged}`,
    `Bearer ${wrongAlgorithm}`,
    `Bearer ${unsigned}`,
    `Bearer ${unknownUser}`,
  ]
  for (const [method, url] of [
    ['GET', '/api/me'],
    ['GET', '/api/summary'],
    ['GET', '/api/tickets'],
    ['POST', '/api/tickets'],
    ['PATCH', '/api/tickets/1'],
    ['GET', '/api/assets'],
    ['GET', '/api/users'],
  ]) {
    for (const authorization of badHeaders) {
      const headers = authorization ? { Authorization: authorization } : {}
      const res = await ctx.request(method, url, { headers, body: method === 'GET' ? undefined : {} })
      assert.equal(res.status, 401, `${method} ${url} with ${authorization}`)
    }
  }
})

test('/api/me returns the current user from the database', async () => {
  const res = await ctx.request('GET', '/api/me', { token: ctx.tokens.tech })
  assert.equal(res.status, 200)
  assert.deepEqual(res.body, { id: ctx.tokens.techId, name: 'Field Technician', email: 'field@assetdesk.dev', role: 'Field Tech' })
})

test('the people directory does not expose password hashes', async () => {
  const res = await ctx.request('GET', '/api/users', { token: ctx.tokens.admin })
  assert.equal(res.status, 200)
  assert.ok(res.body.length > 0)
  for (const user of res.body) assert.equal(user.password_hash, undefined)
})

test('the seeded dashboard reflects recent activity', async () => {
  const res = await ctx.request('GET', '/api/summary', { token: ctx.tokens.admin })
  assert.equal(res.status, 200)
  assert.equal(res.body.assets, 12)
  // Seed: two tickets resolved within the last week, one resolved 11 days ago.
  assert.equal(res.body.resolved, 2)
  assert.equal(res.body.openTickets, 6)
  assert.equal(res.body.slaRisk, 3)
})

test('creating a ticket records the requester from the token', async () => {
  const res = await ctx.request('POST', '/api/tickets', {
    token: ctx.tokens.admin,
    body: { title: '  Printer offline at front desk  ', priority: 'high', description: 'Paper jam light stays on.' },
  })
  assert.equal(res.status, 201)
  assert.equal(res.body.title, 'Printer offline at front desk')
  assert.equal(res.body.status, 'open')
  assert.equal(res.body.priority, 'high')
  assert.equal(res.body.requester, 'Operations Admin')
  assert.equal(res.body.requester_id, ctx.tokens.adminId)
  assert.equal(res.body.assignee_id, null)
  assert.equal(res.body.resolved_at, null)
})

test('ticket input is validated on the server', async () => {
  const cases = [
    { body: {}, error: /Title is required/ },
    { body: { title: '   ' }, error: /Title is required/ },
    { body: { title: 'x'.repeat(201) }, error: /at most 200/ },
    { body: { title: 'Valid', priority: 'urgent' }, error: /Priority must be one of/ },
    { body: { title: 'Valid', description: { nested: true } }, error: /Description/ },
  ]
  for (const { body, error } of cases) {
    const res = await ctx.request('POST', '/api/tickets', { token: ctx.tokens.admin, body })
    assert.equal(res.status, 400, JSON.stringify(body))
    assert.match(res.body.error, error)
  }
})

test('SQL-looking input is stored as text, not executed', async () => {
  const title = "x'); DROP TABLE tickets; --"
  const res = await ctx.request('POST', '/api/tickets', { token: ctx.tokens.admin, body: { title } })
  assert.equal(res.status, 201)
  assert.equal(res.body.title, title)
  const list = await ctx.request('GET', '/api/tickets', { token: ctx.tokens.admin })
  assert.ok(list.body.some((t) => t.title === title))
})
