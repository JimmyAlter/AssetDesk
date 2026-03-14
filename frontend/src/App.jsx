import { useEffect, useMemo, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

const fetchJson = async (path, options = {}) => {
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

const StatusBadge = ({ tone, label }) => (
  <span className={`badge badge--${tone}`}>{label}</span>
)

const StatCard = ({ label, value, hint, trend }) => (
  <div className="card stat-card">
    <p className="card-label">{label}</p>
    <div className="stat-row">
      <h3>{value}</h3>
      {trend && (
        <svg className="sparkline" viewBox="0 0 120 40" aria-hidden="true">
          <polyline points={trend} fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      )}
    </div>
    <p className="card-hint">{hint}</p>
  </div>
)

const StatSkeleton = () => (
  <div className="card stat-card">
    <span className="skeleton-line short" />
    <span className="skeleton-line" />
    <span className="skeleton-line short" />
  </div>
)

const EmptyState = ({ title, subtitle, action }) => (
  <div className="empty-state">
    <h4>{title}</h4>
    <p>{subtitle}</p>
    {action}
  </div>
)

const SkeletonRow = () => (
  <div className="row skeleton">
    <div>
      <span className="skeleton-line" />
      <span className="skeleton-line short" />
    </div>
    <span className="skeleton-pill" />
    <span className="skeleton-pill" />
    <span className="skeleton-line short" />
  </div>
)

const SectionToolbar = ({ children }) => (
  <div className="toolbar">
    {children}
  </div>
)

const TableHeader = ({ title, subtitle, action }) => (
  <div className="table-header">
    <div>
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
    {action}
  </div>
)

const Login = ({ onLogin, busy, error }) => {
  const [email, setEmail] = useState('demo@assetdesk.dev')
  const [password, setPassword] = useState('demo123')

  const handleSubmit = (event) => {
    event.preventDefault()
    onLogin(email, password)
  }

  return (
    <div className="login-shell">
      <div className="login-panel">
        <div className="login-badge">AssetDesk</div>
        <h1>Enterprise IT operations workspace</h1>
        <p className="login-sub">
          Govern inventory, service delivery, and field execution from a secure, unified platform.
        </p>
        <form className="login-form" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="login-foot">
          Demo access: <strong>demo@assetdesk.dev</strong> / <strong>demo123</strong>
        </p>
      </div>
      <div className="login-panel login-panel--alt">
        <div className="login-grid">
          <div>
            <span>Assets monitored</span>
            <strong>148</strong>
          </div>
          <div>
            <span>Open tickets</span>
            <strong>12</strong>
          </div>
          <div>
            <span>Weekly closures</span>
            <strong>42</strong>
          </div>
          <div>
            <span>SLA compliance</span>
            <strong>97%</strong>
          </div>
        </div>
        <div className="login-activity">
          <p>Latest activity</p>
          <ul>
            <li>Change window approved for core systems</li>
            <li>Endpoint policy synced across offices</li>
            <li>Ticket queue cleared for priority items</li>
          </ul>
        </div>
      </div>
    </div>
  )
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
  const [ticketQuery, setTicketQuery] = useState('')
  const [ticketStatus, setTicketStatus] = useState('all')
  const [ticketPriority, setTicketPriority] = useState('all')
  const [assetQuery, setAssetQuery] = useState('')
  const [assetStatus, setAssetStatus] = useState('all')
  const [userQuery, setUserQuery] = useState('')
  const [userRole, setUserRole] = useState('all')
  const [ticketPage, setTicketPage] = useState(1)
  const [assetPage, setAssetPage] = useState(1)
  const [userPage, setUserPage] = useState(1)

  const navigation = useMemo(
    () => [
      { id: 'dashboard', label: 'Executive Overview' },
      { id: 'tickets', label: 'Service Requests' },
      { id: 'assets', label: 'Asset Inventory' },
      { id: 'users', label: 'Workforce' },
    ],
    []
  )

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

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const matchesQuery =
        ticket.title.toLowerCase().includes(ticketQuery.toLowerCase()) ||
        ticket.requester.toLowerCase().includes(ticketQuery.toLowerCase())
      const matchesStatus = ticketStatus === 'all' || ticket.status === ticketStatus
      const matchesPriority = ticketPriority === 'all' || ticket.priority === ticketPriority
      return matchesQuery && matchesStatus && matchesPriority
    })
  }, [tickets, ticketQuery, ticketStatus, ticketPriority])

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesQuery =
        asset.name.toLowerCase().includes(assetQuery.toLowerCase()) ||
        asset.tag.toLowerCase().includes(assetQuery.toLowerCase()) ||
        asset.location.toLowerCase().includes(assetQuery.toLowerCase())
      const matchesStatus = assetStatus === 'all' || asset.status === assetStatus
      return matchesQuery && matchesStatus
    })
  }, [assets, assetQuery, assetStatus])

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesQuery =
        user.name.toLowerCase().includes(userQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(userQuery.toLowerCase())
      const matchesRole = userRole === 'all' || user.role === userRole
      return matchesQuery && matchesRole
    })
  }, [users, userQuery, userRole])

  const ticketPageSize = 8
  const assetPageSize = 8
  const userPageSize = 8

  useEffect(() => setTicketPage(1), [ticketQuery, ticketStatus, ticketPriority])
  useEffect(() => setAssetPage(1), [assetQuery, assetStatus])
  useEffect(() => setUserPage(1), [userQuery, userRole])

  const paginatedTickets = filteredTickets.slice(
    (ticketPage - 1) * ticketPageSize,
    ticketPage * ticketPageSize
  )
  const paginatedAssets = filteredAssets.slice(
    (assetPage - 1) * assetPageSize,
    assetPage * assetPageSize
  )
  const paginatedUsers = filteredUsers.slice(
    (userPage - 1) * userPageSize,
    userPage * userPageSize
  )

  const ticketTotalPages = Math.max(1, Math.ceil(filteredTickets.length / ticketPageSize))
  const assetTotalPages = Math.max(1, Math.ceil(filteredAssets.length / assetPageSize))
  const userTotalPages = Math.max(1, Math.ceil(filteredUsers.length / userPageSize))

  const activeTicketFilters = [
    ticketQuery && `Search: ${ticketQuery}`,
    ticketStatus !== 'all' && `Status: ${ticketStatus}`,
    ticketPriority !== 'all' && `Priority: ${ticketPriority}`,
  ].filter(Boolean)

  const activeAssetFilters = [
    assetQuery && `Search: ${assetQuery}`,
    assetStatus !== 'all' && `Status: ${assetStatus}`,
  ].filter(Boolean)

  const activeUserFilters = [
    userQuery && `Search: ${userQuery}`,
    userRole !== 'all' && `Role: ${userRole}`,
  ].filter(Boolean)

  if (!token) {
    return <Login onLogin={handleLogin} busy={loading} error={error} />
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">AD</div>
          <div>
            <h2>AssetDesk</h2>
            <span>Support + inventory hub</span>
          </div>
        </div>
        <nav>
          {navigation.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? 'nav-item nav-item--active' : 'nav-item'}
              onClick={() => setView(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div>
            <p>Signed in as</p>
            <strong>IT Operations</strong>
          </div>
          <button className="ghost" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <div>
            <p className="eyebrow">Workspace / Enterprise Operations</p>
            <h1>{navigation.find((item) => item.id === view)?.label}</h1>
            <p>Maintain service continuity, asset health, and distributed coverage.</p>
          </div>
          <div className="topbar-actions">
            <div className="status-chip">Enterprise operations</div>
            <button className="primary" onClick={() => setFormOpen(true)}>New ticket</button>
          </div>
        </header>

        {error && <div className="banner">{error}</div>}

        {view === 'dashboard' && (
          <section className="grid">
            {loading ? (
              Array.from({ length: 4 }).map((_, idx) => <StatSkeleton key={idx} />)
            ) : (
              <>
            <StatCard label="Assets under management" value={summary?.assets ?? '--'} hint="Managed inventory" trend="0,32 20,24 40,28 60,18 80,22 100,14 120,20" />
            <StatCard label="Open service requests" value={summary?.openTickets ?? '--'} hint="Awaiting action" trend="0,20 20,18 40,26 60,22 80,30 100,26 120,28" />
            <StatCard label="Resolved this week" value={summary?.resolved ?? '--'} hint="Completed" trend="0,28 20,24 40,20 60,22 80,16 100,12 120,10" />
            <StatCard label="SLA at risk" value={summary?.slaRisk ?? '--'} hint="Needs review" trend="0,10 20,12 40,16 60,20 80,18 100,22 120,20" />
              </>
            )}

            <div className="card span-2">
              <TableHeader
                title="Latest service requests"
                subtitle="Most recent items across the organization"
                action={<button className="ghost" onClick={() => setView('tickets')}>View all</button>}
              />
              <div className="table">
                <div className="row row--header">
                  <span>Request</span>
                  <span>Status</span>
                  <span>Priority</span>
                  <span>Created</span>
                </div>
                {loading && Array.from({ length: 5 }).map((_, idx) => <SkeletonRow key={idx} />)}
                {!loading && tickets.length === 0 && (
                  <EmptyState
                    title="No tickets yet"
                    subtitle="Create a request to start tracking issues."
                    action={<button className="primary" onClick={() => setFormOpen(true)}>New ticket</button>}
                  />
                )}
                {!loading && tickets.slice(0, 5).map((ticket) => (
                  <div key={ticket.id} className="row">
                    <div>
                      <strong>{ticket.title}</strong>
                      <span>{ticket.requester}</span>
                    </div>
                    <StatusBadge tone={ticket.status === 'open' ? 'green' : 'gray'} label={ticket.status} />
                    <StatusBadge tone={ticket.priority === 'high' ? 'red' : ticket.priority === 'medium' ? 'amber' : 'blue'} label={ticket.priority} />
                    <span>{ticket.created_at}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card span-2">
              <TableHeader
                title="Asset attention"
                subtitle="Devices flagged for review in the last 24 hours"
                action={<button className="ghost" onClick={() => setView('assets')}>Open inventory</button>}
              />
              <div className="table">
                <div className="row row--header">
                  <span>Asset</span>
                  <span>Status</span>
                  <span>Last seen</span>
                  <span>Location</span>
                </div>
                {loading && Array.from({ length: 4 }).map((_, idx) => <SkeletonRow key={idx} />)}
                {!loading && assets.length === 0 && (
                  <EmptyState
                    title="Inventory is empty"
                    subtitle="Add assets to track health and ownership."
                  />
                )}
                {!loading && assets.slice(0, 5).map((asset) => (
                  <div key={asset.id} className="row">
                    <div>
                      <strong>{asset.name}</strong>
                      <span>{asset.tag}</span>
                    </div>
                    <StatusBadge tone={asset.status === 'healthy' ? 'green' : asset.status === 'warning' ? 'amber' : 'red'} label={asset.status} />
                    <span>{asset.last_seen}</span>
                    <span>{asset.location}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {view === 'tickets' && (
          <section className="card list">
            <TableHeader
              title="Service requests"
              subtitle="Track incidents, access requests, and change tasks"
              action={<button className="primary" onClick={() => setFormOpen(true)}>New ticket</button>}
            />
            <SectionToolbar>
              <input
                placeholder="Search tickets"
                value={ticketQuery}
                onChange={(event) => setTicketQuery(event.target.value)}
              />
              <select value={ticketStatus} onChange={(event) => setTicketStatus(event.target.value)}>
                <option value="all">All status</option>
                <option value="open">Open</option>
                <option value="resolved">Resolved</option>
              </select>
              <select value={ticketPriority} onChange={(event) => setTicketPriority(event.target.value)}>
                <option value="all">All priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </SectionToolbar>
            {activeTicketFilters.length > 0 && (
              <div className="filter-chips">
                {activeTicketFilters.map((filter) => (
                  <span key={filter} className="chip">{filter}</span>
                ))}
                <button
                  className="ghost"
                  onClick={() => {
                    setTicketQuery('')
                    setTicketStatus('all')
                    setTicketPriority('all')
                  }}
                >
                  Clear all
                </button>
              </div>
            )}
            <div className="table-meta">
              <span>{filteredTickets.length} tickets</span>
              <span>Page {ticketPage} of {ticketTotalPages}</span>
            </div>
            <div className="table">
              <div className="row row--header">
                <span>Request</span>
                <span>Status</span>
                <span>Priority</span>
                <span>Created</span>
              </div>
              {loading && Array.from({ length: 6 }).map((_, idx) => <SkeletonRow key={idx} />)}
              {!loading && filteredTickets.length === 0 && (
                <EmptyState
                  title="No matching tickets"
                  subtitle="Try adjusting your filters or create a new request."
                />
              )}
              {!loading && paginatedTickets.map((ticket) => (
                <div key={ticket.id} className="row">
                  <div>
                    <strong>{ticket.title}</strong>
                    <span>{ticket.requester} · {ticket.assignee || 'Unassigned'}</span>
                  </div>
                  <StatusBadge tone={ticket.status === 'open' ? 'green' : 'gray'} label={ticket.status} />
                  <StatusBadge tone={ticket.priority === 'high' ? 'red' : ticket.priority === 'medium' ? 'amber' : 'blue'} label={ticket.priority} />
                  <span>{ticket.created_at}</span>
                </div>
              ))}
            </div>
            <div className="pagination">
              <button
                className="ghost"
                disabled={ticketPage === 1}
                onClick={() => setTicketPage((prev) => Math.max(1, prev - 1))}
              >
                Prev
              </button>
              <button
                className="ghost"
                disabled={ticketPage === ticketTotalPages}
                onClick={() => setTicketPage((prev) => Math.min(ticketTotalPages, prev + 1))}
              >
                Next
              </button>
            </div>
          </section>
        )}

        {view === 'assets' && (
          <section className="card list">
            <TableHeader
              title="Asset inventory"
              subtitle="Every endpoint, ownership record, and last check-in"
            />
            <SectionToolbar>
              <input
                placeholder="Search assets or locations"
                value={assetQuery}
                onChange={(event) => setAssetQuery(event.target.value)}
              />
              <select value={assetStatus} onChange={(event) => setAssetStatus(event.target.value)}>
                <option value="all">All status</option>
                <option value="healthy">Healthy</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </select>
            </SectionToolbar>
            {activeAssetFilters.length > 0 && (
              <div className="filter-chips">
                {activeAssetFilters.map((filter) => (
                  <span key={filter} className="chip">{filter}</span>
                ))}
                <button
                  className="ghost"
                  onClick={() => {
                    setAssetQuery('')
                    setAssetStatus('all')
                  }}
                >
                  Clear all
                </button>
              </div>
            )}
            <div className="table-meta">
              <span>{filteredAssets.length} assets</span>
              <span>Page {assetPage} of {assetTotalPages}</span>
            </div>
            <div className="table">
              <div className="row row--header">
                <span>Asset</span>
                <span>Location</span>
                <span>Status</span>
                <span>Last seen</span>
              </div>
              {loading && Array.from({ length: 6 }).map((_, idx) => <SkeletonRow key={idx} />)}
              {!loading && filteredAssets.length === 0 && (
                <EmptyState
                  title="No assets found"
                  subtitle="Try a different search term or status filter."
                />
              )}
              {!loading && paginatedAssets.map((asset) => (
                <div key={asset.id} className="row">
                  <div>
                    <strong>{asset.name}</strong>
                    <span>{asset.tag} · {asset.type}</span>
                  </div>
                  <span>{asset.location}</span>
                  <StatusBadge tone={asset.status === 'healthy' ? 'green' : asset.status === 'warning' ? 'amber' : 'red'} label={asset.status} />
                  <span>{asset.last_seen}</span>
                </div>
              ))}
            </div>
            <div className="pagination">
              <button
                className="ghost"
                disabled={assetPage === 1}
                onClick={() => setAssetPage((prev) => Math.max(1, prev - 1))}
              >
                Prev
              </button>
              <button
                className="ghost"
                disabled={assetPage === assetTotalPages}
                onClick={() => setAssetPage((prev) => Math.min(assetTotalPages, prev + 1))}
              >
                Next
              </button>
            </div>
          </section>
        )}

        {view === 'users' && (
          <section className="card list">
            <TableHeader
              title="Workforce"
              subtitle="Operations leadership and service desk coverage"
            />
            <SectionToolbar>
              <input
                placeholder="Search people"
                value={userQuery}
                onChange={(event) => setUserQuery(event.target.value)}
              />
              <select value={userRole} onChange={(event) => setUserRole(event.target.value)}>
                <option value="all">All roles</option>
                <option value="Admin">Admin</option>
                <option value="Support Lead">Support Lead</option>
                <option value="Field Tech">Field Tech</option>
              </select>
            </SectionToolbar>
            {activeUserFilters.length > 0 && (
              <div className="filter-chips">
                {activeUserFilters.map((filter) => (
                  <span key={filter} className="chip">{filter}</span>
                ))}
                <button
                  className="ghost"
                  onClick={() => {
                    setUserQuery('')
                    setUserRole('all')
                  }}
                >
                  Clear all
                </button>
              </div>
            )}
            <div className="table-meta">
              <span>{filteredUsers.length} people</span>
              <span>Page {userPage} of {userTotalPages}</span>
            </div>
            <div className="table">
              <div className="row row--header">
                <span>Name</span>
                <span>Role</span>
                <span>Created</span>
                <span></span>
              </div>
              {loading && Array.from({ length: 5 }).map((_, idx) => <SkeletonRow key={idx} />)}
              {!loading && filteredUsers.length === 0 && (
                <EmptyState
                  title="No users found"
                  subtitle="Adjust the search terms or roles filter."
                />
              )}
              {!loading && paginatedUsers.map((user) => (
                <div key={user.id} className="row">
                  <div>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <span>{user.role}</span>
                  <span>{user.created_at}</span>
                  <button className="ghost">View</button>
                </div>
              ))}
            </div>
            <div className="pagination">
              <button
                className="ghost"
                disabled={userPage === 1}
                onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
              >
                Prev
              </button>
              <button
                className="ghost"
                disabled={userPage === userTotalPages}
                onClick={() => setUserPage((prev) => Math.min(userTotalPages, prev + 1))}
              >
                Next
              </button>
            </div>
          </section>
        )}
      </main>

      {formOpen && (
        <div className="modal">
          <div className="modal-card">
            <div className="modal-head">
              <h3>Create ticket</h3>
              <button className="ghost" onClick={() => setFormOpen(false)}>Close</button>
            </div>
            <form onSubmit={handleTicketSubmit} className="modal-body">
              <label>
                Title
                <input
                  value={newTicket.title}
                  onChange={(event) => setNewTicket({ ...newTicket, title: event.target.value })}
                  required
                />
              </label>
              <label>
                Priority
                <select
                  value={newTicket.priority}
                  onChange={(event) => setNewTicket({ ...newTicket, priority: event.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label>
                Description
                <textarea
                  rows="4"
                  value={newTicket.description}
                  onChange={(event) => setNewTicket({ ...newTicket, description: event.target.value })}
                />
              </label>
              <button className="primary" type="submit">Create ticket</button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
