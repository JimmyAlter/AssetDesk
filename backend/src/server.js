require('dotenv').config()
const express = require('express')
const cors = require('cors')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { db, init, seed } = require('./db')

const app = express()
const port = process.env.PORT || 4000
const jwtSecret = process.env.JWT_SECRET || 'dev_secret_change_me'

init()
seed()

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  })
)
app.use(express.json())

const authenticate = (req, res, next) => {
  const header = req.headers.authorization || ''
  const [, token] = header.split(' ')
  if (!token) return res.status(401).json({ error: 'Missing token' })
  try {
    req.user = jwt.verify(token, jwtSecret)
    return next()
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' })
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Missing credentials' })

  const user = db
    .prepare('SELECT id, name, email, role, password_hash FROM users WHERE email = ?')
    .get(email)

  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' })
  }

  const token = jwt.sign(
    { sub: user.id, name: user.name, role: user.role },
    jwtSecret,
    { expiresIn: '8h' }
  )

  return res.json({
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  })
})

app.get('/api/summary', authenticate, (req, res) => {
  const assets = db.prepare('SELECT COUNT(*) as total FROM assets').get().total
  const openTickets = db
    .prepare("SELECT COUNT(*) as total FROM tickets WHERE status = 'open'")
    .get().total
  const resolved = db
    .prepare("SELECT COUNT(*) as total FROM tickets WHERE status = 'resolved' AND created_at >= datetime('now', '-7 day')")
    .get().total
  const slaRisk = db
    .prepare("SELECT COUNT(*) as total FROM tickets WHERE status = 'open' AND priority = 'high'")
    .get().total

  res.json({ assets, openTickets, resolved, slaRisk })
})

app.get('/api/tickets', authenticate, (req, res) => {
  const tickets = db
    .prepare('SELECT * FROM tickets ORDER BY datetime(created_at) DESC')
    .all()
  res.json(tickets)
})

app.post('/api/tickets', authenticate, (req, res) => {
  const { title, priority, description } = req.body || {}
  if (!title) return res.status(400).json({ error: 'Title is required' })

  const stmt = db.prepare(
    `INSERT INTO tickets (title, status, priority, requester, assignee, asset_id, description, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
  )

  const info = stmt.run(
    title,
    'open',
    priority || 'medium',
    req.user.name || 'Operator',
    'Unassigned',
    null,
    description || ''
  )

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(info.lastInsertRowid)
  res.status(201).json(ticket)
})

app.get('/api/assets', authenticate, (req, res) => {
  const assets = db
    .prepare('SELECT * FROM assets ORDER BY datetime(last_seen) DESC')
    .all()
  res.json(assets)
})

app.get('/api/users', authenticate, (req, res) => {
  const users = db
    .prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC')
    .all()
  res.json(users)
})

app.listen(port, () => {
  console.log(`AssetDesk API running on http://localhost:${port}`)
})
