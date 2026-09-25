const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')

// Each run gets its own throwaway SQLite file, seeded by the server on load.
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'assetdesk-'))
process.env.DB_PATH = path.join(tmpDir, 'test.db')
process.env.JWT_SECRET = 'test-secret'

const app = require('../src/server')
const { db } = require('../src/db')

let server
let baseUrl

test.before(async () => {
  server = app.listen(0)
  await new Promise((resolve) => server.once('listening', resolve))
  baseUrl = `http://127.0.0.1:${server.address().port}`
})

test.after(async () => {
  await new Promise((resolve) => server.close(resolve))
  db.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

const request = async (method, url, { token, body } = {}) => {
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(baseUrl + url, { method, headers, body: body && JSON.stringify(body) })
  return { status: res.status, body: await res.json() }
}

const login = async () => {
  const res = await request('POST', '/api/auth/login', {
    body: { email: 'demo@assetdesk.dev', password: 'demo123' },
  })
  assert.equal(res.status, 200)
  return res.body.token
}

test('health check is public', async () => {
  const res = await request('GET', '/api/health')
  assert.deepEqual(res, { status: 200, body: { status: 'ok' } })
})

test('login rejects bad credentials without saying which part was wrong', async () => {
  const wrongPassword = await request('POST', '/api/auth/login', { body: { email: 'demo@assetdesk.dev', password: 'nope' } })
  const unknownUser = await request('POST', '/api/auth/login', { body: { email: 'ghost@assetdesk.dev', password: 'demo123' } })
  assert.equal(wrongPassword.status, 401)
  assert.deepEqual(wrongPassword.body, unknownUser.body)
})

test('login returns a token and never the password hash', async () => {
  const res = await request('POST', '/api/auth/login', { body: { email: 'demo@assetdesk.dev', password: 'demo123' } })
  assert.equal(res.status, 200)
  assert.ok(res.body.token)
  assert.equal(res.body.user.password_hash, undefined)
})

test('every data route requires a valid token', async () => {
  for (const url of ['/api/summary', '/api/tickets', '/api/assets', '/api/users']) {
    assert.equal((await request('GET', url)).status, 401, url)
    assert.equal((await request('GET', url, { token: 'not-a-jwt' })).status, 401, url)
  }
})

test('the people directory does not expose password hashes', async () => {
  const token = await login()
  const res = await request('GET', '/api/users', { token })
  assert.equal(res.status, 200)
  assert.ok(res.body.length > 0)
  for (const user of res.body) assert.equal(user.password_hash, undefined)
})

test('creating a ticket records the requester from the token', async () => {
  const token = await login()
  const res = await request('POST', '/api/tickets', {
    token,
    body: { title: '  Printer offline at front desk  ', priority: 'high', description: 'Paper jam light stays on.' },
  })
  assert.equal(res.status, 201)
  assert.equal(res.body.title, 'Printer offline at front desk')
  assert.equal(res.body.status, 'open')
  assert.equal(res.body.priority, 'high')
  assert.equal(res.body.requester, 'Operations Admin')
})

test('ticket input is validated on the server', async () => {
  const token = await login()
  const cases = [
    { body: {}, error: /Title is required/ },
    { body: { title: '   ' }, error: /Title is required/ },
    { body: { title: 'x'.repeat(201) }, error: /at most 200/ },
    { body: { title: 'Valid', priority: 'urgent' }, error: /Priority must be one of/ },
    { body: { title: 'Valid', description: { nested: true } }, error: /Description/ },
  ]
  for (const { body, error } of cases) {
    const res = await request('POST', '/api/tickets', { token, body })
    assert.equal(res.status, 400, JSON.stringify(body))
    assert.match(res.body.error, error)
  }
})

test('SQL-looking input is stored as text, not executed', async () => {
  const token = await login()
  const title = "x'); DROP TABLE tickets; --"
  const res = await request('POST', '/api/tickets', { token, body: { title } })
  assert.equal(res.status, 201)
  assert.equal(res.body.title, title)
  const list = await request('GET', '/api/tickets', { token })
  assert.ok(list.body.some((t) => t.title === title))
})
