// Mock API for AssetDesk - Runs 100% in-browser using LocalStorage

const seedUsers = [
  { id: 1, name: 'Operations Admin', email: 'demo@assetdesk.dev', role: 'Admin', password: 'demo123', created_at: '2026-03-01 10:00:00' },
  { id: 2, name: 'Service Desk Lead', email: 'lead@assetdesk.dev', role: 'Support Lead', password: 'demo123', created_at: '2026-03-01 10:00:00' },
  { id: 3, name: 'Field Technician', email: 'field@assetdesk.dev', role: 'Field Tech', password: 'demo123', created_at: '2026-03-01 10:00:00' },
  { id: 4, name: 'Support Analyst', email: 'analyst@assetdesk.dev', role: 'Support Lead', password: 'demo123', created_at: '2026-03-01 10:00:00' },
  { id: 5, name: 'Endpoint Specialist', email: 'endpoint@assetdesk.dev', role: 'Field Tech', password: 'demo123', created_at: '2026-03-01 10:00:00' }
]

const seedAssets = [
  { id: 1, tag: 'AD-0192', name: 'Lenovo ThinkPad T14', type: 'Laptop', status: 'healthy', assigned_to: 'Service Desk Lead', location: 'Regional Office', last_seen: '2026-03-13 09:20' },
  { id: 2, tag: 'AD-0214', name: 'Dell OptiPlex 7090', type: 'Desktop', status: 'warning', assigned_to: 'Field Technician', location: 'Branch Office', last_seen: '2026-03-13 08:14' },
  { id: 3, tag: 'AD-0331', name: 'HP ProBook 450', type: 'Laptop', status: 'critical', assigned_to: 'Unassigned', location: 'Branch Office', last_seen: '2026-03-12 22:41' },
  { id: 4, tag: 'AD-0407', name: 'Mac Mini M2', type: 'Mini PC', status: 'healthy', assigned_to: 'Operations Admin', location: 'HQ', last_seen: '2026-03-13 10:02' },
  { id: 5, tag: 'AD-0440', name: 'Dell Latitude 7430', type: 'Laptop', status: 'healthy', assigned_to: 'Support Analyst', location: 'Regional Office', last_seen: '2026-03-13 09:05' },
  { id: 6, tag: 'AD-0523', name: 'HP EliteDesk 800', type: 'Desktop', status: 'warning', assigned_to: 'Endpoint Specialist', location: 'Branch Office', last_seen: '2026-03-12 19:22' },
  { id: 7, tag: 'AD-0581', name: 'Lenovo ThinkCentre M80', type: 'Desktop', status: 'healthy', assigned_to: 'Service Desk Lead', location: 'HQ', last_seen: '2026-03-13 09:44' },
  { id: 8, tag: 'AD-0627', name: 'Surface Laptop 5', type: 'Laptop', status: 'healthy', assigned_to: 'Field Technician', location: 'Branch Office', last_seen: '2026-03-13 07:58' },
  { id: 9, tag: 'AD-0710', name: 'Acer Swift 3', type: 'Laptop', status: 'critical', assigned_to: 'Unassigned', location: 'Regional Office', last_seen: '2026-03-12 20:11' },
  { id: 10, tag: 'AD-0788', name: 'Dell PowerEdge T40', type: 'Server', status: 'warning', assigned_to: 'Operations Admin', location: 'Data Center', last_seen: '2026-03-13 06:30' },
  { id: 11, tag: 'AD-0812', name: 'Synology DS920+', type: 'NAS', status: 'healthy', assigned_to: 'Service Desk Lead', location: 'HQ', last_seen: '2026-03-13 09:50' },
  { id: 12, tag: 'AD-0875', name: 'Ubiquiti USW-24', type: 'Switch', status: 'healthy', assigned_to: 'Endpoint Specialist', location: 'Branch Office', last_seen: '2026-03-13 09:05' }
]

