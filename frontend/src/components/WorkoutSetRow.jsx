import { Minus } from 'lucide-react'

export default function WorkoutSetRow({
  set,
  previous,
  draft,
  busy,
  onDraftChange,
  onCommit,
  onToggleComplete,
  onRemove,
}) {
  const weightValue = draft?.weight ?? set.weight_kg ?? ''
  const repsValue = draft?.reps ?? set.reps ?? ''

  return (
    <div className={`set-row ${set.completed ? 'set-complete' : ''}`} role="row">
      <span className="set-number">{String(set.set_number).padStart(2, '0')}</span>
      <span className="set-previous">{previous ? `${previous.weight_kg ?? '—'} × ${previous.reps ?? '—'}` : '—'}</span>
      <label className="visually-hidden" htmlFor={`weight-${set.id}`}>Set {set.set_number} weight in kilograms</label>
      <input
        id={`weight-${set.id}`}
        type="number"
        min="0"
        step="0.5"
        inputMode="decimal"
        value={weightValue}
        placeholder="0"
        disabled={busy}
        onChange={(event) => onDraftChange('weight', event.target.value)}
        onBlur={(event) => onCommit('weight_kg', event.currentTarget.value)}
      />
      <label className="visually-hidden" htmlFor={`reps-${set.id}`}>Set {set.set_number} repetitions</label>
      <input
        id={`reps-${set.id}`}
        type="number"
        min="0"
        step="1"
        inputMode="numeric"
        value={repsValue}
        placeholder="0"
        disabled={busy}
        onChange={(event) => onDraftChange('reps', event.target.value)}
        onBlur={(event) => onCommit('reps', event.currentTarget.value)}
      />
      <button
        type="button"
        className={`set-done ${set.completed ? 'is-done' : ''}`}
        aria-pressed={set.completed}
        disabled={busy}
        onClick={() => onToggleComplete(!set.completed)}
      >
        {set.completed ? 'Done' : 'Log'}
      </button>
      <button className="icon-button remove-set" title={`Remove set ${set.set_number}`} disabled={busy} onClick={onRemove}>
        <Minus size={15} />
      </button>
    </div>
  )
}
