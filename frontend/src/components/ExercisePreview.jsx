import ExerciseAnimation from './ExerciseAnimation'

export default function ExercisePreview({ exercise, name, showControls = false, compact = true, autoplay = false }) {
  return (
    <div className="exercise-preview">
      <ExerciseAnimation
        exercise={exercise}
        name={name}
        compact={compact}
        showControls={showControls}
        autoplay={autoplay}
      />
    </div>
  )
}
