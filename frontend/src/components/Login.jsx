import { useState } from 'react'
import { LogoIcon, ShieldIcon, ActivityIcon } from './Icons'

const Login = ({ onLogin, busy, error }) => {
  const [email, setEmail] = useState('demo@assetdesk.dev')
  const [password, setPassword] = useState('demo123')

  const handleSubmit = (event) => {
    event.preventDefault()
    onLogin(email, password)
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
          <h1>Enterprise IT operations, unified.</h1>
          <p className="login-hero__sub">
            Govern inventory, service delivery, and field execution from a secure, unified platform.
          </p>
          <div className="login-grid">
            <div className="login-grid__item">
              <span>Assets monitored</span>
              <strong>148</strong>
            </div>
            <div className="login-grid__item">
              <span>Open tickets</span>
              <strong>12</strong>
            </div>
            <div className="login-grid__item">
              <span>Weekly closures</span>
              <strong>42</strong>
            </div>
            <div className="login-grid__item">
              <span>SLA compliance</span>
              <strong>97%</strong>
            </div>
          </div>
          <div className="login-activity">
            <p className="login-activity__head"><ActivityIcon /> Latest activity</p>
            <ul>
              <li>Change window approved for core systems</li>
              <li>Endpoint policy synced across offices</li>
              <li>Ticket queue cleared for priority items</li>
            </ul>
          </div>
        </div>
      </div>
      <div className="login-panel login-panel--form">
        <div className="login-form__wrap">
          <div className="login-form__header">
            <ShieldIcon />
            <h2>Sign in to your workspace</h2>
            <p>Enter your credentials to access the operations console.</p>
          </div>
          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              <span>Email address</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
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
                required
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="login-btn" disabled={busy}>
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="login-foot">
            Demo access: <strong>demo@assetdesk.dev</strong> / <strong>demo123</strong>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