const seedTickets = [
  { id: 1, title: 'VPN disconnects after sleep', status: 'open', priority: 'high', requester: 'Service Desk Lead', assignee: 'Field Technician', asset_id: 1, description: 'VPN drops after laptops wake from sleep. Investigate power settings.', created_at: '2026-03-13 08:25', updated_at: '2026-03-13 08:25' },
  { id: 2, title: 'Patch failure on desktop fleet', status: 'open', priority: 'medium', requester: 'Operations Admin', assignee: 'Service Desk Lead', asset_id: 2, description: 'Monthly update failed on several endpoints. Review remediation plan.', created_at: '2026-03-12 18:12', updated_at: '2026-03-12 18:12' },
  { id: 3, title: 'Battery health review', status: 'resolved', priority: 'low', requester: 'Field Technician', assignee: 'Service Desk Lead', asset_id: 3, description: 'Battery cycle count high. Replacement scheduled and confirmed.', created_at: '2026-03-11 10:05', updated_at: '2026-03-12 09:40' },
  { id: 4, title: 'New user onboarding', status: 'open', priority: 'medium', requester: 'Support Analyst', assignee: 'Operations Admin', asset_id: 4, description: 'Provision standard apps, VPN, and security policies.', created_at: '2026-03-13 09:12', updated_at: '2026-03-13 09:12' },
  { id: 5, title: 'Recurring printer queue stall', status: 'resolved', priority: 'low', requester: 'Endpoint Specialist', assignee: 'Field Technician', asset_id: null, description: 'Cleared queue and updated driver policy for the print server.', created_at: '2026-03-10 16:40', updated_at: '2026-03-11 09:10' },
  { id: 6, title: 'Slow boot times on laptops', status: 'open', priority: 'high', requester: 'Operations Admin', assignee: 'Support Analyst', asset_id: 7, description: 'Investigate startup scripts, security agents, and driver updates.', created_at: '2026-03-12 07:55', updated_at: '2026-03-12 07:55' },
  { id: 7, title: 'Asset warranty tracking', status: 'open', priority: 'low', requester: 'Service Desk Lead', assignee: 'Endpoint Specialist', asset_id: 8, description: 'Sync warranty dates and refresh lifecycle policies.', created_at: '2026-03-13 07:40', updated_at: '2026-03-13 07:40' }
]

function getStorage(key, fallback) {
  const data = localStorage.getItem(key)
  if (!data) {
    localStorage.setItem(key, JSON.stringify(fallback))
    return fallback
  }
  return JSON.parse(data)
}

function setStorage(key, data) {
  localStorage.setItem(key, JSON.stringify(data))
}

export const isDemoMode = () => {
  return window.location.hostname.includes('vercel.app') || 
         import.meta.env.VITE_DEMO_MODE === 'true'
}

export const mockFetchJson = async (path, options = {}) => {
  // Simulate network latency (50-200ms)
  await new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 150))

  // Decode user from Authorization header (mock b64 JWT)
  let currentUser = null
  const authHeader = options.headers?.Authorization || ''
  if (authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    try {
      currentUser = JSON.parse(atob(token))
    } catch (e) {
      // invalid token format
      throw new Error('Unauthorized')
    }
  }

  // 1. POST /api/auth/login
  if (path === '/api/auth/login' && options.method === 'POST') {
    const { email, password } = JSON.parse(options.body)
    const users = getStorage('assetdesk_users', seedUsers)
    const user = users.find(u => u.email === email && u.password === password)
    
    if (!user) {
      throw new Error('Invalid credentials')
    }

    // Generate mock token encoding user info
    const tokenInfo = { id: user.id, name: user.name, email: user.email, role: user.role }
    const token = btoa(JSON.stringify(tokenInfo))
    
    return {
      token,
      user: tokenInfo
    }
  }

  // Guard all other routes with mock authentication
  if (!currentUser) {
    throw new Error('Unauthorized')
  }

  // 2. GET /api/summary
  if (path === '/api/summary' && (!options.method || options.method === 'GET')) {
    const assets = getStorage('assetdesk_assets', seedAssets)
    const tickets = getStorage('assetdesk_tickets', seedTickets)

    const openTickets = tickets.filter(t => t.status === 'open').length
    const resolved = tickets.filter(t => t.status === 'resolved').length // Simplified mock date filter
    const slaRisk = tickets.filter(t => t.status === 'open' && t.priority === 'high').length

    return {
      assets: assets.length,
      openTickets,
      resolved,
      slaRisk
    }
  }

  // 3. GET /api/tickets
  if (path === '/api/tickets' && (!options.method || options.method === 'GET')) {
    return getStorage('assetdesk_tickets', seedTickets)
  }

  // 4. POST /api/tickets
  if (path === '/api/tickets' && options.method === 'POST') {
    const { title, priority, description } = JSON.parse(options.body)
    if (!title) throw new Error('Title is required')

    const tickets = getStorage('assetdesk_tickets', seedTickets)
    const now = new Date()
    const formattedDate = now.toISOString().replace('T', ' ').substring(0, 16)
    
    const newTicket = {
      id: tickets.length > 0 ? Math.max(...tickets.map(t => t.id)) + 1 : 1,
      title,
      status: 'open',
      priority: priority || 'medium',
      requester: currentUser.name || 'Operator',
      assignee: 'Unassigned',
      asset_id: null,
      description: description || '',
      created_at: formattedDate,
      updated_at: formattedDate
    }

    tickets.unshift(newTicket)
    setStorage('assetdesk_tickets', tickets)
    return newTicket
  }

  // 5. GET /api/assets
  if (path === '/api/assets' && (!options.method || options.method === 'GET')) {
    return getStorage('assetdesk_assets', seedAssets)
  }

  // 6. GET /api/users
  if (path === '/api/users' && (!options.method || options.method === 'GET')) {
    const users = getStorage('assetdesk_users', seedUsers)
    // Map to remove passwords
    return users.map(({ password, ...u }) => u)
  }

  throw new Error(`Endpoint not mocked: ${path}`)
}
