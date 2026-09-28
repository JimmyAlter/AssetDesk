import { useState } from 'react'
import { LogoIcon, ShieldIcon, TicketIcon, UsersIcon } from './Icons'

// Demo accounts created by the backend seed. They all share one password.
const DEMO_PASSWORD = 'demo123'
const DEMO_ACCOUNTS = [
  { role: 'Admin', email: 'demo@assetdesk.dev', blurb: 'Everything, including the people directory' },
  { role: 'Support Lead', email: 'lead@assetdesk.dev', blurb: 'Triage, assign and reopen tickets' },
  { role: 'Field Tech', email: 'field@assetdesk.dev', blurb: 'Only tickets assigned to them' },
]

const Login = ({ onLogin, busy, error }) => {
  const [email, setEmail] = useState(DEMO_ACCOUNTS[0].email)
  const [password, setPassword] = useState(DEMO_PASSWORD)

  const handleSubmit = (event) => {
    event.preventDefault()
    onLogin(email, password)
  }

  const pickAccount = (account) => {
    setEmail(account.email)
    setPassword(DEMO_PASSWORD)
  }

  return (
    <div className="login-shell">
      <div className="login-panel login-panel--hero">
        <div className="login-hero__bg" aria-hidden="true">
          <div className="login-orb login-orb--1" />
          <div className="login-orb login-orb--2" />
          <div className="login-orb login-orb--3" />
        </div>
        <div className="login-hero__content">
          <div className="login-hero__badge">
            <LogoIcon />
            <span>AssetDesk</span>
          </div>
          <h1>IT service desk and asset inventory.</h1>
          <p className="login-hero__sub">
            Raise tickets, move them from open to resolved, assign them to the right person and keep an eye on device health.
          </p>
          <ul className="login-features">
            <li><TicketIcon /> Ticket lifecycle: open, in progress, resolved, reopen</li>
            <li><UsersIcon /> Three roles with different permissions, enforced by the API</li>
            <li><ShieldIcon /> JWT sessions, bcrypt passwords, rate-limited sign-in</li>
          </ul>
        </div>
      </div>
      <div className="login-panel login-panel--form">
        <div className="login-form__wrap">
          <div className="login-form__header">
            <ShieldIcon />
            <h2>Sign in to your workspace</h2>
            <p>Pick a demo role below, or type the credentials yourself.</p>
          </div>
          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              <span>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                autoComplete="username"
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </label>
            {error && <p className="form-error" role="alert">{error}</p>}
            <button type="submit" className="login-btn" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="demo-accounts">
            <p className="demo-accounts__label">Demo accounts · password <strong>{DEMO_PASSWORD}</strong></p>
            {DEMO_ACCOUNTS.map((account) => (
              <button
                key={account.email}
                type="button"
                className={email === account.email ? 'demo-account demo-account--active' : 'demo-account'}
                onClick={() => pickAccount(account)}
              >
                <strong>{account.role}</strong>
                <span>{account.email}</span>
                <small>{account.blurb}</small>
              </button>
            ))}
          </div>
          <p className="login-foot">
            The API runs on a free tier and sleeps when idle, so the first sign-in can take up to a minute.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
