// Role-based access: Admin and Support Lead manage the desk, Field Tech works
// the tickets assigned to them. See the permissions table in the README.
const test = require('node:test')
const assert = require('node:assert/strict')
const { setup } = require('./helpers')

const ctx = setup()

const ticketId = (list, title) => list.find((t) => t.title === title).id

test('managers can read the people directory, field techs get 403', async () => {
  for (const role of ['admin', 'lead']) {
    const res = await ctx.request('GET', '/api/users', { token: ctx.tokens[role] })
    assert.equal(res.status, 200, role)
  }
  for (const role of ['tech', 'otherTech']) {
    const res = await ctx.request('GET', '/api/users', { token: ctx.tokens[role] })
    assert.equal(res.status, 403, role)
    assert.equal(res.body.error, 'You do not have permission to do that')
  }
})

test('managers see every ticket, field techs only their own', async () => {
  const all = await ctx.request('GET', '/api/tickets', { token: ctx.tokens.lead })
  const mine = await ctx.request('GET', '/api/tickets', { token: ctx.tokens.tech })
  assert.equal(all.status, 200)
  assert.equal(mine.status, 200)
  assert.ok(mine.body.length > 0)
  assert.ok(mine.body.length < all.body.length)
  for (const ticket of mine.body) {
    assert.ok(
      ticket.assignee_id === ctx.tokens.techId || ticket.requester_id === ctx.tokens.techId,
      `${ticket.title} should not be visible to the field tech`
    )
  }
})

test('field techs can raise tickets and then see them', async () => {
  const created = await ctx.request('POST', '/api/tickets', { token: ctx.tokens.tech, body: { title: 'Dock not charging' } })
  assert.equal(created.status, 201)
  const mine = await ctx.request('GET', '/api/tickets', { token: ctx.tokens.tech })
  assert.ok(mine.body.some((t) => t.id === created.body.id))
})

test('field techs cannot assign tickets (403)', async () => {
  const mine = (await ctx.request('GET', '/api/tickets', { token: ctx.tokens.tech })).body
  const id = ticketId(mine, 'RAID controller warning on file server')
  for (const assigneeId of [ctx.tokens.techId, ctx.tokens.otherTechId, null]) {
    const res = await ctx.request('PATCH', `/api/tickets/${id}`, { token: ctx.tokens.tech, body: { assigneeId } })
    assert.equal(res.status, 403)
    assert.match(res.body.error, /Only admins and support leads can assign/)
  }
})

test('field techs cannot change the status of a ticket that is not assigned to them (403)', async () => {
  const mine = (await ctx.request('GET', '/api/tickets', { token: ctx.tokens.tech })).body
  // Raised by the field tech, assigned to the Service Desk Lead.
  const id = ticketId(mine, 'Battery health review')
  const res = await ctx.request('PATCH', `/api/tickets/${id}`, { token: ctx.tokens.tech, body: { status: 'open' } })
  assert.equal(res.status, 403)
  assert.match(res.body.error, /only update tickets assigned to you/)
})

test('field techs cannot reopen resolved tickets, even their own (403)', async () => {
  const mine = (await ctx.request('GET', '/api/tickets', { token: ctx.tokens.tech })).body
  const id = ticketId(mine, 'Recurring printer queue stall')
  const res = await ctx.request('PATCH', `/api/tickets/${id}`, { token: ctx.tokens.tech, body: { status: 'open' } })
  assert.equal(res.status, 403)
  assert.match(res.body.error, /reopen/)
})

test('tickets a field tech cannot see are reported as not found', async () => {
  const all = (await ctx.request('GET', '/api/tickets', { token: ctx.tokens.admin })).body
  const id = ticketId(all, 'Slow boot times on laptops')
  const res = await ctx.request('PATCH', `/api/tickets/${id}`, { token: ctx.tokens.tech, body: { status: 'in_progress' } })
  assert.equal(res.status, 404)
})

test('field techs can work tickets assigned to them', async () => {
  const mine = (await ctx.request('GET', '/api/tickets', { token: ctx.tokens.tech })).body
  const id = ticketId(mine, 'RAID controller warning on file server')
  const started = await ctx.request('PATCH', `/api/tickets/${id}`, { token: ctx.tokens.tech, body: { status: 'in_progress' } })
  assert.equal(started.status, 200)
  const resolved = await ctx.request('PATCH', `/api/tickets/${id}`, { token: ctx.tokens.tech, body: { status: 'resolved' } })
  assert.equal(resolved.status, 200)
  assert.equal(resolved.body.status, 'resolved')
})

test('managers can assign and reopen', async () => {
  const all = (await ctx.request('GET', '/api/tickets', { token: ctx.tokens.lead })).body
  const id = ticketId(all, 'RAID controller warning on file server')
  const reopened = await ctx.request('PATCH', `/api/tickets/${id}`, {
    token: ctx.tokens.lead,
    body: { status: 'open', assigneeId: ctx.tokens.otherTechId },
  })
  assert.equal(reopened.status, 200)
  assert.equal(reopened.body.status, 'open')
  assert.equal(reopened.body.assignee, 'Endpoint Specialist')

  // Reassigned away, so the first field tech no longer sees it.
  const mine = (await ctx.request('GET', '/api/tickets', { token: ctx.tokens.tech })).body
  assert.ok(!mine.some((t) => t.id === id))
})

test('a role change applies to existing tokens straight away', async () => {
  const token = ctx.tokens.otherTech
  assert.equal((await ctx.request('GET', '/api/users', { token })).status, 403)
  ctx.db.prepare("UPDATE users SET role = 'Support Lead' WHERE id = ?").run(ctx.tokens.otherTechId)
  try {
    assert.equal((await ctx.request('GET', '/api/users', { token })).status, 200)
  } finally {
    ctx.db.prepare("UPDATE users SET role = 'Field Tech' WHERE id = ?").run(ctx.tokens.otherTechId)
  }
})
