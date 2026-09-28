// Shared setup for the API tests. node --test runs every test file in its own
// process, so each file gets its own throwaway SQLite database. Nothing runs
// on import; call setup() from a test file.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')

const PASSWORD = 'demo123'
const ACCOUNTS = {
  admin: 'demo@assetdesk.dev',
  lead: 'lead@assetdesk.dev',
  tech: 'field@assetdesk.dev',
  otherTech: 'endpoint@assetdesk.dev',
}

const setup = () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'assetdesk-'))
  process.env.DB_PATH = path.join(tmpDir, 'test.db')
  process.env.JWT_SECRET = 'test-secret'

  const app = require('../src/server')
  const { db } = require('../src/db')
  const servers = []

  // Starts an app (the default one, or one from createApp) on a random port
  // and returns a request helper bound to it.
  const serve = async (instance = app) => {
    const server = instance.listen(0)
    await new Promise((resolve) => server.once('listening', resolve))
    servers.push(server)
    const baseUrl = `http://127.0.0.1:${server.address().port}`
    return async (method, url, { token, body, headers = {}, raw } = {}) => {
      const allHeaders = { 'Content-Type': 'application/json', ...headers }
      if (token) allHeaders.Authorization = `Bearer ${token}`
      const res = await fetch(baseUrl + url, {
        method,
        headers: allHeaders,
        body: raw !== undefined ? raw : body && JSON.stringify(body),
      })
      const text = await res.text()
      return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null }
    }
  }

  const ctx = { app, db, serve, request: null, tokens: {} }

  test.before(async () => {
    ctx.request = await serve()
    for (const [key, email] of Object.entries(ACCOUNTS)) {
      const res = await ctx.request('POST', '/api/auth/login', { body: { email, password: PASSWORD } })
      assert.equal(res.status, 200, `login as ${email}`)
      ctx.tokens[key] = res.body.token
      ctx.tokens[`${key}Id`] = res.body.user.id
    }
  })

  test.after(async () => {
    await Promise.all(servers.map((server) => new Promise((resolve) => server.close(resolve))))
    db.close()
    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  return ctx
}

module.exports = { setup, ACCOUNTS, PASSWORD }
