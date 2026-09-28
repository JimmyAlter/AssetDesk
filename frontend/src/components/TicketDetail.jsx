import { useState } from 'react'
import Badge from './ui/Badge'
import { formatDateTime } from '../format'
import { isManager, statusActions, STATUS_LABELS, STATUS_TONES, PRIORITY_TONES } from '../permissions'

const TicketDetail = ({ ticket, user, users, onUpdate }) => {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const actions = statusActions(user, ticket)
  const canAssign = isManager(user)

  const update = async (changes) => {
    try {
      setBusy(true)
      setError('')
      await onUpdate(ticket.id, changes)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="ticket-detail">
      <div>
        <h4 className="ticket-detail__title">{ticket.title}</h4>
        <div className="ticket-detail__badges">
          <Badge tone={STATUS_TONES[ticket.status]} label={STATUS_LABELS[ticket.status]} />
          <Badge tone={PRIORITY_TONES[ticket.priority]} label={`${ticket.priority} priority`} />
        </div>
      </div>

      {ticket.description && <p className="ticket-detail__description">{ticket.description}</p>}

      <dl className="detail-list">
        <div><dt>Requester</dt><dd>{ticket.requester}</dd></div>
        <div><dt>Assignee</dt><dd>{ticket.assignee || 'Unassigned'}</dd></div>
        <div><dt>Created</dt><dd>{formatDateTime(ticket.created_at)}</dd></div>
        <div><dt>Last update</dt><dd>{formatDateTime(ticket.updated_at)}</dd></div>
        {ticket.resolved_at && <div><dt>Resolved</dt><dd>{formatDateTime(ticket.resolved_at)}</dd></div>}
      </dl>

      {canAssign && (
        <label className="field">
          <span>Assign to</span>
          <select
            value={ticket.assignee_id ?? ''}
            disabled={busy}
            onChange={(e) => update({ assigneeId: e.target.value === '' ? null : Number(e.target.value) })}
          >
            <option value="">Unassigned</option>
            {users.map((person) => (
              <option key={person.id} value={person.id}>{person.name} · {person.role}</option>
            ))}
          </select>
        </label>
      )}

      {actions.length > 0 && (
        <div className="ticket-detail__actions">
          {actions.map((action) => (
            <button
              key={action.to}
              className={action.to === 'resolved' ? 'btn btn--primary' : 'btn btn--ghost'}
              disabled={busy}
              onClick={() => update({ status: action.to })}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {!canAssign && actions.length === 0 && (
        <p className="ticket-detail__hint">
          {ticket.status === 'resolved'
            ? 'Resolved tickets can be reopened by an admin or support lead.'
            : 'Only the assigned technician or a manager can change this ticket.'}
        </p>
      )}

      {error && <p className="form-error" role="alert">{error}</p>}
    </div>
  )
}

export default TicketDetail
