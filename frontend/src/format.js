// The API stores UTC timestamps in SQLite's "YYYY-MM-DD HH:MM:SS" format.
export const parseUtc = (value) => {
  if (!value) return null
  const date = new Date(`${value.replace(' ', 'T')}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

export const formatDateTime = (value) => {
  const date = parseUtc(value)
  if (!date) return '—'
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const formatDate = (value) => {
  const date = parseUtc(value)
  if (!date) return '—'
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase()
