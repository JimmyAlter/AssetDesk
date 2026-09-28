const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')
const { ROLES } = require('./roles')

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', 'data', 'assetdesk.db')

// Ensure target database directory exists
const dir = path.dirname(dbPath)
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true })
}

const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

const TICKETS_TABLE = `
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'in_progress', 'resolved')),
    priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
    requester_id INTEGER NOT NULL REFERENCES users(id),
    assignee_id INTEGER REFERENCES users(id),
    asset_id INTEGER REFERENCES assets(id),
    description TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    resolved_at TEXT
  );
`

const columnsOf = (table) => db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name)

// Databases created before ticket assignment existed stored requester and
// assignee as free-text names. Move them to user ids and add resolved_at.
const migrateLegacyTickets = () => {
  const columns = columnsOf('tickets')
  if (columns.length === 0 || columns.includes('requester_id')) return

  db.transaction(() => {
    db.exec('ALTER TABLE tickets RENAME TO tickets_legacy')
    db.exec(TICKETS_TABLE)
    db.exec(`
      INSERT INTO tickets (id, title, status, priority, requester_id, assignee_id, asset_id, description, created_at, updated_at, resolved_at)
      SELECT t.id, t.title,
             CASE WHEN t.status IN ('open', 'in_progress', 'resolved') THEN t.status ELSE 'open' END,
             CASE WHEN t.priority IN ('low', 'medium', 'high') THEN t.priority ELSE 'medium' END,
             COALESCE((SELECT id FROM users WHERE name = t.requester), (SELECT MIN(id) FROM users)),
             (SELECT id FROM users WHERE name = t.assignee),
             (SELECT id FROM assets WHERE id = t.asset_id),
             t.description, t.created_at, t.updated_at,
             CASE WHEN t.status = 'resolved' THEN t.updated_at END
      FROM tickets_legacy t
    `)
    db.exec('DROP TABLE tickets_legacy')
  })()
}

