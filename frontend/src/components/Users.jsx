import { useMemo, useState } from 'react'
import Badge from './ui/Badge'
import EmptyState from './ui/EmptyState'
import { SkeletonRow } from './ui/Skeleton'
import Pagination from './ui/Pagination'
import Modal from './Modal'
import { SearchIcon } from './Icons'
import { formatDate, initials } from '../format'
import { ROLES, STATUS_LABELS, STATUS_TONES } from '../permissions'

const PAGE_SIZE = 8

const ROLE_SUMMARY = {
  [ROLES.ADMIN]: 'Full access: every ticket, assignment, reopening and the people directory.',
  [ROLES.LEAD]: 'Runs the queue: every ticket, assignment, reopening and the people directory.',
  [ROLES.TECH]: 'Works the tickets assigned to them and can raise new ones.',
}

const Users = ({ users, tickets, loading }) => {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('all')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState(null)

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = query.toLowerCase()
      const matchesQuery = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      const matchesRole = role === 'all' || u.role === role
      return matchesQuery && matchesRole
    })
  }, [users, query, role])


  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeFilters = [
    query && `Search: ${query}`,
    role !== 'all' && `Role: ${role}`,
  ].filter(Boolean)

  const selected = users.find((u) => u.id === selectedId)
  const workload = selected
    ? tickets.filter((t) => t.assignee_id === selected.id && t.status !== 'resolved')
    : []

  return (
    <section className="card view-card">
      <div className="card__header">
        <div>
          <h3>Workforce</h3>
          <p>Operations leadership and service desk coverage</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar__search">
          <SearchIcon />
          <input
            placeholder="Search people…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
          />
        </div>
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1) }}>
          <option value="all">All roles</option>
          {Object.values(ROLES).map((name) => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {activeFilters.length > 0 && (
        <div className="filter-chips">
          {activeFilters.map((f) => (
            <span key={f} className="chip">{f}</span>
          ))}
          <button className="btn btn--ghost btn--sm" onClick={() => { setQuery(''); setRole('all'); setPage(1) }}>
            Clear all
          </button>
        </div>
      )}

      <div className="table-meta">
        <span>{filtered.length} people</span>
      </div>

      <div className="table">
        <div className="row row--header">
          <span>Name</span>
          <span>Role</span>
          <span>Joined</span>
          <span></span>
        </div>
        {loading && Array.from({ length: 5 }).map((_, idx) => <SkeletonRow key={idx} />)}
        {!loading && filtered.length === 0 && (
          <EmptyState title="No users found" subtitle="Adjust the search terms or roles filter." />
        )}
        {!loading && paginated.map((user) => (
          <div key={user.id} className="row">
            <div className="row__cell row__cell--main">
              <div className="user-avatar">{initials(user.name)}</div>
              <div>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            <span className="row__role-tag">{user.role}</span>
            <span className="row__meta">{formatDate(user.created_at)}</span>
            <button className="btn btn--ghost btn--sm" onClick={() => setSelectedId(user.id)}>View</button>
          </div>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal open={Boolean(selected)} onClose={() => setSelectedId(null)} title="Team member">
        {selected && (
          <div className="ticket-detail">
            <div className="person-head">
              <div className="user-avatar user-avatar--lg">{initials(selected.name)}</div>
              <div>
                <h4 className="ticket-detail__title">{selected.name}</h4>
                <span className="row__role-tag">{selected.role}</span>
              </div>
            </div>
            <p className="ticket-detail__description">{ROLE_SUMMARY[selected.role]}</p>
            <dl className="detail-list">
              <div><dt>Email</dt><dd>{selected.email}</dd></div>
              <div><dt>Joined</dt><dd>{formatDate(selected.created_at)}</dd></div>
              <div><dt>Active tickets</dt><dd>{workload.length}</dd></div>
            </dl>
            {workload.length > 0 && (
              <ul className="workload">
                {workload.map((ticket) => (
                  <li key={ticket.id}>
                    <span>{ticket.title}</span>
                    <Badge tone={STATUS_TONES[ticket.status]} label={STATUS_LABELS[ticket.status]} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </section>
  )
}

export default Users
