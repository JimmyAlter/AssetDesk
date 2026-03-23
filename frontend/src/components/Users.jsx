import { useMemo, useState, useEffect } from 'react'
import EmptyState from './ui/EmptyState'
import { SkeletonRow } from './ui/Skeleton'
import Pagination from './ui/Pagination'
import { SearchIcon } from './Icons'

const PAGE_SIZE = 8

const Users = ({ users, loading }) => {
  const [query, setQuery] = useState('')
  const [role, setRole] = useState('all')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const q = query.toLowerCase()
      const matchesQuery = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      const matchesRole = role === 'all' || u.role === role
      return matchesQuery && matchesRole
    })
  }, [users, query, role])

  useEffect(() => setPage(1), [query, role])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeFilters = [
    query && `Search: ${query}`,
    role !== 'all' && `Role: ${role}`,
  ].filter(Boolean)

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
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="all">All roles</option>
          <option value="Admin">Admin</option>
          <option value="Support Lead">Support Lead</option>
          <option value="Field Tech">Field Tech</option>
        </select>
      </div>

      {activeFilters.length > 0 && (
        <div className="filter-chips">
          {activeFilters.map((f) => (
            <span key={f} className="chip">{f}</span>
          ))}
          <button className="btn btn--ghost btn--sm" onClick={() => { setQuery(''); setRole('all') }}>
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
              <div className="user-avatar">{user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}</div>
              <div>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            <span className="row__role-tag">{user.role}</span>
            <span className="row__meta">{user.created_at}</span>
            <button className="btn btn--ghost btn--sm">View</button>
          </div>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </section>
  )
}

export default Users
