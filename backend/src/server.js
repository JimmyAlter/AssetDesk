require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const rateLimit = require('express-rate-limit')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const { db, init, seed } = require('./db')
const { MANAGERS, TICKET_STATUSES, TRANSITIONS, canTransition } = require('./roles')

const port = process.env.PORT || 4000
const isProduction = process.env.NODE_ENV === 'production'
const DEV_JWT_SECRET = 'dev_secret_change_me'

if (isProduction && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEV_JWT_SECRET)) {
  console.error('CRITICAL ERROR: JWT_SECRET environment variable is missing or insecure in production mode!')
  process.exit(1)
}

const jwtSecret = process.env.JWT_SECRET || DEV_JWT_SECRET
const JWT_ALGORITHM = 'HS256'

// Compared against when the email is unknown, so a failed login costs the same
// bcrypt work whether or not the account exists.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('assetdesk-dummy-password', 10)

init()
seed()

// TRUST_PROXY takes what Express's "trust proxy" setting takes: a hop count,
// true/false, or a list of addresses. Behind Render's proxy it has to be set
// for req.ip, and therefore the login rate limit, to be the real client.
const parseTrustProxy = (value, production = isProduction) => {
  const trimmed = (value || '').trim()
  if (trimmed === '') return production ? 1 : false
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (/^\d+$/.test(trimmed)) return Number(trimmed)
  return trimmed
}

const parseOrigins = (value) =>
  (value || '').split(',').map((origin) => origin.trim()).filter(Boolean)

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

const TICKET_PRIORITIES = ['low', 'medium', 'high']
const MAX_TITLE_LENGTH = 200
const MAX_DESCRIPTION_LENGTH = 5000
const MAX_EMAIL_LENGTH = 254
const MAX_PASSWORD_LENGTH = 200

const TICKET_SELECT = `
  SELECT t.id, t.title, t.status, t.priority, t.description, t.asset_id,
         t.requester_id, r.name AS requester,
         t.assignee_id, a.name AS assignee,
         t.created_at, t.updated_at, t.resolved_at
  FROM tickets t
  JOIN users r ON r.id = t.requester_id
  LEFT JOIN users a ON a.id = t.assignee_id
`

const findTicket = (id) => db.prepare(`${TICKET_SELECT} WHERE t.id = ?`).get(id)

const isManager = (user) => MANAGERS.includes(user.role)

// Field techs only work with tickets they raised or that are assigned to them.
const canSeeTicket = (user, ticket) =>
  isManager(user) || ticket.assignee_id === user.id || ticket.requester_id === user.id

