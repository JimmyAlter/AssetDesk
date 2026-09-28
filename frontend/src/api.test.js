import { describe, expect, it, vi } from 'vitest'
import { API_URL, ApiError, apiFetch } from './api'

const jsonResponse = (status, body) => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => (body === undefined ? '' : JSON.stringify(body)),
})

describe('apiFetch', () => {
  it('keeps Content-Type when an Authorization header is sent (regression)', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(201, { id: 1 }))

    await apiFetch('/api/tickets', {
      method: 'POST',
      headers: { Authorization: 'Bearer abc' },
      body: JSON.stringify({ title: 'Printer offline' }),
    }, fetchImpl)

    const [url, init] = fetchImpl.mock.calls[0]
    expect(url).toBe(`${API_URL}/api/tickets`)
    expect(init.method).toBe('POST')
    expect(init.body).toBe('{"title":"Printer offline"}')
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer abc',
    })
  })

  it('adds the bearer token from the token option', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, []))
    await apiFetch('/api/tickets', { token: 't0ken' }, fetchImpl)
    expect(fetchImpl.mock.calls[0][1].headers).toEqual({
      'Content-Type': 'application/json',
      Authorization: 'Bearer t0ken',
    })
  })

  it('returns parsed JSON', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(200, { status: 'ok' }))
    await expect(apiFetch('/api/health', {}, fetchImpl)).resolves.toEqual({ status: 'ok' })
  })

  it('throws the server error message with the status', async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(403, { error: 'You do not have permission to do that' }))
    const error = await apiFetch('/api/users', { token: 'x' }, fetchImpl).catch((err) => err)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(403)
    expect(error.message).toBe('You do not have permission to do that')
  })

  it('falls back to a generic message for non-JSON errors', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 502, text: async () => '<html>Bad gateway</html>' }))
    const error = await apiFetch('/api/summary', {}, fetchImpl).catch((err) => err)
    expect(error.status).toBe(502)
    expect(error.message).toBe('Request failed (502)')
  })

  it('reports network failures as status 0', async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    const error = await apiFetch('/api/summary', {}, fetchImpl).catch((err) => err)
    expect(error).toBeInstanceOf(ApiError)
    expect(error.status).toBe(0)
  })
})
