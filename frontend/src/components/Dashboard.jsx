import StatCard, { StatSkeleton } from './ui/StatCard'
import Badge from './ui/Badge'
import EmptyState from './ui/EmptyState'
import { SkeletonRow } from './ui/Skeleton'
import { DashboardIcon, TicketIcon, ServerIcon, ShieldIcon } from './Icons'
import { formatDateTime } from '../format'
import { STATUS_LABELS, STATUS_TONES, PRIORITY_TONES } from '../permissions'

const ASSET_TONES = { healthy: 'green', warning: 'amber', critical: 'red' }
const SEVERITY = { critical: 0, warning: 1, healthy: 2 }

const Dashboard = ({ summary, tickets, assets, loading, onViewAll, onNewTicket, onSelectTicket }) => {
  const attention = assets
    .filter((asset) => asset.status !== 'healthy')
    .sort((a, b) => SEVERITY[a.status] - SEVERITY[b.status])
    .slice(0, 5)

  return (
    <section className="dashboard">
      <div className="stat-grid">
        {loading ? (
          Array.from({ length: 4 }).map((_, idx) => <StatSkeleton key={idx} />)
        ) : (
          <>
            <StatCard
              label="Assets under management"
              value={summary?.assets ?? '--'}
              hint="Devices in the inventory"
              accentClass="stat-card--violet"
              icon={<ServerIcon />}
            />
            <StatCard
              label="Open service requests"
              value={summary?.openTickets ?? '--'}
              hint="Open or in progress"
              accentClass="stat-card--blue"
              icon={<TicketIcon />}
            />
            <StatCard
              label="Resolved this week"
              value={summary?.resolved ?? '--'}
              hint="Resolved in the last 7 days"
              accentClass="stat-card--emerald"
              icon={<DashboardIcon />}
            />
            <StatCard
              label="SLA at risk"
              value={summary?.slaRisk ?? '--'}
              hint="High priority, not resolved"
              accentClass="stat-card--amber"
              icon={<ShieldIcon />}
            />
          </>
        )}
      </div>

      <div className="dashboard__tables">
        <div className="card card--full">
          <div className="card__header">
            <div>
              <h3>Latest service requests</h3>
              <p>Most recent tickets you can see</p>
            </div>
            <button className="btn btn--ghost" onClick={() => onViewAll('tickets')}>View all</button>
          </div>
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
                action={<button className="btn btn--primary" onClick={onNewTicket}>New ticket</button>}
              />
            )}
            {!loading && tickets.slice(0, 5).map((ticket) => (
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
        </div>

        <div className="card card--full">
          <div className="card__header">
            <div>
              <h3>Asset attention</h3>
              <p>Devices in a warning or critical state</p>
            </div>
            <button className="btn btn--ghost" onClick={() => onViewAll('assets')}>Open inventory</button>
          </div>
          <div className="table">
            <div className="row row--header">
              <span>Asset</span>
              <span>Status</span>
              <span>Last seen</span>
              <span>Location</span>
            </div>
            {loading && Array.from({ length: 4 }).map((_, idx) => <SkeletonRow key={idx} />)}
            {!loading && attention.length === 0 && (
              <EmptyState
                title="All devices healthy"
                subtitle="Nothing in the inventory needs attention."
              />
            )}
            {!loading && attention.map((asset) => (
              <div key={asset.id} className="row">
                <div className="row__cell row__cell--main">
                  <strong>{asset.name}</strong>
                  <span>{asset.tag}</span>
                </div>
                <Badge tone={ASSET_TONES[asset.status]} label={asset.status} />
                <span className="row__meta">{formatDateTime(asset.last_seen)}</span>
                <span className="row__meta">{asset.location}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Dashboard
