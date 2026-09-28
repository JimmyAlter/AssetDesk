// Databases created by earlier versions stored ticket requester and assignee
// as names. init() moves them to user ids without losing tickets.
const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('fs')
const os = require('os')
const path = require('path')
const Database = require('better-sqlite3')

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'assetdesk-migrate-'))
const dbPath = path.join(tmpDir, 'legacy.db')

const legacy = new Database(dbPath)
legacy.exec(`
  CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL, password_hash TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT (datetime('now')));
  CREATE TABLE assets (id INTEGER PRIMARY KEY AUTOINCREMENT, tag TEXT NOT NULL, name TEXT NOT NULL, type TEXT NOT NULL,
    status TEXT NOT NULL, assigned_to TEXT, location TEXT NOT NULL, last_seen TEXT NOT NULL);
  CREATE TABLE tickets (id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, status TEXT NOT NULL,
    priority TEXT NOT NULL, requester TEXT NOT NULL, assignee TEXT, asset_id INTEGER, description TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
  INSERT INTO users (name, email, role, password_hash) VALUES ('Operations Admin', 'demo@assetdesk.dev', 'Admin', 'x'),
    ('Field Technician', 'field@assetdesk.dev', 'Field Tech', 'x');
  INSERT INTO tickets (title, status, priority, requester, assignee, asset_id, description, created_at, updated_at) VALUES
    ('Assigned', 'open', 'high', 'Field Technician', 'Operations Admin', NULL, 'a', '2026-03-10 10:00', '2026-03-10 10:00'),
    ('Unassigned', 'open', 'low', 'Someone Deleted', 'Unassigned', 42, 'b', '2026-03-11 10:00', '2026-03-11 10:00'),
    ('Done', 'resolved', 'medium', 'Operations Admin', 'Field Technician', NULL, 'c', '2026-03-09 10:00', '2026-03-12 09:00');
`)
legacy.close()

process.env.DB_PATH = dbPath
const { db, init } = require('../src/db')

test.after(() => {
  db.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

test('legacy tickets are migrated to user ids with resolved_at', () => {
  init()
  const columns = db.prepare('PRAGMA table_info(tickets)').all().map((c) => c.name)
  assert.ok(columns.includes('requester_id'))
  assert.ok(columns.includes('resolved_at'))
  assert.ok(!columns.includes('requester'))

  const rows = db.prepare('SELECT title, requester_id, assignee_id, asset_id, resolved_at FROM tickets ORDER BY id').all()
  assert.deepEqual(rows, [
    { title: 'Assigned', requester_id: 2, assignee_id: 1, asset_id: null, resolved_at: null },
    // Unknown requester falls back to the first user; "Unassigned" and a missing asset become NULL.
    { title: 'Unassigned', requester_id: 1, assignee_id: null, asset_id: null, resolved_at: null },
    { title: 'Done', requester_id: 1, assignee_id: 2, asset_id: null, resolved_at: '2026-03-12 09:00' },
  ])

  // Running init again is a no-op.
  init()
  assert.equal(db.prepare('SELECT COUNT(*) AS n FROM tickets').get().n, 3)
})
