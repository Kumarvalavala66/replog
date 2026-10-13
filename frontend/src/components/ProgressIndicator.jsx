export default function ProgressIndicator({ label, value, max, tone = 'lime' }) {
  const ratio = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div className="progress-indicator">
      <div className="progress-indicator-header">
        <span>{label}</span>
        <strong>{value ?? 0}/{max || 0}</strong>
      </div>
      <div className="progress-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max || 0} aria-valuenow={value ?? 0}>
        <span className={`progress-fill progress-fill--${tone}`} style={{ width: `${ratio}%` }} />
      </div>
    </div>
  )
}
