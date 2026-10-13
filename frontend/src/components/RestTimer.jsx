import { Minus, Pause, Play, Plus, RotateCcw, Timer } from 'lucide-react'

function formatRest(seconds) {
  const safe = Math.max(0, Number(seconds) || 0)
  return `${String(Math.floor(safe / 60)).padStart(2, '0')}:${String(safe % 60).padStart(2, '0')}`
}

export default function RestTimer({
  seconds,
  duration = 90,
  running,
  onStartPause,
  onAdd,
  onSubtract,
  onReset,
  onDurationChange,
}) {
  const total = Math.max(1, duration)
  const remaining = Math.max(0, Number(seconds) || 0)
  const ratio = Math.min(100, (remaining / total) * 100)

  return (
    <section className={`panel rest-timer ${running ? 'is-running' : ''}`}>
      <div className="timer-display">
        <Timer size={18} aria-hidden="true" />
        <div>
          <span className="eyebrow">REST TIMER</span>
          <strong aria-live="polite">{formatRest(remaining)}</strong>
        </div>
      </div>
      <div className="rest-meter" aria-hidden="true">
        <span style={{ width: `${ratio}%` }} />
      </div>
      <div className="timer-controls">
        <button className="icon-button" type="button" aria-label="Subtract 15 seconds" onClick={onSubtract}><Minus size={15} /></button>
        <button className="button button-primary" type="button" onClick={onStartPause}>
          {running ? <Pause size={15} /> : <Play size={15} />}
          {running ? 'Pause' : remaining === duration ? 'Start' : remaining === 0 ? 'Restart' : 'Resume'}
        </button>
        <button className="icon-button" type="button" aria-label="Add 15 seconds" onClick={onAdd}><Plus size={15} /></button>
        <button className="icon-button" type="button" aria-label="Reset rest timer" onClick={onReset}><RotateCcw size={15} /></button>
        {onDurationChange && (
          <label className="rest-duration">
            <span className="visually-hidden">Default rest duration</span>
            <select aria-label="Default rest duration" value={duration} onChange={(event) => onDurationChange(Number(event.target.value))}>
              <option value={45}>45s</option>
              <option value={60}>60s</option>
              <option value={90}>90s</option>
              <option value={120}>120s</option>
              <option value={180}>180s</option>
            </select>
          </label>
        )}
      </div>
    </section>
  )
}