const init = () => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tag TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      status TEXT NOT NULL,
      assigned_to TEXT,
      location TEXT NOT NULL,
      last_seen TEXT NOT NULL
    );
  `)
  migrateLegacyTickets()
  db.exec(TICKETS_TABLE)
}

// UTC timestamp in SQLite's datetime() format for a moment in the past, so a
// freshly seeded database always shows recent activity on the dashboard.
const ago = ({ days = 0, hours = 0, minutes = 0 }) => {
  const ms = ((days * 24 + hours) * 60 + minutes) * 60 * 1000
  return new Date(Date.now() - ms).toISOString().slice(0, 19).replace('T', ' ')
}

// All names below are role-style placeholders, not real people.
const seed = () => {
  const count = db.prepare('SELECT COUNT(*) as total FROM users').get()
  if (count.total > 0) return

  const passwordHash = bcrypt.hashSync('demo123', 10)

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, role, password_hash, created_at) VALUES (?, ?, ?, ?, ?)'
  )
  const insertAsset = db.prepare(
    'INSERT INTO assets (tag, name, type, status, assigned_to, location, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  const insertTicket = db.prepare(
    `INSERT INTO tickets (title, status, priority, requester_id, assignee_id, asset_id, description, created_at, updated_at, resolved_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  db.transaction(() => {
    const user = (name, email, role, joined) =>
      insertUser.run(name, email, role, passwordHash, ago(joined)).lastInsertRowid

    const admin = user('Operations Admin', 'demo@assetdesk.dev', ROLES.ADMIN, { days: 120 })
    const lead = user('Service Desk Lead', 'lead@assetdesk.dev', ROLES.LEAD, { days: 90 })
    const field = user('Field Technician', 'field@assetdesk.dev', ROLES.TECH, { days: 60 })
    const analyst = user('Support Analyst', 'analyst@assetdesk.dev', ROLES.LEAD, { days: 45 })
    const endpoint = user('Endpoint Specialist', 'endpoint@assetdesk.dev', ROLES.TECH, { days: 30 })

    const asset = (tag, name, type, status, assignedTo, location, lastSeen) =>
      insertAsset.run(tag, name, type, status, assignedTo, location, ago(lastSeen)).lastInsertRowid

    const thinkpad = asset('AD-0192', 'Lenovo ThinkPad T14', 'Laptop', 'healthy', 'Service Desk Lead', 'Regional Office', { minutes: 35 })
    const optiplex = asset('AD-0214', 'Dell OptiPlex 7090', 'Desktop', 'warning', 'Field Technician', 'Branch Office', { hours: 2 })
    const probook = asset('AD-0331', 'HP ProBook 450', 'Laptop', 'critical', 'Unassigned', 'Branch Office', { hours: 13 })
    const macMini = asset('AD-0407', 'Mac Mini M2', 'Mini PC', 'healthy', 'Operations Admin', 'HQ', { minutes: 12 })
    asset('AD-0440', 'Dell Latitude 7430', 'Laptop', 'healthy', 'Support Analyst', 'Regional Office', { hours: 1 })
    asset('AD-0523', 'HP EliteDesk 800', 'Desktop', 'warning', 'Endpoint Specialist', 'Branch Office', { hours: 16 })
    const thinkcentre = asset('AD-0581', 'Lenovo ThinkCentre M80', 'Desktop', 'healthy', 'Service Desk Lead', 'HQ', { minutes: 50 })
    const surface = asset('AD-0627', 'Surface Laptop 5', 'Laptop', 'healthy', 'Field Technician', 'Branch Office', { hours: 3 })
    asset('AD-0710', 'Acer Swift 3', 'Laptop', 'critical', 'Unassigned', 'Regional Office', { hours: 15 })
    const fileServer = asset('AD-0788', 'Dell PowerEdge T40', 'Server', 'warning', 'Operations Admin', 'Data Center', { hours: 4 })
    asset('AD-0812', 'Synology DS920+', 'NAS', 'healthy', 'Service Desk Lead', 'HQ', { minutes: 20 })
    asset('AD-0875', 'Ubiquiti USW-24', 'Switch', 'healthy', 'Endpoint Specialist', 'Branch Office', { hours: 1 })

    const ticket = (title, status, priority, requester, assignee, assetId, description, created, resolved) => {
      const createdAt = ago(created)
      const resolvedAt = resolved ? ago(resolved) : null
      insertTicket.run(title, status, priority, requester, assignee, assetId, description, createdAt, resolvedAt || createdAt, resolvedAt)
    }

    ticket('VPN disconnects after sleep', 'in_progress', 'high', lead, field, thinkpad,
      'VPN drops after laptops wake from sleep. Investigate power settings.', { hours: 5 })
    ticket('Patch failure on desktop fleet', 'open', 'medium', admin, lead, optiplex,
      'Monthly update failed on several endpoints. Review remediation plan.', { days: 1, hours: 2 })
    ticket('Battery health review', 'resolved', 'low', field, lead, probook,
      'Battery cycle count high. Replacement scheduled and confirmed.', { days: 3 }, { days: 2 })
    ticket('New user onboarding', 'open', 'medium', analyst, null, macMini,
      'Provision standard apps, VPN, and security policies.', { hours: 3 })
    ticket('Recurring printer queue stall', 'resolved', 'low', endpoint, field, null,
      'Cleared queue and updated driver policy for the print server.', { days: 5 }, { days: 4 })
    ticket('Slow boot times on laptops', 'open', 'high', admin, analyst, thinkcentre,
      'Investigate startup scripts, security agents, and driver updates.', { days: 1, hours: 6 })
    ticket('Asset warranty tracking', 'open', 'low', lead, endpoint, surface,
      'Sync warranty dates and refresh lifecycle policies.', { hours: 8 })
    ticket('RAID controller warning on file server', 'open', 'high', admin, field, fileServer,
      'Controller reports a degraded array. Schedule a disk swap in the next change window.', { hours: 1 })
    ticket('Shared mailbox permissions', 'resolved', 'medium', analyst, analyst, null,
      'Granted the finance team access to the invoices mailbox.', { days: 12 }, { days: 11 })
  })()
}

module.exports = {
  db,
  init,
  seed,
}
