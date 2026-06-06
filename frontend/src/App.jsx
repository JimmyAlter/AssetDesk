import { useEffect, useState } from 'react'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import Dashboard from './components/Dashboard'
import Tickets from './components/Tickets'
import Assets from './components/Assets'
import Users from './components/Users'
import Modal from './components/Modal'
import { navItems } from './components/Sidebar'
import { PlusIcon } from './components/Icons'
import { isDemoMode, mockFetchJson } from './mockApi'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const fetchJson = async (path, options = {}) => {
  if (isDemoMode()) {
    return mockFetchJson(path, options)
  }
  const response = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Request failed')
  }
  return response.json()
}

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('assetdesk-token'))
  const [view, setView] = useState('dashboard')
  const [summary, setSummary] = useState(null)
  const [tickets, setTickets] = useState([])
  const [assets, setAssets] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [newTicket, setNewTicket] = useState({ title: '', priority: 'medium', description: '' })

  useEffect(() => {
    if (!token) return
    const load = async () => {
      try {
        setLoading(true)
        setError('')
        const headers = { Authorization: `Bearer ${token}` }
        const [summaryData, ticketData, assetData, userData] = await Promise.all([
          fetchJson('/api/summary', { headers }),
          fetchJson('/api/tickets', { headers }),
          fetchJson('/api/assets', { headers }),
          fetchJson('/api/users', { headers }),
        ])
        setSummary(summaryData)
        setTickets(ticketData)
        setAssets(assetData)
        setUsers(userData)
      } catch (err) {
        setError(err.message || 'Unable to load data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const handleLogin = async (email, password) => {
    try {
      setLoading(true)
      setError('')
      const data = await fetchJson('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      localStorage.setItem('assetdesk-token', data.token)
      setToken(data.token)
    } catch (err) {
      setError('Invalid credentials. Try the demo access.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('assetdesk-token')
    setToken(null)
  }

  const handleTicketSubmit = async (event) => {
    event.preventDefault()
    try {
      setLoading(true)
      const data = await fetchJson('/api/tickets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(newTicket),
      })
      setTickets((prev) => [data, ...prev])
      setNewTicket({ title: '', priority: 'medium', description: '' })
      setFormOpen(false)
    } catch (err) {
      setError('Unable to create ticket right now.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return <Login onLogin={handleLogin} busy={loading} error={error} />
  }

  const currentLabel = navItems.find((item) => item.id === view)?.label || 'Overview'

  return (
    <div className="shell">
      <Sidebar view={view} onNavigate={setView} onLogout={handleLogout} />

      <main className="main">
        <header className="topbar">
          <div className="topbar__left">
            <p className="eyebrow">Workspace / Enterprise Operations</p>
            <h1>{currentLabel}</h1>
            <p className="topbar__sub">Maintain service continuity, asset health, and distributed coverage.</p>
          </div>
          <div className="topbar__right">
            <div className="status-chip">
              <span className="status-chip__dot" />
              Enterprise operations
            </div>
            <button className="btn btn--primary" onClick={() => setFormOpen(true)}>
              <PlusIcon /> New ticket
            </button>
          </div>
        </header>

        {isDemoMode() && (
          <div className="banner banner--info" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px 16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', color: '#3b82f6', borderRadius: '6px', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px' }}>
              🌐 <strong>Demo Mode:</strong> Running entirely client-side using LocalStorage database. Any additions/modifications will persist locally in your browser.
            </span>
            <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: '12px', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3b82f6' }} onClick={() => { localStorage.clear(); window.location.reload(); }}>
              Reset Data
            </button>
          </div>
        )}

        {error && <div className="banner banner--error">{error}</div>}

        {view === 'dashboard' && (
          <Dashboard
            summary={summary}
            tickets={tickets}
            assets={assets}
            loading={loading}
            onViewAll={setView}
            onNewTicket={() => setFormOpen(true)}
          />
        )}
        {view === 'tickets' && (
          <Tickets tickets={tickets} loading={loading} onNewTicket={() => setFormOpen(true)} />
        )}
        {view === 'assets' && (
          <Assets assets={assets} loading={loading} />
        )}
        {view === 'users' && (
          <Users users={users} loading={loading} />
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
            />
          </label>
          <button className="btn btn--primary btn--full" type="submit">Create ticket</button>
        </form>
      </Modal>
    </div>
  )
}

export default App
