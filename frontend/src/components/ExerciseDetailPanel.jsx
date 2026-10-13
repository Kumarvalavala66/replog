import { X } from 'lucide-react'
import ExerciseAnimation from './ExerciseAnimation'

export default function ExerciseDetailPanel({ exercise, onClose }) {
  if (!exercise) return null

  return (
    <aside className="exercise-detail-panel" role="dialog" aria-labelledby="exercise-detail-title">
      <div className="exercise-detail-header">
        <div>
          <span className="eyebrow">EXERCISE DETAIL</span>
          <h3 id="exercise-detail-title">{exercise.name}</h3>
        </div>
        <button type="button" className="icon-button" aria-label="Close exercise detail" onClick={onClose}>
          <X size={15} />
        </button>
      </div>
      <ExerciseAnimation exercise={exercise} showControls compact={false} />
      <div className="detail-meta">
        <span>{exercise.muscle_group}</span>
        <span>{exercise.equipment}</span>
        <span>{exercise.user_id == null ? 'Built-in' : 'Custom'}</span>
      </div>
      {exercise.instructions
        ? <p>{exercise.instructions}</p>
        : <p>No written instructions yet. Use the demonstration as a movement cue.</p>}
    </aside>
  )
}
