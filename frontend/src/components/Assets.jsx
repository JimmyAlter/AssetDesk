import { useMemo, useState, useEffect } from 'react'
import Badge from './ui/Badge'
import EmptyState from './ui/EmptyState'
import { SkeletonRow } from './ui/Skeleton'
import Pagination from './ui/Pagination'
import { SearchIcon } from './Icons'

const PAGE_SIZE = 8

const Assets = ({ assets, loading }) => {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return assets.filter((a) => {
      const q = query.toLowerCase()
      const matchesQuery =
        a.name.toLowerCase().includes(q) ||
        a.tag.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q)
      const matchesStatus = status === 'all' || a.status === status
      return matchesQuery && matchesStatus
    })
  }, [assets, query, status])

  useEffect(() => setPage(1), [query, status])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeFilters = [
    query && `Search: ${query}`,
    status !== 'all' && `Status: ${status}`,
  ].filter(Boolean)

  return (
    <section className="card view-card">
      <div className="card__header">
        <div>
          <h3>Asset inventory</h3>
          <p>Every endpoint, ownership record, and last check-in</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar__search">
          <SearchIcon />
          <input
            placeholder="Search assets or locations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All status</option>
          <option value="healthy">Healthy</option>
          <option value="warning">Warning</option>
          <option value="critical">Critical</option>
        </select>
      </div>

      {activeFilters.length > 0 && (
        <div className="filter-chips">
          {activeFilters.map((f) => (
            <span key={f} className="chip">{f}</span>
          ))}
          <button className="btn btn--ghost btn--sm" onClick={() => { setQuery(''); setStatus('all') }}>
            Clear all
          </button>
        </div>
      )}

      <div className="table-meta">
        <span>{filtered.length} assets</span>
      </div>

      <div className="table">
        <div className="row row--header">
          <span>Asset</span>
          <span>Location</span>
          <span>Status</span>
          <span>Last seen</span>
        </div>
        {loading && Array.from({ length: 6 }).map((_, idx) => <SkeletonRow key={idx} />)}
        {!loading && filtered.length === 0 && (
          <EmptyState title="No assets found" subtitle="Try a different search term or status filter." />
        )}
        {!loading && paginated.map((asset) => (
          <div key={asset.id} className="row">
            <div className="row__cell row__cell--main">
              <strong>{asset.name}</strong>
              <span>{asset.tag} · {asset.type}</span>
            </div>
            <span className="row__meta">{asset.location}</span>
            <Badge tone={asset.status === 'healthy' ? 'green' : asset.status === 'warning' ? 'amber' : 'red'} label={asset.status} />
            <span className="row__meta">{asset.last_seen}</span>
          </div>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </section>
  )
}

export default Assets
