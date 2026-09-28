import { useCallback, useEffect, useState } from 'react'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Tickets from './components/Tickets'
import TicketDetail from './components/TicketDetail'
import Assets from './components/Assets'
import Users from './components/Users'
import Modal from './components/Modal'
import { navItems } from './components/navItems'
import { PlusIcon } from './components/Icons'
import { apiFetch } from './api'
import { isManager } from './permissions'

const SESSION_KEY = 'assetdesk-session'
const EMPTY_TICKET = { title: '', priority: 'medium', description: '' }

const loadSession = () => {
  try {
    const session = JSON.parse(localStorage.getItem(SESSION_KEY))
    return session?.token && session?.user ? session : null
  } catch {
    return null
  }
}

const saveSession = (session) => {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    // Storage can be unavailable (private mode); the session then lasts until reload.
  }
}

function App() {
  const [session, setSession] = useState(loadSession)
  const [view, setView] = useState('dashboard')
  const [summary, setSummary] = useState(null)
  const [tickets, setTickets] = useState([])
  const [assets, setAssets] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [newTicket, setNewTicket] = useState(EMPTY_TICKET)
  const [selectedTicketId, setSelectedTicketId] = useState(null)

  const token = session?.token
  const user = session?.user

  const logout = useCallback((message = '') => {
    saveSession(null)
    setSession(null)
    setNotice(message)
    setView('dashboard')
    setSummary(null)
    setTickets([])
    setAssets([])
    setUsers([])
    setError('')
    setFormOpen(false)
    setSelectedTicketId(null)
  }, [])

  // Authenticated request. A 401 means the token expired or was revoked, so
  // the user goes back to the sign-in screen with an explanation.
  const request = useCallback(async (path, options = {}) => {
    try {
      return await apiFetch(path, { token, ...options })
    } catch (err) {
      if (err.status === 401) logout('Your session has expired. Please sign in again.')
      throw err
    }
  }, [token, logout])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const me = await request('/api/me')
        const [summaryData, ticketData, assetData, userData] = await Promise.all([
          request('/api/summary'),
          request('/api/tickets'),
          request('/api/assets'),
          isManager(me) ? request('/api/users') : Promise.resolve([]),
        ])
        if (cancelled) return
        setSession((prev) => {
          const next = { ...prev, user: me }
          saveSession(next)
          return next
        })
        setSummary(summaryData)
        setTickets(ticketData)
        setAssets(assetData)
        setUsers(userData)
      } catch (err) {
        if (!cancelled && err.status !== 401) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [token, request])

  const refreshSummary = async () => {
    try {
      setSummary(await request('/api/summary'))
    } catch {
      // The counters catch up on the next load.
    }
  }

  const handleLogin = async (email, password) => {
    try {
      setLoading(true)
      setNotice('')
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      saveSession(data)
      setSession(data)
    } catch (err) {
      setNotice(err.status === 401 ? 'Invalid email or password.' : err.message)
    } finally {
      setLoading(false)
    }
  }

  const openTicketForm = () => {
    setFormError('')
    setFormOpen(true)
  }

  const handleTicketSubmit = async (event) => {
    event.preventDefault()
    try {
      setSubmitting(true)
      setFormError('')
      const data = await request('/api/tickets', {
        method: 'POST',
        body: JSON.stringify(newTicket),
      })
      setTickets((prev) => [data, ...prev])
      setNewTicket(EMPTY_TICKET)
      setFormOpen(false)
      refreshSummary()
    } catch (err) {
      setFormError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleTicketUpdate = async (id, changes) => {
    const updated = await request(`/api/tickets/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(changes),
    })
    setTickets((prev) => prev.map((ticket) => (ticket.id === id ? updated : ticket)))
    refreshSummary()
    return updated
  }

  if (!token) {
    return <Login onLogin={handleLogin} busy={loading} error={notice} />
  }

  const visibleNav = navItems.filter((item) => !item.managersOnly || isManager(user))
  const currentView = visibleNav.some((item) => item.id === view) ? view : 'dashboard'
  const currentLabel = visibleNav.find((item) => item.id === currentView)?.label || 'Overview'
  const selectedTicket = tickets.find((ticket) => ticket.id === selectedTicketId)

  return (
    <div className="shell">
      <Sidebar items={visibleNav} view={currentView} user={user} onNavigate={setView} onLogout={() => logout()} />

      <main className="main">
        <header className="topbar">
          <div className="topbar__left">
            <p className="eyebrow">Workspace / IT Operations</p>
            <h1>{currentLabel}</h1>
            <p className="topbar__sub">
              {isManager(user)
                ? 'Triage the queue, assign work and keep an eye on device health.'
                : 'Tickets assigned to you or raised by you, plus the asset inventory.'}
            </p>
          </div>
          <div className="topbar__right">
            <button className="btn btn--primary" onClick={openTicketForm}>
              <PlusIcon /> New ticket
            </button>
          </div>
        </header>

        {error && <div className="banner banner--error" role="alert">{error}</div>}

        {currentView === 'dashboard' && (
          <Dashboard
            summary={summary}
            tickets={tickets}
            assets={assets}
            loading={loading}
            onViewAll={setView}
            onNewTicket={openTicketForm}
            onSelectTicket={setSelectedTicketId}
          />
        )}
        {currentView === 'tickets' && (
          <Tickets
            tickets={tickets}
            loading={loading}
            onNewTicket={openTicketForm}
            onSelectTicket={setSelectedTicketId}
          />
        )}
        {currentView === 'assets' && (
          <Assets assets={assets} loading={loading} />
        )}
        {currentView === 'users' && (
          <Users users={users} tickets={tickets} loading={loading} />
        )}
      </main>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Create ticket">
        <form onSubmit={handleTicketSubmit} className="modal-form">
          <label>
            <span>Title</span>
            <input
              value={newTicket.title}
              onChange={(e) => setNewTicket({ ...newTicket, title: e.target.value })}
              placeholder="Brief summary of the issue"
              maxLength={200}
              required
            />
          </label>
          <label>
            <span>Priority</span>
            <select
              value={newTicket.priority}
              onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label>
            <span>Description</span>
            <textarea
              rows="4"
              value={newTicket.description}
              onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
              placeholder="Detailed description of the request…"
              maxLength={5000}
            />
          </label>
          {formError && <p className="form-error" role="alert">{formError}</p>}
          <button className="btn btn--primary btn--full" type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create ticket'}
          </button>
        </form>
      </Modal>

      <Modal open={Boolean(selectedTicket)} onClose={() => setSelectedTicketId(null)} title="Ticket details">
        {selectedTicket && (
          <TicketDetail
            key={selectedTicket.id}
            ticket={selectedTicket}
            user={user}
            users={users}
            onUpdate={handleTicketUpdate}
          />
        )}
      </Modal>
    </div>
  )
}

export default App
