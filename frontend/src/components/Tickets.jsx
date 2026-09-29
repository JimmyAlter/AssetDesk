import { useMemo, useState } from 'react'
import Badge from './ui/Badge'
import EmptyState from './ui/EmptyState'
import { SkeletonRow } from './ui/Skeleton'
import Pagination from './ui/Pagination'
import { SearchIcon } from './Icons'
import { formatDateTime } from '../format'
import { STATUS_LABELS, STATUS_TONES, PRIORITY_TONES } from '../permissions'

const PAGE_SIZE = 8

const Tickets = ({ tickets, loading, onSelectTicket }) => {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [priority, setPriority] = useState('all')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    return tickets.filter((t) => {
      const q = query.toLowerCase()
      const matchesQuery =
        t.title.toLowerCase().includes(q) ||
        t.requester.toLowerCase().includes(q) ||
        (t.assignee || '').toLowerCase().includes(q)
      const matchesStatus = status === 'all' || t.status === status
      const matchesPriority = priority === 'all' || t.priority === priority
      return matchesQuery && matchesStatus && matchesPriority
    })
  }, [tickets, query, status, priority])


  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const activeFilters = [
    query && `Search: ${query}`,
    status !== 'all' && `Status: ${STATUS_LABELS[status]}`,
    priority !== 'all' && `Priority: ${priority}`,
  ].filter(Boolean)

  return (
    <section className="card view-card">
      <div className="card__header">
        <div>
          <h3>Service requests</h3>
          <p>Select a ticket to see details, change its status or assign it</p>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar__search">
          <SearchIcon />
          <input
            placeholder="Search tickets, requesters or assignees…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1) }}
          />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1) }}>
          <option value="all">All status</option>
          <option value="open">Open</option>
          <option value="in_progress">In progress</option>
          <option value="resolved">Resolved</option>
        </select>
        <select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1) }}>
          <option value="all">All priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {activeFilters.length > 0 && (
        <div className="filter-chips">
          {activeFilters.map((f) => (
            <span key={f} className="chip">{f}</span>
          ))}
          <button className="btn btn--ghost btn--sm" onClick={() => { setQuery(''); setStatus('all'); setPriority('all'); setPage(1) }}>
            Clear all
          </button>
        </div>
      )}

      <div className="table-meta">
        <span>{filtered.length} tickets</span>
      </div>

      <div className="table">
        <div className="row row--header">
          <span>Request</span>
          <span>Status</span>
          <span>Priority</span>
          <span>Created</span>
        </div>
        {loading && Array.from({ length: 6 }).map((_, idx) => <SkeletonRow key={idx} />)}
        {!loading && filtered.length === 0 && (
          <EmptyState title="No matching tickets" subtitle="Try adjusting your filters or create a new request." />
        )}
        {!loading && paginated.map((ticket) => (
          <button key={ticket.id} className="row row--button" onClick={() => onSelectTicket(ticket.id)}>
            <div className="row__cell row__cell--main">
              <strong>{ticket.title}</strong>
              <span>{ticket.requester} · {ticket.assignee || 'Unassigned'}</span>
            </div>
            <Badge tone={STATUS_TONES[ticket.status]} label={STATUS_LABELS[ticket.status]} />
            <Badge tone={PRIORITY_TONES[ticket.priority]} label={ticket.priority} />
            <span className="row__meta">{formatDateTime(ticket.created_at)}</span>
          </button>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </section>
  )
}

export default Tickets
