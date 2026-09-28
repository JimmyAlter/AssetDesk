// Ticket lifecycle: open -> in_progress -> resolved, back to the queue from
// in_progress, and reopen from resolved.
const test = require('node:test')
const assert = require('node:assert/strict')
const { setup } = require('./helpers')

const ctx = setup()

const createTicket = async (title = 'Monitor flickers') => {
  const res = await ctx.request('POST', '/api/tickets', { token: ctx.tokens.admin, body: { title } })
  assert.equal(res.status, 201)
  return res.body
}

const patch = (id, body, token = ctx.tokens.admin) =>
  ctx.request('PATCH', `/api/tickets/${id}`, { token, body })

const summary = async () => (await ctx.request('GET', '/api/summary', { token: ctx.tokens.admin })).body

test('a ticket moves through the lifecycle and resolved_at follows it', async () => {
  const ticket = await createTicket()
  const before = await summary()

  const started = await patch(ticket.id, { status: 'in_progress' })
  assert.equal(started.status, 200)
  assert.equal(started.body.status, 'in_progress')
  assert.equal(started.body.resolved_at, null)

  const resolved = await patch(ticket.id, { status: 'resolved' })
  assert.equal(resolved.status, 200)
  assert.equal(resolved.body.status, 'resolved')
  assert.match(resolved.body.resolved_at, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)

  const afterResolve = await summary()
  assert.equal(afterResolve.resolved, before.resolved + 1)
  assert.equal(afterResolve.openTickets, before.openTickets - 1)

  const reopened = await patch(ticket.id, { status: 'open' })
  assert.equal(reopened.status, 200)
  assert.equal(reopened.body.status, 'open')
  assert.equal(reopened.body.resolved_at, null)
  assert.deepEqual(await summary(), before)
})

test('in_progress tickets can go back to the queue', async () => {
  const ticket = await createTicket()
  await patch(ticket.id, { status: 'in_progress' })
  const res = await patch(ticket.id, { status: 'open' })
  assert.equal(res.status, 200)
  assert.equal(res.body.status, 'open')
})

test('transitions outside the state machine are rejected with 409', async () => {
  const ticket = await createTicket()
  const skip = await patch(ticket.id, { status: 'resolved' })
  assert.equal(skip.status, 409)
  assert.match(skip.body.error, /open ticket cannot move to resolved/)

  await patch(ticket.id, { status: 'in_progress' })
  await patch(ticket.id, { status: 'resolved' })
  const backwards = await patch(ticket.id, { status: 'in_progress' })
  assert.equal(backwards.status, 409)
})

test('setting the current status again is a no-op', async () => {
  const ticket = await createTicket()
  const res = await patch(ticket.id, { status: 'open' })
  assert.equal(res.status, 200)
  assert.equal(res.body.status, 'open')
})

test('assignment takes a user id or null', async () => {
  const ticket = await createTicket()
  const assigned = await patch(ticket.id, { assigneeId: ctx.tokens.techId })
  assert.equal(assigned.status, 200)
  assert.equal(assigned.body.assignee_id, ctx.tokens.techId)
  assert.equal(assigned.body.assignee, 'Field Technician')

  const unassigned = await patch(ticket.id, { assigneeId: null })
  assert.equal(unassigned.status, 200)
  assert.equal(unassigned.body.assignee_id, null)
  assert.equal(unassigned.body.assignee, null)
})

test('update input is validated', async () => {
  const ticket = await createTicket()
  const cases = [
    { body: {}, error: /Provide a status/ },
    { body: { status: 'closed' }, error: /Status must be one of/ },
    { body: { status: 42 }, error: /Status must be one of/ },
    { body: { assigneeId: 9999 }, error: /assigneeId/ },
    { body: { assigneeId: '2' }, error: /assigneeId/ },
    { body: { assigneeId: 1.5 }, error: /assigneeId/ },
  ]
  for (const { body, error } of cases) {
    const res = await patch(ticket.id, body)
    assert.equal(res.status, 400, JSON.stringify(body))
    assert.match(res.body.error, error)
  }
})

test('unknown ticket ids return 404', async () => {
  for (const id of ['9999', 'abc', '0', '-1', '1.5']) {
    const res = await patch(id, { status: 'in_progress' })
    assert.equal(res.status, 404, id)
    assert.equal(res.body.error, 'Ticket not found')
  }
})
