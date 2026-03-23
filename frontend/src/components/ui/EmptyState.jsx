const EmptyState = ({ title, subtitle, action }) => (
  <div className="empty-state">
    <div className="empty-state__inner">
      <h4>{title}</h4>
      <p>{subtitle}</p>
      {action}
    </div>
  </div>
)

export default EmptyState
