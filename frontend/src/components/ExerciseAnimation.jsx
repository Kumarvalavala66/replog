import { Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { resolveExerciseAnimation } from '../exercises/catalog'
import usePrefersReducedMotion from '../hooks/usePrefersReducedMotion'
import ExerciseFigure from './ExerciseFigures'
import './exercise-motion.css'

export default function ExerciseAnimation({
  exercise,
  name,
  showControls = true,
  compact = false,
  className = '',
  movementCue,
  autoplay = true,
}) {
  const resolvedName = exercise?.name || name || 'Exercise'
  const meta = useMemo(() => resolveExerciseAnimation(resolvedName), [resolvedName])
  const reducedMotion = usePrefersReducedMotion()
  const [playing, setPlaying] = useState(autoplay && !reducedMotion && meta.animated)
  const [slow, setSlow] = useState(false)
  const [replayTick, setReplayTick] = useState(0)

  useEffect(() => {
    setPlaying(autoplay && !reducedMotion && meta.animated)
  }, [autoplay, reducedMotion, meta.animated, meta.id])

  const canAnimate = meta.animated && !reducedMotion
  const running = canAnimate && playing
  const cue = movementCue || meta.cue
  const label = resolvedName === 'Exercise' ? meta.label : resolvedName

  return (
    <div className={`exercise-animation ${compact ? 'exercise-animation--compact' : ''} ${className}`.trim()}>
      {!compact && (
        <div className="exercise-animation-header">
          <div>
            <span className="exercise-animation-label">{meta.animated ? 'Demonstration' : 'Reference'}</span>
            <strong>{label}</strong>
          </div>
          {showControls && (
            <div className="exercise-animation-controls">
              <button
                type="button"
                className="exercise-mini-button"
                disabled={!canAnimate}
                aria-pressed={running}
                onClick={() => setPlaying((current) => !current)}
              >
                {running ? <Pause size={12} /> : <Play size={12} />}
                {running ? 'Pause' : 'Play'}
              </button>
              <button
                type="button"
                className="exercise-mini-button"
                disabled={!canAnimate}
                aria-pressed={slow}
                onClick={() => setSlow((current) => !current)}
              >
                {slow ? 'Normal' : 'Slow'}
              </button>
              <button
                type="button"
                className="exercise-mini-button"
                disabled={!canAnimate}
                onClick={() => {
                  setReplayTick((tick) => tick + 1)
                  setPlaying(true)
                }}
              >
                <RotateCcw size={12} /> Replay
              </button>
            </div>
          )}
        </div>
      )}
      <div className="exercise-animation-viewport" key={`${meta.id}-${replayTick}`}>
        <svg
          className={`exercise-svg ${running ? 'is-running' : ''} ${slow ? 'is-slow' : ''} exercise-svg--${meta.id}`}
          viewBox="0 0 240 180"
          role="img"
          aria-label={
            meta.animated
              ? `${label} movement demonstration`
              : `${label} static illustration`
          }
        >
          <ExerciseFigure type={meta.id} />
        </svg>
      </div>
      {!compact && <p className="exercise-animation-cue">{reducedMotion && meta.animated ? `${cue} Motion is paused because reduced motion is enabled.` : cue}</p>}
    </div>
  )
}
