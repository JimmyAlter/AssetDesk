const path = require('path')
const fs = require('fs')
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')

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

    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      priority TEXT NOT NULL,
      requester TEXT NOT NULL,
      assignee TEXT,
      asset_id INTEGER,
      description TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `)
}

const seed = () => {
  const count = db.prepare('SELECT COUNT(*) as total FROM users').get()
  if (count.total > 0) return

  const passwordHash = bcrypt.hashSync('demo123', 10)

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, role, password_hash) VALUES (?, ?, ?, ?)'
  )
  insertUser.run('Operations Admin', 'demo@assetdesk.dev', 'Admin', passwordHash)
  insertUser.run('Service Desk Lead', 'lead@assetdesk.dev', 'Support Lead', passwordHash)
  insertUser.run('Field Technician', 'field@assetdesk.dev', 'Field Tech', passwordHash)
  insertUser.run('Support Analyst', 'analyst@assetdesk.dev', 'Support Lead', passwordHash)
  insertUser.run('Endpoint Specialist', 'endpoint@assetdesk.dev', 'Field Tech', passwordHash)

  const insertAsset = db.prepare(
    'INSERT INTO assets (tag, name, type, status, assigned_to, location, last_seen) VALUES (?, ?, ?, ?, ?, ?, ?)'
  )
  insertAsset.run('AD-0192', 'Lenovo ThinkPad T14', 'Laptop', 'healthy', 'Service Desk Lead', 'Regional Office', '2026-03-13 09:20')
  insertAsset.run('AD-0214', 'Dell OptiPlex 7090', 'Desktop', 'warning', 'Field Technician', 'Branch Office', '2026-03-13 08:14')
  insertAsset.run('AD-0331', 'HP ProBook 450', 'Laptop', 'critical', 'Unassigned', 'Branch Office', '2026-03-12 22:41')
  insertAsset.run('AD-0407', 'Mac Mini M2', 'Mini PC', 'healthy', 'Operations Admin', 'HQ', '2026-03-13 10:02')
  insertAsset.run('AD-0440', 'Dell Latitude 7430', 'Laptop', 'healthy', 'Support Analyst', 'Regional Office', '2026-03-13 09:05')
  insertAsset.run('AD-0523', 'HP EliteDesk 800', 'Desktop', 'warning', 'Endpoint Specialist', 'Branch Office', '2026-03-12 19:22')
  insertAsset.run('AD-0581', 'Lenovo ThinkCentre M80', 'Desktop', 'healthy', 'Service Desk Lead', 'HQ', '2026-03-13 09:44')
  insertAsset.run('AD-0627', 'Surface Laptop 5', 'Laptop', 'healthy', 'Field Technician', 'Branch Office', '2026-03-13 07:58')
  insertAsset.run('AD-0710', 'Acer Swift 3', 'Laptop', 'critical', 'Unassigned', 'Regional Office', '2026-03-12 20:11')
  insertAsset.run('AD-0788', 'Dell PowerEdge T40', 'Server', 'warning', 'Operations Admin', 'Data Center', '2026-03-13 06:30')
  insertAsset.run('AD-0812', 'Synology DS920+', 'NAS', 'healthy', 'Service Desk Lead', 'HQ', '2026-03-13 09:50')
  insertAsset.run('AD-0875', 'Ubiquiti USW-24', 'Switch', 'healthy', 'Endpoint Specialist', 'Branch Office', '2026-03-13 09:05')

  const insertTicket = db.prepare(
    `INSERT INTO tickets (title, status, priority, requester, assignee, asset_id, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )
  insertTicket.run(
    'VPN disconnects after sleep',
    'open',
    'high',
    'Service Desk Lead',
    'Field Technician',
    1,
    'VPN drops after laptops wake from sleep. Investigate power settings.',
    '2026-03-13 08:25',
    '2026-03-13 08:25'
  )
  insertTicket.run(
    'Patch failure on desktop fleet',
    'open',
    'medium',
    'Operations Admin',
    'Service Desk Lead',
    2,
    'Monthly update failed on several endpoints. Review remediation plan.',
    '2026-03-12 18:12',
    '2026-03-12 18:12'
  )
  insertTicket.run(
    'Battery health review',
    'resolved',
    'low',
    'Field Technician',
    'Service Desk Lead',
    3,
    'Battery cycle count high. Replacement scheduled and confirmed.',
    '2026-03-11 10:05',
    '2026-03-12 09:40'
  )
  insertTicket.run(
    'New user onboarding',
    'open',
    'medium',
    'Support Analyst',
    'Operations Admin',
    4,
    'Provision standard apps, VPN, and security policies.',
    '2026-03-13 09:12',
    '2026-03-13 09:12'
  )
  insertTicket.run(
    'Recurring printer queue stall',
    'resolved',
    'low',
    'Endpoint Specialist',
    'Field Technician',
    null,
    'Cleared queue and updated driver policy for the print server.',
    '2026-03-10 16:40',
    '2026-03-11 09:10'
  )
  insertTicket.run(
    'Slow boot times on laptops',
    'open',
    'high',
    'Operations Admin',
    'Support Analyst',
    7,
    'Investigate startup scripts, security agents, and driver updates.',
    '2026-03-12 07:55',
    '2026-03-12 07:55'
  )
  insertTicket.run(
    'Asset warranty tracking',
    'open',
    'low',
    'Service Desk Lead',
    'Endpoint Specialist',
    8,
    'Sync warranty dates and refresh lifecycle policies.',
    '2026-03-13 07:40',
    '2026-03-13 07:40'
  )
}

module.exports = {
  db,
  init,
  seed,
}
