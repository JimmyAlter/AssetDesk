import StatCard, { StatSkeleton } from './ui/StatCard'
import Badge from './ui/Badge'
import EmptyState from './ui/EmptyState'
import { SkeletonRow } from './ui/Skeleton'
import { DashboardIcon, TicketIcon, ServerIcon, ShieldIcon } from './Icons'

const Dashboard = ({ summary, tickets, assets, loading, onViewAll, onNewTicket }) => (
  <section className="dashboard">
    <div className="stat-grid">
      {loading ? (
        Array.from({ length: 4 }).map((_, idx) => <StatSkeleton key={idx} />)
      ) : (
        <>
          <StatCard
            label="Assets under management"
            value={summary?.assets ?? '--'}
            hint="Managed inventory"
            trend="0,32 20,24 40,28 60,18 80,22 100,14 120,20"
            accentClass="stat-card--violet"
            icon={<ServerIcon />}
          />
          <StatCard
            label="Open service requests"
            value={summary?.openTickets ?? '--'}
            hint="Awaiting action"
            trend="0,20 20,18 40,26 60,22 80,30 100,26 120,28"
            accentClass="stat-card--blue"
            icon={<TicketIcon />}
          />
          <StatCard
            label="Resolved this week"
            value={summary?.resolved ?? '--'}
            hint="Completed"
            trend="0,28 20,24 40,20 60,22 80,16 100,12 120,10"
            accentClass="stat-card--emerald"
            icon={<DashboardIcon />}
          />
          <StatCard
            label="SLA at risk"
            value={summary?.slaRisk ?? '--'}
            hint="Needs review"
            trend="0,10 20,12 40,16 60,20 80,18 100,22 120,20"
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
            <p>Most recent items across the organization</p>
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
            <div key={ticket.id} className="row">
              <div className="row__cell row__cell--main">
                <strong>{ticket.title}</strong>
                <span>{ticket.requester}</span>
              </div>
              <Badge tone={ticket.status === 'open' ? 'green' : 'gray'} label={ticket.status} />
              <Badge tone={ticket.priority === 'high' ? 'red' : ticket.priority === 'medium' ? 'amber' : 'blue'} label={ticket.priority} />
              <span className="row__meta">{ticket.created_at}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card card--full">
        <div className="card__header">
          <div>
            <h3>Asset attention</h3>
            <p>Devices flagged for review in the last 24 hours</p>
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
          {!loading && assets.length === 0 && (
            <EmptyState
              title="Inventory is empty"
              subtitle="Add assets to track health and ownership."
            />
          )}
          {!loading && assets.slice(0, 5).map((asset) => (
            <div key={asset.id} className="row">
              <div className="row__cell row__cell--main">
                <strong>{asset.name}</strong>
                <span>{asset.tag}</span>
              </div>
              <Badge tone={asset.status === 'healthy' ? 'green' : asset.status === 'warning' ? 'amber' : 'red'} label={asset.status} />
              <span className="row__meta">{asset.last_seen}</span>
              <span className="row__meta">{asset.location}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </section>
)

export default Dashboard
