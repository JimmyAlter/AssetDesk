const StatCard = ({ label, value, hint, accentClass, icon }) => (
  <div className={`card stat-card ${accentClass || ''}`}>
    <div className="stat-card__head">
      <p className="card-label">{label}</p>
      {icon && <span className="stat-card__icon">{icon}</span>}
    </div>
    <h3>{value}</h3>
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
