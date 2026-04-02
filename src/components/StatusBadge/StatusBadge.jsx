import './StatusBadge.css'

const STATUS_CONFIG = {
  pending: { label: 'Pending', className: 'badge-pending' },
  verified: { label: 'Verified', className: 'badge-verified' },
  assigned: { label: 'Assigned', className: 'badge-assigned' },
  resolved: { label: 'Resolved', className: 'badge-resolved' },
}

const SEVERITY_CONFIG = {
  critical: { label: 'Critical', className: 'badge-critical' },
  high: { label: 'High', className: 'severity-high' },
  medium: { label: 'Medium', className: 'severity-medium' },
  low: { label: 'Low', className: 'severity-low' },
}

export const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending
  return (
    <span className={`badge ${config.className}`}>
      <span className="badge-dot"></span>
      {config.label}
    </span>
  )
}

export const SeverityBadge = ({ severity }) => {
  const config = SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.medium
  return (
    <span className={`badge ${config.className}`}>
      {config.label}
    </span>
  )
}

export const AiConfidenceBadge = ({ confidence }) => {
  const getColor = (c) => {
    if (c >= 90) return 'var(--signal-green)'
    if (c >= 75) return 'var(--amber)'
    return 'var(--signal-red)'
  }

  return (
    <div className="ai-confidence-badge">
      <div className="ai-confidence-ring" style={{ '--progress': `${confidence}%`, '--ring-color': getColor(confidence) }}>
        <svg viewBox="0 0 36 36" className="ai-ring-svg">
          <path
            className="ai-ring-bg"
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          />
          <path
            className="ai-ring-fill"
            strokeDasharray={`${confidence}, 100`}
            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            style={{ stroke: getColor(confidence) }}
          />
        </svg>
        <span className="ai-confidence-value">{confidence}%</span>
      </div>
      <span className="ai-confidence-label">AI Confidence</span>
    </div>
  )
}

export default StatusBadge
