import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDown, ArrowUp, Check, Clock3, Maximize2, Minimize2, Plus, Trash2 } from 'lucide-react'
import ExerciseAnimation from './ExerciseAnimation'
import ProgressIndicator from './ProgressIndicator'
import RestTimer from './RestTimer'
import WorkoutSetRow from './WorkoutSetRow'

const DEFAULT_REST = 90

function elapsed(startedAt, now) {
  if (!startedAt || !now) return '00:00:00'
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000))
  return `${String(Math.floor(seconds / 3600)).padStart(2, '0')}:${String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

export default function LiveWorkout({
  workout, exercises, previous, onAddExercise, onUpdateSet, onAddSet,
  onRemoveSet, onRemoveExercise, onMoveExercise, onFinish, busy,
}) {
  const [exerciseId, setExerciseId] = useState('')
  const [now, setNow] = useState(0)
  const [restSeconds, setRestSeconds] = useState(DEFAULT_REST)
  const [restDuration, setRestDuration] = useState(DEFAULT_REST)
  const [timerRunning, setTimerRunning] = useState(false)
  const [setDrafts, setSetDrafts] = useState({})
  const [expandedId, setExpandedId] = useState(null)
  const [demoFocusId, setDemoFocusId] = useState(null)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!timerRunning) return undefined
    const interval = window.setInterval(() => {
      setRestSeconds((seconds) => {
        if (seconds <= 1) {
          setTimerRunning(false)
          return 0
        }
        return seconds - 1
      })
    }, 1000)
    return () => window.clearInterval(interval)
  }, [timerRunning])

  const totals = useMemo(() => workout.exercises.reduce((total, item) => {
    total.sets += item.sets.length
    for (const set of item.sets) {
      if (!set.completed) continue
      total.done += 1
      if (set.reps != null) total.reps += set.reps
      if (set.reps != null && set.weight_kg != null) total.volume += set.reps * set.weight_kg
    }
    return total
  }, { sets: 0, done: 0, reps: 0, volume: 0 }), [workout.exercises])

  const currentExercise = useMemo(() => {
    if (demoFocusId) {
      return workout.exercises.find((item) => item.id === demoFocusId) || workout.exercises[0]
    }
    return workout.exercises.find((item) => item.sets.some((set) => !set.completed)) || workout.exercises[0]
  }, [demoFocusId, workout.exercises])

  const availableExercises = exercises.filter(
    (exercise) => !workout.exercises.some((item) => item.exercise_id === exercise.id),
  )

  function startRest() {
    setRestSeconds(restDuration)
    setTimerRunning(true)
  }

  return (
    <section className="live-workout">
      <div className="live-summary panel">
        <div className="live-title">
          <span className="status status-active">LIVE SESSION</span>
          <h2>{workout.title}</h2>
          <span>Started {new Date(workout.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        <div className="live-metrics">
          <div><Clock3 size={16} /><span>Duration</span><strong>{elapsed(workout.started_at, now)}</strong></div>
          <div><Check size={16} /><span>Sets done</span><strong>{totals.done}/{totals.sets || 0}</strong></div>
          <div><Activity size={16} /><span>Volume</span><strong>{Math.round(totals.volume).toLocaleString()} kg</strong></div>
        </div>
      </div>

      <ProgressIndicator label="Session completion" value={totals.done} max={totals.sets || 1} />

      {currentExercise && (
        <section className="panel live-focus">
          <div className="live-focus-copy">
            <span className="eyebrow">CURRENT MOVEMENT</span>
            <h3>{currentExercise.exercise?.name || `Exercise ${currentExercise.exercise_id}`}</h3>
            <p>{currentExercise.exercise?.muscle_group} · {currentExercise.exercise?.equipment}</p>
          </div>
          <ExerciseAnimation
            exercise={currentExercise.exercise}
            name={currentExercise.exercise?.name}
            showControls
            compact={false}
            autoplay={false}
          />
        </section>
      )}

      <RestTimer
        seconds={restSeconds}
        duration={restDuration}
        running={timerRunning}
        onSubtract={() => setRestSeconds((s) => Math.max(0, s - 15))}
        onAdd={() => setRestSeconds((s) => s + 15)}
        onReset={() => { setTimerRunning(false); setRestSeconds(restDuration) }}
        onDurationChange={(value) => {
          setRestDuration(value)
          if (!timerRunning) setRestSeconds(value)
        }}
        onStartPause={() => {
          if (!timerRunning && restSeconds === 0) setRestSeconds(restDuration)
          setTimerRunning((running) => !running)
        }}
      />

      {workout.exercises.map((item, index) => {
        const detail = item.exercise
        const prior = previous[item.exercise_id]
        const expanded = expandedId === item.id
        return (
          <article className={`panel live-exercise ${currentExercise?.id === item.id ? 'is-current' : ''}`} key={item.id}>
            <div className="live-exercise-heading">
              <div className="live-exercise-title">
                <span className="exercise-index">{String(index + 1).padStart(2, '0')}</span>
                <div>
                  <h3>{detail?.name || `Exercise ${item.exercise_id}`}</h3>
                  <span>{detail?.muscle_group} · {detail?.equipment}</span>
                </div>
              </div>
              <div className="live-exercise-actions">
                <button className="icon-button" title={expanded ? 'Collapse demonstration' : 'Expand demonstration'} disabled={busy} onClick={() => { setExpandedId(expanded ? null : item.id); setDemoFocusId(item.id) }}>
                  {expanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                </button>
                <button className="icon-button" title="Move exercise up" disabled={index === 0 || busy} onClick={() => onMoveExercise(item.id, index - 1)}><ArrowUp size={16} /></button>
                <button className="icon-button" title="Move exercise down" disabled={index === workout.exercises.length - 1 || busy} onClick={() => onMoveExercise(item.id, index + 1)}><ArrowDown size={16} /></button>
                <button className="icon-button danger-icon" title="Remove exercise" disabled={busy} onClick={() => onRemoveExercise(item.id)}><Trash2 size={16} /></button>
              </div>
            </div>
            {expanded && (
              <div className="live-exercise-visuals">
                <ExerciseAnimation exercise={detail} name={detail?.name} showControls compact={false} autoplay={false} />
              </div>
            )}
            <div className="previous-performance">
              <span>PREVIOUS</span>
              {prior?.sets?.length
                ? <strong>{prior.sets.map((set) => `${set.weight_kg ?? '—'} kg × ${set.reps ?? '—'}`).join('  ·  ')}</strong>
                : <strong>No previous performance</strong>}
              {prior?.performed_at && <time>{new Date(prior.performed_at).toLocaleDateString()}</time>}
            </div>
            <div className="set-table" role="table" aria-label={`${detail?.name || 'Exercise'} sets`}>
              <div className="set-table-head" role="row"><span>SET</span><span>PREVIOUS</span><span>KG</span><span>REPS</span><span>DONE</span><span /></div>
              {item.sets.map((set) => {
                const old = prior?.sets?.find((candidate) => candidate.set_number === set.set_number)
                const clearDraft = (field) => {
                  setSetDrafts((current) => {
                    const setDraft = { ...current[set.id] }
                    delete setDraft[field]
                    const next = { ...current }
                    if (Object.keys(setDraft).length) next[set.id] = setDraft
                    else delete next[set.id]
                    return next
                  })
                }
                return (
                  <WorkoutSetRow
                    key={set.id}
                    set={set}
                    previous={old}
                    draft={setDrafts[set.id]}
                    busy={busy}
                    onDraftChange={(field, value) => setSetDrafts((current) => ({ ...current, [set.id]: { ...current[set.id], [field]: value } }))}
                    onCommit={async (field, value) => {
                      const saved = await onUpdateSet(set.id, { [field]: value === '' ? null : Number(value) })
                      if (saved) clearDraft(field === 'weight_kg' ? 'weight' : 'reps')
                    }}
                    onToggleComplete={async (completed) => {
                      const saved = await onUpdateSet(set.id, { completed })
                      if (saved && completed) startRest()
                    }}
                    onRemove={() => onRemoveSet(set.id)}
                  />
                )
              })}
            </div>
            <button
              className="text-button add-set"
              disabled={busy}
              onClick={() => {
                const last = item.sets.at(-1)
                const priorSet = prior?.sets?.find((candidate) => candidate.set_number === item.sets.length + 1)
                  || prior?.sets?.at(-1)
                onAddSet(item.id, {
                  weight_kg: last?.weight_kg ?? priorSet?.weight_kg ?? null,
                  reps: last?.reps ?? priorSet?.reps ?? null,
                })
              }}
            >
              <Plus size={15} /> Add set
            </button>
          </article>
        )
      })}

      <section className="panel add-exercise-row">
        <label htmlFor="add-live-exercise">Add exercise</label>
        <select id="add-live-exercise" value={exerciseId} onChange={(event) => setExerciseId(event.target.value)}>
          <option value="">Choose from your library</option>
          {availableExercises.map((exercise) => <option value={exercise.id} key={exercise.id}>{exercise.name}</option>)}
        </select>
        <button className="button button-primary" disabled={!exerciseId || busy} onClick={async () => { await onAddExercise(Number(exerciseId)); setExerciseId('') }}><Plus size={16} /> Add exercise</button>
      </section>

      <div className="finish-workout-bar">
        <span>{totals.done} completed sets · {totals.reps} reps · {Math.round(totals.volume).toLocaleString()} kg volume</span>
        <button className="button button-primary" disabled={busy} onClick={onFinish}><Check size={16} /> Finish workout</button>
      </div>
    </section>
  )
}
