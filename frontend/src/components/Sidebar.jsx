import { LogoutIcon, LogoIcon } from './Icons'
import { initials } from '../format'

const Sidebar = ({ items, view, user, onNavigate, onLogout }) => (
  <aside className="sidebar">
    <div className="brand">
      <div className="brand-mark">
        <LogoIcon />
      </div>
      <div className="brand-text">
        <h2>AssetDesk</h2>
        <span>IT Operations Hub</span>
      </div>
    </div>

    <nav className="nav">
      <p className="nav-label">Navigation</p>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <button
            key={item.id}
            className={view === item.id ? 'nav-item nav-item--active' : 'nav-item'}
            onClick={() => onNavigate(item.id)}
            aria-label={item.label}
            aria-current={view === item.id ? 'page' : undefined}
            title={item.label}
          >
            <Icon aria-hidden="true" />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>

    {/* Compact user chip and sign-out for narrow screens, where the footer is hidden. */}
    <div className="sidebar-compact">
      <div className="sidebar-avatar" title={`${user?.name} · ${user?.role}`}>{initials(user?.name)}</div>
      <span className="sidebar-compact__role">{user?.role}</span>
      <button className="sidebar-compact__logout" onClick={onLogout} aria-label="Sign out" title="Sign out">
        <LogoutIcon aria-hidden="true" />
      </button>
    </div>

    <div className="sidebar-foot">
      <div className="sidebar-foot__user">
        <div className="sidebar-avatar">{initials(user?.name)}</div>
        <div>
          <p className="sidebar-foot__name">{user?.name}</p>
          <p className="sidebar-foot__role">{user?.role}</p>
        </div>
      </div>
      <button className="sidebar-logout" onClick={onLogout}>
        <LogoutIcon />
        <span>Sign out</span>
      </button>
    </div>
  </aside>
)

export default Sidebar
