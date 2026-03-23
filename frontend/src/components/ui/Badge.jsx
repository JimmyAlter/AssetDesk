const Badge = ({ tone, label }) => (
  <span className={`badge badge--${tone}`}>{label}</span>
)

export default Badge
