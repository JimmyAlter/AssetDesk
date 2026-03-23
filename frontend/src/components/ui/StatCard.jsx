const StatCard = ({ label, value, hint, trend, accentClass, icon }) => (
  <div className={`card stat-card ${accentClass || ''}`}>
    <div className="stat-card__head">
      <p className="card-label">{label}</p>
      {icon && <span className="stat-card__icon">{icon}</span>}
    </div>
    <div className="stat-row">
      <h3>{value}</h3>
      {trend && (
        <svg className="sparkline" viewBox="0 0 120 40" aria-hidden="true">
          <defs>
            <linearGradient id={`sp-${label.replace(/\s/g,'')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.3" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline points={trend} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <polygon points={`${trend},120,40 0,40`} fill={`url(#sp-${label.replace(/\s/g,'')})`} opacity="0.5" />
        </svg>
      )}
    </div>
    <p className="card-hint">{hint}</p>
  </div>
)

export const StatSkeleton = () => (
  <div className="card stat-card">
    <span className="skeleton-line short" />
    <span className="skeleton-line" />
    <span className="skeleton-line short" />
  </div>
)

export default StatCard
