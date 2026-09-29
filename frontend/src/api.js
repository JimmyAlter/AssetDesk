export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000'

export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

// JSON fetch against the AssetDesk API. Caller headers are merged over the
// defaults rather than replacing them, so passing Authorization never drops
// Content-Type. Errors carry the server's message and the HTTP status.
export const apiFetch = async (path, { token, headers, ...options } = {}, fetchImpl = fetch) => {
  let response
  try {
    response = await fetchImpl(`${API_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
    })
  } catch {
    throw new ApiError('Cannot reach the API. It may be waking up; try again in a moment.', 0)
  }

  const text = await response.text()
  let data
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }

  if (!response.ok) {
    throw new ApiError(data?.error || `Request failed (${response.status})`, response.status)
  }
  return data
}
