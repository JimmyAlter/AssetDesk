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
          >
            <Icon />
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>

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