const createApp = ({
  production = isProduction,
  trustProxy = parseTrustProxy(process.env.TRUST_PROXY, production),
  corsOrigins = parseOrigins(process.env.CORS_ORIGIN),
  loginLimit = 20,
} = {}) => {
  const app = express()
  app.set('trust proxy', trustProxy)

  app.use(helmet())

  const allowOrigin = (origin) => {
    if (!origin) return true
    if (corsOrigins.includes(origin)) return true
    return !production && LOCAL_ORIGIN.test(origin)
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        if (allowOrigin(origin)) return callback(null, true)
        return callback(new HttpError(403, 'Origin not allowed'))
      },
    })
  )
  app.use(express.json({ limit: '200kb' }))

  const authLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: loginLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Try again in a minute.' },
    // Proxy handling is configured explicitly through TRUST_PROXY above.
    validate: { xForwardedForHeader: false },
  })

  const authenticate = (req, res, next) => {
    const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || '')
    if (!match) return res.status(401).json({ error: 'Missing token' })
    let payload
    try {
      payload = jwt.verify(match[1], jwtSecret, { algorithms: [JWT_ALGORITHM] })
    } catch {
      return res.status(401).json({ error: 'Invalid token' })
    }
    // Load the user on every request so a deleted account or a role change
    // takes effect immediately instead of when the token expires.
    const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(payload.sub)
    if (!user) return res.status(401).json({ error: 'Invalid token' })
    req.user = user
    return next()
  }

  const requireRole = (...roles) => (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'You do not have permission to do that' })
    }
    return next()
  }

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' })
  })

  app.post('/api/auth/login', authLimiter, (req, res) => {
    const { email, password } = req.body || {}
    if (
      typeof email !== 'string' || typeof password !== 'string' ||
      !email.trim() || !password ||
      email.length > MAX_EMAIL_LENGTH || password.length > MAX_PASSWORD_LENGTH
    ) {
      return res.status(400).json({ error: 'Email and password are required' })
    }

    const user = db
      .prepare('SELECT id, name, email, role, password_hash FROM users WHERE email = ? COLLATE NOCASE')
      .get(email.trim())

    const passwordOk = bcrypt.compareSync(password, user ? user.password_hash : DUMMY_PASSWORD_HASH)
    if (!user || !passwordOk) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { sub: user.id, name: user.name, role: user.role },
      jwtSecret,
      { algorithm: JWT_ALGORITHM, expiresIn: '8h' }
    )

    return res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    })
  })

  app.get('/api/me', authenticate, (req, res) => {
    res.json(req.user)
  })

  app.get('/api/summary', authenticate, (req, res) => {
    const assets = db.prepare('SELECT COUNT(*) as total FROM assets').get().total
    const openTickets = db
      .prepare("SELECT COUNT(*) as total FROM tickets WHERE status != 'resolved'")
      .get().total
    const resolved = db
      .prepare("SELECT COUNT(*) as total FROM tickets WHERE status = 'resolved' AND resolved_at >= datetime('now', '-7 day')")
      .get().total
    const slaRisk = db
      .prepare("SELECT COUNT(*) as total FROM tickets WHERE status != 'resolved' AND priority = 'high'")
      .get().total

    res.json({ assets, openTickets, resolved, slaRisk })
  })

  app.get('/api/tickets', authenticate, (req, res) => {
    const order = 'ORDER BY datetime(t.created_at) DESC, t.id DESC'
    const tickets = isManager(req.user)
      ? db.prepare(`${TICKET_SELECT} ${order}`).all()
      : db
        .prepare(`${TICKET_SELECT} WHERE t.assignee_id = ? OR t.requester_id = ? ${order}`)
        .all(req.user.id, req.user.id)
    res.json(tickets)
  })

  app.post('/api/tickets', authenticate, (req, res) => {
    const { title, priority = 'medium', description = '' } = req.body || {}
    if (typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' })
    }
    if (title.length > MAX_TITLE_LENGTH) {
      return res.status(400).json({ error: `Title must be at most ${MAX_TITLE_LENGTH} characters` })
    }
    if (!TICKET_PRIORITIES.includes(priority)) {
      return res.status(400).json({ error: `Priority must be one of: ${TICKET_PRIORITIES.join(', ')}` })
    }
    if (typeof description !== 'string' || description.length > MAX_DESCRIPTION_LENGTH) {
      return res.status(400).json({ error: `Description must be text of at most ${MAX_DESCRIPTION_LENGTH} characters` })
    }

    const info = db.prepare(
      `INSERT INTO tickets (title, status, priority, requester_id, assignee_id, asset_id, description, created_at, updated_at)
       VALUES (?, 'open', ?, ?, NULL, NULL, ?, datetime('now'), datetime('now'))`
    ).run(title.trim(), priority, req.user.id, description)

    res.status(201).json(findTicket(info.lastInsertRowid))
  })

  app.patch('/api/tickets/:id', authenticate, (req, res) => {
    const id = Number(req.params.id)
    const ticket = Number.isInteger(id) && id > 0 ? findTicket(id) : undefined
    if (!ticket || !canSeeTicket(req.user, ticket)) {
      return res.status(404).json({ error: 'Ticket not found' })
    }

    const body = req.body || {}
    const hasStatus = Object.prototype.hasOwnProperty.call(body, 'status')
    const hasAssignee = Object.prototype.hasOwnProperty.call(body, 'assigneeId')
    if (!hasStatus && !hasAssignee) {
      return res.status(400).json({ error: 'Provide a status and/or an assigneeId' })
    }

    if (!isManager(req.user)) {
      if (hasAssignee) {
        return res.status(403).json({ error: 'Only admins and support leads can assign tickets' })
      }
      if (ticket.assignee_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only update tickets assigned to you' })
      }
    }

    let assigneeId = ticket.assignee_id
    if (hasAssignee) {
      if (body.assigneeId === null) {
        assigneeId = null
      } else if (
        !Number.isInteger(body.assigneeId) ||
        !db.prepare('SELECT id FROM users WHERE id = ?').get(body.assigneeId)
      ) {
        return res.status(400).json({ error: 'assigneeId must be the id of an existing user, or null' })
      } else {
        assigneeId = body.assigneeId
      }
    }

    let status = ticket.status
    if (hasStatus && body.status !== ticket.status) {
      if (!TICKET_STATUSES.includes(body.status)) {
        return res.status(400).json({ error: `Status must be one of: ${TICKET_STATUSES.join(', ')}` })
      }
      if (!TRANSITIONS[ticket.status].includes(body.status)) {
        return res.status(409).json({ error: `A ${ticket.status} ticket cannot move to ${body.status}` })
      }
      if (!canTransition(req.user.role, ticket.status, body.status)) {
        return res.status(403).json({ error: 'Only admins and support leads can reopen resolved tickets' })
      }
      status = body.status
    }

    db.prepare(
      `UPDATE tickets
       SET status = ?, assignee_id = ?, updated_at = datetime('now'),
           resolved_at = CASE WHEN ? = 'resolved' THEN COALESCE(resolved_at, datetime('now')) ELSE NULL END
       WHERE id = ?`
    ).run(status, assigneeId, status, ticket.id)

    return res.json(findTicket(ticket.id))
  })

  app.get('/api/assets', authenticate, (req, res) => {
    const assets = db
      .prepare('SELECT * FROM assets ORDER BY datetime(last_seen) DESC')
      .all()
    res.json(assets)
  })

  app.get('/api/users', authenticate, requireRole(...MANAGERS), (req, res) => {
    const users = db
      .prepare('SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC')
      .all()
    res.json(users)
  })

  app.use((req, res) => {
    res.status(404).json({ error: 'Not found' })
  })

  // Express recognises error handlers by their four parameters.
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
      return res.status(400).json({ error: 'Request body is not valid JSON' })
    }
    if (err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'Request body is too large' })
    }
    if (err instanceof HttpError) {
      return res.status(err.status).json({ error: err.message })
    }
    console.error(err)
    return res.status(500).json({ error: 'Internal server error' })
  })

  return app
}

const app = createApp()

if (require.main === module) {
  app.listen(port, () => {
    console.log(`AssetDesk API running on http://localhost:${port}`)
  })
}

module.exports = app
module.exports.createApp = createApp
module.exports.parseTrustProxy = parseTrustProxy
